import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'
import {
  JCG_STATIONS,
  defaultTide,
  fetchJcgTideHourly,
  fetchStormGlassTideRange,
} from '../tide'

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

export async function fetchStormGlass(lat: number, lng: number, start: Date, end: Date): Promise<StormGlassHour[]> {
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

export function hoursToConditions(spotId: string, hours: StormGlassHour[], targetDateStr?: string, tideHourly?: number[], openMeteo?: OpenMeteoWeather): WaveCondition[] {
  // 指定日のデータのみフィルタ（targetDateStrがあれば）
  const filtered = targetDateStr
    ? hours.filter(h => {
        const jst = new Date(new Date(h.time).getTime() + 9 * 60 * 60 * 1000)
        return jst.toISOString().split('T')[0] === targetDateStr
      })
    : hours

  const conditions: WaveCondition[] = []
  let prevTide: number | undefined
  const fallbackTide = defaultTide()

  for (const h of filtered) {
    const jstHour = (new Date(h.time).getUTCHours() + 9) % 24
    // 潮位: 与えられた時間配列（JCG実測 or StormGlass予測）を優先、欠損時のみサイン推定
    const tideHeight = tideHourly?.[jstHour] ?? fallbackTide[jstHour]
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
    const station = JCG_STATIONS[spot.area]
    const sgOffset = station?.stormglassOffsetCm ?? 115

    // 指定日の0時〜23時（JST）をUTCに変換してリクエスト
    const start = new Date(`${dateStr}T00:00:00+09:00`)
    const end = new Date(`${dateStr}T23:59:59+09:00`)

    // 当日は JCG 実測、翌日以降は StormGlass Tide 予測
    const tidePromise: Promise<number[] | undefined> = isToday
      ? fetchJcgTideHourly(spot.area, date).catch(err => {
          console.error(`[Tide] JCG failed for ${spot.area}, fallback to StormGlass:`, err)
          return fetchStormGlassTideRange(spot.lat, spot.lng, dateStr, dateStr, sgOffset)
            .then(m => m.get(dateStr))
            .catch(() => undefined)
        })
      : fetchStormGlassTideRange(spot.lat, spot.lng, dateStr, dateStr, sgOffset)
          .then(m => m.get(dateStr))
          .catch(() => undefined)

    const [hours, tideHourly, openMeteo] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, start, end),
      tidePromise,
      fetchOpenMeteoWeather(spot.lat, spot.lng, dateStr).catch(() => undefined),
    ])

    const tideSource = isToday ? (tideHourly ? 'jcg' : 'fallback') : (tideHourly ? 'stormglass' : 'fallback')
    console.log(`[StormGlass] getConditions ${spotId} ${dateStr}: ${hours.length}h, tide:${tideSource}, weather:${openMeteo ? 'open-meteo' : 'fallback'}`)

    return hoursToConditions(spotId, hours, dateStr, tideHourly, openMeteo)
  },

  async getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const now = new Date()
    const startDate = parseJstDate(now)
    // 今日のJST 0時から開始
    const todayMidnightJST = new Date(`${startDate}T00:00:00+09:00`)
    const end = new Date(todayMidnightJST.getTime() + days * 24 * 60 * 60 * 1000)
    const endDate = parseJstDate(end)
    const station = JCG_STATIONS[spot.area]
    const sgOffset = station?.stormglassOffsetCm ?? 115

    // 当日：JCG 実測（失敗時はStormGlass側の当日分にフォールバック）
    // 翌日以降：StormGlass Tide API（7日分一括）
    const [hours, jcgToday, sgTideMap, weatherMap] = await Promise.all([
      fetchStormGlass(spot.lat, spot.lng, todayMidnightJST, end),
      fetchJcgTideHourly(spot.area, now).catch(err => {
        console.error(`[Tide] JCG failed for ${spot.area}, will use StormGlass for today too:`, err)
        return null as number[] | null
      }),
      fetchStormGlassTideRange(spot.lat, spot.lng, startDate, endDate, sgOffset)
        .catch(err => {
          console.error('[Tide] StormGlass tide range failed:', err)
          return new Map<string, number[]>()
        }),
      fetchOpenMeteoWeatherRange(spot.lat, spot.lng, startDate, endDate).catch(() => new Map<string, OpenMeteoWeather>()),
    ])

    // 日付ごとの潮位を組み立て
    const tideByDate = new Map<string, number[]>(sgTideMap)
    if (jcgToday) {
      tideByDate.set(startDate, jcgToday)
    }
    const fallbackDay = defaultTide()

    const todaySource = jcgToday ? 'jcg' : (sgTideMap.has(startDate) ? 'stormglass' : 'fallback')
    console.log(`[StormGlass] getForecast ${spotId} ${days}d: ${hours.length}h, tide today:${todaySource}, tide days:${tideByDate.size}/${days}, weather days:${weatherMap.size}`)

    const conditions: WaveCondition[] = []
    let prevTide: number | undefined

    for (const h of hours) {
      const jstHour = (new Date(h.time).getUTCHours() + 9) % 24
      const jst = new Date(new Date(h.time).getTime() + 9 * 60 * 60 * 1000)
      const hourDateStr = jst.toISOString().split('T')[0]

      const dayTide = tideByDate.get(hourDateStr) ?? fallbackDay
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
