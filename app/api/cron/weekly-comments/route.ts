import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'

export const maxDuration = 90

// ==========================================
// 週間エリア別AIコメント生成（毎朝6時 JST）
// ==========================================

const AREAS: Record<string, { lat: number; lon: number; name: string }> = {
  shonan:  { lat: 35.33, lon: 139.45, name: '湘南' },
  chiba:   { lat: 35.50, lon: 140.43, name: '千葉' },
  ibaraki: { lat: 36.31, lon: 140.58, name: '茨城' },
}

// 気象庁 予想天気図PNG
const WEATHER_CHART_URLS = [
  'https://www.jma.go.jp/bosai/weather_map/data/surf/latest_24.png',
  'https://www.jma.go.jp/bosai/weather_map/data/surf/latest_48.png',
]

// 画像URL → base64 に変換
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaveForecast/1.0)' } })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  } catch {
    return null
  }
}

interface DailyWaveSummary {
  date: string       // YYYY-MM-DD (JST)
  waveHeightMax: number
  waveHeightMean: number
  wavePeriodMean: number
  waveDirectionMean: number
  windSpeedMax: number
  windDirectionMean: number
  swellHeightMean: number
  swellPeriodMean: number
  swellDirectionMean: number
}

// Open-Meteo Marine + Forecast API から 7日分のサーフィン関連データを取得
async function fetchWeeklySurfData(lat: number, lon: number): Promise<DailyWaveSummary[]> {
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction&forecast_days=7&timezone=Asia/Tokyo`
  const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m&forecast_days=7&timezone=Asia/Tokyo`

  const [marineRes, windRes] = await Promise.all([fetch(marineUrl), fetch(windUrl)])
  if (!marineRes.ok || !windRes.ok) return []
  const marine = await marineRes.json()
  const wind = await windRes.json()

  const times: string[] = marine?.hourly?.time ?? []
  if (times.length === 0) return []

  const wh: number[] = marine.hourly.wave_height ?? []
  const wp: number[] = marine.hourly.wave_period ?? []
  const wd: number[] = marine.hourly.wave_direction ?? []
  const sh: number[] = marine.hourly.swell_wave_height ?? []
  const sp: number[] = marine.hourly.swell_wave_period ?? []
  const sd: number[] = marine.hourly.swell_wave_direction ?? []
  const ws: number[] = wind.hourly.wind_speed_10m ?? []
  const wdr: number[] = wind.hourly.wind_direction_10m ?? []

  // 日付ごとにグルーピング
  const groups = new Map<string, number[]>()
  times.forEach((t, i) => {
    const date = t.slice(0, 10)
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(i)
  })

  const avg = (arr: number[], idx: number[]) => idx.reduce((s, i) => s + (arr[i] ?? 0), 0) / idx.length
  const max = (arr: number[], idx: number[]) => Math.max(...idx.map(i => arr[i] ?? 0))

  const summaries: DailyWaveSummary[] = []
  for (const [date, idx] of groups) {
    summaries.push({
      date,
      waveHeightMax: Math.round(max(wh, idx) * 10) / 10,
      waveHeightMean: Math.round(avg(wh, idx) * 10) / 10,
      wavePeriodMean: Math.round(avg(wp, idx) * 10) / 10,
      waveDirectionMean: Math.round(avg(wd, idx)),
      windSpeedMax: Math.round(max(ws, idx) * 10) / 10,
      windDirectionMean: Math.round(avg(wdr, idx)),
      swellHeightMean: Math.round(avg(sh, idx) * 10) / 10,
      swellPeriodMean: Math.round(avg(sp, idx) * 10) / 10,
      swellDirectionMean: Math.round(avg(sd, idx)),
    })
  }
  return summaries.slice(0, 7)
}

// 台風データ型
interface TyphoonDoc {
  id: string
  name: string
  nameKana?: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  forecastPath?: Array<{ lat: number; lon: number; time: string; pressure: number; windSpeed: number }>
}

