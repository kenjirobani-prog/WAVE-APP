import { NextRequest, NextResponse } from 'next/server'
import { getConditions, getForecast } from '@/lib/wave/waveService'
import { detectTideEvents } from '@/lib/wave/types'
import { calcWaveEnergy, predictBreakType, getSwellRatio } from '@/lib/wave/scoring'
import { SPOTS } from '@/data/spots'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { WaveCondition } from '@/lib/wave/types'

export const maxDuration = 30

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

function plainToCondition(p: ReturnType<typeof conditionToPlain>): WaveCondition {
  return {
    ...p,
    timestamp: new Date(p.timestamp),
  } as WaveCondition
}

// Firestoreキャッシュからデータを取得（あればconditions配列を返す、なければnull）
async function getCachedConditions(spotId: string, dateStr: string): Promise<WaveCondition[] | null> {
  try {
    await ensureAnonymousAuth()
    const db = getDb()
    const cacheKey = `${spotId}_${dateStr}`
    const cacheRef = doc(db, 'forecastCache', cacheKey)
    const snap = await getDoc(cacheRef)
    if (snap.exists()) {
      const data = snap.data()
      const conditions = (data.conditions ?? []).map(plainToCondition)
      console.log(`[Forecast] Cache HIT: ${cacheKey} (${conditions.length} hours, updated: ${data.updatedAt})`)
      return conditions
    }
  } catch (err) {
    console.error('[Forecast] Cache read error:', err instanceof Error ? err.message : err)
  }
  return null
}

// Firestoreにキャッシュを保存
async function saveCacheConditions(spotId: string, dateStr: string, conditions: WaveCondition[]): Promise<void> {
  try {
    await ensureAnonymousAuth()
    const db = getDb()
    const cacheKey = `${spotId}_${dateStr}`
    const cacheRef = doc(db, 'forecastCache', cacheKey)
    await setDoc(cacheRef, {
      spotId,
      date: dateStr,
      conditions: conditions.map(conditionToPlain),
      updatedAt: new Date().toISOString(),
      source: 'api-fallback',
    })
    console.log(`[Forecast] Cache SAVE: ${cacheKey}`)
  } catch (err) {
    console.error('[Forecast] Cache write error:', err instanceof Error ? err.message : err)
  }
}

function addMetadata(conditions: WaveCondition[], spotId: string) {
  const spot = SPOTS.find(s => s.id === spotId)
  const bp = spot?.bathymetryProfile
  const tideByHour = Array.from({ length: 24 }, (_, h) => {
    const c = conditions.find(c => (new Date(c.timestamp).getUTCHours() + 9) % 24 === h)
    return c?.tideHeight ?? 0
  })
  const tideEvents = detectTideEvents(tideByHour)
  const conditionsWithMeta = conditions.map(c => {
    const swellRatio = getSwellRatio(c.swellWaveHeight, c.waveHeight)
    const breakInfo = bp && spot
      ? predictBreakType(
          bp.type, c.tideHeight, c.waveHeight, swellRatio, bp.closeoutRisk,
          c.swellDir, spot.bestSwellDir, c.windDir, c.swellWaveHeight, c.windWaveHeight,
        )
      : null
    return {
      ...c,
      waveEnergy: Math.round(calcWaveEnergy(c.waveHeight, c.wavePeriod) * 10) / 10,
      breakType: breakInfo?.type ?? 'spilling',
      breakTypeLabel: breakInfo?.labelJa ?? 'スピリング',
      breakTypeDifficulty: breakInfo?.difficulty ?? 'beginner',
      breakTypeDescription: breakInfo?.description ?? '',
    }
  })
  return { conditionsWithMeta, tideEvents }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const spotId = searchParams.get('spotId')
  const type = searchParams.get('type') ?? 'daily'
  const days = parseInt(searchParams.get('days') ?? '3', 10)
  const dateParam = searchParams.get('date')

  if (!spotId) {
    return NextResponse.json({ error: 'spotId is required' }, { status: 400 })
  }

  try {
    if (type === 'forecast') {
      const conditions = await getForecast(spotId, days)
      return NextResponse.json({ conditions })
    }

    // daily: 指定日または今日
    let date: Date
    if (dateParam) {
      date = new Date(`${dateParam}T12:00:00+09:00`)
    } else {
      date = new Date()
    }
    const dateStr = dateParam ?? toJstDateStr(date)

    // 1. Firestoreキャッシュを確認
    const cached = await getCachedConditions(spotId, dateStr)
    if (cached && cached.length > 0) {
      const { conditionsWithMeta, tideEvents } = addMetadata(cached, spotId)
      return NextResponse.json({ conditions: conditionsWithMeta, tideEvents })
    }

    // 2. キャッシュなし → StormGlass APIから取得
    console.log(`[Forecast] Cache MISS: ${spotId}_${dateStr}, fetching from API...`)
    const conditions = await getConditions(spotId, date)

    // 3. Firestoreにキャッシュ保存（非同期、レスポンスはブロックしない）
    saveCacheConditions(spotId, dateStr, conditions)

    const { conditionsWithMeta, tideEvents } = addMetadata(conditions, spotId)
    return NextResponse.json({ conditions: conditionsWithMeta, tideEvents })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Forecast API error:', message, error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast data', detail: message },
      { status: 500 }
    )
  }
}
