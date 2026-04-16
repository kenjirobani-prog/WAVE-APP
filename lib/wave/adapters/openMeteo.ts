import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'
import {
  JCG_STATIONS,
  defaultTide,
  estimateTideHeight,
  fetchJcgTideHourly,
} from '../tide'

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'

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

// ---- Open-Meteo 海象・気象データ ----

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchMarineData(lat: number, lng: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_direction,swell_wave_period,wind_wave_height,wind_wave_period,wind_wave_direction',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Tokyo',
    start_date: startDate,
    end_date: endDate,
  })
  const res = await fetchWithTimeout(`${OPEN_METEO_MARINE_URL}?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo marine API error: ${res.status}`)
  return res.json()
}

async function fetchWeatherData(lat: number, lng: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'weather_code,wind_speed_10m,wind_direction_10m,temperature_2m,uv_index',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Tokyo',
    start_date: startDate,
    end_date: endDate,
  })
  const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`)
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
  tideHourly: number[],
  swellWaveHeights: number[],
  windWaveHeights: number[],
  windWaveDirections: number[],
  temperatures: number[],
  uvIndexes: number[],
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
      tideTrend: prevTide !== undefined ? tideHeight - prevTide : 0,
      weather: classifyWeather(weatherCodes[i] ?? 0),
      temperature: temperatures[i] ?? 20,
      uvIndex: uvIndexes[i] ?? 0,
      swellWaveHeight: swellWaveHeights[i] ?? 0,
      windWaveHeight: windWaveHeights[i] ?? 0,
      windWaveDirection: windWaveDirections[i] ?? 180,
    }
  })
}

export const openMeteoAdapter: WaveAdapter = {
  async getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const dateStr = parseDate(date)
    const todayStr = parseDate(new Date())
    const isToday = dateStr === todayStr
    const areaOffset = JCG_STATIONS[spot.area]?.offsetCm ?? 115

    const [marine, weather, tideHourly] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, dateStr, dateStr),
      fetchWeatherData(spot.lat, spot.lng, dateStr, dateStr),
      isToday
        ? fetchJcgTideHourly(spot.area, date).catch(() => defaultTide(areaOffset))
        : Promise.resolve(defaultTide(areaOffset)),
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
      tideHourly,
      marine.hourly.swell_wave_height,
      marine.hourly.wind_wave_height,
      marine.hourly.wind_wave_direction,
      weather.hourly.temperature_2m,
      weather.hourly.uv_index,
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
    const areaOffset = JCG_STATIONS[spot.area]?.offsetCm ?? 115

    const [marine, weather, jcgTide] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, startStr, endStr),
      fetchWeatherData(spot.lat, spot.lng, startStr, endStr),
      fetchJcgTideHourly(spot.area, today).catch(() => defaultTide(areaOffset)),
    ])

    const fallbackDay = defaultTide(areaOffset)
    const times: string[] = marine.hourly.time
    return times.map((time, i) => {
      const dt = new Date(time + '+09:00')
      const hour = parseInt(time.split('T')[1].split(':')[0], 10)
      const thisDateStr = parseDate(dt)
      const tideHourly = thisDateStr === todayStr ? jcgTide : fallbackDay

      const tideHeight = tideHourly[hour] ?? estimateTideHeight(hour, areaOffset)
      const prevTide = hour > 0
        ? (tideHourly[hour - 1] ?? estimateTideHeight(hour - 1, areaOffset))
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
        tideTrend: prevTide !== undefined ? tideHeight - prevTide : 0,
        weather: classifyWeather(weather.hourly.weather_code[i] ?? 0),
        temperature: weather.hourly.temperature_2m[i] ?? 20,
        uvIndex: weather.hourly.uv_index[i] ?? 0,
        swellWaveHeight: marine.hourly.swell_wave_height[i] ?? 0,
        windWaveHeight: marine.hourly.wind_wave_height[i] ?? 0,
        windWaveDirection: marine.hourly.wind_wave_direction[i] ?? 180,
      }
    })
  },
}
