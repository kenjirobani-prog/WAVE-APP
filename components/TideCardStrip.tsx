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
        const labelColor = isHigh ? 'var(--ink-900)' : 'var(--ink-500)'
        return (
          <div
            key={i}
            style={{
              background: 'var(--paper-300)',
              border: '1px solid var(--ink-900)',
              borderRadius: 0,
              padding: '8px 6px',
              textAlign: 'center',
            }}
          >
            <p
              className="font-jp"
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: labelColor,
                lineHeight: 1.3,
                marginBottom: 2,
                margin: 0,
              }}
            >
              {isHigh ? '満' : '干'}
            </p>
            <p
              className="font-jp"
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--ink-700)',
                lineHeight: 1.3,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {ev.label}
            </p>
            <p
              className="font-display"
              style={{
                fontSize: 18,
                color: 'var(--ink-900)',
                lineHeight: 1,
                letterSpacing: '0.02em',
                margin: 0,
              }}
            >
              {Math.round(ev.level)}
            </p>
            <p
              className="font-display"
              style={{
                fontSize: 9,
                color: 'var(--ink-500)',
                lineHeight: 1.3,
                letterSpacing: '0.06em',
                margin: 0,
                marginTop: 1,
              }}
            >
              CM
            </p>
          </div>
        )
      })}
    </div>
  )
}
