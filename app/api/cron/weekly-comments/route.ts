import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { shouldMentionTyphoon, distanceToTokyoKm } from '@/lib/typhoon/mention'
import { fetchStormGlass, hoursToConditions } from '@/lib/wave/adapters/stormglass'
import { calculateScore, getStarRating } from '@/lib/wave/scoring'
import { SPOTS } from '@/data/spots'
import type { WaveCondition } from '@/lib/wave/types'

export const maxDuration = 90

// ==========================================
// 週間エリア別AIコメント生成（毎朝6時 JST）
// ==========================================

const AREAS: Record<string, { lat: number; lon: number; name: string; repSpotId: string }> = {
  shonan:       { lat: 35.317, lon: 139.474, name: '湘南', repSpotId: 'kugenuma' },
  'chiba-north': { lat: 35.336, lon: 140.395, name: '千葉北', repSpotId: 'ichinomiya' },
  'chiba-south': { lat: 35.065, lon: 140.000, name: '千葉南', repSpotId: 'kamogawa' },
  ibaraki:      { lat: 36.305, lon: 140.578, name: '茨城', repSpotId: 'oarai' },
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
  date: string
  waveHeightMax: number
  waveHeightMean: number
  wavePeriodMean: number
  waveDirectionMean: number
  windSpeedMax: number
  windDirectionMean: number
  swellHeightMean: number
  swellPeriodMean: number
  swellDirectionMean: number
  windSpeedMorning: number
  windDirMorning: number
  windSpeedNoon: number
  windDirNoon: number
  windSpeedEvening: number
  windDirEvening: number
  waveHeightMorning: number
  waveHeightNoon: number
  waveHeightEvening: number
}

// --- StormGlassベースの週間スコア+サマリ計算 ---

