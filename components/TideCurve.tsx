'use client'

const W = 280
const H = 100
const PAD_X = 0
const PAD_Y = 10

// ミドルタイドゾーン（80〜120cm）
const MIDDLE_MIN = 80
const MIDDLE_MAX = 120

interface Props {
  tideSeries: number[]   // 24時間の潮位配列（インデックス=hour）
  currentHour: number    // 現在時刻（0〜23）
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export default function TideCurve({ tideSeries, currentHour }: Props) {
  if (tideSeries.length === 0) return null

  const filled = Array.from({ length: 24 }, (_, h) => tideSeries[h] ?? 0)
  const minH = Math.min(...filled)
  const maxH = Math.max(...filled)
  const range = maxH - minH || 1

  const toX = (hour: number) => PAD_X + (hour / 23) * (W - PAD_X * 2)
  const toY = (value: number) =>
    H - PAD_Y - ((value - minH) / range) * (H - PAD_Y * 2)

  const pts = filled.map((h, idx) => ({ x: toX(idx), y: toY(h) }))
  const linePath = buildSmoothPath(pts)
  const fillPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(2)} ${H} L ${pts[0].x.toFixed(2)} ${H} Z`

  const markerX = toX(currentHour)
  const markerY = toY(filled[currentHour] ?? minH)

  // ミドルタイドゾーンのY座標
  const zoneTopY = toY(MIDDLE_MAX)
  const zoneBotY = toY(MIDDLE_MIN)
  const zoneH = Math.max(0, zoneBotY - zoneTopY)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="tideGradC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* 曲線下塗り */}
      <path d={fillPath} fill="url(#tideGradC)" />

      {/* 曲線ライン */}
      <path
        d={linePath}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 現在時刻の縦点線 */}
      <line
        x1={markerX} y1={PAD_Y}
        x2={markerX} y2={H - PAD_Y}
        stroke="#22c55e"
        strokeWidth="1"
        strokeDasharray="3 2"
      />

      {/* 現在時刻の緑ドット */}
      <circle cx={markerX} cy={markerY} r="5" fill="#22c55e" />
    </svg>
  )
}
