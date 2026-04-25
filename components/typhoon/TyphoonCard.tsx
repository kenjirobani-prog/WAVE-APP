'use client'
import Link from 'next/link'
import ArrowButton from '@/components/ui/ArrowButton'
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

function MetricCell({ en, label, value }: { en: string; label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--paper-300)',
        border: '1px solid var(--ink-900)',
        padding: '10px 12px',
      }}
    >
      <div
        className="font-display text-[9px] tracking-[0.06em]"
        style={{ color: 'var(--ink-500)' }}
      >
        {en}
      </div>
      <div
        className="font-jp text-[9px] font-medium mt-0.5"
        style={{ color: 'var(--ink-500)' }}
      >
        {label}
      </div>
      <div
        className="font-jp text-sm font-black mt-1"
        style={{ color: 'var(--ink-900)' }}
      >
        {value}
      </div>
    </div>
  )
}

export default function TyphoonCard({ year, typhoon }: Props) {
  return (
    <div
      style={{
        background: 'var(--paper-100)',
        border: '1px solid var(--ink-900)',
        padding: '16px 18px',
      }}
    >
      <div
        className="flex items-start justify-between gap-3 pb-3 mb-3"
        style={{ borderBottom: '1px solid var(--rule-thin)' }}
      >
        <div>
          <div
            className="font-display text-[10px] tracking-[0.08em]"
            style={{ color: 'var(--ink-500)' }}
          >
            TYPHOON {typhoon.number}
          </div>
          <div className="font-jp text-base font-black mt-1" style={{ color: 'var(--ink-900)' }}>
            {typhoon.name}
          </div>
        </div>
        <div className="text-right">
          {typhoon.updatedAt && (
            <div
              className="font-jp text-[10px] font-bold"
              style={{ color: 'var(--ink-500)' }}
            >
              {formatDateTime(typhoon.updatedAt)} 更新
            </div>
          )}
          {typhoon.startedAt && (
            <div
              className="font-jp text-[10px] font-medium mt-0.5"
              style={{ color: 'var(--ink-300)' }}
            >
              {formatDateTime(typhoon.startedAt)} 発生
            </div>
          )}
        </div>
      </div>
      <div className="mb-3">
        <div
          className="font-display text-[9px] tracking-[0.06em]"
          style={{ color: 'var(--ink-500)' }}
        >
          LOCATION
        </div>
        <div className="font-jp text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>
          {getApproximateLocation(typhoon.position.lat, typhoon.position.lon)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <MetricCell en="PRESSURE" label="中心気圧" value={`${typhoon.pressure} hPa`} />
        <MetricCell en="WIND" label="最大風速" value={`${Number(typhoon.windSpeed).toFixed(1)} m/s`} />
        {typhoon.intensity && (
          <MetricCell en="INTENSITY" label="強さ" value={typhoon.intensity} />
        )}
        {typhoon.size && (
          <MetricCell en="SIZE" label="大きさ" value={typhoon.size} />
        )}
      </div>
      <Link
        href={`/typhoon/${year}/${typhoon.id}`}
        className="block"
        style={{
          background: 'var(--ink-900)',
          color: 'var(--paper-100)',
          padding: '10px 14px',
          textDecoration: 'none',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="font-display text-[10px] tracking-[0.08em]"
              style={{ color: 'rgba(251,248,243,0.6)' }}
            >
              VIEW DETAILS
            </div>
            <div className="font-jp text-sm font-black mt-0.5">詳細を見る</div>
          </div>
          <ArrowButton variant="light" size={28} />
        </div>
      </Link>
    </div>
  )
}
