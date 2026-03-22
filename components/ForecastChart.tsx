'use client'
import { useRef } from 'react'
import type { WaveCondition } from '@/lib/wave/types'
import type { UserProfile, WindType } from '@/types'
import { classifyWind } from '@/lib/wave/scoring'

interface Props {
  conditions: WaveCondition[]
  profile: UserProfile
  showNowMarker?: boolean
  onFirstScroll?: () => void
}

const PREFERRED_SIZE_M: Record<UserProfile['preferredSize'], number> = {
  'ankle': 0.3,
  'waist-chest': 0.8,
  'head': 1.5,
  'overhead': 2.0,
}

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'OH'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ'
}

function getBarColor(waveHeight: number, preferred: number): string {
  if (waveHeight >= preferred) return 'bg-emerald-400'
  if (waveHeight >= preferred - 0.3) return 'bg-blue-400'
  return 'bg-sky-200'
}

function windTypeColor(type: WindType): string {
  if (type === 'calm') return 'text-slate-300'
  if (type === 'offshore') return 'text-emerald-500'
  if (type === 'side-offshore') return 'text-blue-400'
  if (type === 'side-onshore') return 'text-amber-400'
  return 'text-red-400'
}

function windTypeShort(type: WindType): string {
  if (type === 'calm') return '無風'
  if (type === 'offshore') return 'OFF'
  if (type === 'side-offshore') return 'S-OFF'
  if (type === 'side-onshore') return 'S-ON'
  return 'ON'
}

function WindCell({ dir, speed }: { dir: number; speed: number }) {
  const type = classifyWind(dir, speed)
  const color = windTypeColor(type)
  return (
    <div className={`flex flex-col items-center gap-0 ${color}`}>
      <span
        className="text-sm leading-tight"
        style={{ transform: `rotate(${dir}deg)`, display: 'inline-block' }}
      >
        ↑
      </span>
      <span className="text-[10px] leading-tight">{speed.toFixed(1)}</span>
      <span className="text-[10px] leading-tight font-semibold">{windTypeShort(type)}</span>
    </div>
  )
}

export default function ForecastChart({ conditions, profile, showNowMarker = true, onFirstScroll }: Props) {
  const preferred = PREFERRED_SIZE_M[profile.preferredSize]
  const maxHeight = Math.max(...conditions.map(c => c.waveHeight), 1)
  const now = new Date()
  const scrolledRef = useRef(false)

  // 基準日（最初のエントリの日付）
  const baseDay = conditions.length > 0
    ? new Date(conditions[0].timestamp).toDateString()
    : null

  function handleScroll() {
    if (!scrolledRef.current && onFirstScroll) {
      scrolledRef.current = true
      onFirstScroll()
    }
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4" onScroll={handleScroll}>
      <div className="flex gap-1.5 pb-2" style={{ minWidth: `${conditions.length * 52}px` }}>
        {conditions.map((c, i) => {
          const ts = new Date(c.timestamp)
          const hour = ts.getHours()
          const isNextDay = baseDay !== null && ts.toDateString() !== baseDay
          const isNow = showNowMarker && Math.abs(ts.getTime() - now.getTime()) < 1800000
          const barHeight = Math.round((c.waveHeight / maxHeight) * 80)

          return (
            <div key={i} className="flex flex-col items-center gap-0.5 w-12 shrink-0">
              {/* 波高バー */}
              <div className="h-20 flex items-end w-full">
                <div
                  className={`w-full rounded-t-sm ${getBarColor(c.waveHeight, preferred)}`}
                  style={{ height: `${Math.max(barHeight, 4)}px` }}
                />
              </div>
              {/* 波高数値・体感サイズ */}
              <span className="text-xs text-slate-600 font-medium leading-none">{c.waveHeight.toFixed(1)}m</span>
              <span className="text-[10px] text-slate-400 leading-none">{waveHeightLabel(c.waveHeight)}</span>
              {/* 風（矢印・速度・種別） */}
              <WindCell dir={c.windDir} speed={c.windSpeed} />
              {/* 時間 */}
              <span className={`text-[10px] font-medium leading-none ${isNow ? 'text-sky-600' : isNextDay ? 'text-slate-300' : 'text-slate-400'}`}>
                {isNow ? '▲' : ''}{isNextDay ? '翌' : ''}{hour}時
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
