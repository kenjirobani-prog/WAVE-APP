'use client'
import { useState, useMemo } from 'react'
import BackButton from '@/components/BackButton'
import { glossaryData } from '@/data/glossary'

const ALL_ID = 'all'

const CATEGORY_EN: Record<string, string> = {
  all: 'ALL',
  wave: 'WAVE',
  surf: 'SURF',
  spot: 'SPOT',
  gear: 'GEAR',
  weather: 'WEATHER',
  technique: 'TECHNIQUE',
}

export default function GlossaryClient() {
  const [activeCategory, setActiveCategory] = useState(ALL_ID)
  const [query, setQuery] = useState('')

  const allTerms = useMemo(
    () => glossaryData.flatMap(c => c.terms.map(t => ({ ...t, categoryId: c.id, categoryLabel: c.label }))),
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const terms =
      activeCategory === ALL_ID
        ? allTerms
        : allTerms.filter(t => t.categoryId === activeCategory)
    if (!q) return terms
    return terms.filter(
      t =>
        t.term.toLowerCase().includes(q) ||
        t.reading.includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [activeCategory, query, allTerms])

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-100)' }}>
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
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">GLOSSARY</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">用語集</div>
      </header>

      {/* Search box */}
      <div
        className="px-5 py-4"
        style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-900)' }}
      >
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#1a1815" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="用語を検索..."
            className="w-full pl-9 pr-9 py-2.5 font-jp text-sm outline-none"
            style={{
              background: 'var(--paper-100)',
              border: '2px solid var(--ink-900)',
              color: 'var(--ink-900)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="検索をクリア"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1815" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs (black bar) */}
      <div
        className="flex gap-px overflow-x-auto px-1 py-1"
        style={{ background: 'var(--ink-900)', scrollbarWidth: 'none', borderBottom: '2px solid var(--ink-900)' }}
      >
        <CategoryTab
          en={CATEGORY_EN.all}
          jp="すべて"
          count={allTerms.length}
          active={activeCategory === ALL_ID}
          onClick={() => setActiveCategory(ALL_ID)}
        />
        {glossaryData.map(cat => (
          <CategoryTab
            key={cat.id}
            en={CATEGORY_EN[cat.id] ?? cat.id.toUpperCase()}
            jp={cat.label}
            count={cat.terms.length}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      {/* Result count */}
      <div
        className="px-5 py-3"
        style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-900)' }}
      >
        <div
          className="font-jp text-[11px] font-bold"
          style={{ color: 'var(--ink-500)' }}
        >
          {query ? `「${query}」の検索結果 ${filtered.length}件` : `全 ${filtered.length}件`}
        </div>
      </div>

      {/* Term list */}
      <main className="flex-1 overflow-auto pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>該当する用語がありません</p>
          </div>
        ) : (
          <div style={{ borderBottom: '4px solid var(--ink-900)' }}>
            {filtered.map((term) => {
              return (
                <div
                  key={`${term.categoryId}-${term.term}`}
                  className="px-5 py-4"
                  style={{
                    background: 'var(--paper-100)',
                    borderBottom: '1px solid var(--ink-900)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="font-display text-[10px] tracking-[0.08em] px-2 py-0.5"
                      style={{
                        background: 'var(--ink-900)',
                        color: 'var(--paper-100)',
                      }}
                    >
                      {CATEGORY_EN[term.categoryId] ?? term.categoryLabel}
                    </span>
                    <span
                      className="font-jp text-[10px] font-medium"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      {term.reading}
                    </span>
                  </div>
                  <div className="font-jp text-base font-black" style={{ color: 'var(--ink-900)' }}>
                    {term.term}
                  </div>
                  <p
                    className="font-jp text-[12px] font-medium leading-[1.7] mt-2"
                    style={{ color: 'var(--ink-700)' }}
                  >
                    {term.description}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function CategoryTab({
  en, jp, count, active, onClick,
}: {
  en: string
  jp: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-2 text-center transition-colors"
      style={{
        background: active ? 'var(--paper-100)' : 'transparent',
        color: active ? 'var(--ink-900)' : 'rgba(237,229,213,0.6)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div className="font-display text-[11px] tracking-[0.06em] leading-none">{en}</div>
      <div
        className="font-jp text-[10px] mt-1"
        style={{ fontWeight: active ? 700 : 500 }}
      >
        {jp} <span style={{ opacity: 0.7 }}>({count})</span>
      </div>
    </button>
  )
}
