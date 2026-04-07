'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import type { SurfboardItem } from '@/app/api/surfboards/route'

function lengthToFeet(inch: number | null): string {
  if (!inch) return '—'
  const feet = Math.floor(inch / 12)
  const rem = Math.round(inch % 12)
  return rem > 0 ? `${feet}'${rem}"` : `${feet}'0"`
}

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  '初心者': { bg: '#dcfce7', color: '#166534' },
  '初中級者': { bg: '#dcfce7', color: '#166534' },
  '中級者': { bg: '#dbeafe', color: '#1e40af' },
  '中上級者': { bg: '#dbeafe', color: '#1e40af' },
  '上級者': { bg: '#ffedd5', color: '#9a3412' },
  'オールレベル': { bg: '#f0f9ff', color: '#0284c7' },
}

const GENRE_COLORS: Record<string, { bg: string; color: string }> = {
  'ショートボード': { bg: '#ede9fe', color: '#6d28d9' },
  'ミッドレングス': { bg: '#e0f2fe', color: '#0369a1' },
  'ロングボード': { bg: '#fef3c7', color: '#92400e' },
  'ソフトボード': { bg: '#d1fae5', color: '#065f46' },
  'ロング・ソフト': { bg: '#fef3c7', color: '#92400e' },
}

function SpecGrid({ item }: { item: SurfboardItem }) {
  const specs = [
    { label: '長さ', value: lengthToFeet(item.lengthInch) },
    { label: 'ボリューム', value: item.volumeL ? `${item.volumeL}L` : '—' },
    { label: 'フィン', value: item.fin || '—' },
    { label: 'ジャンル', value: item.genre || '—' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {specs.map(s => (
        <div key={s.label} className="bg-[#f8fafc] rounded-lg p-3">
          <p className="text-[10px] text-[#8899aa] mb-1">{s.label}</p>
          <p className="text-sm font-bold text-[#0a1628]">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function SurfboardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<SurfboardItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/surfboards')
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        const found = (data.items as SurfboardItem[])?.find(i => i.id === id)
        setItem(found ?? null)
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#f0f9ff]">
        <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
            <div className="h-6 w-40 bg-white/20 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#eef1f4] p-4 animate-pulse">
              <div className="h-4 bg-[#eef1f4] rounded w-1/3 mb-3" />
              <div className="h-3 bg-[#eef1f4] rounded w-full" />
            </div>
          ))}
        </main>

      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex-1 flex flex-col bg-[#f0f9ff]">
        <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Not Found</span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#8899aa]">ボードが見つかりませんでした</p>
        </main>
      </div>
    )
  }

  const genreStyle = GENRE_COLORS[item.genre] ?? { bg: '#f1f5f9', color: '#475569' }
  const levelStyle = LEVEL_COLORS[item.level] ?? { bg: '#f1f5f9', color: '#475569' }

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>{item.brand}</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{item.model || item.name}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span style={{ background: genreStyle.bg, color: genreStyle.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{item.genre}</span>
          {item.lengthInch && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{lengthToFeet(item.lengthInch)}</span>
          )}
          {item.volumeL && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{item.volumeL}L</span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4 p-4 space-y-3">
        {/* スペック詳細 */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">スペック詳細</p>
          <SpecGrid item={item} />
        </div>

        {/* こんなサーファーに */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">こんなサーファーに</p>
          <div className="flex gap-1.5 flex-wrap">
            {item.level && (
              <span style={{ background: levelStyle.bg, color: levelStyle.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>{item.level}</span>
            )}
            {item.waveSize && (
              <span style={{ background: '#f0f9ff', color: '#0284c7', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>{item.waveSize}</span>
            )}
            <span style={{ background: genreStyle.bg, color: genreStyle.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>{item.genre}</span>
          </div>
        </div>

        {/* 特徴・コメント */}
        {item.description && (
          <div className="bg-white rounded-xl border border-[#eef1f4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">特徴・コメント</p>
            <p className="text-sm text-[#374151] leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* 価格・公式サイト */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">価格・公式サイト</p>
          <div className="mb-3">
            {item.priceUSD ? (
              <>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>${item.priceUSD.toLocaleString()}</p>
                <p className="text-xs text-[#8899aa] mt-1">約¥{Math.round(item.priceUSD * 150).toLocaleString()}（150円換算）</p>
              </>
            ) : item.priceJPY ? (
              <p style={{ fontSize: 28, fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>¥{item.priceJPY.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-[#8899aa]">価格情報なし</p>
            )}
          </div>
          {item.officialUrl ? (
            <a
              href={item.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#0284c7] text-white rounded-full text-sm font-semibold"
            >
              公式サイトで見る ↗
            </a>
          ) : (
            <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>販売終了</span>
          )}
        </div>
      </main>

    </div>
  )
}
