'use client'

interface Props {
  text?: string
  generatedAt?: string
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch {
    return ''
  }
}

export default function WeeklyCommentRow({ text, generatedAt }: Props) {
  return (
    <div
      style={{
        background: '#f0f9ff',
        borderLeft: '2px solid #0ea5e9',
        borderRadius: 6,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        margin: '2px 8px',
      }}
    >
      <span style={{ fontSize: 12, flexShrink: 0 }}>💬</span>
      <p style={{ fontSize: 11, color: '#4a6fa5', lineHeight: 1.5, flex: 1, margin: 0 }}>
        {text || 'コメントを生成中...'}
      </p>
      {generatedAt && (
        <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>{formatTime(generatedAt)}</span>
      )}
    </div>
  )
}
