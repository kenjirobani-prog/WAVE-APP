import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'
const JMA_TIDE_URL = 'https://www.data.jma.go.jp/gmd/kaiyou/db/tide/suisan/txt'

function getSpotById(spotId: string): Spot {
  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot) throw new Error(`Spot not found: ${spotId}`)
  return spot
}

function parseDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function classifyWeather(code: number): WaveCondition['weather'] {
  // WMO weather code
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

async function fetchMarineData(lat: number, lng: number, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'wave_height,wave_period,wave_direction,wind_wave_height,swell_wave_height,swell_wave_direction,swell_wave_period',
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

// 潮位データのモック（気象庁APIは公式には提供されていないため、
// Phase 1ではOpen-Meteoの代替値を使用、将来的に気象庁データと統合）
function estimateTideHeight(hour: number): number {
  // 湘南エリアの典型的な潮位パターン（正弦波近似）
  const base = 90 // cm
  const amplitude = 60
  // 約12時間周期の潮汐
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
}

export const openMeteoAdapter: WaveAdapter = {
  async getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const dateStr = parseDate(date)
    const [marine, weather] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, dateStr, dateStr),
      fetchWeatherData(spot.lat, spot.lng, dateStr, dateStr),
    ])

    const times: string[] = marine.hourly.time
    const waveHeights: number[] = marine.hourly.wave_height
    const wavePeriods: number[] = marine.hourly.wave_period
    const swellDirs: number[] = marine.hourly.swell_wave_direction
    const windSpeeds: number[] = weather.hourly.wind_speed_10m
    const windDirs: number[] = weather.hourly.wind_direction_10m
    const weatherCodes: number[] = weather.hourly.weather_code

    return times.map((time, i) => {
      const hour = new Date(time).getHours()
      const tideHeight = estimateTideHeight(hour)
      const prevTide = i > 0 ? estimateTideHeight(hour - 1) : undefined

      return {
        spotId,
        timestamp: new Date(time),
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
  },

  async getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days - 1)
    const startStr = parseDate(today)
    const endStr = parseDate(endDate)

    const [marine, weather] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, startStr, endStr),
      fetchWeatherData(spot.lat, spot.lng, startStr, endStr),
    ])

    const times: string[] = marine.hourly.time
    const waveHeights: number[] = marine.hourly.wave_height
    const wavePeriods: number[] = marine.hourly.wave_period
    const swellDirs: number[] = marine.hourly.swell_wave_direction
    const windSpeeds: number[] = weather.hourly.wind_speed_10m
    const windDirs: number[] = weather.hourly.wind_direction_10m
    const weatherCodes: number[] = weather.hourly.weather_code

    return times.map((time, i) => {
      const hour = new Date(time).getHours()
      const tideHeight = estimateTideHeight(hour)
      const prevTide = i > 0 ? estimateTideHeight(hour - 1) : undefined

      return {
        spotId,
        timestamp: new Date(time),
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
  },
}
