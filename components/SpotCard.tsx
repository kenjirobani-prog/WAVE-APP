'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Spot, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import ScoreGrade from './ScoreGrade'
import { useCountUp } from '@/hooks/useCountUp'
import { classifyWind, windTypeLabel } from '@/lib/wave/scoring'

interface Props {
  spot: Spot
  score: SpotScore
  isFavorite?: boolean
  waveHeight?: number
  date?: Date
  isTop?: boolean
  condition?: WaveCondition | null
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

function tideLabel(m: 'rising' | 'falling' | 'slack'): string {
  if (m === 'rising') return '上げ潮'
  if (m === 'falling') return '下げ潮'
  return '止まり'
}

export default function SpotCard({ spot, score, isFavorite, waveHeight, date, isTop, condition }: Props) {
  const router = useRouter()
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`
  const { count, ref: countRef } = useCountUp(score.score)

  const [showSheet, setShowSheet] = useState(false)
  const [sheetAnimate, setSheetAnimate] = useState(false)
  const touchStartY = useRef(0)

  function openSheet() {
    try { navigator.vibrate(10) } catch {}
    setShowSheet(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetAnimate(true))
    })
  }

  function closeSheet() {
    setSheetAnimate(false)
    setTimeout(() => setShowSheet(false), 300)
  }

  function handleSheetTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleSheetTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 60) closeSheet()
  }

  return (
    <>
      <div
        onClick={openSheet}
        className={`rounded-xl border p-4 active:scale-[0.98] transition-all cursor-pointer ${
          isTop
            ? 'bg-sky-50 border-sky-200'
            : 'bg-white border-[#eef1f4] hover:border-sky-200 hover:bg-[#f8feff]'
        }`}
      >
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

      {/* ボトムシート */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ opacity: sheetAnimate ? 1 : 0, transition: 'opacity 300ms ease-out' }}
            onClick={closeSheet}
          />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md"
            style={{
              transform: sheetAnimate ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 300ms ease-out',
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchEnd={handleSheetTouchEnd}
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#dde3ea] rounded-full" />
            </div>

            <div className="px-5 pb-8">
              {/* スポット名 + グレード + スコア */}
              <div className="flex items-center gap-3 mb-4">
                <ScoreGrade grade={score.grade} size="lg" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[#0a1628]">{spot.name}</h2>
                  {isFavorite && (
                    <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full tracking-wide">
                      よく行く
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-bold text-[#0a1628]">{score.score}</span>
                  <span className="text-xs text-[#8899aa] block">/ 100</span>
                </div>
              </div>

              {/* タグ */}
              {score.reasonTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {score.reasonTags.map(tag => (
                    <span key={tag} className="text-[10px] font-medium bg-[#f0f4f8] text-[#8899aa] px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* コンディション4ミニカード */}
              {condition && (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  <div className="bg-[#f0f4f8] rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#8899aa] mb-1">波高</p>
                    <p className="text-sm font-bold text-[#0a1628]">{condition.waveHeight.toFixed(1)}m</p>
                    <p className="text-[9px] text-[#8899aa]">{waveHeightLabel(condition.waveHeight)}</p>
                  </div>
                  <div className="bg-[#f0f4f8] rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#8899aa] mb-1">風</p>
                    <p className="text-sm font-bold text-[#0a1628]">{condition.windSpeed.toFixed(1)}</p>
                    <p className="text-[9px] text-[#8899aa]">{windTypeLabel(classifyWind(condition.windDir, condition.windSpeed))}</p>
                  </div>
                  <div className="bg-[#f0f4f8] rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#8899aa] mb-1">うねり</p>
                    <p className="text-sm font-bold text-[#0a1628]">{condition.wavePeriod}s</p>
                    <p className="text-[9px] text-[#8899aa]">{condition.swellDir}°</p>
                  </div>
                  <div className="bg-[#f0f4f8] rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#8899aa] mb-1">潮</p>
                    <p className="text-sm font-bold text-[#0a1628]">{condition.tideHeight}cm</p>
                    <p className="text-[9px] text-[#8899aa]">{tideLabel(condition.tideMovement)}</p>
                  </div>
                </div>
              )}

              {/* 詳細ボタン */}
              <button
                onClick={() => router.push(href)}
                className="w-full py-3.5 bg-sky-900 text-white rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
              >
                詳細を見る →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
