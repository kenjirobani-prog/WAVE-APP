'use client'
import Link from 'next/link'
import { getApproximateLocation } from '@/lib/typhoon/location'

interface Props {
  year: string
  typhoon: {
    id: string
    name: string
    number: number
    position: { lat: number; lon: number }
    pressure: number
    windSpeed: number
    intensity?: string
    size?: string
    updatedAt?: string
    startedAt?: string
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

export default function TyphoonCard({ year, typhoon }: Props) {
  return (
    <div className="bg-white border border-[#eef1f4] rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold text-[#0a1628]">{typhoon.name}</h3>
        <div className="text-right">
          {typhoon.updatedAt && (
            <p className="text-[10px] text-[#8899aa]">{formatDateTime(typhoon.updatedAt)} 更新</p>
          )}
          {typhoon.startedAt && (
            <p className="text-[10px] text-[#c0ccd8]">{formatDateTime(typhoon.startedAt)} 発生</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#f0f9ff] rounded-lg p-2" style={{ gridColumn: '1 / -1' }}>
          <p className="text-[9px] text-[#8899aa]">現在位置</p>
          <p className="text-sm font-semibold text-[#0a1628]">
            {getApproximateLocation(typhoon.position.lat, typhoon.position.lon)}
          </p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2">
          <p className="text-[9px] text-[#8899aa]">中心気圧</p>
          <p className="text-sm font-semibold text-[#0a1628]">{typhoon.pressure} hPa</p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2">
          <p className="text-[9px] text-[#8899aa]">最大風速</p>
          <p className="text-sm font-semibold text-[#0a1628]">{typhoon.windSpeed} m/s</p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2">
          <p className="text-[9px] text-[#8899aa]">強さ</p>
          <p className="text-sm font-semibold text-[#0a1628]">{typhoon.intensity || '-'}</p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2">
          <p className="text-[9px] text-[#8899aa]">大きさ</p>
          <p className="text-sm font-semibold text-[#0a1628]">{typhoon.size || '-'}</p>
        </div>
      </div>
      <Link
        href={`/typhoon/${year}/${typhoon.id}`}
        className="flex items-center justify-end gap-1 text-xs font-semibold text-[#1A7A6E]"
      >
        詳細を見る →
      </Link>
    </div>
  )
}
