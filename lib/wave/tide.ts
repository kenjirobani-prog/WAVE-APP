import type { AreaKey } from '@/types'

// エリア別・海上保安庁（JCG）験潮所マッピング
// offsetCm: StormGlass の sg(平均海面基準, m) を station の基準系(cm)に揃えるオフセット
//   - JCG 値はそのまま使う（station 自前の基準系）
//   - StormGlass 値には `sg*100 + offsetCm` を適用
// 値は概算（後から実測比較で調整可）
export const JCG_STATIONS: Record<AreaKey, { id: string; name: string; offsetCm: number }> = {
  'shonan':      { id: '0062', name: '横浜',   offsetCm: 115 },
  'chiba-north': { id: '0053', name: '千葉',   offsetCm: 100 },
  'chiba-south': { id: '0052', name: '布良',   offsetCm:  90 },
  'ibaraki':     { id: '0042', name: '小名浜', offsetCm:  85 },
}

const KAIHO_GAUGE_BASE = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php'

export function estimateTideHeight(hour: number, offsetCm: number = 115): number {
  const amplitude = 70
  return Math.round(offsetCm + amplitude * Math.sin((hour / 12) * Math.PI))
}

export function defaultTide(offsetCm: number = 115): number[] {
  return Array.from({ length: 24 }, (_, h) => estimateTideHeight(h, offsetCm))
}

// ---- JCG 験潮HTML パーサー ----

function parseObservations(html: string, date: Date): (number | undefined)[] {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])
  // サーバーはUTCで動作するためJST(+9h)で計算
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = jst.getUTCFullYear()
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(jst.getUTCDate()).padStart(2, '0')

  const pattern = new RegExp(
    `${yyyy}\\s+${mm}\\s+${dd}\\s+(\\d{2})\\s+\\d{2}\\s+(\\d+)`,
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
  const numCell = `(?:<td[^>]*>\\s*(\\d+)\\s*<\\/td>\\s*){1,25}`
  const rowPattern = new RegExp(`${dateCell}\\s*(${numCell})`, 's')

  const rowMatch = rowPattern.exec(html)
  if (!rowMatch) return new Array(24).fill(undefined)

  const values: number[] = []
  const tdPattern = /<td[^>]*>\s*(\d+)\s*<\/td>/g
  let tdMatch
  while ((tdMatch = tdPattern.exec(rowMatch[1])) !== null) {
    values.push(parseInt(tdMatch[1]))
  }

  // 予測テーブルは1時〜23時（0時なし）
  const shifted: (number | undefined)[] = new Array(24).fill(undefined)
  values.slice(0, 23).forEach((v, i) => {
    shifted[i + 1] = isNaN(v) ? undefined : v
  })
  return shifted
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
      headers: { Accept: 'text/html,application/xhtml+xml' },
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

    const result = Array.from({ length: 24 }, (_, h) => {
      if (observations[h] !== undefined) return observations[h]!
      if (predictions[h] !== undefined) return predictions[h]!
      return estimateTideHeight(h, station.offsetCm)
    })

    console.log(`[JCG] ${area}(s=${station.id}/${station.name}) obs=${obsCount} pred=${predCount}`)
    return result
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * StormGlass Tide API を多日分まとめて取得。
 * 返り値: JST日付文字列 YYYY-MM-DD → 24時間配列(cm)
 */
export async function fetchStormGlassTideRange(
  lat: number,
  lng: number,
  startDateJst: string,
  endDateJst: string,
  offsetCm: number,
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
      const arr = byDate.get(dateKey) ?? Array(24).fill(offsetCm)
      arr[jstHour] = Math.round(d.sg * 100 + offsetCm)
      byDate.set(dateKey, arr)
    })
  } finally {
    clearTimeout(timeout)
  }
  return byDate
}
