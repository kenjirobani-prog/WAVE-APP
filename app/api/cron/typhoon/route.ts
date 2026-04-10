import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import type { TyphoonData, ForecastPoint } from '@/types/typhoon'

export const maxDuration = 60

// 日本の代表座標（東京）
const JAPAN_LAT = 35.6895
const JAPAN_LON = 139.6917
const THRESHOLD_KM = 4000

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

function isWithinThreshold(lat: number, lon: number, forecastPath: ForecastPoint[]): boolean {
  if (haversineKm(lat, lon, JAPAN_LAT, JAPAN_LON) <= THRESHOLD_KM) return true
  return forecastPath.some(p => haversineKm(p.lat, p.lon, JAPAN_LAT, JAPAN_LON) <= THRESHOLD_KM)
}

// XMLから単純な値を正規表現で抽出（depsなしで軽量パース）
function extractAll(xml: string, pattern: RegExp): string[] {
  const matches: string[] = []
  let m: RegExpExecArray | null
  while ((m = pattern.exec(xml)) !== null) {
    matches.push(m[1])
  }
  return matches
}

function extractFirst(xml: string, pattern: RegExp): string | null {
  const m = pattern.exec(xml)
  return m ? m[1] : null
}

// "+8.1+150.6/" のような座標文字列を {lat, lon} にパース
function parseCoordinate(coord: string): { lat: number; lon: number } | null {
  // +8.1+150.6/ や -12.3+145.0/ 形式
  const m = coord.match(/([+-]?\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/)
  if (!m) return null
  return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) }
}

interface ParsedTyphoon {
  name: string
  nameKana: string
  number: number
  intensity: string
  size: string
  current: {
    lat: number
    lon: number
    pressure: number
    windSpeed: number
    maxWindGust: number
  }
  forecastPath: ForecastPoint[]
}

// 1つの MeteorologicalInfo ブロックから台風データをパース
function parseTyphoonBlock(xml: string, typhoonNumber: number, typhoonName: string, typhoonNameKana: string, intensity: string, size: string): ParsedTyphoon | null {
  // MeteorologicalInfos type="台風情報" 全体を抽出
  const sectionMatch = xml.match(/<MeteorologicalInfos type="台風情報">([\s\S]*?)<\/MeteorologicalInfos>/)
  if (!sectionMatch) return null
  const section = sectionMatch[1]

  // 各 MeteorologicalInfo ブロックを抽出
  const infoBlocks = section.match(/<MeteorologicalInfo>[\s\S]*?<\/MeteorologicalInfo>/g) ?? []

  let current: ParsedTyphoon['current'] | null = null
  const forecastPath: ForecastPoint[] = []

  for (const block of infoBlocks) {
    const dtTypeMatch = block.match(/<DateTime type="([^"]+)">([^<]+)</)
    if (!dtTypeMatch) continue
    const dtType = dtTypeMatch[1]
    const dtValue = dtTypeMatch[2]

    // 中心位置（度）を抽出
    // 実況ブロック: <jmx_eb:Coordinate type="中心位置（度）">
    // 予報ブロック: <jmx_eb:BasePoint type="中心位置（度）"> （ProbabilityCircle 内）
    let coord: { lat: number; lon: number } | null = null
    const coordMatch = block.match(/<jmx_eb:Coordinate[^>]*type="中心位置（度）">([^<]+)</)
    if (coordMatch) {
      coord = parseCoordinate(coordMatch[1])
    } else {
      const basePointMatch = block.match(/<jmx_eb:BasePoint[^>]*type="中心位置（度）">([^<]+)</)
      if (basePointMatch) {
        coord = parseCoordinate(basePointMatch[1])
      }
    }
    if (!coord) continue

    // 中心気圧
    const pressureMatch = block.match(/<jmx_eb:Pressure[^>]*type="中心気圧"[^>]*>(\d+)</)
    const pressure = pressureMatch ? parseInt(pressureMatch[1], 10) : 0

    // 最大風速（m/s）
    const windSpeedMatch = block.match(/<jmx_eb:WindSpeed[^>]*unit="m\/s"[^>]*type="最大風速"[^>]*>(\d+)</)
    const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[1], 10) : 0

    // 最大瞬間風速（m/s）
    const gustMatch = block.match(/<jmx_eb:WindSpeed[^>]*unit="m\/s"[^>]*type="最大瞬間風速"[^>]*>(\d+)</)
    const maxWindGust = gustMatch ? parseInt(gustMatch[1], 10) : 0

    if (dtType === '実況') {
      current = { lat: coord.lat, lon: coord.lon, pressure, windSpeed, maxWindGust }
    } else if (dtType.startsWith('予報')) {
      forecastPath.push({
        lat: coord.lat,
        lon: coord.lon,
        time: dtValue,
        pressure,
        windSpeed,
      })
    }
  }

  if (!current) return null

  return {
    name: `台風${typhoonNumber}号`,
    nameKana: typhoonNameKana,
    number: typhoonNumber,
    intensity,
    size,
    current,
    forecastPath,
  }
}

