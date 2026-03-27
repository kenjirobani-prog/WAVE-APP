import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const STORMGLASS_URL = 'https://api.stormglass.io/v2/weather/point'

// 海上保安庁 リアルタイム験潮データ（横浜観測点）— 潮位はこちらが正確
const KAIHO_GAUGE_URL = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php?s=0062'

const PARAMS = [
  'waveHeight', 'wavePeriod', 'waveDirection',
  'swellHeight', 'swellDirection', 'swellPeriod',
  'secondarySwellHeight', 'secondarySwellDirection',
  'windWaveHeight', 'windWaveDirection',
  'windSpeed', 'windDirection',
  'airTemperature', 'seaLevel',
].join(',')

function getSpotById(spotId: string): Spot {
  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot) throw new Error(`Spot not found: ${spotId}`)
  return spot
}

// StormGlassのレスポンスから値を取得（sgソース優先）
function val(obj: Record<string, number> | undefined): number {
  if (!obj) return 0
  return obj.sg ?? obj[Object.keys(obj)[0]] ?? 0
}

// seaLevel（メートル単位）→ cm に変換。StormGlassの基準を湘南向けに補正
// StormGlassのseaLevelは平均海面(MSL)からのオフセット（メートル）
// 湘南の平均潮位を約115cmとし、seaLevel(m)*100 を加算
function seaLevelToCm(seaLevelMeters: number): number {
  const baseCm = 115
  return Math.round(baseCm + seaLevelMeters * 100)
}

function classifyWeather(windSpeed: number, temperature: number): WaveCondition['weather'] {
  // StormGlassにweatherCodeがないため、風速で簡易推定
  // 将来的にはweatherCodeパラメータ追加を検討
  if (windSpeed < 3) return 'sunny'
  if (windSpeed < 8) return 'cloudy'
  return 'rainy'
}

function parseJstDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

// ---- 潮位: 海上保安庁 験潮データ（今日分）/ サイン推定（未来） ----

function estimateTideHeight(hour: number): number {
  const base = 115
  const amplitude = 70
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
}

function defaultTide(): number[] {
  return Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
}

function parseObservations(html: string, date: Date): (number | undefined)[] {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = jst.getUTCFullYear()
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(jst.getUTCDate()).padStart(2, '0')
  const pattern = new RegExp(`${yyyy}\\s+${mm}\\s+${dd}\\s+(\\d{2})\\s+\\d{2}\\s+(\\d+)`, 'g')
  let match
  while ((match = pattern.exec(html)) !== null) {
    const hour = parseInt(match[1])
    const value = parseInt(match[2])
    if (value !== 9999 && hour >= 0 && hour < 24) hourlyValues[hour].push(value)
  }
  return hourlyValues.map(vals => vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : undefined)
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
  while ((tdMatch = tdPattern.exec(rowMatch[1])) !== null) values.push(parseInt(tdMatch[1]))
  const shifted: (number | undefined)[] = new Array(24).fill(undefined)
  values.slice(0, 23).forEach((v, i) => { shifted[i + 1] = isNaN(v) ? undefined : v })
  return shifted
}

