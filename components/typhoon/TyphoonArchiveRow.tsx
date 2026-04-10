'use client'
import Link from 'next/link'

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
    <Link href={`/typhoon/${year}/${typhoon.id}`}>
      <div className="bg-white border border-[#eef1f4] rounded-lg px-4 py-3 mb-2 flex items-center justify-between active:bg-[#f0f9ff] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0a1628]">
            {typhoon.number}号 {typhoon.name}
          </p>
          <p className="text-[10px] text-[#8899aa] mt-0.5">
            最小気圧 {typhoon.pressure} hPa
            {typhoon.updatedAt && ` ・ ${formatDate(typhoon.updatedAt)}`}
          </p>
        </div>
        <span className="text-xs text-[#1A7A6E] font-semibold ml-2">詳細 →</span>
      </div>
    </Link>
  )
}
