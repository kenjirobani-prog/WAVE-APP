'use client'

interface Props {
  currentLevel: number
  trend: 'rising' | 'falling' | 'steady'
}

const TREND_CONFIG = {
  rising:  { icon: '↑', label: '上げ潮', color: 'var(--ink-900)' },
  falling: { icon: '↓', label: '引き潮', color: 'var(--ink-500)' },
  steady:  { icon: '→', label: '停滞中', color: 'var(--ink-500)' },
}

export default function TideStatusBar({ currentLevel, trend }: Props) {
  const cfg = TREND_CONFIG[trend]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
      {/* 現在マーカードット（赤、TideCurve と統一） */}
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--alert-red)',
          flexShrink: 0,
        }}
      />
      <span
        className="font-jp"
        style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-500)' }}
      >
        現在
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
        <span
          className="font-display"
          style={{ fontSize: 16, color: 'var(--ink-900)', letterSpacing: '0.02em' }}
        >
          {Math.round(currentLevel)}
        </span>
        <span
          className="font-display"
          style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.06em' }}
        >
          CM
        </span>
      </span>
      {/* 右側：上げ/引き/停滞 */}
      <span
        className="font-jp"
        style={{
          marginLeft: 'auto',
          fontSize: 13,
          fontWeight: 700,
          color: cfg.color,
        }}
      >
        {cfg.icon} {cfg.label}
      </span>
    </div>
  )
}
