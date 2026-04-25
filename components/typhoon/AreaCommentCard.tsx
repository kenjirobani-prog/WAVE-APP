'use client'

interface Props {
  area: string
  areaEn?: string
  comment?: {
    text: string
    generatedAt?: string
  }
  altBg?: 'paper-100' | 'paper-300'
}

const AREA_EN: Record<string, string> = {
  '湘南': 'SHONAN',
  '千葉': 'CHIBA',
  '千葉北': 'CHIBA·N',
  '千葉南': 'CHIBA·S',
  '茨城': 'IBARAKI',
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm} 生成`
  } catch {
    return ''
  }
}

export default function AreaCommentCard({ area, areaEn, comment, altBg = 'paper-100' }: Props) {
  const en = areaEn ?? AREA_EN[area] ?? area.toUpperCase()
  const bg = altBg === 'paper-300' ? 'var(--paper-300)' : 'var(--paper-100)'

  return (
    <div
      className="px-5 py-4"
      style={{
        background: bg,
        borderBottom: '1px solid var(--ink-900)',
      }}
    >
      <div
        className="flex items-baseline justify-between mb-2 pb-2"
        style={{ borderBottom: '1px solid var(--rule-thin)' }}
      >
        <div>
          <div className="font-display text-base tracking-[0.06em]" style={{ color: 'var(--ink-900)' }}>
            {en}
          </div>
          <div
            className="font-jp text-[10px] font-bold mt-0.5"
            style={{ color: 'var(--ink-500)' }}
          >
            {area}エリア
          </div>
        </div>
        {comment?.generatedAt && (
          <div className="font-jp text-[10px] font-bold" style={{ color: 'var(--ink-500)' }}>
            {formatTime(comment.generatedAt)}
          </div>
        )}
      </div>
      {comment?.text ? (
        <p
          className="font-jp text-[13px] font-medium leading-[1.85]"
          style={{ color: 'var(--ink-700)', whiteSpace: 'pre-wrap' }}
        >
          {comment.text}
        </p>
      ) : (
        <p className="font-jp text-[12px] font-medium" style={{ color: 'var(--ink-500)' }}>
          コメントは毎朝6時に更新されます。しばらくお待ちください。
        </p>
      )}
    </div>
  )
}
