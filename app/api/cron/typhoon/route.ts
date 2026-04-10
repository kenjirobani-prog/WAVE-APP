import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import type { TyphoonData, ForecastPoint } from '@/types/typhoon'

export const maxDuration = 30

// 日本の代表座標（東京）
const JAPAN_LAT = 35.6895
const JAPAN_LON = 139.6917
const THRESHOLD_KM = 800

// Haversine公式で2点間の距離（km）を計算
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

function isWithin800km(lat: number, lon: number, forecastPath: ForecastPoint[]): boolean {
  if (haversineKm(lat, lon, JAPAN_LAT, JAPAN_LON) <= THRESHOLD_KM) return true
  return forecastPath.some(p => haversineKm(p.lat, p.lon, JAPAN_LAT, JAPAN_LON) <= THRESHOLD_KM)
}

// 気象庁の台風データJSONからTyphoonDataを抽出
function parseTyphoons(data: any): TyphoonData[] {
  const results: TyphoonData[] = []
  try {
    // 気象庁 typhoon JSON: data は配列で各台風のデータ
    const items = Array.isArray(data) ? data : [data]
    for (const item of items) {
      // 台風情報本体の取得（気象庁JSON構造に対応）
      const typhoonInfo = item?.typhoon ?? item
      if (!typhoonInfo) continue

      const name = typhoonInfo.name ?? typhoonInfo.tcName ?? `台風${typhoonInfo.number ?? ''}号`
      const number = typhoonInfo.number ?? typhoonInfo.tcNumber ?? 0

      // 現在位置の取得
      const current = typhoonInfo.current ?? typhoonInfo.realtime ?? typhoonInfo
      const lat = current?.lat ?? current?.latitude ?? current?.position?.lat ?? null
      const lon = current?.lon ?? current?.longitude ?? current?.position?.lon ?? null
      if (lat == null || lon == null) continue

      const pressure = current?.pressure ?? current?.centralPressure ?? 0
      const windSpeed = current?.windSpeed ?? current?.maxWindSpeed ?? 0

      // 予報パスの取得
      const forecasts = typhoonInfo.forecast ?? typhoonInfo.forecastList ?? []
      const forecastPath: ForecastPoint[] = forecasts
        .map((f: any) => {
          const fLat = f?.lat ?? f?.latitude ?? f?.position?.lat
          const fLon = f?.lon ?? f?.longitude ?? f?.position?.lon
          if (fLat == null || fLon == null) return null
          return {
            lat: fLat,
            lon: fLon,
            time: f?.time ?? f?.validTime ?? new Date().toISOString(),
            pressure: f?.pressure ?? f?.centralPressure ?? 0,
            windSpeed: f?.windSpeed ?? f?.maxWindSpeed ?? 0,
          }
        })
        .filter((f: ForecastPoint | null): f is ForecastPoint => f !== null)

      const within800 = isWithin800km(lat, lon, forecastPath)

      results.push({
        name,
        number: typeof number === 'number' ? number : parseInt(String(number), 10) || 0,
        position: { lat, lon },
        pressure,
        windSpeed,
        forecastPath,
        isActive: true,
        isWithin800km: within800,
        updatedAt: new Date(),
      })
    }
  } catch (err) {
    console.error('[typhoon] parse error:', err)
  }
  return results
}

export async function GET(request: NextRequest) {
  // Vercel Cron認証
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // 気象庁 台風データ取得
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    let typhoonData: any = null
    try {
      // 気象庁の台風情報JSON（非公式API）
      const res = await fetch('https://www.jma.go.jp/bosai/typhoon/data/typhoon/all.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaveForecast/1.0)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('json')) {
          typhoonData = await res.json()
        } else {
          console.log('[typhoon] API returned non-JSON (likely no active typhoons or blocked)')
        }
      } else {
        console.log(`[typhoon] API returned ${res.status}`)
      }
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      console.log(`[typhoon] fetch error: ${msg}`)
    } finally {
      clearTimeout(timeout)
    }

    // 台風データなし → 正常終了
    if (!typhoonData) {
      console.log('[typhoon] No active typhoon data')
      return NextResponse.json({ success: true, typhoons: 0, message: 'No active typhoons' })
    }

    // パース
    const typhoons = parseTyphoons(typhoonData)
    if (typhoons.length === 0) {
      console.log('[typhoon] Parsed 0 typhoons from data')
      return NextResponse.json({ success: true, typhoons: 0, message: 'No typhoons parsed' })
    }

    // Firestoreに保存
    await ensureAnonymousAuth()
    const db = getDb()
    const year = String(new Date().getFullYear())

    for (const t of typhoons) {
      const typhoonId = `T${year.slice(2)}${String(t.number).padStart(2, '0')}` // e.g. T2604
      const docRef = doc(db, 'typhoons', year, 'list', typhoonId)
      await setDoc(docRef, {
        name: t.name,
        number: t.number,
        position: t.position,
        pressure: t.pressure,
        windSpeed: t.windSpeed,
        forecastPath: t.forecastPath,
        isActive: t.isActive,
        isWithin800km: t.isWithin800km,
        updatedAt: new Date().toISOString(),
      })
      console.log(`[typhoon] Saved ${typhoonId} (${t.name}) within800km=${t.isWithin800km}`)
    }

    return NextResponse.json({
      success: true,
      typhoons: typhoons.length,
      ids: typhoons.map(t => `T${year.slice(2)}${String(t.number).padStart(2, '0')}`),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[typhoon] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
