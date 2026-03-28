'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { glossaryData } from '@/data/glossary'
import BottomNav from '@/components/BottomNav'

const ALL_ID = 'all'

export default function GlossaryClient() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState(ALL_ID)
  const [query, setQuery] = useState('')

  const allTerms = useMemo(
    () => glossaryData.flatMap(c => c.terms),
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const terms =
      activeCategory === ALL_ID
        ? allTerms
        : (glossaryData.find(c => c.id === activeCategory)?.terms ?? [])
    if (!q) return terms
    return terms.filter(
      t =>
        t.term.toLowerCase().includes(q) ||
        t.reading.includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [activeCategory, query, allTerms])

  const totalCount =
    activeCategory === ALL_ID
      ? allTerms.length
      : (glossaryData.find(c => c.id === activeCategory)?.terms.length ?? 0)

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>サーフィン用語集</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Glossary</div>
          </div>
        </div>
      </header>

      {/* 検索ボックス */}
      <div className="bg-white border-b border-[#eef1f4] px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="用語を検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-[#0a1628] placeholder-[#8899aa] outline-none"
            style={{ background: '#f0f9ff', border: '0.5px solid #eef1f4' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899aa]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* カテゴリタブ */}
      <div
        className="bg-white border-b border-[#eef1f4] px-3 py-2 flex gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <CategoryTab
          id={ALL_ID}
          label="すべて"
          active={activeCategory === ALL_ID}
          onClick={() => setActiveCategory(ALL_ID)}
        />
        {glossaryData.map(cat => (
          <CategoryTab
            key={cat.id}
            id={cat.id}
            label={cat.label}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      {/* 件数表示 */}
      <div className="px-4 pt-3 pb-1">
        <span style={{ fontSize: 11, color: '#8899aa', fontWeight: 500 }}>
          {query ? `「${query}」の検索結果 ${filtered.length}件` : `${filtered.length}件`}
        </span>
      </div>

      {/* 用語リスト */}
      <main className="flex-1 overflow-auto pb-28 px-4 pt-1 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[#8899aa] text-sm">該当する用語がありません</p>
          </div>
        ) : (
          filtered.map(term => (
            <div
              key={term.term}
              className="bg-white rounded-xl border border-[#eef1f4] px-4 py-3.5"
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span style={{ fontSize: 17, fontWeight: 700, color: '#0a1628' }}>{term.term}</span>
                <span style={{ fontSize: 11, color: '#8899aa' }}>{term.reading}</span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{term.description}</p>
            </div>
          ))
        )}
      </main>

      <BottomNav current="glossary" />
    </div>
  )
}

function CategoryTab({
  id, label, active, onClick,
}: {
  id: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors"
      style={active
        ? { background: '#0284c7', color: '#fff' }
        : { background: '#f0f9ff', color: '#8899aa' }
      }
    >
      {label}
    </button>
  )
}
