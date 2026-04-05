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
  isFavorite?: boolean
  date?: Date
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SpotCard({ spot, stars, isCloseout, isFavorite, date }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`

  return (
    <Link href={href}>
      <div className={`rounded-xl p-4 active:scale-[0.98] transition-all ${
        isCloseout
          ? 'bg-white border-2 border-red-400'
          : 'bg-white border border-[#eef1f4] hover:border-sky-200 hover:bg-[#f8feff]'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-[#0a1628] truncate">{spot.name}</h2>
            {isFavorite && (
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full tracking-wide shrink-0">
                よく行く
              </span>
            )}
          </div>
          {isCloseout ? (
            <span className="text-xs font-bold text-red-500 shrink-0">終日クローズアウト</span>
          ) : (
            <div className="flex gap-3 shrink-0">
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
    </Link>
  )
}
