import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

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

// Claude API でコメント生成（Vision対応）
async function generateWeeklyComments(
  areaData: Record<string, DailyWaveSummary[]>,
  chartImages: string[],
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

  const prompt = `あなたはサーフィン波予報の専門家です。天気図と波浪データをもとに、各エリアの今後7日間の波への影響コメントを生成してください。

【重要な観点】
- 低気圧・高気圧の動き → うねり・風波への影響
- 前線の通過タイミング → コンディション変化のタイミング
- 各日の「狙い目の時間帯」や「注意点」を含める
- サーファー目線で実用的な情報を提供する

【数値データ】
${dataText}

以下のJSON形式で出力してください。他の文字（マークダウンコードブロック含む）は一切含めないこと。dateキーは上記データのYYYY-MM-DD形式と完全一致させること：
{
  "shonan":  { "YYYY-MM-DD": "コメント（60文字以内）", ... 7日分 },
  "chiba":   { "YYYY-MM-DD": "コメント（60文字以内）", ... 7日分 },
  "ibaraki": { "YYYY-MM-DD": "コメント（60文字以内）", ... 7日分 }
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
    const comments = await generateWeeklyComments(areaData, validCharts)
    if (!comments) {
      return NextResponse.json({ error: 'Comment generation failed' }, { status: 500 })
    }

    // Firestoreに保存: weeklyComments/{area} に 7日分をmapで保存
    await ensureAnonymousAuth()
    const db = getDb()
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
