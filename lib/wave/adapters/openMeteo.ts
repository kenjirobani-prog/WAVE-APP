import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'

// 気象庁 横浜観測点 (QS) 潮位予報
const JMA_TIDE_STATION = 'QS'
const JMA_SUISAN_URL = 'https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php'

interface TidePoint {
  minutes: number // 0:00 = 0, 23:59 = 1439
  height: number  // cm
}

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

// 気象庁HTMLから満潮・干潮の時刻と潮位を抽出
function parseTidePoints(html: string): TidePoint[] {
  const points: TidePoint[] = []

  // JMA suisan.php のHTML内のパターン: "H:MM" の時刻セルに続く潮位数値セル
  // 例: <td>5:37</td><td>179</td> または空白・アスタリスクのセル
  const cellPattern = /<td[^>]*>\s*(\d{1,2}):(\d{2})\s*<\/td>\s*<td[^>]*>\s*(\d{2,3})\s*<\/td>/g

  let match
  while ((match = cellPattern.exec(html)) !== null) {
    const hour = parseInt(match[1])
    const minute = parseInt(match[2])
    const height = parseInt(match[3])
    if (hour >= 0 && hour < 24 && height > 0 && height < 400) {
      points.push({ minutes: hour * 60 + minute, height })
    }
  }

  // フォールバック: より緩いパターンで再試行
  if (points.length < 2) {
    const loosePattern = /(\d{1,2}):(\d{2})[^\d]*?(\d{2,3})/g
    while ((match = loosePattern.exec(html)) !== null) {
      const hour = parseInt(match[1])
      const minute = parseInt(match[2])
      const height = parseInt(match[3])
      if (hour >= 0 && hour < 24 && height > 0 && height < 400) {
        const key = hour * 60 + minute
        if (!points.find(p => p.minutes === key)) {
          points.push({ minutes: key, height })
        }
      }
    }
  }

  return points.sort((a, b) => a.minutes - b.minutes)
}

// 満潮・干潮データから24時間の毎時潮位を余弦補間で生成
function interpolateHourlyTide(extremes: TidePoint[]): number[] {
  if (extremes.length < 2) throw new Error('Need at least 2 tide extremes')

  const sorted = [...extremes].sort((a, b) => a.minutes - b.minutes)
  const result: number[] = []

  for (let hour = 0; hour < 24; hour++) {
    const t = hour * 60

    let prev: TidePoint | null = null
    let next: TidePoint | null = null

    for (const p of sorted) {
      if (p.minutes <= t) prev = p
    }
    for (const p of sorted) {
      if (p.minutes > t) { next = p; break }
    }

    // 前後の端点がない場合は日の境界での折り返しを近似
    if (!prev) {
      const last = sorted[sorted.length - 1]
      prev = { minutes: last.minutes - 24 * 60, height: last.height }
    }
    if (!next) {
      const first = sorted[0]
      next = { minutes: first.minutes + 24 * 60, height: first.height }
    }

    const duration = next.minutes - prev.minutes
    const elapsed = t - prev.minutes
    const fraction = duration > 0 ? elapsed / duration : 0

    // 余弦補間: h = (H_prev + H_next)/2 + (H_prev - H_next)/2 * cos(π * fraction)
    const height =
      (prev.height + next.height) / 2 +
      ((prev.height - next.height) / 2) * Math.cos(Math.PI * fraction)

    result.push(Math.round(height))
  }

  return result
}

// 気象庁横浜観測点から毎時潮位を取得（失敗時は正弦波近似にフォールバック）
async function fetchJMATideHourly(date: Date): Promise<number[]> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const params = new URLSearchParams({
    stn: JMA_TIDE_STATION,
    ys: String(year),
    ms: String(month),
    ds: String(day),
    ye: String(year),
    me: String(month),
    de: String(day),
    S_HILO: 'on',
  })

  const res = await fetch(`${JMA_SUISAN_URL}?${params}`, {
    headers: { 'Accept': 'text/html,application/xhtml+xml' },
    next: { revalidate: 3600 },
  } as RequestInit)

  if (!res.ok) throw new Error(`JMA tide API error: ${res.status}`)

  const html = await res.text()
  const extremes = parseTidePoints(html)

  if (extremes.length < 2) throw new Error('JMA: insufficient tide data points')

  return interpolateHourlyTide(extremes)
}

// フォールバック: 正弦波近似による潮位推定
function estimateTideHeight(hour: number): number {
  const base = 90 // cm
  const amplitude = 60
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
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
    const hour = new Date(time).getHours()
    const tideHeight = tideHourly[hour] ?? estimateTideHeight(hour)
    const prevTide = tideHourly[hour - 1] ?? (hour > 0 ? estimateTideHeight(hour - 1) : undefined)

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
}

export const openMeteoAdapter: WaveAdapter = {
  async getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
    const spot = getSpotById(spotId)
    const dateStr = parseDate(date)

    const [marine, weather, tideHourly] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, dateStr, dateStr),
      fetchWeatherData(spot.lat, spot.lng, dateStr, dateStr),
      fetchJMATideHourly(date).catch(() =>
        Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
      ),
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

    const [marine, weather, tideHourly] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, startStr, endStr),
      fetchWeatherData(spot.lat, spot.lng, startStr, endStr),
      fetchJMATideHourly(today).catch(() =>
        Array.from({ length: 24 }, (_, h) => estimateTideHeight(h))
      ),
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
}
