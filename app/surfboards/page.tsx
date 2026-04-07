'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SurfboardItem } from '@/app/api/surfboards/route'

type GenreFilter = 'all' | 'ショートボード' | 'ミッドレングス' | 'ロング・ソフト'
type LengthFilter = 'all' | '5' | '6' | '7' | '8+'

function lengthToFeet(inch: number | null): string {
  if (!inch) return ''
  const feet = Math.floor(inch / 12)
  const rem = Math.round(inch % 12)
  return rem > 0 ? `${feet}'${rem}"` : `${feet}'0"`
}

function matchGenre(genre: string, filter: GenreFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'ロング・ソフト') return genre === 'ロングボード' || genre === 'ソフトボード' || genre === 'ロング・ソフト'
  return genre === filter
}

function matchLength(inch: number | null, filter: LengthFilter): boolean {
  if (filter === 'all') return true
  if (!inch) return false
  const feet = inch / 12
  if (filter === '5') return feet >= 5 && feet < 6
  if (filter === '6') return feet >= 6 && feet < 7
  if (filter === '7') return feet >= 7 && feet < 8
  if (filter === '8+') return feet >= 8
  return true
}

function formatPrice(jpy: number | null, usd: number | null): string {
  if (usd) return `$${usd.toLocaleString()}`
  if (jpy) return `¥${jpy.toLocaleString()}`
  return ''
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

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 pt-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white rounded-xl border border-[#eef1f4] p-4 animate-pulse">
          <div className="h-4 bg-[#eef1f4] rounded w-2/3 mb-3" />
          <div className="h-3 bg-[#eef1f4] rounded w-1/2 mb-2" />
          <div className="h-3 bg-[#eef1f4] rounded w-full" />
        </div>
      ))}
    </div>
  )
}

export default function SurfboardsPage() {
  const router = useRouter()
  const [items, setItems] = useState<SurfboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [genre, setGenre] = useState<GenreFilter>('all')
  const [brand, setBrand] = useState('all')
  const [length, setLength] = useState<LengthFilter>('all')

  useEffect(() => {
    fetch('/api/surfboards')
      .then(r => r.ok ? r.json() : Promise.reject('Failed to fetch'))
      .then(data => setItems(data.items ?? []))
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const brands = Array.from(new Set(items.map(i => i.brand).filter(Boolean))).sort()

  const filtered = items.filter(i =>
    !i.discontinued &&
    matchGenre(i.genre, genre) &&
    (brand === 'all' || i.brand === brand) &&
    matchLength(i.lengthInch, length)
  )

  // ブランド別にグルーピング
  const grouped = filtered.reduce<Record<string, SurfboardItem[]>>((acc, item) => {
    const key = item.brand || 'その他'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const sortedBrands = Object.keys(grouped).sort()
  const hasFilters = genre !== 'all' || brand !== 'all' || length !== 'all'

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>サーフボード図鑑</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Surfboard Guide</div>
          </div>
        </div>
      </header>

      {/* フィルター */}
      <div className="bg-white border-b border-[#eef1f4] px-4 py-3 space-y-2">
        {/* ジャンル */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'ショートボード', 'ミッドレングス', 'ロング・ソフト'] as GenreFilter[]).map(g => (
            <button key={g} onClick={() => setGenre(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                genre === g ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#64748b]'
              }`}
            >
              {g === 'all' ? 'すべて' : g}
            </button>
          ))}
        </div>
        {/* ブランド */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setBrand('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              brand === 'all' ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#64748b]'
            }`}
          >
            全ブランド
          </button>
          {brands.map(b => (
            <button key={b} onClick={() => setBrand(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                brand === b ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#64748b]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        {/* 長さ */}
        <div className="flex gap-1.5 flex-wrap">
          {([['all', 'すべて'], ['5', "5'台"], ['6', "6'台"], ['7', "7'台"], ['8+', "8'+"] ] as [LengthFilter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setLength(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                length === v ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#64748b]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={() => { setGenre('all'); setBrand('all'); setLength('all') }}
            className="text-xs text-[#0284c7] font-semibold"
          >
            絞り込みをリセット
          </button>
        )}
      </div>

      {/* リスト */}
      <main className="flex-1 overflow-auto pb-4">
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-[#8899aa] text-sm text-center px-4">{error}</p>
            <button onClick={() => location.reload()} className="px-6 py-2 bg-[#0284c7] text-white rounded-full text-sm font-semibold">再試行</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="text-lg font-bold text-[#0a1628]">該当するボードがありません</p>
            <p className="text-sm text-[#8899aa]">フィルター条件を変更してください</p>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-5">
            {sortedBrands.map(brandName => (
              <div key={brandName}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-bold text-[#0a1628]">{brandName}</h2>
                  <span className="text-[10px] text-[#8899aa] font-semibold">{grouped[brandName].length}モデル</span>
                </div>
                <div className="space-y-2">
                  {grouped[brandName].map(item => {
                    const genreStyle = GENRE_COLORS[item.genre] ?? { bg: '#f1f5f9', color: '#475569' }
                    const levelStyle = LEVEL_COLORS[item.level] ?? { bg: '#f1f5f9', color: '#475569' }
                    return (
                      <button key={item.id}
                        onClick={() => router.push(`/surfboards/${item.id}`)}
                        className="w-full text-left bg-white rounded-xl border border-[#eef1f4] p-4 active:scale-[0.98] transition-all hover:border-sky-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0a1628] truncate">{item.model || item.name}</p>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              <span style={{ background: genreStyle.bg, color: genreStyle.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                                {item.genre}
                              </span>
                              {item.level && (
                                <span style={{ background: levelStyle.bg, color: levelStyle.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                                  {item.level}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-[#64748b] mt-2 line-clamp-2" style={{ lineHeight: 1.5 }}>
                                {item.description.slice(0, 55)}{item.description.length > 55 ? '...' : ''}
                              </p>
                            )}
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {item.lengthInch && (
                                <span className="text-[10px] text-[#8899aa] bg-[#f8fafc] border border-[#eef1f4] rounded px-1.5 py-0.5">
                                  {lengthToFeet(item.lengthInch)}
                                </span>
                              )}
                              {item.volumeL && (
                                <span className="text-[10px] text-[#8899aa] bg-[#f8fafc] border border-[#eef1f4] rounded px-1.5 py-0.5">
                                  {item.volumeL}L
                                </span>
                              )}
                              {item.waveSize && (
                                <span className="text-[10px] text-[#8899aa] bg-[#f8fafc] border border-[#eef1f4] rounded px-1.5 py-0.5">
                                  {item.waveSize}
                                </span>
                              )}
                              {item.fin && (
                                <span className="text-[10px] text-[#8899aa] bg-[#f8fafc] border border-[#eef1f4] rounded px-1.5 py-0.5">
                                  {item.fin}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-sm font-bold text-[#0284c7]">{formatPrice(item.priceJPY, item.priceUSD)}</span>
                            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  )
}
