import { NextRequest, NextResponse } from 'next/server'
import { getConditions, getForecast } from '@/lib/wave/waveService'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const spotId = searchParams.get('spotId')
  const type = searchParams.get('type') ?? 'daily' // 'daily' | 'forecast'
  const days = parseInt(searchParams.get('days') ?? '3', 10)

  if (!spotId) {
    return NextResponse.json({ error: 'spotId is required' }, { status: 400 })
  }

  try {
    if (type === 'forecast') {
      const conditions = await getForecast(spotId, days)
      return NextResponse.json({ conditions })
    } else {
      const conditions = await getConditions(spotId, new Date())
      return NextResponse.json({ conditions })
    }
  } catch (error) {
    console.error('Forecast API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast data' },
      { status: 500 }
    )
  }
}
