'use client'

interface Props {
  currentLevel: number
  trend: 'rising' | 'falling' | 'steady'
}

const TREND_CONFIG = {
  rising:  { icon: '↑', label: '上げ潮', color: '#0369a1' },
  falling: { icon: '↓', label: '引き潮', color: '#94a3b8' },
  steady:  { icon: '→', label: '停滞中', color: '#94a3b8' },
}

export default function TideStatusBar({ currentLevel, trend }: Props) {
  const cfg = TREND_CONFIG[trend]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
      {/* 緑ドット */}
      <span style={{
        display: 'inline-block',
        width: 6, height: 6,
        borderRadius: '50%',
        background: '#22c55e',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: '#94a3b8' }}>現在</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#0a1628' }}>
        {Math.round(currentLevel)}<span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 1 }}>cm</span>
      </span>
      {/* 右側：上げ/引き/停滞 */}
      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: cfg.color }}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  )
}
