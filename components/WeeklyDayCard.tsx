'use client'

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

function getDayColor(dayOfWeek: number): string {
  if (dayOfWeek === 0) return '#E24B4A' // 日曜
  if (dayOfWeek === 6) return '#378ADD' // 土曜
  return '#0a1628'
}

function renderStars(score: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(score)))
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

export default function WeeklyDayCard({ date, bestStars, isCloseout, comment, generatedAt }: Props) {
  const dow = DOW_JA[date.getDay()]
  const dayColor = getDayColor(date.getDay())

  return (
    <div
      style={{
        background: 'white',
        border: isCloseout ? '1px solid #ef4444' : '0.5px solid #e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* 上部：日付・星 */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                lineHeight: 1,
                color: dayColor,
              }}
            >
              {dow}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
              {formatMD(date)}
            </div>
          </div>
          {isCloseout ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
              終日クローズアウト
            </span>
          ) : (
            <div
              style={{
                color: '#f59e0b',
                fontSize: 15,
                letterSpacing: '1px',
                marginTop: 4,
              }}
            >
              {renderStars(bestStars)}
            </div>
          )}
        </div>
      </div>

      {/* 区切り線＋コメント（コメントある日のみ） */}
      {comment && (
        <>
          <div style={{ height: '0.5px', background: '#e2e8f0', margin: '0 16px' }} />
          <div style={{ padding: '10px 16px 13px' }}>
            <p style={{
              fontSize: 13,
              color: '#185FA5',
              lineHeight: 1.65,
              margin: 0,
            }}>
              {comment}
            </p>
            {generatedAt && (
              <p style={{
                fontSize: 11,
                color: '#93c5fd',
                marginTop: 5,
                marginBottom: 0,
              }}>
                {formatUpdatedAt(generatedAt)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
