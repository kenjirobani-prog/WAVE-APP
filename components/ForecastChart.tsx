'use client'
import type { WaveCondition } from '@/lib/wave/types'
import type { UserProfile } from '@/types'
import { classifyWind } from '@/lib/wave/scoring'

interface Props {
  conditions: WaveCondition[]
  profile: UserProfile
  spotFacing: number
}

const PREFERRED_SIZE_M: Record<UserProfile['preferredSize'], number> = {
  'ankle': 0.3,
  'waist-chest': 0.8,
  'head': 1.5,
  'overhead': 2.0,
}

function getBarColor(waveHeight: number, preferred: number): string {
  if (waveHeight >= preferred) return 'bg-emerald-400'
  if (waveHeight >= preferred - 0.3) return 'bg-blue-400'
  return 'bg-sky-200'
}

function getWindColor(windDir: number, spotFacing: number): string {
  const type = classifyWind(windDir, spotFacing)
  if (type === 'offshore') return 'text-emerald-500'
  if (type === 'side-offshore') return 'text-blue-400'
  if (type === 'side') return 'text-amber-400'
  return 'text-red-400'
}

function WindArrow({ dir, spotFacing }: { dir: number; spotFacing: number }) {
  const color = getWindColor(dir, spotFacing)
  return (
    <span
      className={`inline-block text-lg leading-none ${color}`}
      style={{ transform: `rotate(${dir}deg)` }}
    >
      ↑
    </span>
  )
}

export default function ForecastChart({ conditions, profile, spotFacing }: Props) {
  const preferred = PREFERRED_SIZE_M[profile.preferredSize]
  const maxHeight = Math.max(...conditions.map(c => c.waveHeight), 1)
  const now = new Date()

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-2 pb-2" style={{ minWidth: `${conditions.length * 56}px` }}>
        {conditions.map((c, i) => {
          const hour = new Date(c.timestamp).getHours()
          const isNow = Math.abs(new Date(c.timestamp).getTime() - now.getTime()) < 1800000
          const barHeight = Math.round((c.waveHeight / maxHeight) * 80)

          return (
            <div key={i} className="flex flex-col items-center gap-1 w-12 shrink-0">
              {/* 波高バー */}
              <div className="h-20 flex items-end w-full">
                <div
                  className={`w-full rounded-t-sm ${getBarColor(c.waveHeight, preferred)}`}
                  style={{ height: `${Math.max(barHeight, 4)}px` }}
                  title={`${c.waveHeight.toFixed(1)}m`}
                />
              </div>
              {/* 波高数値 */}
              <span className="text-xs text-slate-500">{c.waveHeight.toFixed(1)}m</span>
              {/* 風矢印 */}
              <WindArrow dir={c.windDir} spotFacing={spotFacing} />
              {/* 時間 */}
              <span className={`text-xs font-medium ${isNow ? 'text-sky-600' : 'text-slate-400'}`}>
                {isNow ? '▲' : ''}{hour}時
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
