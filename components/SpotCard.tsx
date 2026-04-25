'use client'
import Link from 'next/link'
import type { Spot } from '@/types'
import { getWaveSizeLabel } from '@/lib/wave/waveSize'
import StarRating from '@/components/StarRating'
import ArrowButton from '@/components/ui/ArrowButton'

interface TimeSlotStars {
  morning: number
  midday: number
  evening: number
}

interface TimeSlotWaveHeights {
  morning: number
  midday: number
  evening: number
}

interface Props {
  spot: Spot
  stars: TimeSlotStars
  waveHeights?: TimeSlotWaveHeights
  isCloseout?: boolean
  date?: Date
  index?: number
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SpotCard({ spot, stars, waveHeights, isCloseout, date, index = 0 }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`
  const altBg = index % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
  const nameEn = (spot.nameEn || spot.name).toUpperCase()

  if (isCloseout) {
    return (
      <Link
        href={href}
        className="block p-5"
        style={{
          background: 'var(--alert-red-bg)',
          borderBottom: '1px solid var(--ink-900)',
          textDecoration: 'none',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div
              className="font-display text-3xl leading-[0.95]"
              style={{ color: 'var(--alert-red)' }}
            >
              {nameEn}
            </div>
            <div
              className="font-jp text-[13px] font-bold mt-1"
              style={{ color: 'var(--alert-red)' }}
            >
              {spot.name}
            </div>
            <div
              className="font-jp text-xs font-black mt-2"
              style={{ color: 'var(--alert-red)', letterSpacing: '0.05em' }}
            >
              ⚠ クローズアウト
            </div>
          </div>
          <ArrowButton variant="red" />
        </div>
      </Link>
    )
  }

  const timeSlots = [
    { label: '朝', score: stars.morning, waveHeight: waveHeights?.morning },
    { label: '昼', score: stars.midday, waveHeight: waveHeights?.midday },
    { label: '夕', score: stars.evening, waveHeight: waveHeights?.evening },
  ]

  return (
    <Link
      href={href}
      className="block p-5"
      style={{
        background: altBg,
        color: 'var(--ink-900)',
        borderBottom: '1px solid var(--ink-900)',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-end justify-between mb-3.5 gap-4">
        <div className="min-w-0">
          <div className="font-display text-3xl leading-[0.95]">
            {nameEn}
          </div>
          <div className="font-jp text-[13px] font-bold mt-1">
            {spot.name}
          </div>
        </div>
        <ArrowButton variant="dark" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {timeSlots.map(slot => (
          <div
            key={slot.label}
            className="text-center"
            style={{
              background: 'var(--paper-100)',
              color: 'var(--ink-900)',
              border: '1px solid var(--ink-900)',
              padding: '12px 8px',
            }}
          >
            <div className="font-jp text-base font-black">{slot.label}</div>
            <div className="my-2 flex justify-center">
              <StarRating stars={slot.score} size="xs" />
            </div>
            <div className="font-jp text-[10px] font-bold">
              {slot.waveHeight && slot.waveHeight > 0 ? getWaveSizeLabel(slot.waveHeight) : '-'}
            </div>
          </div>
        ))}
      </div>
    </Link>
  )
}
