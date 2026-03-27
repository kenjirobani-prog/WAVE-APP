'use client'
import type { TideEvent } from '@/lib/wave/types'

interface Props {
  events: TideEvent[]
}

export default function TideCardStrip({ events }: Props) {
  if (events.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
      {Array.from({ length: 4 }, (_, i) => {
        const ev = events[i]
        if (!ev) {
          return <div key={i} />
        }
        const isHigh = ev.type === 'high'
        const labelColor = isHigh ? '#0369a1' : '#94a3b8'
        return (
          <div
            key={i}
            style={{
              background: '#f0f9ff',
              borderRadius: 8,
              padding: '6px 8px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 600, color: labelColor, lineHeight: 1.3, marginBottom: 2 }}>
              {isHigh ? '満' : '干'} {ev.label}
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', lineHeight: 1.1 }}>
              {ev.level}
            </p>
            <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.3 }}>cm</p>
          </div>
        )
      })}
    </div>
  )
}