// 東京を基準に台風までの距離（km）を計算
const TOKYO = { lat: 35.6895, lon: 139.6917 }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function typhoonStageLabel(distanceKm: number): string {
  if (distanceKm < 500) return '非常に近い（500km以内）'
  if (distanceKm < 1500) return '近い（500〜1,500km）'
  if (distanceKm < 3000) return 'うねりが届き始める（1,500〜3,000km）'
  return '遠い（3,000km超）'
}

// Firestoreからアクティブな台風を取得
async function fetchActiveTyphoons(db: import('firebase/firestore').Firestore): Promise<TyphoonDoc[]> {
  try {
    const year = String(new Date().getFullYear())
    const ref = collection(db, 'typhoons', year, 'list')
    const q = query(ref, where('isActive', '==', true))
    const snap = await getDocs(q)
    const results: TyphoonDoc[] = []
    snap.forEach(d => {
      const data = d.data()
      results.push({
        id: d.id,
        name: data.name ?? '',
        nameKana: data.nameKana,
        number: data.number ?? 0,
        position: data.position ?? { lat: 0, lon: 0 },
        pressure: data.pressure ?? 0,
        windSpeed: data.windSpeed ?? 0,
        forecastPath: data.forecastPath,
      })
    })
    return results
  } catch (err) {
    console.warn('[weekly-comments] fetchActiveTyphoons failed:', err)
    return []
  }
}

