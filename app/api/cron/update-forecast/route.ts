import { NextRequest, NextResponse } from 'next/server'
import { getForecast } from '@/lib/wave/waveService'
import { SPOTS } from '@/data/spots'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import type { WaveCondition } from '@/lib/wave/types'
import { COMMENT_SCHEDULES, padHour, type CommentTarget } from '@/lib/commentSchedules'

// StormGlassリクエスト削減:
// - 7日分まとめ取得（getForecast 1回）でtoday/tomorrow/weeklyを全てカバー
// - spotあたり 4→2 SGリクエスト（weather 1 + tide 1）
// - cron 6回/日 × 20 spots × 2 = 240 req/日（上限500の48%）

export const maxDuration = 60

function toJstDateStr(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

function conditionToPlain(c: WaveCondition) {
  return {
    spotId: c.spotId,
    timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp,
    waveHeight: c.waveHeight,
    wavePeriod: c.wavePeriod,
    swellDir: c.swellDir,
    windSpeed: c.windSpeed,
    windDir: c.windDir,
    tideHeight: c.tideHeight,
    tideTrend: c.tideTrend,
    weather: c.weather,
    temperature: c.temperature,
    uvIndex: c.uvIndex,
    swellWaveHeight: c.swellWaveHeight,
    windWaveHeight: c.windWaveHeight,
    windWaveDirection: c.windWaveDirection,
  }
}

export async function GET(request: NextRequest) {
  // Vercel Cron認証: CRON_SECRETが設定されていれば検証
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const today = new Date()
  const dateStr = toJstDateStr(today)
  const { searchParams } = new URL(request.url)
  const area = searchParams.get('area') ?? 'shonan'
  const activeSpots = SPOTS.filter(s => s.isActive && s.area === area)
  const results: { spotId: string; status: string; hours?: number }[] = []

  try {
    // Firestore匿名認証
    await ensureAnonymousAuth()
    const db = getDb()

    // 7日分まとめ取得 → 日付ごとに分割してFirestoreへ保存
    for (const spot of activeSpots) {
      try {
        const all = await getForecast(spot.id, 7)

        // 日付ごとにグループ化（JST基準）
        const byDate = new Map<string, WaveCondition[]>()
        for (const c of all) {
          const d = toJstDateStr(c.timestamp instanceof Date ? c.timestamp : new Date(c.timestamp))
          if (!byDate.has(d)) byDate.set(d, [])
          byDate.get(d)!.push(c)
        }

        const nowIso = new Date().toISOString()
        for (const [d, conditions] of byDate) {
          const cacheRef = doc(db, 'forecastCache', `${spot.id}_${d}`)
          await setDoc(cacheRef, {
            spotId: spot.id,
            date: d,
            conditions: conditions.map(conditionToPlain),
            updatedAt: nowIso,
            source: 'cron',
          })
        }

        results.push({ spotId: spot.id, status: 'ok', hours: all.length })
        console.log(`[Cron] ${spot.id}: ${all.length} hours cached across ${byDate.size} days`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ spotId: spot.id, status: `error: ${msg}` })
        console.error(`[Cron] ${spot.id} error:`, msg)
      }
    }

    // 日次AIコメント生成（forecastCache更新直後に常に実行）
    // 各エリアは自分のエリアのコメントのみ生成（他エリアの未更新データを参照しない）
    const AREA_LABELS: Record<string, string> = {
      shonan: '湘南', 'chiba-north': '千葉北', 'chiba-south': '千葉南', ibaraki: '茨城',
    }
    const areaLabel = AREA_LABELS[area] ?? '湘南'
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const commentResults: { target: string; hour: number; status: string }[] = []
    const baseUrl = request.url.replace(/\/api\/cron\/update-forecast.*$/, '')

    for (const target of ['today', 'tomorrow'] as CommentTarget[]) {
      const scheduleHours = COMMENT_SCHEDULES[target] as readonly number[]
      const latestHour = scheduleHours.filter(h => h <= jstHour).pop() ?? scheduleHours[0]
      try {
        const url = `${baseUrl}/api/daily-comment?target=${target}&hour=${padHour(latestHour)}&areaLabel=${encodeURIComponent(areaLabel)}&force=1`
        console.log(`[Cron] Generating ${target}/${areaLabel} comment for schedule ${latestHour}h...`)
        const res = await fetch(url)
        const data = await res.json()
        commentResults.push({ target, hour: latestHour, status: data.comment ? 'ok' : `error: ${data.error}` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        commentResults.push({ target, hour: latestHour, status: `error: ${msg}` })
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[Cron] Complete in ${elapsed}ms`)
    return NextResponse.json({ ok: true, date: dateStr, elapsed: `${elapsed}ms`, results, commentResults })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Cron] Fatal error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