function toJstDateStr(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

interface WeeklyDayScore {
  bestStars: number
  isCloseout: boolean
}

interface WeeklyAreaResult {
  scores: Record<string, WeeklyDayScore>
  summaries: DailyWaveSummary[]
}

async function computeWeeklyData(
  areaKey: string,
  areaCoord: { lat: number; lon: number; repSpotId: string },
): Promise<WeeklyAreaResult> {
  const empty: WeeklyAreaResult = { scores: {}, summaries: [] }
  const spot = SPOTS.find(s => s.id === areaCoord.repSpotId)
  if (!spot) return empty

  const now = new Date()
  const start = new Date(`${toJstDateStr(now)}T00:00:00+09:00`)
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + 7)

  let hours: Awaited<ReturnType<typeof fetchStormGlass>>
  try {
    hours = await fetchStormGlass(areaCoord.lat, areaCoord.lon, start, endDate)
    console.log(`[weekly-comments] StormGlass ${areaKey}: ${hours.length} hours`)
  } catch (err) {
    console.error(`[weekly-comments] StormGlass fetch failed for ${areaKey}:`, err)
    return empty
  }

  // WaveConditionに変換
  const conditions = hoursToConditions(spot.id, hours)

  // 日付ごとにグループ化
  const byDate = new Map<string, WaveCondition[]>()
  for (const c of conditions) {
    const jst = new Date(new Date(c.timestamp).getTime() + 9 * 60 * 60 * 1000)
    const dateKey = jst.toISOString().split('T')[0]
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(c)
  }

  const scores: Record<string, WeeklyDayScore> = {}
  const summaries: DailyWaveSummary[] = []

  for (const [dateStr, dayConds] of byDate) {
    const findAtHour = (h: number) => dayConds.find(c => {
      const jstH = (new Date(c.timestamp).getUTCHours() + 9) % 24
      return jstH === h
    })
    const mornCond = findAtHour(6)
    const noonCond = findAtHour(12)
    const eveCond = findAtHour(16)
    const dayMaxWind = Math.max(...dayConds.map(c => c.windSpeed ?? 0))

    // --- スコア計算（時間帯別の実風速で評価） ---
    {
      const slotStars: number[] = []
      let closeoutCount = 0
      let slotCount = 0
      for (const cond of [mornCond, noonCond, eveCond]) {
        if (!cond) continue
        slotCount++
        const sc = calculateScore(cond, spot)
        const isCo = sc.reasonTags.includes('クローズアウト') || sc.reasonTags.includes('暴風（サーフィン不可）')
        if (isCo) { closeoutCount++ } else { slotStars.push(getStarRating(sc.score, false)) }
      }
      const allCloseout = slotCount > 0 && closeoutCount === slotCount
      scores[dateStr] = {
        bestStars: allCloseout || slotStars.length === 0 ? 1 : Math.max(...slotStars),
        isCloseout: allCloseout,
      }
    }

    // --- コメント用サマリ（同一StormGlassデータから生成） ---
    const avg = (accessor: (c: WaveCondition) => number) =>
      dayConds.reduce((s, c) => s + accessor(c), 0) / dayConds.length
    const max = (accessor: (c: WaveCondition) => number) =>
      Math.max(...dayConds.map(accessor))

    summaries.push({
      date: dateStr,
      waveHeightMax: Math.round(max(c => c.waveHeight) * 10) / 10,
      waveHeightMean: Math.round(avg(c => c.waveHeight) * 10) / 10,
      wavePeriodMean: Math.round(avg(c => c.wavePeriod) * 10) / 10,
      waveDirectionMean: Math.round(avg(c => c.swellDir)),
      windSpeedMax: Math.round(dayMaxWind * 10) / 10,
      windDirectionMean: Math.round(avg(c => c.windDir)),
      swellHeightMean: Math.round(avg(c => c.swellWaveHeight ?? c.waveHeight) * 10) / 10,
      swellPeriodMean: Math.round(avg(c => c.wavePeriod) * 10) / 10,
      swellDirectionMean: Math.round(avg(c => c.swellDir)),
      windSpeedMorning: Math.round((mornCond?.windSpeed ?? 0) * 10) / 10,
      windDirMorning: Math.round(mornCond?.windDir ?? 0),
      windSpeedNoon: Math.round((noonCond?.windSpeed ?? 0) * 10) / 10,
      windDirNoon: Math.round(noonCond?.windDir ?? 0),
      windSpeedEvening: Math.round((eveCond?.windSpeed ?? 0) * 10) / 10,
      windDirEvening: Math.round(eveCond?.windDir ?? 0),
      waveHeightMorning: Math.round((mornCond?.waveHeight ?? 0) * 10) / 10,
      waveHeightNoon: Math.round((noonCond?.waveHeight ?? 0) * 10) / 10,
      waveHeightEvening: Math.round((eveCond?.waveHeight ?? 0) * 10) / 10,
    })
  }

  return { scores, summaries }
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
  areaScores: Record<string, Record<string, WeeklyDayScore>>,
  chartImages: string[],
  activeTyphoons: TyphoonDoc[],
): Promise<{ data: Record<string, Record<string, string>> } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[weekly-comments] ANTHROPIC_API_KEY not set')
    return { error: 'ANTHROPIC_API_KEY not set' }
  }

  const summarizeArea = (areaKey: string, name: string, days: DailyWaveSummary[]) => {
    const scores = areaScores[areaKey] ?? {}
    return `${name}:\n` + days.map(d => {
      const s = scores[d.date]
      const scoreTag = s ? (s.isCloseout ? ' 【終日クローズアウト・★1】' : ` ★${s.bestStars}`) : ''
      return `  ${d.date}${scoreTag}: 朝6時[波高${d.waveHeightMorning}m 風${d.windSpeedMorning}m/s/${d.windDirMorning}°] 昼12時[波高${d.waveHeightNoon}m 風${d.windSpeedNoon}m/s/${d.windDirNoon}°] 夕方16時[波高${d.waveHeightEvening}m 風${d.windSpeedEvening}m/s/${d.windDirEvening}°] 日最大風速${d.windSpeedMax}m/s 周期${d.wavePeriodMean}s うねり${d.swellHeightMean}m/${d.swellPeriodMean}s/${d.swellDirectionMean}°`
    }).join('\n')
  }

  const dataText = Object.entries(areaData)
    .map(([key, days]) => summarizeArea(key, AREAS[key].name, days))
    .join('\n\n')

  // 台風コンテキストの構築（距離3000km以内 かつ 970hPa以下 の台風のみ）
  const mentionableTyphoons = activeTyphoons.filter(t =>
    shouldMentionTyphoon({ position: t.position, pressure: t.pressure })
  )
  let typhoonContext = ''
  if (mentionableTyphoons.length > 0) {
    const SWELL_KM = 1700
    const SWELL_BUFFER_DAYS = 1.5
    const typhoonBlocks = mentionableTyphoons.map(t => {
      const distance = distanceToTokyoKm({ position: t.position, pressure: t.pressure })
      const isArrived = distance <= SWELL_KM

      // forecastPathからうねり到達・終了日を計算
      let arrivalDate: string | null = null
      let departureDate: string | null = null
      const TOKYO = { lat: 35.7, lon: 139.7 }
      for (const f of (t.forecastPath ?? [])) {
        const fDist = Math.sqrt((f.lat - TOKYO.lat) ** 2 + (f.lon - TOKYO.lon) ** 2) * 111 // 簡易距離
        const fDistKm = fDist // 粗い近似
        // haversine再計算は不要（精度はforecastPath用途で十分）
        const realDist = distanceToTokyoKm({ position: { lat: f.lat, lon: f.lon }, pressure: 0 })
        if (realDist <= SWELL_KM && !arrivalDate) {
          const d = new Date(f.time)
          arrivalDate = `${d.getMonth() + 1}月${d.getDate()}日`
        }
        if (realDist <= SWELL_KM) {
          const buf = new Date(new Date(f.time).getTime() + SWELL_BUFFER_DAYS * 24 * 60 * 60 * 1000)
          departureDate = `${buf.getMonth() + 1}月${buf.getDate()}日`
        }
      }
      if (isArrived && !arrivalDate) {
        const now = new Date()
        arrivalDate = `${now.getMonth() + 1}月${now.getDate()}日`
      }

      return `- 台風${t.number}号${t.nameKana ? `（${t.nameKana}）` : ''}
  日本からの距離：約${Math.round(distance)}km
  中心気圧：${t.pressure}hPa / 最大風速：${t.windSpeed}m/s
  うねり到達予測：${arrivalDate ?? '未達'}
  うねり終了予測：${departureDate ?? '未定'}
  現在うねり到達中：${isArrived ? 'はい' : 'いいえ'}

  ★重要：${arrivalDate ? `${arrivalDate}以降のコメントには必ず「台風${t.number}号のうねりが届き始める」旨を含めてください。` : 'うねりが届く見込みがない場合は台風に言及しないでください。'}
  ${departureDate ? `${departureDate}頃までうねりが継続する見込みです。該当する日にちのコメントに必ず反映してください。` : ''}`
    }).join('\n\n')

    typhoonContext = `
【現在発生中の台風（うねりへの影響あり）】
${typhoonBlocks}

安全に関わる情報（危険・海に近づかないでください等）は最優先で明記してください。
台風うねりが届く日のコメントには必ず台風情報を含めてください。これは絶対に守ること。
`
  }

  const prompt = `あなたはサーフィン波予報の専門家です。
気象予報士の視点で、天気図と波浪数値データを読み取り、
サーファーにとって実用的な波への影響コメントを生成します。

【コメント生成のルール】
- 80〜100文字程度で記述する
- 低気圧・高気圧・前線の動きとうねり・風波への具体的な影響を書く
- 「何時頃が狙い目か」または「どの条件のサーファーに向くか」を必ず含める
- 風速・波高は「朝6時」「昼12時」「夕方16時」の時間帯別データを使うこと（「日最大風速」は安全警告の判断にのみ使用し、コメント本文の風速は朝6時・昼12時・夕方16時の値を使う）
- 波高・周期・風速などの具体的な数値を1つ以上含める
- サーファー目線の実用的な表現を使う
  例：「朝イチ狙い目」「オンショアで面荒れ」「グランドスウェル期待」
  「ショートボーダー向き」「ロングボード日和」など
- 気象用語は使わず、サーフィン文化に沿った表現にする
- 台風情報がある場合は必ずコメントに反映する
- 安全に関わる情報（危険・海に近づかないでください）は最優先で明記する
- 「入水」という言葉は絶対に使わないこと。代わりに「海に入る」「サーフィンする」「パドルアウト」「海に近づかないでください」「サーフィンは控えて」などの自然な表現を使う
- 【終日クローズアウト・★1】と表示されている日は、必ず「海に近づかないでください」「サーフィンは絶対に控えてください」等の警告を含めること。「上級者向け」「チャレンジング」等の肯定的な表現は使わないこと

【数値データ】
${dataText}
${typhoonContext}

以下のJSON形式で出力してください。他の文字（マークダウンコードブロック含む）は一切含めないこと。dateキーは上記データのYYYY-MM-DD形式と完全一致させること：
{
  "shonan":       { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 },
  "chiba-north":  { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 },
  "chiba-south":  { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 },
  "ibaraki":      { "YYYY-MM-DD": "コメント（80〜100文字）", ... 7日分 }
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
        max_tokens: 4096,
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
      return { error: `Claude API ${res.status}: ${errText.slice(0, 200)}` }
    }
    const result = await res.json()
    const text = result?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[weekly-comments] No JSON in response:', text.slice(0, 200))
      return { error: `No JSON in response: ${text.slice(0, 200)}` }
    }
    return { data: JSON.parse(jsonMatch[0]) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[weekly-comments] Claude generation failed:', msg)
    return { error: `Generation failed: ${msg}` }
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

    // 3エリア分をStormGlassから一括取得（スコア+コメント用データを同一ソースから生成）
    const areaData: Record<string, DailyWaveSummary[]> = {}
    const areaScores: Record<string, Record<string, WeeklyDayScore>> = {}

    await Promise.all(
      Object.entries(AREAS).map(async ([key, coord]) => {
        const { scores, summaries } = await computeWeeklyData(key, coord)
        areaScores[key] = scores
        areaData[key] = summaries
        console.log(`[weekly-comments] ${coord.name}: ${summaries.length} days, ${Object.keys(scores).length} scores (StormGlass)`)
      })
    )

    // Claudeでコメント生成（StormGlassデータベース）
    const result = await generateWeeklyComments(areaData, areaScores, validCharts, activeTyphoons)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    const comments = result.data
    const generatedAt = new Date().toISOString()
    let savedCount = 0
    for (const [area, days] of Object.entries(comments)) {
      if (!AREAS[area]) continue
      await setDoc(doc(db, 'weeklyComments', area), {
        days,
        stars: areaScores[area] ?? {},
        generatedAt,
      })
      savedCount++
      console.log(`[weekly-comments] Saved weeklyComments/${area} (${Object.keys(days).length} days, ${Object.keys(areaScores[area] ?? {}).length} scores)`)
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
