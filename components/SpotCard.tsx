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
  if (h >= 2.0)  return 'オーバーヘッド'
  if (h >= 1.8)  return '頭〜オーバーヘッド'
  if (h >= 1.6)  return '頭'
  if (h >= 1.5)  return '肩〜頭'
  if (h >= 1.35) return '肩'
  if (h >= 1.2)  return '胸'
  if (h >= 1.0)  return '腹〜胸'
  if (h >= 0.8)  return '腹'
  if (h >= 0.65) return '腰〜腹'
  if (h >= 0.5)  return '腰'
  if (h >= 0.4)  return 'モモ〜腰'
  if (h >= 0.3)  return 'モモ'
  if (h >= 0.2)  return 'ヒザ〜モモ'
  if (h >= 0.1)  return 'ヒザ'
  return 'スネ以下'
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function scoreBarColor(s: number): string {
  if (s >= 80) return 'bg-[#0284c7]'
  if (s >= 60) return 'bg-sky-700'
  if (s >= 40) return 'bg-sky-500'
  return 'bg-slate-300'
}

function windShortLabel(type: ReturnType<typeof classifyWind>): string {
  if (type === 'calm') return '無風'
  if (type === 'offshore') return 'オフショア'
  if (type === 'side-offshore') return 'サイドオフ'
  if (type === 'side-onshore') return 'サイドオン'
  return 'オンショア'
}

function calcSetInterval(period: number): string {
  const minMin = Math.round((period * 5) / 60 * 10) / 10
  const maxMin = Math.round((period * 7) / 60 * 10) / 10
  if (minMin < 1) return `約${Math.round(period * 6 / 60 * 10) / 10}分`
  return `約${Math.floor(minMin)}〜${Math.ceil(maxMin)}分`
}

const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']

function swellDir8(deg: number): string {
  return COMPASS_8[Math.round(deg / 45) % 8]
}


export default function SpotCard({ spot, score, isFavorite, condition, date, isTop }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`
  const { count, ref: countRef } = useCountUp(score.score)
  const cellBg = isTop ? '#e0f2fe' : '#f8fafc'

  return (
    <Link href={href}>
      <div className={`rounded-xl border p-4 active:scale-[0.98] transition-all ${
        isTop
          ? 'bg-[#f0f9ff] border-[#7dd3fc]'
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
              <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', display: 'inline-block', marginTop: 2 }}>
                {waveHeightLabel(condition.waveHeight)}
              </span>
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
              <p style={{ fontSize: 11, fontWeight: 600 }} className="text-[#0a1628] leading-tight">{Math.round(condition.wavePeriod)}秒</p>
              <p style={{ fontSize: 8 }} className="text-[#64748b] leading-tight">{calcSetInterval(condition.wavePeriod)}/set</p>
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
