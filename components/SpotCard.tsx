'use client'
import Link from 'next/link'
import type { Spot, SpotScore } from '@/types'
import ScoreGrade from './ScoreGrade'

interface Props {
  spot: Spot
  score: SpotScore
  isFavorite?: boolean
  waveHeight?: number
  date?: Date  // 表示対象の日付（詳細画面に渡す）
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

export default function SpotCard({ spot, score, isFavorite, waveHeight, date }: Props) {
  const href = date
    ? `/spot/${spot.id}?date=${toDateString(date)}`
    : `/spot/${spot.id}`

  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
        <ScoreGrade grade={score.grade} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">{spot.name}</h2>
            {isFavorite && (
              <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">
                お気に入り
              </span>
            )}
          </div>
          {waveHeight !== undefined && (
            <p className="text-sm font-medium text-sky-600 mt-0.5">
              {waveHeight.toFixed(1)}m
              <span className="text-slate-400 font-normal ml-1">({waveHeightLabel(waveHeight)})</span>
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {score.reasonTags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-2xl font-bold text-slate-700">{score.score}</span>
          <span className="text-xs text-slate-400 block">/ 100</span>
        </div>
      </div>
    </Link>
  )
}
