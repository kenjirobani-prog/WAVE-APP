'use client'
import Link from 'next/link'
import ArrowButton from '@/components/ui/ArrowButton'

interface Props {
  year: string
  typhoon: {
    id: string
    name: string
    number: number
    pressure: number
    updatedAt?: string
  }
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function TyphoonArchiveRow({ year, typhoon }: Props) {
  return (
    <Link
      href={`/typhoon/${year}/${typhoon.id}`}
      className="block"
      style={{
        background: 'var(--paper-100)',
        border: '1px solid var(--ink-900)',
        padding: '14px 16px',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="font-display text-[10px] tracking-[0.08em]"
            style={{ color: 'var(--ink-500)' }}
          >
            TYPHOON {typhoon.number}
          </div>
          <div
            className="font-jp text-sm font-bold mt-0.5"
            style={{ color: 'var(--ink-900)' }}
          >
            {typhoon.name}
          </div>
          <div
            className="font-jp text-[10px] font-medium mt-1"
            style={{ color: 'var(--ink-500)' }}
          >
            最小気圧 {typhoon.pressure} hPa
            {typhoon.updatedAt && ` · ${formatDate(typhoon.updatedAt)}`}
          </div>
        </div>
        <ArrowButton variant="dark" size={28} />
      </div>
    </Link>
  )
}
