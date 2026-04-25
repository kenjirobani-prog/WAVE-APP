'use client'

interface Props {
  target: 'today' | 'tomorrow'
}

export default function DormantCommentPlaceholder({ target }: Props) {
  return (
    <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#7dd3fc',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        AI{target === 'today' ? '今日' : '明日'}の予報
      </div>
      <div
        style={{
          fontSize: 14,
          color: '#4a6fa5',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}
      >
        {'🌙 深夜帯は予報をお休み中です\n次回更新は朝4:00です'}
      </div>
    </div>
  )
}
