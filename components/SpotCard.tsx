'use client'
import Link from 'next/link'
import type { Spot } from '@/types'
import StarRating from './StarRating'
import { getWaveSizeLabel } from '@/lib/wave/waveSize'

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
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function SizePill({ height }: { height?: number }) {
  if (height == null) return null
  return (
    <span
      style={{
        fontSize: '11px',
        color: '#64748b',
        background: '#f1f5f9',
        borderRadius: '20px',
        padding: '1px 8px',
        display: 'inline-block',
        marginTop: '3px',
        whiteSpace: 'nowrap',
      }}
    >
      {getWaveSizeLabel(height)}
    </span>
  )
}

export default function SpotCard({ spot, stars, waveHeights, isCloseout, date }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`

  return (
    <Link href={href}>
      <div
        className={`rounded-xl p-4 active:scale-[0.98] ${
          isCloseout
            ? 'bg-white border-2 border-red-400'
            : 'bg-white border border-[#eef1f4] hover:border-sky-200 hover:bg-[#f0f9ff]'
        }`}
        style={{ borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s ease' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 pt-1">
            <h2 className="text-base font-bold text-[#0a1628] truncate">{spot.name}</h2>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            {isCloseout ? (
              <span className="text-xs font-bold text-red-500 pt-1">終日クローズアウト</span>
            ) : (
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">朝</span>
                  <StarRating stars={stars.morning} size="sm" />
                  <SizePill height={waveHeights?.morning} />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">昼</span>
                  <StarRating stars={stars.midday} size="sm" />
                  <SizePill height={waveHeights?.midday} />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">夕</span>
                  <StarRating stars={stars.evening} size="sm" />
                  <SizePill height={waveHeights?.evening} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#D0D8E0] mt-2">
          <span className="text-xs font-medium text-[#1A7A6E]">詳細を見る</span>
          <span className="text-sm text-[#1A7A6E] animate-bounce-x">›</span>
        </div>
      </div>
    </Link>
  )
}