// Claude API でコメント生成（Vision対応）
async function generateWeeklyComments(
  areaData: Record<string, DailyWaveSummary[]>,
  chartImages: string[],
  activeTyphoons: TyphoonDoc[],
): Promise<Record<string, Record<string, string>> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[weekly-comments] ANTHROPIC_API_KEY not set')
    return null
  }

  const summarizeArea = (name: string, days: DailyWaveSummary[]) => {
    return `${name}:\n` + days.map(d =>
      `  ${d.date}: 波高${d.waveHeightMean}m(最大${d.waveHeightMax}m) 周期${d.wavePeriodMean}s 波向${d.waveDirectionMean}° うねり${d.swellHeightMean}m/${d.swellPeriodMean}s/${d.swellDirectionMean}° 風${d.windSpeedMax}m/s/${d.windDirectionMean}°`
    ).join('\n')
  }

  const dataText = Object.entries(areaData)
    .map(([key, days]) => summarizeArea(AREAS[key].name, days))
    .join('\n\n')

  // 台風コンテキストの構築
  let typhoonContext = ''
  if (activeTyphoons.length > 0) {
    const typhoonBlocks = activeTyphoons.map(t => {
      const distance = haversineKm(t.position.lat, t.position.lon, TOKYO.lat, TOKYO.lon)
      const stage = typhoonStageLabel(distance)
      const forecastSummary = (t.forecastPath ?? []).slice(0, 5).map(p =>
        `${p.time.slice(0, 16)}: (${p.lat.toFixed(1)}, ${p.lon.toFixed(1)}) ${p.pressure}hPa`
      ).join(', ')
      return `- 台風${t.number}号${t.nameKana ? `（${t.nameKana}）` : ''}
  現在位置：北緯${t.position.lat}°・東経${t.position.lon}°
  中心気圧：${t.pressure}hPa / 最大風速：${t.windSpeed}m/s
  東京からの距離：約${Math.round(distance / 100) * 100}km（${stage}）
  進路予報：${forecastSummary || 'なし'}`
    }).join('\n\n')

    typhoonContext = `
【現在発生中の台風】
${typhoonBlocks}

台風によるうねりの影響を各日のコメントに必ず反映すること。
距離段階に応じて以下の表現例を参考に書き分けること：

・遠い（3,000km超）:
  「台風○号のうねりが届き始める可能性あり」
  「台風からのうねりに期待。周期が長くなる兆候あり」
・うねりが届き始める（1,500〜3,000km）:
  「台風うねりが到達。周期12〜14秒のグランドスウェル期待」
  「台風うねりでサイズアップ。朝イチが狙い目」
・近い（500〜1,500km）:
  「台風接近によりサイズが急激にアップ。上級者以外は注意」
  「強烈なクローズアウト気味。無理な入水は避けること」
・非常に近い（500km以内）:
  「台風が非常に近く危険。絶対に海に近づかないこと」
  「暴風・高波・離岸流の危険あり。入水厳禁」

安全に関わる情報（入水厳禁・危険）は最優先で明記すること。
`
  }

  const prompt = `あなたはサーフィン波予報の専門家です。
気象予報士の視点で、天気図と波浪数値データを読み取り、
サーファーにとって実用的な波への影響コメントを生成します。

【コメント生成のルール】
- 80〜100文字程度で記述する
- 低気圧・高気圧・前線の動きとうねり・風波への具体的な影響を書く
- 「何時頃が狙い目か」または「どの条件のサーファーに向くか」を必ず含める
- 波高・周期・風速などの具体的な数値を1つ以上含める
- サーファー目線の実用的な表現を使う
  例：「朝イチ狙い目」「オンショアで面荒れ」「グランドスウェル期待」
  「ショートボーダー向き」「ロングボード日和」など
- 気象用語は使わず、サーフィン文化に沿った表現にする
- 台風情報がある場合は必ずコメントに反映する
- 安全に関わる情報（入水禁止・危険）は最優先で明記する

【数値データ】
${dataText}
${typhoonContext}

以下のJSON形式で出力してください。他の文字（マークダウンコードブロック含む）は一切含めないこと。dateキーは上記データのYYYY-MM-DD形式と完全一致させること：
{
  "shonan":  { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 },
  "chiba":   { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 },
  "ibaraki": { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 }
}`

  const imageBlocks = chartImages.filter(Boolean).map(data => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/png' as const,
      data,
    },
  }))

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[weekly-comments] Claude API error ${res.status}: ${errText.slice(0, 300)}`)
      return null
    }
    const result = await res.json()
    const text = result?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[weekly-comments] No JSON in response')
      return null
    }
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[weekly-comments] Claude generation failed:', msg)
    return null
  }
}

export async function GET(request: NextRequest) {
  // Vercel Cron認証
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (authHeader !== `Bearer ${cronSecret}` && secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Firestore匿名認証（台風データ取得・保存の両方で必要）
    await ensureAnonymousAuth()
    const db = getDb()

    // アクティブな台風を取得
    const activeTyphoons = await fetchActiveTyphoons(db)
    console.log(`[weekly-comments] Active typhoons: ${activeTyphoons.length}`)

    // 気象庁天気図を取得（失敗してもコメント生成は続行）
    const chartImages = await Promise.all(WEATHER_CHART_URLS.map(imageToBase64))
    const validCharts = chartImages.filter((c): c is string => !!c)
    console.log(`[weekly-comments] Fetched ${validCharts.length}/2 weather charts`)

    // 3エリア分のOpen-Meteoデータを取得
    const areaData: Record<string, DailyWaveSummary[]> = {}
    for (const [key, coord] of Object.entries(AREAS)) {
      const days = await fetchWeeklySurfData(coord.lat, coord.lon)
      areaData[key] = days
      console.log(`[weekly-comments] ${coord.name}: ${days.length} days`)
    }

    // Claudeでコメント生成
    const comments = await generateWeeklyComments(areaData, validCharts, activeTyphoons)
    if (!comments) {
      return NextResponse.json({ error: 'Comment generation failed' }, { status: 500 })
    }
    const generatedAt = new Date().toISOString()
    let savedCount = 0
    for (const [area, days] of Object.entries(comments)) {
      if (!AREAS[area]) continue
      await setDoc(doc(db, 'weeklyComments', area), {
        days,
        generatedAt,
      })
      savedCount++
      console.log(`[weekly-comments] Saved weeklyComments/${area} (${Object.keys(days).length} days)`)
    }

    return NextResponse.json({
      success: true,
      areas: savedCount,
      chartImages: validCharts.length,
      generatedAt,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[weekly-comments] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
