import type { WaveAdapter, WaveCondition } from '../types'
import type { Spot } from '@/types'
import { SPOTS } from '@/data/spots'

const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'

// 海上保安庁 リアルタイム験潮データ（横浜観測点 s=0062）
// 潮位基準: 最低水面（横浜は平均水面の下115cm = 0cm基準）
// → 平均水面 = 115cm、大潮の高潮 ≈ 185cm、大潮の干潮 ≈ 20cm
const KAIHO_GAUGE_URL = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php?s=0062'

function getSpotById(spotId: string): Spot {
  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot) throw new Error(`Spot not found: ${spotId}`)
  return spot
}

function parseDate(date: Date): string {
  return date.toISOString().split('T')[0]
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

/**
 * 海保HTML内の5分ごと観測値を解析して時間ごとの平均潮位を返す。
 * 欠損値(9999)は除外し、観測値がない時間はundefinedを返す。
 */
function parseObservations(html: string, date: Date): (number | undefined)[] {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  // 形式: "YYYY MM DD HH MM   value" （スペース区切り）
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

/**
 * 海保HTML内の1時間ごと予測テーブルを解析して0〜23時の潮位配列を返す。
 * テーブル形式: <td>MMDD</td><td>h0</td><td>h1</td>...<td>h23</td>[<td>h24</td>]
 */
function parsePredictionTable(html: string, date: Date): (number | undefined)[] {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const dateStr = mm + dd  // e.g. "0320"

  // 対象日付のセルから始まる連続する数値セル列を取得
  const dateCell = `<td[^>]*>\\s*${dateStr}\\s*<\\/td>`
  const numCell = `(?:<td[^>]*>\\s*(\\d+)\\s*<\\/td>\\s*){1,25}`
  const rowPattern = new RegExp(`${dateCell}\\s*(${numCell})`, 's')

  const rowMatch = rowPattern.exec(html)
  if (!rowMatch) return new Array(24).fill(undefined)

  const cellsHtml = rowMatch[1]
  const values: number[] = []
  const tdPattern = /<td[^>]*>\s*(\d+)\s*<\/td>/g
  let tdMatch
  while ((tdMatch = tdPattern.exec(cellsHtml)) !== null) {
    values.push(parseInt(tdMatch[1]))
  }

  // 最大25値（0:00〜24:00）、先頭24件（0〜23時）を使用
  return values.slice(0, 24).map(v => (isNaN(v) ? undefined : v))
}

/**
 * フォールバック: 正弦波近似。
 * 新基準（最低水面）に合わせて base=115、amplitude=70cm。
 */
function estimateTideHeight(hour: number): number {
  const base = 115      // 平均水面 (最低水面基準)
  const amplitude = 70  // 潮差の概算
  return Math.round(base + amplitude * Math.sin((hour / 12) * Math.PI))
}

/**
 * 海保リアルタイム験潮APIから今日の毎時潮位を取得する。
 * 観測値を優先し、欠損時間は予測値にフォールバック。
 * それでも不足の場合は正弦波近似で補完。
 */
async function fetchKAihoTideHourly(date: Date): Promise<number[]> {
  const res = await fetch(KAIHO_GAUGE_URL, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    // 5分更新のため30分キャッシュ
    next: { revalidate: 1800 },
  } as RequestInit)

  if (!res.ok) throw new Error(`KAiho gauge API error: ${res.status}`)

  const html = await res.text()

  const observations = parseObservations(html, date)
  const predictions = parsePredictionTable(html, date)

  const result: number[] = []
  for (let h = 0; h < 24; h++) {
    if (observations[h] !== undefined) {
      result.push(observations[h]!)          // 5分観測値の時間平均
    } else if (predictions[h] !== undefined) {
      result.push(predictions[h]!)           // 予測値にフォールバック
    } else {
      result.push(estimateTideHeight(h))     // 最終フォールバック
    }
  }
  return result
}

// ---- Open-Meteo 海象・気象データ ----

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
  todayTideHourly: number[],
  todayDateStr: string
): WaveCondition[] {
  return times.map((time, i) => {
    const dt = new Date(time)
    const hour = dt.getHours()
    const dateStr = parseDate(dt)

    // 今日のデータは海保リアルタイム値、翌日以降は正弦波近似
    const tideHeight = dateStr === todayDateStr
      ? (todayTideHourly[hour] ?? estimateTideHeight(hour))
      : estimateTideHeight(hour)
    const prevTide = dateStr === todayDateStr && hour > 0
      ? (todayTideHourly[hour - 1] ?? estimateTideHeight(hour - 1))
      : (hour > 0 ? estimateTideHeight(hour - 1) : undefined)

    return {
      spotId,
      timestamp: dt,
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
      fetchKAihoTideHourly(date).catch(() =>
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
      tideHourly,
      dateStr
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

    const [marine, weather, tideHourly] = await Promise.all([
      fetchMarineData(spot.lat, spot.lng, startStr, endStr),
      fetchWeatherData(spot.lat, spot.lng, startStr, endStr),
      fetchKAihoTideHourly(today).catch(() =>
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
      tideHourly,
      todayStr
    )
  },
}
