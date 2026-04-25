'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import ArrowButton from '@/components/ui/ArrowButton'
import type { SurfboardItem } from '@/app/api/surfboards/route'

type GenreFilter = 'all' | 'ショートボード' | 'ミッドレングス' | 'ロング・ソフト'
type LengthFilter = 'all' | '5' | '6' | '7' | '8+'

const GENRE_TABS: { id: GenreFilter; en: string; jp: string }[] = [
  { id: 'all', en: 'ALL', jp: 'すべて' },
  { id: 'ショートボード', en: 'SHORT', jp: 'ショートボード' },
  { id: 'ミッドレングス', en: 'MID', jp: 'ミッドレングス' },
  { id: 'ロング・ソフト', en: 'LONG / SOFT', jp: 'ロング・ソフト' },
]

const GENRE_EN: Record<string, string> = {
  'ショートボード': 'SHORT BOARD',
  'ミッドレングス': 'MID LENGTH',
  'ロングボード': 'LONG BOARD',
  'ソフトボード': 'SOFT BOARD',
  'ロング・ソフト': 'LONG / SOFT',
}

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

function SkeletonList() {
  return (
    <div className="space-y-2 px-4 pt-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="animate-pulse p-4"
          style={{ background: 'var(--paper-100)', border: '1px solid var(--ink-900)' }}
        >
          <div className="h-4 w-2/3 mb-3" style={{ background: 'var(--paper-300)' }} />
          <div className="h-3 w-1/2" style={{ background: 'var(--paper-300)' }} />
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

  const grouped = filtered.reduce<Record<string, SurfboardItem[]>>((acc, item) => {
    const key = item.brand || 'その他'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const sortedBrands = Object.keys(grouped).sort()
  const hasFilters = genre !== 'all' || brand !== 'all' || length !== 'all'

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      {/* Header */}
      <header
        className="px-5 pt-5 pb-5"
        style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
      >
        <div className="flex items-center gap-3 mb-3.5">
          <BackButton />
          <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
            メニューへ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">SURFBOARDS</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">サーフボード図鑑</div>
      </header>

      {/* Genre tabs (black bar, English-Japanese) */}
      <div
        className="flex gap-px overflow-x-auto"
        style={{ background: 'var(--ink-900)', scrollbarWidth: 'none', borderBottom: '2px solid var(--ink-900)' }}
      >
        {GENRE_TABS.map(tab => {
          const isActive = genre === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setGenre(tab.id)}
              className="flex-1 px-3 py-3 text-center transition-colors"
              style={{
                background: isActive ? 'var(--paper-100)' : 'transparent',
                color: isActive ? 'var(--ink-900)' : 'rgba(237,229,213,0.6)',
                border: 'none',
                cursor: 'pointer',
                minWidth: 80,
              }}
            >
              <div className="font-display text-xs leading-none tracking-[0.06em]">{tab.en}</div>
              <div
                className="font-jp text-[10px] mt-1"
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {tab.jp}
              </div>
            </button>
          )
        })}
      </div>

      {/* Brand & length filters */}
      <div
        className="px-5 py-3 space-y-2"
        style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-900)' }}
      >
        <div>
          <div
            className="font-display text-[9px] tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--ink-500)' }}
          >
            BRAND
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip active={brand === 'all'} onClick={() => setBrand('all')}>全ブランド</FilterChip>
            {brands.map(b => (
              <FilterChip key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</FilterChip>
            ))}
          </div>
        </div>
        <div>
          <div
            className="font-display text-[9px] tracking-[0.08em] mb-1.5"
            style={{ color: 'var(--ink-500)' }}
          >
            LENGTH
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([['all', 'すべて'], ['5', "5'台"], ['6', "6'台"], ['7', "7'台"], ['8+', "8'+"]] as [LengthFilter, string][]).map(([v, l]) => (
              <FilterChip key={v} active={length === v} onClick={() => setLength(v)}>{l}</FilterChip>
            ))}
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setGenre('all'); setBrand('all'); setLength('all') }}
            className="font-jp text-xs font-bold underline"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ink-900)' }}
          >
            絞り込みをリセット
          </button>
        )}
      </div>

      {/* List */}
      <main className="flex-1 overflow-auto pb-4">
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>{error}</p>
            <button
              onClick={() => location.reload()}
              className="px-6 py-2 font-jp text-sm font-bold"
              style={{ background: 'var(--ink-900)', color: 'var(--paper-100)' }}
            >
              再試行
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="font-jp text-base font-bold" style={{ color: 'var(--ink-900)' }}>該当するボードがありません</p>
            <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>フィルター条件を変更してください</p>
          </div>
        ) : (
          <div style={{ borderBottom: '4px solid var(--ink-900)' }}>
            {sortedBrands.map((brandName, brandIdx) => (
              <div key={brandName}>
                <div
                  className="px-5 py-3"
                  style={{
                    background: brandIdx % 2 === 0 ? 'var(--ink-900)' : 'var(--ink-700)',
                    color: 'var(--paper-100)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-display text-base tracking-[0.06em]">
                      {brandName.toUpperCase()}
                    </div>
                    <div
                      className="font-jp text-[11px] font-bold"
                      style={{ color: 'rgba(251,248,243,0.7)' }}
                    >
                      {grouped[brandName].length}モデル
                    </div>
                  </div>
                </div>
                {grouped[brandName].map((item, i) => {
                  const altBg = i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
                  const genreEn = GENRE_EN[item.genre] ?? item.genre.toUpperCase()
                  return (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/surfboards/${item.id}`)}
                      className="w-full text-left p-5"
                      style={{
                        background: altBg,
                        color: 'var(--ink-900)',
                        borderBottom: '1px solid var(--ink-900)',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottomWidth: 1,
                        borderBottomStyle: 'solid',
                        borderBottomColor: 'var(--ink-900)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-display text-[10px] tracking-[0.08em]"
                            style={{ color: 'var(--ink-500)' }}
                          >
                            {genreEn}
                          </div>
                          <div className="font-jp text-base font-black mt-1 leading-tight">
                            {item.model || item.name}
                          </div>
                          {item.level && (
                            <div className="mt-2">
                              <span
                                className="font-jp text-[10px] font-bold px-2 py-0.5"
                                style={{
                                  background: 'var(--ink-900)',
                                  color: 'var(--paper-100)',
                                }}
                              >
                                {item.level}
                              </span>
                            </div>
                          )}
                          {item.description && (
                            <p
                              className="font-jp text-[12px] font-medium mt-2 leading-[1.6]"
                              style={{ color: 'var(--ink-500)' }}
                            >
                              {item.description.slice(0, 70)}{item.description.length > 70 ? '...' : ''}
                            </p>
                          )}
                          <div className="flex gap-1.5 mt-2.5 flex-wrap">
                            {item.lengthInch && <SpecTag>{lengthToFeet(item.lengthInch)}</SpecTag>}
                            {item.volumeL && <SpecTag>{item.volumeL}L</SpecTag>}
                            {item.waveSize && <SpecTag>{item.waveSize}</SpecTag>}
                            {item.fin && <SpecTag>{item.fin}</SpecTag>}
                          </div>
                          {(item.priceJPY || item.priceUSD) && (
                            <div
                              className="font-jp text-sm font-black mt-2.5"
                              style={{ color: 'var(--ink-900)' }}
                            >
                              {formatPrice(item.priceJPY, item.priceUSD)}
                            </div>
                          )}
                        </div>
                        <ArrowButton variant="dark" />
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 font-jp text-xs font-bold"
      style={{
        background: active ? 'var(--ink-900)' : 'transparent',
        color: active ? 'var(--paper-100)' : 'var(--ink-900)',
        border: '1px solid var(--ink-900)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function SpecTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-jp text-[10px] font-bold px-2 py-0.5"
      style={{
        border: '1px solid var(--ink-900)',
        color: 'var(--ink-900)',
        background: 'var(--paper-100)',
      }}
    >
      {children}
    </span>
  )
}
