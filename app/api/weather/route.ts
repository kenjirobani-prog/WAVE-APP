import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    latitude: '35.319',
    longitude: '139.471',
    current: 'weather_code,temperature_2m',
    daily: 'temperature_2m_max,uv_index_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '1',
  })
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
    } as RequestInit)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return NextResponse.json({
      weatherCode: data.current?.weather_code ?? 0,
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      temperatureMax: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      uvIndex: Math.round((data.daily?.uv_index_max?.[0] ?? 0) * 10) / 10,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
