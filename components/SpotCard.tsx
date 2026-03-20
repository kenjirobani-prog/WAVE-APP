'use client'
import Link from 'next/link'
import type { Spot, SpotScore } from '@/types'
import ScoreGrade from './ScoreGrade'
import { useCountUp } from '@/hooks/useCountUp'

interface Props {
  spot: Spot
  score: SpotScore
  isFavorite?: boolean
  waveHeight?: number
  date?: Date
  isTop?: boolean
}

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'オーバーヘッド'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸〜肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ以下'
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function scoreBarColor(s: number): string {
  if (s >= 80) return 'bg-sky-900'
  if (s >= 60) return 'bg-sky-700'
  if (s >= 40) return 'bg-sky-500'
  return 'bg-slate-300'
}

export default function SpotCard({ spot, score, isFavorite, waveHeight, date, isTop }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`
  const { count, ref: countRef } = useCountUp(score.score)

  return (
    <Link href={href}>
      <div className={`rounded-xl border p-4 active:scale-[0.98] transition-all ${
        isTop
          ? 'bg-sky-50 border-sky-200'
          : 'bg-white border-[#eef1f4] hover:border-sky-200 hover:bg-[#f8feff]'
      }`}>
        <div className="flex items-center gap-3">
          <ScoreGrade grade={score.grade} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-[#0a1628]">{spot.name}</h2>
              {isFavorite && (
                <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full tracking-wide">
                  よく行く
                </span>
              )}
            </div>
            {waveHeight !== undefined && (
              <p className="text-sm font-semibold text-sky-700">
                {waveHeight.toFixed(1)}m
                <span className="text-[#8899aa] font-normal ml-1">({waveHeightLabel(waveHeight)})</span>
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {score.reasonTags.map(tag => (
                <span key={tag} className="text-[10px] font-medium bg-[#f0f4f8] text-[#8899aa] px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span ref={countRef as React.Ref<HTMLSpanElement>} className="text-2xl font-bold text-[#0a1628]">{count}</span>
            <span className="text-xs text-[#8899aa] block">/ 100</span>
          </div>
        </div>

        {/* スコアバー */}
        <div className="mt-3 h-1 bg-[#eef1f4] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(score.score)}`}
            style={{ width: `${score.score}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
