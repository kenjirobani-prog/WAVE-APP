'use client'
import Link from 'next/link'
import type { Spot, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import ScoreGrade from './ScoreGrade'
import { useCountUp } from '@/hooks/useCountUp'
import { classifyWind, waveQualityLabel, waveQualityColor } from '@/lib/wave/scoring'

interface Props {
  spot: Spot
  score: SpotScore
  isFavorite?: boolean
  condition?: WaveCondition | null
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

function windShortLabel(type: ReturnType<typeof classifyWind>): string {
  if (type === 'calm') return '無風'
  if (type === 'offshore') return 'OFF'
  if (type === 'side-offshore') return 'S-OFF'
  if (type === 'side-onshore') return 'S-ON'
  return 'ON'
}

const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']

function swellDir8(deg: number): string {
  return COMPASS_8[Math.round(deg / 45) % 8]
}

function periodLabel(s: number): string {
  if (s >= 8) return 'うねりあり'
  if (s >= 6) return '普通'
  return '短め'
}

export default function SpotCard({ spot, score, isFavorite, condition, date, isTop }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`
  const { count, ref: countRef } = useCountUp(score.score)
  const cellBg = isTop ? '#e0f2fe' : '#f8fafc'

  return (
    <Link href={href}>
      <div className={`rounded-xl border p-4 active:scale-[0.98] transition-all ${
        isTop
          ? 'bg-sky-50 border-sky-200'
          : 'bg-white border-[#eef1f4] hover:border-sky-200 hover:bg-[#f8feff]'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <ScoreGrade grade={score.grade} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0a1628]">{spot.name}</h2>
              {isFavorite && (
                <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full tracking-wide">
                  よく行く
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span ref={countRef as React.Ref<HTMLSpanElement>} className="text-2xl font-bold text-[#0a1628]">{count}</span>
            <span className="text-xs text-[#8899aa] block">/ 100</span>
          </div>
        </div>

        {/* 5指標グリッド */}
        {condition ? (
          <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div style={{ background: cellBg, borderRadius: 7 }} className="p-2 text-center">
              <p style={{ fontSize: 8 }} className="text-[#94a3b8] mb-0.5">波高</p>
              <p style={{ fontSize: 11, fontWeight: 600 }} className="text-[#0a1628] leading-tight">{condition.waveHeight.toFixed(1)}m</p>
              <p style={{ fontSize: 8 }} className="text-[#64748b] leading-tight">{waveHeightLabel(condition.waveHeight)}</p>
            </div>
            <div style={{ background: cellBg, borderRadius: 7 }} className="p-2 text-center">
              <p style={{ fontSize: 8 }} className="text-[#94a3b8] mb-0.5">風</p>
              <p style={{ fontSize: 11, fontWeight: 600 }} className="text-[#0a1628] leading-tight">{windShortLabel(classifyWind(condition.windDir, condition.windSpeed))}</p>
              <p style={{ fontSize: 8 }} className="text-[#64748b] leading-tight">{condition.windSpeed.toFixed(1)}m/s</p>
            </div>
            <div style={{ background: cellBg, borderRadius: 7 }} className="p-2 text-center">
              <p style={{ fontSize: 8 }} className="text-[#94a3b8] mb-0.5">うねり</p>
              <p style={{ fontSize: 11, fontWeight: 600 }} className="text-[#0a1628] leading-tight">{swellDir8(condition.swellDir)}</p>
            </div>
            <div style={{ background: cellBg, borderRadius: 7 }} className="p-2 text-center">
              <p style={{ fontSize: 8 }} className="text-[#94a3b8] mb-0.5">周期</p>
              <p style={{ fontSize: 11, fontWeight: 600 }} className="text-[#0a1628] leading-tight">{condition.wavePeriod}s</p>
              <p style={{ fontSize: 8 }} className="text-[#64748b] leading-tight">{periodLabel(condition.wavePeriod)}</p>
            </div>
            {(() => {
              const qScore = score.breakdown.waveQuality
              const { text, bg } = waveQualityColor(qScore)
              return (
                <div style={{ background: bg, borderRadius: 7 }} className="p-2 text-center">
                  <p style={{ fontSize: 8, color: '#94a3b8' }} className="mb-0.5">波質</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: text, lineHeight: 1.2 }}>{waveQualityLabel(qScore)}</p>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="mb-3" />
        )}

        {/* スコアバー */}
        <div className="h-1 bg-[#eef1f4] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(score.score)}`}
            style={{ width: `${score.score}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
