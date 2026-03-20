import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    latitude: '35.319',
    longitude: '139.471',
    current: 'weather_code,temperature_2m',
    daily: 'weather_code,temperature_2m_max,uv_index_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '8',
  })
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
    } as RequestInit)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const daily = (data.daily?.time ?? []).map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weather_code[i] ?? 0,
      temperatureMax: Math.round(data.daily.temperature_2m_max[i] ?? 0),
      uvIndex: Math.round((data.daily.uv_index_max[i] ?? 0) * 10) / 10,
    }))
    return NextResponse.json({
      current: {
        weatherCode: data.current?.weather_code ?? 0,
        temperature: Math.round(data.current?.temperature_2m ?? 0),
      },
      daily,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
