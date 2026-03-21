'use client'

const W = 280
const H = 64
const PAD_Y = 8

interface TidePoint {
  hour: number
  tideHeight: number
}

interface Props {
  tideData: TidePoint[]
  currentHour: number
  currentTideHeight: number
  currentTideMovement: 'rising' | 'falling' | 'slack'
}

const movementLabel: Record<Props['currentTideMovement'], string> = {
  rising: '上げ潮',
  falling: '引き潮',
  slack: '止まり',
}
const movementIcon: Record<Props['currentTideMovement'], string> = {
  rising: '↑',
  falling: '↓',
  slack: '→',
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    // Catmull-Rom → cubic Bezier
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export default function TideCurve({
  tideData,
  currentHour,
  currentTideHeight,
  currentTideMovement,
}: Props) {
  if (tideData.length === 0) return null

  const sorted = [...tideData].sort((a, b) => a.hour - b.hour)

  const heights = sorted.map(p => p.tideHeight)
  const minH = Math.min(...heights)
  const maxH = Math.max(...heights)
  const range = maxH - minH || 1

  // hour 0 → x=0, hour 24 → x=W
  const toX = (hour: number) => (hour / 24) * W
  const toY = (h: number) => PAD_Y + (1 - (h - minH) / range) * (H - PAD_Y * 2)

  const pts = sorted.map(p => ({ x: toX(p.hour), y: toY(p.tideHeight) }))
  const linePath = buildSmoothPath(pts)
  const fillPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(2)} ${H} L ${pts[0].x.toFixed(2)} ${H} Z`

  const cx = toX(currentHour)
  const cy = toY(currentTideHeight)

  const timeLabels = [0, 6, 12, 18, 24]

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '0.5px solid #eef1f4',
        borderRadius: 12,
        padding: '0.75rem 1rem',
      }}
    >
      <p
        style={{
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 14,
          color: '#0a1628',
          marginBottom: 8,
        }}
      >
        現在 {currentTideHeight}cm {movementIcon[currentTideMovement]}{' '}
        {movementLabel[currentTideMovement]}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 曲線下の塗り */}
        <path d={fillPath} fill="url(#tideGrad)" />

        {/* 曲線ライン */}
        <path
          d={linePath}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 現在時刻の破線 */}
        <line
          x1={cx}
          y1={PAD_Y}
          x2={cx}
          y2={H - PAD_Y}
          stroke="#0c4a6e"
          strokeWidth="1"
          strokeDasharray="3 2"
        />

        {/* 現在位置マーカー */}
        <circle cx={cx} cy={cy} r="4" fill="#0c4a6e" />
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        {timeLabels.map(h => (
          <span key={h} style={{ fontSize: 10, color: '#8899aa', fontWeight: 500 }}>
            {h}時
          </span>
        ))}
      </div>
    </div>
  )
}
