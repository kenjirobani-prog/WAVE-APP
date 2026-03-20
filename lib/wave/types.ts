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

export interface WaveAdapter {
  getConditions(spotId: string, date: Date): Promise<WaveCondition[]>
  getForecast(spotId: string, days: number): Promise<WaveCondition[]>
}
