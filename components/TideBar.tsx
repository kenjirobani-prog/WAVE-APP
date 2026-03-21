'use client'

interface TidePoint {
  hour: number
  tideHeight: number
}

interface Props {
  tideData: TidePoint[]
  currentHour: number
}

export default function TideBar({ tideData, currentHour }: Props) {
  if (tideData.length === 0) return null

  const sorted = [...tideData].sort((a, b) => a.hour - b.hour)
  const currentPoint = sorted.find(p => p.hour === currentHour)
  const prevPoint = sorted.find(p => p.hour === currentHour - 1)

  const currentTide = currentPoint?.tideHeight ?? sorted[Math.floor(sorted.length / 2)].tideHeight
  const prevTide = prevPoint?.tideHeight

  const isRising = prevTide !== undefined ? currentTide > prevTide : false
  const movementText = isRising ? '↑ 上げ潮' : '↓ 引き潮'

  const heights = sorted.map(p => p.tideHeight)
  const minTide = Math.min(...heights)
  const maxTide = Math.max(...heights)
  const range = maxTide - minTide || 1
  const percent = Math.max(0, Math.min(100, ((currentTide - minTide) / range) * 100))

  return (
    <div>
      {/* 潮位値と満ち引き */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-[#0a1628]">{currentTide}cm</span>
        <span className={`text-sm font-semibold ${isRising ? 'text-sky-500' : 'text-amber-500'}`}>
          {movementText}
        </span>
      </div>

      {/* 横バー */}
      <div className="flex items-center gap-2 text-xs text-[#8899aa]">
        <span>干潮</span>
        <div className="flex-1 relative h-4 bg-[#eef1f4] rounded-full overflow-visible">
          {/* バー本体 */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full"
            style={{ width: `${percent}%`, background: '#0ea5e9' }}
          />
          {/* 現在位置マーカー */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#0ea5e9] rounded-full shadow-sm"
            style={{ left: `${percent}%` }}
          />
        </div>
        <span>満潮</span>
      </div>
    </div>
  )
}
