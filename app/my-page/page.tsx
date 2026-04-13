'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>コンテンツ</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Contents</div>
            </div>
            <div style={{ marginTop: 8, visibility: 'hidden', background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>00:00 更新</span>
            </div>
          </div>
          <div style={{ visibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#0284c7' }}>⚙ マイ設定</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>中級・ミッド・腰</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {/* コンテンツ */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mt-4 mb-2 mx-4">コンテンツ</p>
        <div className="mx-4 bg-white rounded-xl border border-[#eef1f4] overflow-hidden">
          <button
            onClick={() => router.push('/howto')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-[#eef1f4] active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">サーフィンの始め方</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
            onClick={() => router.push('/surfboards')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-[#eef1f4] active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">サーフボード図鑑</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/faq')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-[#f0f9ff] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">よくある質問（FAQ）</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* About AI 波予報 */}
        <div className="mx-4 mt-4 space-y-3">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.1em' }}>ABOUT AI 波予報</div>

          {/* キャッチコピー */}
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0284c7', lineHeight: 1.3 }}>波を、AIが読む時代。</h2>

          {/* AI 波予報とは */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>AI 波予報とは</p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
              AI 波予報は、全国のサーフスポットの波をリアルタイムに分析する波予報アプリです。波の高さ、風向き、うねりの方向、潮位、周期——これらをAIが瞬時に計算し、あなたのレベルとボードに合わせたスコアに変換します。サーファーが長年かけて身につける「コンディションの読み方」を、デジタルの力で誰でも使えるかたちに。
            </p>
          </div>

          {/* データの源泉 */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>データの源泉</p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
              波データはStormGlass APIを通じて、NOAA・ECMWF・MeteoFranceなど世界トップの気象機関のモデルを統合して取得しています。潮位は海上保安庁・横浜観測点のリアルタイム検潮データを使用。天気はWMO天気コードから取得し、UV指数も実データで計算します。
            </p>
          </div>

          {/* 湘南専用のロジック */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>エリア・スポット専用のロジック</p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
              湘南なら、相模トラフ（沿岸から1kmで水深1,000mの深海溝）がSEうねりを減衰なく届ける地形的優位性、スウェル最適方向（SSE 170度〜SW 212度）、江ノ島の遮蔽効果、スポットごとの海底地形——これらすべてが評価ロジックに組み込まれています。
            </p>
          </div>

          {/* 6つの軸で星5段階評価 */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>5つの軸で100点満点 → ★1〜5の星で表示</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { label: '波高', score: '28点' },
                { label: '風', score: '22点' },
                { label: 'うねり方向', score: '18点' },
                { label: '波質', score: '22点' },
                { label: '潮位', score: '10点' },
              ].map(item => (
                <div key={item.label} style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                  <p style={{ fontSize: 9, color: '#8899aa' }}>{item.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0284c7' }}>{item.score}</p>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px' }}>★★★★★ 最高のコンディション（半年に1回出るかのレア）</p>
              <p style={{ margin: '0 0 4px' }}>★★★★☆ 良いコンディション（月1〜3回程度）</p>
              <p style={{ margin: '0 0 4px' }}>★★★☆☆ 普通に楽しめる日の目安</p>
              <p style={{ margin: '0 0 4px' }}>★★☆☆☆ やや難しめ。上級者向け</p>
              <p style={{ margin: 0 }}>★☆☆☆☆ おすすめしません</p>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              雨天時は-3点のペナルティが加算されます。クローズアウト時は★1の赤字で表示されます。波質スコアは周期・セカンダリースウェル・クロスうねり干渉・波エネルギーを複合計算しています。
            </p>
          </div>

          {/* このアプリができた理由 */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>このアプリができた理由</p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
              AI 波予報は、商用サービスではありません。
            </p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
              きっかけはシンプルで、「AIがどこまでできるか試したかった」のと、「好きなサーフィンの波のことを、もっと自分自身が深く知りたかった」という2つの動機からはじまった個人プロジェクトです。
            </p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
              開発も運用も、99%はAIが担っています。コードを書くのもAI、データを集めるのもAI、このページの文章を整えるのもAI。人間がやっていることは、方向を決めることと、海に入ることだけ。そのことが、AIの可能性をいちばん実感できた部分でもあります。
            </p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
              ターゲットとして想定しているのは、週末サーファーや、これからサーフィンをはじめる人たちです。長年の経験でコンディションを読める上級者には物足りないかもしれません。でも、「今日は行くべきか」を数字で判断したい人や、波のことを少しずつ勉強したい人には、きっと役立てると思っています。
            </p>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
              今後は湘南や千葉以外のエリアにも、さらに広げていきたいと考えています。サーフィンとテクノロジーの可能性を、これからも海の近くで試し続けます。
            </p>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              波情報はXでも発信しています。<br />
              <a href="https://x.com/ichinisantaro" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>AI 波予報 / AI Wave Forecast →</a>
            </p>
          </div>

          {/* お問い合わせ */}
          <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
            <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 12 }}>
              バグ報告・機能要望などお気軽にどうぞ
            </p>
            <a
              href="https://forms.gle/bR4gctV1d3zHx9w8A"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#0284c7] text-white rounded-full text-sm font-semibold"
            >
              お問い合わせフォーム →
            </a>
          </div>
        </div>
      </main>

    </div>
  )
}
