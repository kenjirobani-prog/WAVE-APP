export interface WaveCondition {
  spotId: string
  timestamp: Date
  waveHeight: number      // メートル
  wavePeriod: number      // 秒
  swellDir: number        // 度（0-360）
  windSpeed: number       // m/s
  windDir: number         // 度
  tideHeight: number      // cm
  tideMovement: 'rising' | 'falling' | 'slack'
  weather: 'sunny' | 'cloudy' | 'rainy'
}

export interface TideEvent {
  type: 'high' | 'low'
  hour: number
  level: number
  label: string  // 例: '03:00'
}

export function detectTideEvents(tideSeries: number[]): TideEvent[] {
  const events: TideEvent[] = []
  for (let i = 1; i < tideSeries.length - 1; i++) {
    const prev = tideSeries[i - 1]
    const curr = tideSeries[i]
    const next = tideSeries[i + 1]
    if (curr > prev && curr > next) {
      events.push({ type: 'high', hour: i, level: curr, label: `${String(i).padStart(2, '0')}:00` })
    }
    if (curr < prev && curr < next) {
      events.push({ type: 'low', hour: i, level: curr, label: `${String(i).padStart(2, '0')}:00` })
    }
  }
  return events.slice(0, 4)
}

export interface WaveAdapter {
  getConditions(spotId: string, date: Date): Promise<WaveCondition[]>
  getForecast(spotId: string, days: number): Promise<WaveCondition[]>
}
