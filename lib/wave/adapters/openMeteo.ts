import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'

// 海上保安庁 リアルタイム験潮データ（横浜観測点 s=0062）
// 潮位基準: 最低水面（横浜は平均水面の下115cm = 0cm基準）
const KAIHO_GAUGE_URL = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php?s=0062'

function getSpotById(spotId: string): Spot {
  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot) throw new Error(`Spot not found: ${spotId}`)
  return spot
}

function parseDate(date: Date): string {
  // JST日付文字列 (YYYY-MM-DD)
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

function classifyWeather(code: number): WaveCondition['weather'] {
  if (code === 0 || code === 1) return 'sunny'
  if (code <= 3) return 'cloudy'
  return 'rainy'
}

function classifyTideMovement(
  current: number,
  prev: number | undefined
): WaveCondition['tideMovement'] {
  if (prev === undefined) return 'slack'
  const diff = current - prev
  if (diff > 2) return 'rising'
  if (diff < -2) return 'falling'
  return 'slack'
}

// ---- KAiho 験潮データ パーサー ----

function parseObservations(html: string, date: Date): (number | undefined)[] {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  const pattern = new RegExp(
    `${yyyy}\\s+${mm}\\s+${dd}\\s+(\\d{2})\\s+\\d{2}\\s+(\\d+)`,
    'g'
  )
  let match
  while ((match = pattern.exec(html)) !== null) {
    const hour = parseInt(match[1])
    const value = parseInt(match[2])
    if (value !== 9999 && hour >= 0 && hour < 24) {
      hourlyValues[hour].push(value)
    }
  }
  return hourlyValues.map(vals =>
    vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : undefined
  )
}

function parsePredictionTable(html: string, date: Date): (number | undefined)[] {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const dateStr = mm + dd

  const dateCell = `<td[^>]*>\\s*${dateStr}\\s*<\\/td>`
  const numCell = `(?:<td[^>]*>\\s*(\\d+)\\s*<\\/td>\\s*){1,25}`
  const rowPattern = new RegExp(`${dateCell}\\s*(${numCell})`, 's')

  const rowMatch = rowPattern.exec(html)
  if (!rowMatch) return new Array(24).fill(undefined)

  const values: number[] = []
  const tdPattern = /<td[^>]*>\s*(\d+)\s*<\/td>/g
  let tdMatch
  while ((tdMatch = tdPattern.exec(rowMatch[1])) !== null) {
    values.push(parseInt(tdMatch[1]))
  }
  return values.slice(0, 24).map(v => (isNaN(v) ? undefined : v))
}

function estimateTideHeight(hour: number): number {
  const base = 115
  const amplitude = 70
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
}

function defaultTide(): number[] {
  return Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
}

async function fetchKAihoTideHourly(date: Date): Promise<number[]> {
  const res = await fetch(KAIHO_GAUGE_URL, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    next: { revalidate: 1800 },
  } as RequestInit)
  if (!res.ok) throw new Error(`KAiho gauge API error: ${res.status}`)

  const html = await res.text()
  const observations = parseObservations(html, date)
  const predictions = parsePredictionTable(html, date)

  return Array.from({ length: 24 }, (_, h) => {
    if (observations[h] !== undefined) return observations[h]!
    if (predictions[h] !== undefined) return predictions[h]!
    return estimateTideHeight(h)
  })
}

// ---- Open-Meteo 海象・気象データ ----

async function fetchMarineData(lat: number, lng: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_direction,swell_wave_period',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Tokyo',
    start_date: startDate,
    end_date: endDate,
  })
  const res = await fetch(`${OPEN_METEO_MARINE_URL}?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo marine API error: ${res.status}`)
  return res.json()
}

async function fetchWeatherData(lat: number, lng: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'weather_code,wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Tokyo',
    start_date: startDate,
    end_date: endDate,
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo forecast API error: ${res.status}`)
  return res.json()
}

function buildConditions(
  spotId: string,
  times: string[],
  waveHeights: number[],
  wavePeriods: number[],
  swellDirs: number[],
  windSpeeds: number[],
  windDirs: number[],
  weatherCodes: number[],
  tideHourly: number[]
): WaveCondition[] {
  return times.map((time, i) => {
    // Open-Meteo returns JST local time strings like "2026-03-21T04:00" (no timezone suffix).
    // Append +09:00 so the Date is correctly stored as UTC; extract JST hour from the string
    // directly to avoid server-timezone ambiguity.
    const hour = parseInt(time.split('T')[1].split(':')[0], 10)
    const tideHeight = tideHourly[hour] ?? estimateTideHeight(hour)
    const prevTide = hour > 0 ? (tideHourly[hour - 1] ?? estimateTideHeight(hour - 1)) : undefined

    return {
      spotId,
      timestamp: new Date(time + '+09:00'),
      waveHeight: waveHeights[i] ?? 0,
      wavePeriod: wavePeriods[i] ?? 0,
      swellDir: swellDirs[i] ?? 180,
      windSpeed: windSpeeds[i] ?? 0,
      windDir: windDirs[i] ?? 180,
      tideHeight,
      tideMovement: classifyTideMovement(tideHeight, prevTide),
      weather: classifyWeather(weatherCodes[i] ?? 0),
    }
  })
}

export const openMeteoAdapter: WaveAdapter = {
  async getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const dateStr = parseDate(date)
    const todayStr = parseDate(new Date())
    const isToday = dateStr === todayStr

    const [marine, weather, tideHourly] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, dateStr, dateStr),
      fetchWeatherData(spot.lat, spot.lng, dateStr, dateStr),
      isToday
        ? fetchKAihoTideHourly(date).catch(defaultTide)
        : Promise.resolve(defaultTide()),
    ])

    return buildConditions(
      spotId,
      marine.hourly.time,
      marine.hourly.wave_height,
      marine.hourly.wave_period,
      marine.hourly.swell_wave_direction,
      weather.hourly.wind_speed_10m,
      weather.hourly.wind_direction_10m,
      weather.hourly.weather_code,
      tideHourly
    )
  },

  async getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days - 1)
    const startStr = parseDate(today)
    const endStr = parseDate(endDate)
    const todayStr = startStr

    const [marine, weather, kaihoTide] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, startStr, endStr),
      fetchWeatherData(spot.lat, spot.lng, startStr, endStr),
      fetchKAihoTideHourly(today).catch(defaultTide),
    ])

    const times: string[] = marine.hourly.time
    return times.map((time, i) => {
      const dt = new Date(time + '+09:00')
      const hour = parseInt(time.split('T')[1].split(':')[0], 10)
      const thisDateStr = parseDate(dt)
      const tideHourly = thisDateStr === todayStr ? kaihoTide : null

      const tideHeight = tideHourly
        ? (tideHourly[hour] ?? estimateTideHeight(hour))
        : estimateTideHeight(hour)
      const prevTide = hour > 0
        ? (tideHourly ? (tideHourly[hour - 1] ?? estimateTideHeight(hour - 1)) : estimateTideHeight(hour - 1))
        : undefined

      return {
        spotId,
        timestamp: dt,
        waveHeight: marine.hourly.wave_height[i] ?? 0,
        wavePeriod: marine.hourly.wave_period[i] ?? 0,
        swellDir: marine.hourly.swell_wave_direction[i] ?? 180,
        windSpeed: weather.hourly.wind_speed_10m[i] ?? 0,
        windDir: weather.hourly.wind_direction_10m[i] ?? 180,
        tideHeight,
        tideMovement: classifyTideMovement(tideHeight, prevTide),
        weather: classifyWeather(weather.hourly.weather_code[i] ?? 0),
      }
    })
  },
}
