'use client'
import Link from 'next/link'
import type { Spot } from '@/types'
import StarRating from './StarRating'

interface TimeSlotStars {
  morning: number
  midday: number
  evening: number
}

interface Props {
  spot: Spot
  stars: TimeSlotStars
  isCloseout?: boolean
  date?: Date
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SpotCard({ spot, stars, isCloseout, date }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`

  return (
    <Link href={href}>
      <div
        style={{
          background: 'var(--surface)',
          border: isCloseout ? '1px solid #dc2626' : '0.5px solid var(--border)',
          borderRadius: 8,
          padding: '18px 20px',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
        className="hover:bg-[var(--hover)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: 17,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
              className="truncate"
            >
              {spot.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCloseout ? (
              <span className="text-xs font-semibold text-red-600">終日クローズアウト</span>
            ) : (
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>朝</span>
                  <StarRating stars={stars.morning} size="sm" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>昼</span>
                  <StarRating stars={stars.midday} size="sm" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>夕</span>
                  <StarRating stars={stars.evening} size="sm" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          className="flex items-center justify-end gap-1 pt-3 mt-3"
          style={{ borderTop: '0.5px solid var(--border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>詳細を見る</span>
          <span className="text-sm animate-bounce-x" style={{ color: 'var(--text-secondary)' }}>›</span>
        </div>
      </div>
    </Link>
  )
}
