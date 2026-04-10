export interface TyphoonData {
  name: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  forecastPath: ForecastPoint[]
  isActive: boolean
  isWithin800km: boolean
  updatedAt: Date
}

export interface ForecastPoint {
  lat: number
  lon: number
  time: string
  pressure: number
  windSpeed: number
}