// 気象庁developer XMLフィードから最新の台風XMLのURLを取得
async function fetchLatestTyphoonXmlUrls(): Promise<string[]> {
  const feedUrl = 'https://www.data.jma.go.jp/developer/xml/feed/extra.xml'
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaveForecast/1.0)' },
  })
  if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`)
  const xml = await res.text()

  // entry を順次走査して、台風解析・予報情報（5日予報）のものを全て集める
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const urls: string[] = []
  for (const entry of entries) {
    if (entry.includes('台風解析・予報情報（５日予報）')) {
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/)
      if (linkMatch) urls.push(linkMatch[1])
    }
  }
  return urls
}

// XMLから台風番号・名前・階級情報を抽出
function extractTyphoonMetadata(xml: string): { number: number; nameKana: string; intensity: string; size: string } {
  const numberStr = extractFirst(xml, /<Number>(\d+)<\/Number>/)
  const nameKana = extractFirst(xml, /<NameKana>([^<]+)<\/NameKana>/) ?? ''
  const intensity = extractFirst(xml, /<jmx_eb:IntensityClass[^>]*>([^<]*)<\/jmx_eb:IntensityClass>/) ?? ''
  const size = extractFirst(xml, /<jmx_eb:AreaClass[^>]*>([^<]*)<\/jmx_eb:AreaClass>/) ?? ''

  // 台風番号: 2604 の下2桁が台風番号（4号）
  let number = 0
  if (numberStr) {
    const n = parseInt(numberStr, 10)
    number = n % 100 // 下2桁
  }

  return { number, nameKana, intensity, size }
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

  const debug: any = { step: 'start' }

  try {
    // 気象庁フィードから台風XMLのURLリストを取得
    debug.step = 'fetch_feed'
    const xmlUrls = await fetchLatestTyphoonXmlUrls()
    debug.foundXmlUrls = xmlUrls.length
    console.log(`[typhoon] Found ${xmlUrls.length} typhoon XML entries in feed`)

    if (xmlUrls.length === 0) {
      console.log('[typhoon] No active typhoons in JMA feed')
      return NextResponse.json({ success: true, typhoons: 0, message: 'No active typhoons', debug })
    }

    // 各XMLを台風ごとに集約（EventIDで重複排除 = 同じ台風の最新発表を使う）
    // フィードは新しい順なので、既に見た EventID はスキップする
    debug.step = 'fetch_xmls'
    const seenEventIds = new Set<string>()
    const typhoonDataList: ParsedTyphoon[] = []

    for (const url of xmlUrls.slice(0, 20)) { // 最新20件まで処理
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaveForecast/1.0)' },
        })
        if (!res.ok) {
          console.log(`[typhoon] XML fetch failed ${res.status}: ${url}`)
          continue
        }
        const xml = await res.text()

        // EventIDを抽出（TC2604 形式）
        const eventIdMatch = xml.match(/<EventID>(TC\d+)<\/EventID>/)
        if (!eventIdMatch) continue
        const eventId = eventIdMatch[1]
        if (seenEventIds.has(eventId)) continue
        seenEventIds.add(eventId)

        const meta = extractTyphoonMetadata(xml)
        if (meta.number === 0) {
          console.log(`[typhoon] Could not extract number from ${eventId}`)
          continue
        }

        const parsed = parseTyphoonBlock(xml, meta.number, `台風${meta.number}号`, meta.nameKana, meta.intensity, meta.size)
        if (parsed) {
          typhoonDataList.push(parsed)
          console.log(`[typhoon] Parsed ${eventId}: 台風${meta.number}号 ${meta.nameKana} lat=${parsed.current.lat} lon=${parsed.current.lon}`)
        }
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        console.log(`[typhoon] XML parse error: ${msg}`)
      }
    }

    debug.step = 'save_to_firestore'
    debug.parsedTyphoons = typhoonDataList.length

    if (typhoonDataList.length === 0) {
      return NextResponse.json({ success: true, typhoons: 0, message: 'No typhoons parsed', debug })
    }

    // Firestoreに保存
    await ensureAnonymousAuth()
    const db = getDb()
    const year = String(new Date().getFullYear())

    const savedIds: string[] = []
    for (const t of typhoonDataList) {
      const typhoonId = `T${year.slice(2)}${String(t.number).padStart(2, '0')}`
      const within = isWithinThreshold(t.current.lat, t.current.lon, t.forecastPath)
      const docRef = doc(db, 'typhoons', year, 'list', typhoonId)
      await setDoc(docRef, {
        name: t.name,
        nameKana: t.nameKana,
        number: t.number,
        intensity: t.intensity || null,
        size: t.size || null,
        position: { lat: t.current.lat, lon: t.current.lon },
        pressure: t.current.pressure,
        windSpeed: t.current.windSpeed,
        maxWindGust: t.current.maxWindGust,
        forecastPath: t.forecastPath,
        isActive: true,
        isWithin800km: within, // フィールド名は互換性維持
        updatedAt: new Date().toISOString(),
      })
      savedIds.push(typhoonId)
      console.log(`[typhoon] Saved ${typhoonId} within${THRESHOLD_KM}km=${within}`)
    }

    return NextResponse.json({
      success: true,
      typhoons: typhoonDataList.length,
      ids: savedIds,
      debug,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[typhoon] error:', msg)
    return NextResponse.json({ error: msg, debug }, { status: 500 })
  }
}
