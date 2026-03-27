import { NextRequest, NextResponse } from 'next/server'
import { getConditions, getForecast } from '@/lib/wave/waveService'
import { detectTideEvents } from '@/lib/wave/types'
import { calcWaveEnergy } from '@/lib/wave/scoring'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const spotId = searchParams.get('spotId')
  const type = searchParams.get('type') ?? 'daily' // 'daily' | 'forecast'
  const days = parseInt(searchParams.get('days') ?? '3', 10)
  const dateParam = searchParams.get('date') // YYYY-MM-DD (省略時は今日)

  if (!spotId) {
    return NextResponse.json({ error: 'spotId is required' }, { status: 400 })
  }

  try {
    if (type === 'forecast') {
      const conditions = await getForecast(spotId, days)
      return NextResponse.json({ conditions })
    } else {
      // daily: 指定日、または今日のデータを返す
      let date: Date
      if (dateParam) {
        date = new Date(`${dateParam}T12:00:00+09:00`)
      } else {
        date = new Date()
      }
      const conditions = await getConditions(spotId, date)
      // 24時間潮位配列（hour 0-23 の順）を作り、満干潮イベントを検出
      const tideByHour = Array.from({ length: 24 }, (_, h) => {
        const c = conditions.find(c => (new Date(c.timestamp).getUTCHours() + 9) % 24 === h)
        return c?.tideHeight ?? 0
      })
      const tideEvents = detectTideEvents(tideByHour)
      // 各時間帯に波エネルギーを付加
      const conditionsWithEnergy = conditions.map(c => ({
        ...c,
        waveEnergy: Math.round(calcWaveEnergy(c.waveHeight, c.wavePeriod) * 10) / 10,
      }))
      return NextResponse.json({ conditions: conditionsWithEnergy, tideEvents })
    }
  } catch (error) {
    console.error('Forecast API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast data' },
      { status: 500 }
    )
  }
}
