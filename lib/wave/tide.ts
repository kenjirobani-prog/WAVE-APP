import type { AreaKey } from '@/types'

// エリア別・海上保安庁（JCG）験潮所マッピング
// - JCG 値は CD（最低水面）基準のcm値でそのまま使う（オフセット加算なし）
// - stormglassOffsetCm: StormGlass の sg(MSL基準, m) を CD基準(cm) に変換するオフセット
//   （JCGのフッターより横浜の CD = 115cm below MSL、他港は概算）
export const JCG_STATIONS: Record<AreaKey, { id: string; name: string; stormglassOffsetCm: number }> = {
  'shonan':      { id: '0062', name: '横浜',   stormglassOffsetCm: 115 },
  'chiba-north': { id: '0053', name: '千葉',   stormglassOffsetCm: 100 },
  'chiba-south': { id: '0052', name: '布良',   stormglassOffsetCm:  90 },
  'ibaraki':     { id: '0042', name: '小名浜', stormglassOffsetCm:  85 },
}

const KAIHO_GAUGE_BASE = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php'

// フォールバック専用のサイン波推定（JCG/StormGlass両方取得失敗時のみ）
// JCG実測値がだいたい45〜185cmに収まるため、115±70を標準値とする
const FALLBACK_CENTER_CM = 115
const FALLBACK_AMPLITUDE_CM = 70

export function estimateTideHeight(hour: number): number {
  return Math.round(FALLBACK_CENTER_CM + FALLBACK_AMPLITUDE_CM * Math.sin((hour / 12) * Math.PI))
}

export function defaultTide(): number[] {
  return Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
}

// ---- JCG 験潮HTML パーサー ----

function parseObservations(html: string, date: Date): (number | undefined)[] {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])
  // サーバーはUTCで動作するためJST(+9h)で計算
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = jst.getUTCFullYear()
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(jst.getUTCDate()).padStart(2, '0')

  // 大潮時には station datum を下回る負の値も観測されるため `-?\d+` で許容。
  const pattern = new RegExp(
    `${yyyy}\\s+${mm}\\s+${dd}\\s+(\\d{2})\\s+\\d{2}\\s+(-?\\d+)`,
    'g'
  )
  let match
  while ((match = pattern.exec(html)) !== null) {
    const hour = parseInt(match[1])
    const value = parseInt(match[2])
    if (value !== 9999 && hour >= 0 && hour < 24) {
      hourlyValues[hour].push(value)
    }
  }
  return hourlyValues.map(vals =>
    vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : undefined
  )
}

function parsePredictionTable(html: string, date: Date): (number | undefined)[] {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(jst.getUTCDate()).padStart(2, '0')
  const dateStr = mm + dd

  const dateCell = `<td[^>]*>\\s*${dateStr}\\s*<\\/td>`
  // 予測テーブルは 0時〜24時 の25列（HTMLヘッダ実物: <td>0時</td>...<td>24時</td>）
  // 大潮時には station datum を下回る負の値（例: -8cm）も来るため、先頭の `-` を許容する。
  const numCell = `(?:<td[^>]*>\\s*(-?\\d+)\\s*<\\/td>\\s*){1,26}`
  const rowPattern = new RegExp(`${dateCell}\\s*(${numCell})`, 's')

  const rowMatch = rowPattern.exec(html)
  if (!rowMatch) return new Array(24).fill(undefined)

  const values: number[] = []
  const tdPattern = /<td[^>]*>\s*(-?\d+)\s*<\/td>/g
  let tdMatch
  while ((tdMatch = tdPattern.exec(rowMatch[1])) !== null) {
    values.push(parseInt(tdMatch[1]))
  }

  // 予測テーブルは values[h] = h時 の値（0時〜24時）。24時は翌日0時なので無視。
  const result: (number | undefined)[] = new Array(24).fill(undefined)
  for (let h = 0; h < 24; h++) {
    const v = values[h]
    if (v !== undefined && !isNaN(v)) result[h] = v
  }
  return result
}

/** 指定エリアの JCG 験潮所から当日24時間分の潮位(cm)を取得 */
export async function fetchJcgTideHourly(area: AreaKey, date: Date): Promise<number[]> {
  const station = JCG_STATIONS[area]
  if (!station) throw new Error(`No JCG station mapped for area: ${area}`)

  const url = `${KAIHO_GAUGE_BASE}?s=${station.id}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; WaveForecast/1.0)',
      },
      signal: controller.signal,
      next: { revalidate: 1800 },
    } as RequestInit)
    if (!res.ok) throw new Error(`JCG gauge error ${station.id}: ${res.status}`)

    const html = await res.text()
    const observations = parseObservations(html, date)
    const predictions = parsePredictionTable(html, date)

    const obsCount = observations.filter(v => v !== undefined).length
    const predCount = predictions.filter(v => v !== undefined).length
    if (obsCount === 0 && predCount === 0) {
      throw new Error(`JCG HTML parse returned no values (station=${station.id}). Structure may have changed.`)
    }

    // JCG値はそのまま使用（CD基準cm、オフセット加算なし）。欠損時のみサイン推定
    const result = Array.from({ length: 24 }, (_, h) => {
      if (observations[h] !== undefined) return observations[h]!
      if (predictions[h] !== undefined) return predictions[h]!
      return estimateTideHeight(h)
    })

    console.log(`[JCG] ${area}(s=${station.id}/${station.name}) obs=${obsCount} pred=${predCount}`)
    return result
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * StormGlass Tide API を多日分まとめて取得。
 * 返り値: JST日付文字列 YYYY-MM-DD → 24時間配列(cm, CD基準)
 * sg(MSL基準, m) → CD基準(cm) 変換: `sg*100 + stormglassOffsetCm`
 */
export async function fetchStormGlassTideRange(
  lat: number,
  lng: number,
  startDateJst: string,
  endDateJst: string,
  stormglassOffsetCm: number,
): Promise<Map<string, number[]>> {
  const apiKey = process.env.STORMGLASS_API_KEY
  if (!apiKey) throw new Error('STORMGLASS_API_KEY not configured')

  const startISO = new Date(`${startDateJst}T00:00:00+09:00`).toISOString()
  const endISO   = new Date(`${endDateJst}T23:59:59+09:00`).toISOString()
  const url = `https://api.stormglass.io/v2/tide/sea-level/point?lat=${lat}&lng=${lng}&start=${startISO}&end=${endISO}`

  const byDate = new Map<string, number[]>()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, { headers: { Authorization: apiKey }, signal: controller.signal })
    if (!res.ok) throw new Error(`StormGlass Tide API ${res.status}`)
    const json = await res.json()
    ;(json.data ?? []).forEach((d: { time: string; sg: number }) => {
      const jst = new Date(new Date(d.time).getTime() + 9 * 60 * 60 * 1000)
      const dateKey = jst.toISOString().split('T')[0]
      const jstHour = jst.getUTCHours()
      const arr = byDate.get(dateKey) ?? Array(24).fill(stormglassOffsetCm)
      arr[jstHour] = Math.round(d.sg * 100 + stormglassOffsetCm)
      byDate.set(dateKey, arr)
    })
  } finally {
    clearTimeout(timeout)
  }
  return byDate
}
