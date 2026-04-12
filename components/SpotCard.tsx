'use client'
import Link from 'next/link'
import type { Spot } from '@/types'
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

function renderStars(score: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(score)))
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

export default function SpotCard({ spot, stars, waveHeights, isCloseout, date }: Props) {
  const href = date ? `/spot/${spot.id}?date=${toDateString(date)}` : `/spot/${spot.id}`

  const timeSlots = [
    { label: '朝', stars: stars.morning, waveHeight: waveHeights?.morning },
    { label: '昼', stars: stars.midday, waveHeight: waveHeights?.midday },
    { label: '夕', stars: stars.evening, waveHeight: waveHeights?.evening },
  ]

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'white',
          border: isCloseout ? '2px solid #f87171' : '0.5px solid #e2e8f0',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
          marginBottom: 8,
          transition: 'background 0.15s ease',
        }}
      >
        {/* スポット名 */}
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#0a1628',
          minWidth: 72,
          whiteSpace: 'nowrap',
        }}>
          {spot.name}
        </span>

        {/* 朝・昼・夕 */}
        {isCloseout ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', flex: 1, textAlign: 'center' }}>
            終日クローズアウト
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 16, flex: 1, justifyContent: 'center' }}>
            {timeSlots.map(slot => (
              <div key={slot.label} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
              }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                  {slot.label}
                </span>
                <span style={{ color: '#f59e0b', fontSize: 11, letterSpacing: '0.5px' }}>
                  {renderStars(slot.stars)}
                </span>
                {slot.waveHeight != null && slot.waveHeight > 0 && (
                  <span style={{
                    fontSize: 10,
                    color: '#64748b',
                    background: '#f1f5f9',
                    borderRadius: 20,
                    padding: '1px 7px',
                    whiteSpace: 'nowrap',
                  }}>
                    {getWaveSizeLabel(slot.waveHeight)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ▶ボタン */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#378ADD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: 'pulseRight 1s ease-in-out infinite',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="white" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  )
}
