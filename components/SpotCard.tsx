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
        className={`rounded-xl p-4 active:scale-[0.98] ${
          isCloseout
            ? 'bg-white border-2 border-red-400'
            : 'bg-white border border-[#eef1f4] hover:border-sky-200 hover:bg-[#f0f9ff]'
        }`}
        style={{ borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s ease' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-[#0a1628] truncate">{spot.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCloseout ? (
              <span className="text-xs font-bold text-red-500">終日クローズアウト</span>
            ) : (
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">朝</span>
                  <StarRating stars={stars.morning} size="sm" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">昼</span>
                  <StarRating stars={stars.midday} size="sm" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#94a3b8] font-semibold">夕</span>
                  <StarRating stars={stars.evening} size="sm" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#D0D8E0] mt-2">
          <span className="text-xs font-medium text-[#1A7A6E]">{spot.livecam?.type ? '詳細・ライブカメラを見る' : '詳細を見る'}</span>
          <span className="text-sm text-[#1A7A6E] animate-bounce-x">›</span>
        </div>
      </div>
    </Link>
  )
}
