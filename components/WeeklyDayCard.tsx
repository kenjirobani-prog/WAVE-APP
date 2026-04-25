'use client'
import StarRating from '@/components/StarRating'

const DAY_INFO = [
  { en: 'SUN', color: 'var(--alert-red)' },
  { en: 'MON', color: 'var(--ink-900)' },
  { en: 'TUE', color: 'var(--ink-900)' },
  { en: 'WED', color: 'var(--ink-900)' },
  { en: 'THU', color: 'var(--ink-900)' },
  { en: 'FRI', color: 'var(--ink-900)' },
  { en: 'SAT', color: 'var(--accent-saturday)' },
]

interface Props {
  date: Date
  dateStr: string
  bestStars: number
  isCloseout: boolean
  comment?: string
  generatedAt?: string
  index?: number
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function WeeklyDayCard({ date, bestStars, isCloseout, comment, index = 0 }: Props) {
  const day = DAY_INFO[date.getDay()]
  const altBg = index % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
  const bg = isCloseout ? 'var(--alert-red-bg)' : altBg

  return (
    <div
      className="py-4 px-5"
      style={{
        background: bg,
        borderBottom: '1px solid var(--ink-900)',
      }}
    >
      <div className="flex items-start gap-4">
        <div style={{ width: 60, flexShrink: 0 }}>
          <div
            className="font-display text-2xl leading-none"
            style={{ color: day.color }}
          >
            {day.en}
          </div>
          <div
            className="font-jp text-[11px] font-bold mt-1"
            style={{ color: 'var(--ink-500)' }}
          >
            {formatMD(date)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {!isCloseout ? (
            <StarRating stars={bestStars} size="sm" />
          ) : (
            <div
              className="font-jp text-[11px] font-bold tracking-[0.1em]"
              style={{ color: 'var(--alert-red)' }}
            >
              クローズアウト
            </div>
          )}
          {comment && (
            <div
              className="font-jp text-[11px] mt-1.5 font-medium leading-[1.7]"
              style={{ color: 'var(--ink-500)' }}
            >
              {comment}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
