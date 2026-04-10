'use client'

interface Props {
  area: string
  comment?: {
    text: string
    generatedAt?: string
  }
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

export default function AreaCommentCard({ area, comment }: Props) {
  return (
    <div className="bg-white border border-[#eef1f4] rounded-xl p-4">
      <p className="text-[10px] font-bold text-[#0284c7] uppercase tracking-wide mb-2">{area}</p>
      {comment?.text ? (
        <>
          <p className="text-sm text-[#4a6fa5] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
            {comment.text}
          </p>
          {comment.generatedAt && (
            <p className="text-[10px] text-[#a0bac8] mt-2 text-right">{formatTime(comment.generatedAt)}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#94a3b8]">
          コメントは毎朝6時に更新されます。しばらくお待ちください。
        </p>
      )}
    </div>
  )
}
