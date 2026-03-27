'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function MyPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px', minHeight: 100 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>S/W</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>My Page</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28">
        {/* 設定 */}
        <div className="mt-4 mx-4 bg-white rounded-xl border border-[#eef1f4] overflow-hidden">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">設定変更</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mt-6 mb-2 mx-4">コンテンツ</p>
        <div className="mx-4 bg-white rounded-xl border border-[#eef1f4] overflow-hidden">
          <button
            onClick={() => router.push('/glossary')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-[#eef1f4] active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">サーフィン用語集</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/howto')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">How to サーフィン</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* About S/W */}
        <div style={{ margin: '32px 16px 16px', padding: 24, background: '#f0f9ff', borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.1em', marginBottom: 16 }}>ABOUT S/W</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0284c7', marginBottom: 16, lineHeight: 1.3 }}>波を、AIが読む時代。</h2>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            S/Wは、AIが湘南の波をリアルタイムに分析する波予報アプリです。
          </p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            波の高さ、風向き、うねりの方向、潮位、周期——これらをAIが瞬時に計算し、あなたのレベルとボードに合わせたスコアに変換します。熟練サーファーが長年かけて身につける「コンディションの読み方」を、デジタルの力で誰でも使えるかたちに。
          </p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            数字の裏にあるもの。スコアの背後には、波エネルギー（kJ）、グランドスウェル判定、クロスうねり干渉、潮の動き方向など、複数のロジックが走っています。「今日は行くべきか」という問いに、AIが正直に答えます。
          </p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            サーフィンとテクノロジーは、相性がいい。海は毎日変わる。だからこそ、リアルタイムのデータとアルゴリズムが力を発揮します。S/Wはその可能性を、湘南のビーチから試しています。
          </p>
        </div>
      </main>

      <BottomNav current="mypage" />
    </div>
  )
}
