import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import type { TyphoonData, ForecastPoint } from '@/types/typhoon'

export const maxDuration = 90

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

// ==========================================
// エリア別AIコメント生成
// ==========================================

const AREA_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  shonan:  { lat: 35.33, lon: 139.45, label: '湘南' },
  chiba:   { lat: 35.50, lon: 140.43, label: '千葉' },
  ibaraki: { lat: 36.31, lon: 140.58, label: '茨城' },
}

interface SwellForecast {
  hours: number[]
  waveHeight: number[]
  wavePeriod: number[]
  waveDirection: number[]
}

// Open-Meteo Marine API から72時間のうねり予報を取得
async function fetchSwellForecast(lat: number, lon: number): Promise<SwellForecast | null> {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction&forecast_days=3&timezone=Asia/Tokyo`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const h = data?.hourly
    if (!h || !Array.isArray(h.time)) return null
    // 0h, 12h, 24h, 36h, 48h, 60h, 72h の7ポイントを抽出
    const picks = [0, 12, 24, 36, 48, 60, 72]
    return {
      hours: picks,
      waveHeight: picks.map(i => h.wave_height?.[i] ?? 0),
      wavePeriod: picks.map(i => h.wave_period?.[i] ?? 0),
      waveDirection: picks.map(i => h.wave_direction?.[i] ?? 0),
    }
  } catch {
    return null
  }
}

// Claude API 呼び出し（エリア別コメント生成）
async function generateAreaComments(typhoon: ParsedTyphoon, swellData: Record<string, SwellForecast | null>): Promise<Record<string, string> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[typhoon] ANTHROPIC_API_KEY not set')
    return null
  }

  const prompt = `あなたはサーフィン波予報の専門AIです。
以下の台風情報とうねり予報をもとに、各エリアへの影響コメントを生成してください。

台風情報：
- 台風名：${typhoon.name} (${typhoon.nameKana})
- 現在位置：${typhoon.current.lat}°N / ${typhoon.current.lon}°E
- 中心気圧：${typhoon.current.pressure}hPa
- 最大風速：${typhoon.current.windSpeed}m/s
- 進路予報：${JSON.stringify(typhoon.forecastPath.map(p => ({ lat: p.lat, lon: p.lon, time: p.time, pressure: p.pressure })))}

各エリアのうねり予報（0h/12h/24h/36h/48h/60h/72h 先）：
${Object.entries(swellData).map(([k, v]) => {
  if (!v) return `${AREA_COORDS[k].label}: データなし`
  return `${AREA_COORDS[k].label}: 波高${v.waveHeight.map(n => n.toFixed(1)).join('/')}m, 周期${v.wavePeriod.map(n => n.toFixed(0)).join('/')}秒, 波向${v.waveDirection.map(n => Math.round(n)).join('/')}°`
}).join('\n')}

以下のJSON形式で出力してください。他の文字（マークダウンコードブロック含む）は一切含めないこと：
{
  "shonan": "湘南へのコメント（150文字以内・うねり到達時間・期待波高・周期・サーファーへのアドバイスを含む）",
  "chiba": "千葉へのコメント（80文字以内・簡潔に）",
  "ibaraki": "茨城へのコメント（80文字以内・簡潔に）"
}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
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
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[typhoon] Claude API error ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }
    const result = await res.json()
    const text = result?.content?.[0]?.text ?? ''
    // JSONを抽出（モデルが```json ... ```で囲む場合もあるので対処）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    return {
      shonan: parsed.shonan ?? '',
      chiba: parsed.chiba ?? '',
      ibaraki: parsed.ibaraki ?? '',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[typhoon] Claude generation failed:', msg)
    return null
  }
}

// Open-Meteo + Claudeでコメントを生成してFirestoreに保存
async function generateAndSaveAreaComments(
  db: import('firebase/firestore').Firestore,
  year: string,
  typhoonId: string,
  typhoon: ParsedTyphoon,
): Promise<void> {
  // 各エリアのうねりデータを並列取得
  const swellEntries = await Promise.all(
    Object.entries(AREA_COORDS).map(async ([key, coord]) => {
      const forecast = await fetchSwellForecast(coord.lat, coord.lon)
      return [key, forecast] as const
    })
  )
  const swellData: Record<string, SwellForecast | null> = Object.fromEntries(swellEntries)

  const comments = await generateAreaComments(typhoon, swellData)
  if (!comments) {
    console.warn(`[typhoon] No comments generated for ${typhoonId}`)
    return
  }

  const generatedAt = new Date().toISOString()
  for (const [key, text] of Object.entries(comments)) {
    if (!text) continue
    const ref = doc(db, 'typhoons', year, 'list', typhoonId, 'areaComments', key)
    await setDoc(ref, { text, generatedAt })
    console.log(`[typhoon] Saved comment: ${typhoonId}/areaComments/${key}`)
  }
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

      // 既存ドキュメントがあれば startedAt を維持、なければ現在時刻をセット
      let startedAt: string
      try {
        const existing = await getDoc(docRef)
        startedAt = existing.exists() && existing.data()?.startedAt
          ? existing.data()!.startedAt
          : new Date().toISOString()
      } catch {
        startedAt = new Date().toISOString()
      }

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
        startedAt,
        updatedAt: new Date().toISOString(),
      })
      savedIds.push(typhoonId)
      console.log(`[typhoon] Saved ${typhoonId} within${THRESHOLD_KM}km=${within} startedAt=${startedAt}`)

      // エリア別AIコメント生成（isActive かつ within 判定済みの台風のみ）
      if (within) {
        try {
          await generateAndSaveAreaComments(db, year, typhoonId, t)
          console.log(`[typhoon] Area comments generated for ${typhoonId}`)
        } catch (commentErr) {
          const msg = commentErr instanceof Error ? commentErr.message : String(commentErr)
          console.error(`[typhoon] Area comments failed for ${typhoonId}: ${msg}`)
        }
      }
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
