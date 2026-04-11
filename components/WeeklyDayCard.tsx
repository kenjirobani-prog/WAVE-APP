'use client'
import StarRating from './StarRating'

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  date: Date
  dateStr: string
  bestStars: number
  isCloseout: boolean
  comment?: string
  generatedAt?: string
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatUpdatedAt(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}更新`
  } catch {
    return ''
  }
}

export default function WeeklyDayCard({ date, bestStars, isCloseout, comment, generatedAt }: Props) {
  const dow = DOW_JA[date.getDay()]
  const dowColor =
    date.getDay() === 0 ? '#ef4444' : date.getDay() === 6 ? '#3b82f6' : '#0a1628'

  return (
    <div
      style={{
        background: 'white',
        border: isCloseout ? '2px solid #ef4444' : '0.5px solid #eef1f4',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      {/* 上段：日付・星 */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 48 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: dowColor, lineHeight: 1.1 }}>{dow}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMD(date)}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {isCloseout ? (
            <span className="text-xs font-bold text-red-500">終日クローズアウト</span>
          ) : (
            <StarRating stars={bestStars} size="md" />
          )}
        </div>
      </div>

      {/* 下段：コメント（あれば） */}
      {comment && (() => {
        const isDanger =
          comment.includes('入水厳禁') ||
          comment.includes('絶対に') ||
          comment.includes('危険')
        const bg = isDanger ? '#FCEBEB' : '#E6F1FB'
        const mainColor = isDanger ? '#A32D2D' : '#0C447C'
        const subColor = isDanger ? '#791F1F' : '#185FA5'
        return (
          <div style={{ background: bg, padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: mainColor, lineHeight: 1.6, margin: 0 }}>
              {comment}
            </p>
            {generatedAt && (
              <p style={{ fontSize: 11, color: subColor, marginTop: 4, marginBottom: 0 }}>
                {formatUpdatedAt(generatedAt)}
              </p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
