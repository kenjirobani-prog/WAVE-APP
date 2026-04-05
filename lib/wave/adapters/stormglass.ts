import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const STORMGLASS_URL = 'https://api.stormglass.io/v2/weather/point'


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

function classifyWeather(windSpeed: number, _temperature: number): WaveCondition['weather'] {
  // フォールバック: Open-Meteoデータが取得できなかった場合の簡易推定
  if (windSpeed < 3) return 'sunny'
  if (windSpeed < 8) return 'cloudy'
  return 'rainy'
}

// =============================
// Open-Meteo: 天気コード + UVインデックス取得
// =============================
interface OpenMeteoWeather {
  weatherByHour: WaveCondition['weather'][]
  uvByHour: number[]
}

function wmoToWeather(code: number): WaveCondition['weather'] {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'cloudy'
  if (code >= 45 && code <= 67) return 'rainy'
  if (code >= 71 && code <= 77) return 'rainy'
  if (code >= 80 && code <= 99) return 'rainy'
  return 'cloudy'
}

async function fetchOpenMeteoWeather(lat: number, lng: number, dateStr: string): Promise<OpenMeteoWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=weather_code,uv_index&timezone=Asia/Tokyo&start_date=${dateStr}&end_date=${dateStr}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
    const data = await res.json()
    const codes: number[] = data.hourly?.weather_code ?? []
    const uvs: number[] = data.hourly?.uv_index ?? []
    return {
      weatherByHour: codes.map(wmoToWeather),
      uvByHour: uvs,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchOpenMeteoWeatherRange(lat: number, lng: number, startDate: string, endDate: string): Promise<Map<string, OpenMeteoWeather>> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=weather_code,uv_index&timezone=Asia/Tokyo&start_date=${startDate}&end_date=${endDate}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
    const data = await res.json()
    const times: string[] = data.hourly?.time ?? []
    const codes: number[] = data.hourly?.weather_code ?? []
    const uvs: number[] = data.hourly?.uv_index ?? []

    const byDate = new Map<string, OpenMeteoWeather>()
    for (let i = 0; i < times.length; i++) {
      const dateKey = times[i].split('T')[0]
      if (!byDate.has(dateKey)) byDate.set(dateKey, { weatherByHour: [], uvByHour: [] })
      const entry = byDate.get(dateKey)!
      entry.weatherByHour.push(wmoToWeather(codes[i] ?? 0))
      entry.uvByHour.push(uvs[i] ?? 0)
    }
    return byDate
  } finally {
    clearTimeout(timeout)
  }
}

function parseJstDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

// ---- 潮位: StormGlass Tide API / フォールバック推定 ----

function estimateTideHeight(hour: number): number {
  const base = 115
  const amplitude = 70
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
}

function defaultTide(): number[] {
  return Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
}

export async function fetchTideFromStormGlass(lat: number, lng: number, date: string): Promise<number[]> {
  const startISO = new Date(`${date}T00:00:00+09:00`).toISOString()
  const endISO   = new Date(`${date}T23:59:59+09:00`).toISOString()
  const url = `https://api.stormglass.io/v2/tide/sea-level/point?lat=${lat}&lng=${lng}&start=${startISO}&end=${endISO}`
  const hourly = Array(24).fill(115)
  try {
    const apiKey = process.env.STORMGLASS_API_KEY
    if (!apiKey) throw new Error('STORMGLASS_API_KEY not configured')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(url, { headers: { Authorization: apiKey }, signal: controller.signal })
      if (!res.ok) throw new Error(`StormGlass Tide API ${res.status}`)
      const json = await res.json()
      json.data?.forEach((d: { time: string; sg: number }) => {
        const jstHour = (new Date(d.time).getUTCHours() + 9) % 24
        // Chart Datum → TP基準: +115cm オフセット（横浜検潮所基準）
        hourly[jstHour] = Math.round(d.sg * 100 + 115)
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (e) {
    console.error('[fetchTideFromStormGlass] error, using fallback 115cm', e)
  }
  return hourly
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

function hoursToConditions(spotId: string, hours: StormGlassHour[], targetDateStr?: string, tideHourly?: number[], openMeteo?: OpenMeteoWeather): WaveCondition[] {
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
      weather: openMeteo?.weatherByHour[jstHour] ?? classifyWeather(windSpd, temp),
      temperature: temp,
      uvIndex: openMeteo?.uvByHour[jstHour] ?? 0,
      swellWaveHeight: val(h.swellHeight),
      windWaveHeight: val(h.windWaveHeight),
      windWaveDirection: val(h.windWaveDirection),
      secondarySwellHeight: val(h.secondarySwellHeight) || undefined,
      secondarySwellDirection: val(h.secondarySwellDirection) || undefined,
      secondarySwellPeriod: val(h.swellPeriod) || undefined,
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

    // 波データ・潮位データ・天気データを並行取得
    const [hours, tideHourly, openMeteo] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, start, end),
      fetchTideFromStormGlass(spot.lat, spot.lng, dateStr).catch(() => defaultTide()),
      fetchOpenMeteoWeather(spot.lat, spot.lng, dateStr).catch(() => undefined),
    ])
    console.log(`[StormGlass] getConditions ${spotId} ${dateStr}: ${hours.length} hours, tide: stormglass, weather: ${openMeteo ? 'open-meteo' : 'fallback'}`)

    return hoursToConditions(spotId, hours, dateStr, tideHourly, openMeteo)
  },

  async getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const startDate = parseJstDate(now)
    const endDate = parseJstDate(end)

    const [hours, todayTide, weatherMap] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, now, end),
      fetchTideFromStormGlass(spot.lat, spot.lng, startDate).catch(() => defaultTide()),
      fetchOpenMeteoWeatherRange(spot.lat, spot.lng, startDate, endDate).catch(() => new Map<string, OpenMeteoWeather>()),
    ])
    console.log(`[StormGlass] getForecast ${spotId} ${days}days: ${hours.length} hours, weather dates: ${weatherMap.size}`)

    // 日付ごとの潮位をキャッシュ（今日分は既に取得済み、他の日はオンデマンド）
    const tideCache = new Map<string, number[]>()
    tideCache.set(startDate, todayTide)

    const conditions: WaveCondition[] = []
    let prevTide: number | undefined

    for (const h of hours) {
      const jstHour = (new Date(h.time).getUTCHours() + 9) % 24
      const jst = new Date(new Date(h.time).getTime() + 9 * 60 * 60 * 1000)
      const hourDateStr = jst.toISOString().split('T')[0]

      // 日付ごとの潮位を取得（キャッシュなければフォールバック）
      let dayTide = tideCache.get(hourDateStr)
      if (!dayTide) {
        dayTide = defaultTide()
        tideCache.set(hourDateStr, dayTide)
      }
      const tideHeight = dayTide[jstHour]
      const windSpd = val(h.windSpeed)
      const temp = val(h.airTemperature)
      const dayWeather = weatherMap.get(hourDateStr)

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
        weather: dayWeather?.weatherByHour[jstHour] ?? classifyWeather(windSpd, temp),
        temperature: temp,
        uvIndex: dayWeather?.uvByHour[jstHour] ?? 0,
        swellWaveHeight: val(h.swellHeight),
        windWaveHeight: val(h.windWaveHeight),
        windWaveDirection: val(h.windWaveDirection),
        secondarySwellHeight: val(h.secondarySwellHeight) || undefined,
        secondarySwellDirection: val(h.secondarySwellDirection) || undefined,
        secondarySwellPeriod: val(h.swellPeriod) || undefined,
      })
      prevTide = tideHeight
    }

    return conditions
  },
}
