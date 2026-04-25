import type { Metadata } from 'next'
import BackButton from '@/components/BackButton'
import ArrowButton from '@/components/ui/ArrowButton'

export const metadata: Metadata = {
  title: 'AI波予報について | AI波予報',
  description: 'AI波予報のスコアロジック・データソース・開発背景について',
}

const SCORE_TABLE: { axis: string; score: string; en: string }[] = [
  { axis: '波高', score: '28点', en: 'WAVE HEIGHT' },
  { axis: '風', score: '22点', en: 'WIND' },
  { axis: 'うねり方向', score: '18点', en: 'SWELL DIR' },
  { axis: '波質', score: '22点', en: 'WAVE QUALITY' },
  { axis: '潮位', score: '10点', en: 'TIDE' },
]

const STAR_LEGEND: { stars: string; text: string }[] = [
  { stars: '★★★★★', text: '最高のコンディション（半年に1回出るかのレア）' },
  { stars: '★★★★☆', text: '良いコンディション（月1〜3回程度）' },
  { stars: '★★★☆☆', text: '普通に楽しめる日の目安' },
  { stars: '★★☆☆☆', text: 'やや難しめ。上級者向け' },
  { stars: '★☆☆☆☆', text: 'おすすめしません' },
]

export default function AboutPage() {
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
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">ABOUT US</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">このサービスについて</div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {/* Hero */}
        <section
          className="px-5 py-8"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="font-jp text-[26px] font-black leading-tight" style={{ color: 'var(--ink-900)' }}>
            波を、AIが読む時代。
          </div>
        </section>

        {/* Section: AI 波予報とは */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-900)' }}
        >
          <div className="font-display text-[10px] tracking-[0.08em] mb-2" style={{ color: 'var(--ink-500)' }}>
            WHAT / AI 波予報とは
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85]" style={{ color: 'var(--ink-900)' }}>
            AI 波予報は、全国のサーフスポットの波をリアルタイムに分析する波予報アプリです。波の高さ、風向き、うねりの方向、潮位、周期——これらをAIが瞬時に計算し、コンディションスコアに変換します。サーファーが長年かけて身につける「コンディションの読み方」を、デジタルの力で誰でも使えるかたちに。
          </p>
        </section>

        {/* Section: データの源泉 */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-300)', borderBottom: '1px solid var(--ink-900)' }}
        >
          <div className="font-display text-[10px] tracking-[0.08em] mb-2" style={{ color: 'var(--ink-500)' }}>
            DATA SOURCE / データの源泉
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85]" style={{ color: 'var(--ink-900)' }}>
            波データはStormGlass APIを通じて、NOAA・ECMWF・MeteoFranceなど世界トップの気象機関のモデルを統合して取得しています。潮位は当日が海上保安庁のリアルタイム験潮データ（エリア別観測点：湘南=横浜／千葉北=千葉／千葉南=布良／茨城=小名浜）、翌日以降はStormGlass Tide APIの予測値を使用。天気はWMO天気コードから取得し、UV指数も実データで計算します。
          </p>
        </section>

        {/* Section: エリア・スポット専用のロジック */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="font-display text-[10px] tracking-[0.08em] mb-2" style={{ color: 'var(--ink-500)' }}>
            LOGIC / エリア・スポット専用のロジック
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85]" style={{ color: 'var(--ink-900)' }}>
            湘南なら、相模トラフ（沿岸から1kmで水深1,000mの深海溝）がSEうねりを減衰なく届ける地形的優位性、スウェル最適方向（SSE 170度〜SW 212度）、江ノ島の遮蔽効果、スポットごとの海底地形——これらすべてが評価ロジックに組み込まれています。
          </p>
        </section>

        {/* Section: スコア計算テーブル */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="mb-4">
            <div className="font-display text-xl leading-none">SCORING</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              5つの軸で100点満点 → ★1〜5の星で表示
            </div>
          </div>
          <div style={{ border: '1px solid var(--ink-900)' }}>
            {SCORE_TABLE.map((row, i) => (
              <div
                key={row.axis}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)',
                  borderBottom: i < SCORE_TABLE.length - 1 ? '1px solid var(--ink-900)' : 'none',
                }}
              >
                <div>
                  <div
                    className="font-display text-[10px] tracking-[0.08em]"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    {row.en}
                  </div>
                  <div className="font-jp text-sm font-bold mt-0.5">{row.axis}</div>
                </div>
                <div className="font-display text-2xl leading-none">{row.score}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {STAR_LEGEND.map(item => (
              <div key={item.stars} className="flex items-baseline gap-3">
                <div
                  className="font-jp text-sm font-bold"
                  style={{ color: 'var(--ink-900)', whiteSpace: 'nowrap' }}
                >
                  {item.stars}
                </div>
                <div className="font-jp text-[12px] font-medium" style={{ color: 'var(--ink-700)' }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
          <p
            className="font-jp text-[12px] font-medium leading-[1.85] mt-5 pt-4"
            style={{ color: 'var(--ink-500)', borderTop: '1px solid var(--rule-thin)' }}
          >
            雨天時は-3点のペナルティが加算されます。クローズアウト時は★1の赤字で表示されます。波質スコアは周期・セカンダリースウェル・クロスうねり干渉・波エネルギーを複合計算しています。
          </p>
        </section>

        {/* Section: 個人プロジェクト（黒帯） */}
        <section
          className="px-5 py-6"
          style={{
            background: 'var(--ink-900)',
            color: 'var(--paper-100)',
            borderBottom: '2px solid var(--ink-900)',
          }}
        >
          <div className="mb-4">
            <div className="font-display text-xl leading-none">INDIVIDUAL PROJECT</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'rgba(251,248,243,0.6)' }}
            >
              このアプリができた理由
            </div>
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85] mb-3">
            AI 波予報は、商用サービスではありません。
          </p>
          <p className="font-jp text-[13px] font-medium leading-[1.85] mb-3">
            きっかけはシンプルで、「AIがどこまでできるか試したかった」のと、「好きなサーフィンの波のことを、もっと自分自身が深く知りたかった」という2つの動機からはじまった個人プロジェクトです。
          </p>
          <p className="font-jp text-[13px] font-medium leading-[1.85]">
            開発も運用も、99%はAIが担っています。コードを書くのもAI、データを集めるのもAI、このページの文章を整えるのもAI。人間がやっていることは、方向を決めることと、海に入ることだけ。そのことが、AIの可能性をいちばん実感できた部分でもあります。
          </p>
        </section>

        {/* Section: ターゲット */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-900)' }}
        >
          <div className="font-display text-[10px] tracking-[0.08em] mb-2" style={{ color: 'var(--ink-500)' }}>
            TARGET / 想定ユーザー
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85]" style={{ color: 'var(--ink-900)' }}>
            ターゲットとして想定しているのは、週末サーファーや、これからサーフィンをはじめる人たちです。長年の経験でコンディションを読める上級者には物足りないかもしれません。でも、「今日は行くべきか」を数字で判断したい人や、波のことを少しずつ勉強したい人には、きっと役立てると思っています。
          </p>
        </section>

        {/* Section: これから */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-300)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="font-display text-[10px] tracking-[0.08em] mb-2" style={{ color: 'var(--ink-500)' }}>
            FUTURE / これから
          </div>
          <p className="font-jp text-[13px] font-medium leading-[1.85]" style={{ color: 'var(--ink-900)' }}>
            今後は湘南や千葉以外のエリアにも、さらに広げていきたいと考えています。サーフィンとテクノロジーの可能性を、これからも海の近くで試し続けます。
          </p>
        </section>

        {/* CTA: X follow */}
        <a
          href="https://x.com/ichinisantaro"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-5 py-6"
          style={{
            background: 'var(--paper-100)',
            color: 'var(--ink-900)',
            borderBottom: '1px solid var(--ink-900)',
            textDecoration: 'none',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div
                className="font-display text-[10px] tracking-[0.08em]"
                style={{ color: 'var(--ink-500)' }}
              >
                FOLLOW ON X
              </div>
              <div className="font-jp text-base font-black mt-1">
                AI 波予報 / AI Wave Forecast
              </div>
            </div>
            <ArrowButton variant="dark" />
          </div>
        </a>

        {/* CTA: Contact (black) */}
        <a
          href="https://forms.gle/bR4gctV1d3zHx9w8A"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-5 py-6"
          style={{
            background: 'var(--ink-900)',
            color: 'var(--paper-100)',
            borderBottom: '4px solid var(--ink-900)',
            textDecoration: 'none',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div
                className="font-display text-[10px] tracking-[0.08em]"
                style={{ color: 'rgba(251,248,243,0.6)' }}
              >
                CONTACT
              </div>
              <div className="font-jp text-base font-black mt-1">
                お問い合わせフォーム
              </div>
              <div
                className="font-jp text-[11px] font-medium mt-1"
                style={{ color: 'rgba(251,248,243,0.7)' }}
              >
                バグ報告・機能要望などお気軽にどうぞ
              </div>
            </div>
            <ArrowButton variant="light" />
          </div>
        </a>
      </main>
    </div>
  )
}
