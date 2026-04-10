export interface TyphoonData {
  name: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  intensity?: string   // 強さ（例: 強い / 非常に強い / 猛烈な）
  size?: string        // 大きさ（例: 大型 / 超大型）
  forecastPath: ForecastPoint[]
  isActive: boolean
  isWithin800km: boolean
  updatedAt: Date
  startedAt?: string  // ISO8601形式
}

export interface ForecastPoint {
  lat: number
  lon: number
  time: string
  pressure: number
  windSpeed: number
}
