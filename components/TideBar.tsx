'use client'

interface Props {
  tideHeight: number      // cm
  tideMovement: 'rising' | 'falling' | 'slack'
  minTide?: number        // 表示範囲min（デフォルト0）
  maxTide?: number        // 表示範囲max（デフォルト200）
}

const movementLabel: Record<Props['tideMovement'], string> = {
  rising: '上げ潮',
  falling: '引き潮',
  slack: '止まり',
}

const movementIcon: Record<Props['tideMovement'], string> = {
  rising: '↑',
  falling: '↓',
  slack: '→',
}

export default function TideBar({
  tideHeight,
  tideMovement,
  minTide = 0,
  maxTide = 200,
}: Props) {
  const percent = Math.round(((tideHeight - minTide) / (maxTide - minTide)) * 100)
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-slate-500">
        <span>干潮</span>
        <span className="font-semibold text-slate-700">
          {tideHeight}cm{' '}
          <span className={tideMovement === 'rising' ? 'text-blue-500' : tideMovement === 'falling' ? 'text-amber-500' : 'text-slate-400'}>
            {movementIcon[tideMovement]} {movementLabel[tideMovement]}
          </span>
        </span>
        <span>満潮</span>
      </div>
      <div className="relative h-4 bg-slate-200 rounded-full overflow-visible">
        {/* 最適範囲ハイライト */}
        <div className="absolute top-0 bottom-0 bg-emerald-100 rounded-full" style={{ left: '40%', right: '40%' }} />
        {/* バー */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-sky-300 to-sky-500 rounded-full transition-all"
          style={{ width: `${clamped}%` }}
        />
        {/* 現在位置マーカー */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-sky-500 rounded-full shadow-sm"
          style={{ left: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