async function fetchKaihoTideHourly(date: Date): Promise<number[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(KAIHO_GAUGE_URL, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Kaiho gauge API error: ${res.status}`)
    const html = await res.text()
    const observations = parseObservations(html, date)
    const predictions = parsePredictionTable(html, date)
    return Array.from({ length: 24 }, (_, h) => {
      if (observations[h] !== undefined) return observations[h]!
      if (predictions[h] !== undefined) return predictions[h]!
      return estimateTideHeight(h)
    })
  } finally {
    clearTimeout(timeout)
  }
}

// ---- StormGlass types ----

interface StormGlassHour {
  time: string
  waveHeight?: Record<string, number>
  wavePeriod?: Record<string, number>
  waveDirection?: Record<string, number>
  swellHeight?: Record<string, number>
  swellDirection?: Record<string, number>
  swellPeriod?: Record<string, number>
  secondarySwellHeight?: Record<string, number>
  secondarySwellDirection?: Record<string, number>
  windWaveHeight?: Record<string, number>
  windWaveDirection?: Record<string, number>
  windSpeed?: Record<string, number>
  windDirection?: Record<string, number>
  airTemperature?: Record<string, number>
  seaLevel?: Record<string, number>
}

async function fetchStormGlass(lat: number, lng: number, start: Date, end: Date): Promise<StormGlassHour[]> {
  const apiKey = process.env.STORMGLASS_API_KEY
  if (!apiKey) throw new Error('STORMGLASS_API_KEY not configured')

  const url = `${STORMGLASS_URL}?lat=${lat}&lng=${lng}&params=${PARAMS}&start=${start.toISOString()}&end=${end.toISOString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': apiKey },
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`StormGlass API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    return data.hours ?? []
  } finally {
    clearTimeout(timeout)
  }
}

function hoursToConditions(spotId: string, hours: StormGlassHour[], targetDateStr?: string, tideHourly?: number[]): WaveCondition[] {
  // 指定日のデータのみフィルタ（targetDateStrがあれば）
  const filtered = targetDateStr
    ? hours.filter(h => {
        const jst = new Date(new Date(h.time).getTime() + 9 * 60 * 60 * 1000)
        return jst.toISOString().split('T')[0] === targetDateStr
      })
    : hours

  const conditions: WaveCondition[] = []
  let prevTide: number | undefined

  for (const h of filtered) {
    const jstHour = (new Date(h.time).getUTCHours() + 9) % 24
    // 潮位: 海上保安庁データがあればそちらを使用、なければサイン推定
    const tideHeight = tideHourly ? tideHourly[jstHour] : estimateTideHeight(jstHour)
    const windSpd = val(h.windSpeed)
    const temp = val(h.airTemperature)

    const cond: WaveCondition = {
      spotId,
      timestamp: new Date(h.time),
      waveHeight: val(h.waveHeight),
      wavePeriod: val(h.swellPeriod) || val(h.wavePeriod), // うねり周期を優先
      swellDir: val(h.swellDirection),
      windSpeed: windSpd,
      windDir: val(h.windDirection),
      tideHeight,
      tideTrend: prevTide !== undefined ? tideHeight - prevTide : 0,
      weather: classifyWeather(windSpd, temp),
      temperature: temp,
      uvIndex: 0, // StormGlassにはUVIndexなし
      swellWaveHeight: val(h.swellHeight),
      windWaveHeight: val(h.windWaveHeight),
      windWaveDirection: val(h.windWaveDirection),
    }

    prevTide = tideHeight
    conditions.push(cond)
  }

  return conditions
}

export const stormglassAdapter: WaveAdapter = {
  async getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const dateStr = parseJstDate(date)
    const todayStr = parseJstDate(new Date())
    const isToday = dateStr === todayStr

    // 指定日の0時〜23時（JST）をUTCに変換してリクエスト
    const start = new Date(`${dateStr}T00:00:00+09:00`)
    const end = new Date(`${dateStr}T23:59:59+09:00`)

    // 波データと潮位データを並行取得
    const [hours, tideHourly] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, start, end),
      isToday
        ? fetchKaihoTideHourly(date).catch(() => { console.log('[StormGlass] Kaiho fallback to estimate'); return defaultTide() })
        : Promise.resolve(defaultTide()),
    ])
    console.log(`[StormGlass] getConditions ${spotId} ${dateStr}: ${hours.length} hours, tide: ${isToday ? 'kaiho' : 'estimate'}`)

    return hoursToConditions(spotId, hours, dateStr, tideHourly)
  },

  async getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const [hours, tideHourly] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, now, end),
      fetchKaihoTideHourly(now).catch(() => defaultTide()),
    ])
    console.log(`[StormGlass] getForecast ${spotId} ${days}days: ${hours.length} hours`)

    // 今日分のみ海上保安庁潮位を使用（それ以外はサイン推定）
    // hoursToConditionsにtideHourlyを渡さず、個別にマッピング
    const todayStr = parseJstDate(now)
    const conditions: WaveCondition[] = []
    let prevTide: number | undefined

    for (const h of hours) {
      const jstHour = (new Date(h.time).getUTCHours() + 9) % 24
      const jst = new Date(new Date(h.time).getTime() + 9 * 60 * 60 * 1000)
      const hourDateStr = jst.toISOString().split('T')[0]
      const isToday = hourDateStr === todayStr
      const tideHeight = isToday ? tideHourly[jstHour] : estimateTideHeight(jstHour)
      const windSpd = val(h.windSpeed)
      const temp = val(h.airTemperature)

      conditions.push({
        spotId,
        timestamp: new Date(h.time),
        waveHeight: val(h.waveHeight),
        wavePeriod: val(h.swellPeriod) || val(h.wavePeriod),
        swellDir: val(h.swellDirection),
        windSpeed: windSpd,
        windDir: val(h.windDirection),
        tideHeight,
        tideTrend: prevTide !== undefined ? tideHeight - prevTide : 0,
        weather: classifyWeather(windSpd, temp),
        temperature: temp,
        uvIndex: 0,
        swellWaveHeight: val(h.swellHeight),
        windWaveHeight: val(h.windWaveHeight),
        windWaveDirection: val(h.windWaveDirection),
      })
      prevTide = tideHeight
    }

    return conditions
  },
}
