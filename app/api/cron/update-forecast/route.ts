import { NextRequest, NextResponse } from 'next/server'
import { getConditions } from '@/lib/wave/waveService'
import { SPOTS } from '@/data/spots'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import type { WaveCondition } from '@/lib/wave/types'
import { COMMENT_SCHEDULES, padHour, type CommentTarget } from '@/lib/commentSchedules'

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

    for (const spot of activeSpots) {
      try {
        // StormGlass APIからデータ取得
        const conditions = await getConditions(spot.id, today)

        // Firestoreにキャッシュ保存
        // ドキュメントID: {spotId}_{YYYY-MM-DD}
        const cacheKey = `${spot.id}_${dateStr}`
        const cacheRef = doc(db, 'forecastCache', cacheKey)
        await setDoc(cacheRef, {
          spotId: spot.id,
          date: dateStr,
          conditions: conditions.map(conditionToPlain),
          updatedAt: new Date().toISOString(),
          source: 'cron',
        })

        results.push({ spotId: spot.id, status: 'ok', hours: conditions.length })
        console.log(`[Cron] ${spot.id}: ${conditions.length} hours cached`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ spotId: spot.id, status: `error: ${msg}` })
        console.error(`[Cron] ${spot.id} error:`, msg)
      }
    }

    // 明日分も取得
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toJstDateStr(tomorrow)

    for (const spot of activeSpots) {
      try {
        const conditions = await getConditions(spot.id, tomorrow)
        const cacheKey = `${spot.id}_${tomorrowStr}`
        const cacheRef = doc(db, 'forecastCache', cacheKey)
        await setDoc(cacheRef, {
          spotId: spot.id,
          date: tomorrowStr,
          conditions: conditions.map(conditionToPlain),
          updatedAt: new Date().toISOString(),
          source: 'cron',
        })
        results.push({ spotId: spot.id + '_tomorrow', status: 'ok', hours: conditions.length })
        console.log(`[Cron] ${spot.id} (tomorrow): ${conditions.length} hours cached`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ spotId: spot.id + '_tomorrow', status: `error: ${msg}` })
        console.error(`[Cron] ${spot.id} (tomorrow) error:`, msg)
      }
    }

    // 日次AIコメント生成
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const commentResults: { target: string; hour: number; status: string }[] = []
    const baseUrl = request.url.replace(/\/api\/cron\/update-forecast.*$/, '')

    for (const target of ['today', 'tomorrow'] as CommentTarget[]) {
      if ((COMMENT_SCHEDULES[target] as readonly number[]).includes(jstHour)) {
        try {
          const url = `${baseUrl}/api/daily-comment?target=${target}&hour=${padHour(jstHour)}`
          console.log(`[Cron] Generating ${target} comment for ${jstHour}h...`)
          const res = await fetch(url)
          const data = await res.json()
          commentResults.push({ target, hour: jstHour, status: data.comment ? 'ok' : `error: ${data.error}` })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          commentResults.push({ target, hour: jstHour, status: `error: ${msg}` })
        }
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
