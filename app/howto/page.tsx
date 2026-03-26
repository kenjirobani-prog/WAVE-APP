import type { Metadata } from 'next'
import Link from 'next/link'
import { howtoArticles } from '@/data/howto'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'How to Surfing | Shonan Wave Forecast',
  description: '湘南サーフィンの基礎知識。波予報の読み方・ポイント選び・ボードの選び方を初心者向けにわかりやすく解説。',
}

export default function HowToPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8]">
      <header className="bg-white border-b border-[#eef1f4] px-4 pt-10 pb-5">
        <p style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          How to Surfing
        </p>
        <h1 className="text-xl font-bold text-[#0a1628] leading-snug">
          湘南サーフィンをもっと<br />楽しむための基礎知識
        </h1>
      </header>

      <main className="flex-1 overflow-auto pb-28 px-4 pt-4 space-y-3">
        {howtoArticles.map((article, i) => (
          <Link key={article.slug} href={`/howto/${article.slug}`} className="block">
            <div
              className="bg-white rounded-xl border border-[#eef1f4] overflow-hidden active:bg-[#f8fafc] transition-colors"
              style={{ padding: '18px 16px' }}
            >
              {/* カテゴリバッジ・読了時間 */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#0369a1',
                  background: '#e0f2fe', borderRadius: 99, padding: '2px 8px',
                  letterSpacing: '0.03em',
                }}>
                  {article.category}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{article.readingTime}</span>
              </div>

              {/* タイトル・サブタイトル */}
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0a1628', lineHeight: 1.4, marginBottom: 4 }}>
                {article.title}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
                {article.subtitle}
              </p>

              {/* フッター */}
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {article.publishedAt.replace(/-/g, '/')}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>
                  読む →
                </span>
              </div>
            </div>
          </Link>
        ))}

        {howtoArticles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p style={{ fontSize: 14, color: '#94a3b8' }}>記事を準備中です</p>
          </div>
        )}
      </main>

      <BottomNav current="howto" />
    </div>
  )
}
