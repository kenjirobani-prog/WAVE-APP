import type { Metadata } from 'next'
import Link from 'next/link'
import { howtoArticles } from '@/data/howto'
import BackButton from '@/components/BackButton'
import ArrowButton from '@/components/ui/ArrowButton'

export const metadata: Metadata = {
  title: 'サーフィンの始め方 | AI波予報',
  description: 'サーフィン初心者向け入門ガイド。道具の選び方・波の読み方・マナーまでわかりやすく解説。',
}

const CHAPTER_ORDER = [
  'how-to-start-surfing',
  'surfing-gear-guide',
  'rules-and-manners',
  'point-selection-guide',
  'wave-forecast-basics',
]

const FAQ_CATEGORIES: { en: string; jp: string; items: { q: string; a: string }[] }[] = [
  {
    en: 'SERVICE',
    jp: 'サービス基本情報',
    items: [
      { q: 'AI 波予報とは何ですか？', a: 'AI 波予報（jpwaveforecast.com）は、AIが湘南・千葉・茨城の波をリアルタイムで自動分析する波予報アプリです。波高・風・うねり・潮位などのデータをAIが総合的に判断し、初心者にもわかりやすい★1〜5のスコアで「今日行くべきか」を即判断できます。完全無料・登録不要で利用できます。' },
      { q: '湘南の波予報はどこで確認できますか？', a: 'AI 波予報（jpwaveforecast.com）で湘南7スポット（由比ヶ浜・七里ヶ浜・水族館前・鵠沼・辻堂・茅ヶ崎・大磯）の最新コンディションを無料で確認できます。1日6回AIが自動更新します。' },
      { q: '利用料金はかかりますか？', a: 'AI 波予報は完全無料でご利用いただけます。アカウント登録も不要です。' },
      { q: 'どのくらいの頻度で更新されますか？', a: '1日6回（4・6・9・12・15・18時）AIが自動でデータを取得・更新します。朝イチサーフィン前の最新情報も確認できます。' },
      { q: 'アカウント登録は必要ですか？', a: '不要です。サイトを開くだけですぐにAIが分析した最新の波予報を確認できます。' },
    ],
  },
  {
    en: 'SCORE',
    jp: 'スコア・波予報の仕組み',
    items: [
      { q: '波のスコアはどうやって計算されますか？', a: '波高（28点）・風（22点）・うねり方向（18点）・波質（22点）・潮位（10点）の合計100点満点でAIがスコア化し（雨天時は-3点）、朝・昼・夕方の3時間帯ごとに★1〜5の星で表示します。' },
      { q: 'スコアはどう見ればいいですか？', a: '朝・昼・夕方の3つの時間帯ごとに★1〜5の星で表示しています。★★★★★（5つ）が最高で、半年に1回出るかどうかのレアなコンディションです。★4は月に1〜3回程度、★3が普通に楽しめる日の目安です。普段は★2〜3がベースで、★4なら十分良いコンディション。★1でも「クローズアウト」の赤字表示がない場合は入れますが、初心者の方には難しいかもしれません。' },
      { q: '波質ラベル（キレた波・ダンパーなど）とは何ですか？', a: 'AIが波の質を5段階で判定します。キレた波・グッドウェーブ・まあまあ・ワイド気味・ダンパーの5種類で、周期・うねり比率・潮位などを総合的に判断します。' },
      { q: 'AIスコアとは何ですか？', a: 'AIが波高・風速・うねり・潮位など複数のデータをリアルタイムで分析し、サーフィンのしやすさを★1〜5の星で評価したものです。★4以上なら十分良いコンディション、★1はサーフィンに不向きな状況を示します。' },
      { q: 'AIコメントはどのように生成されますか？', a: 'Claude AI（Anthropic社）が7日分の波データを分析して、今週のベストな日や注目ポイントを自然な日本語で要約します。今日・明日タブでも時間帯別のAIコメントが自動生成されます。' },
    ],
  },
  {
    en: 'SPOTS',
    jp: 'スポット・エリア',
    items: [
      { q: '鵠沼の波はどこで見られますか？', a: 'AI 波予報（jpwaveforecast.com）の波予報タブで鵠沼のリアルタイムコンディションを確認できます。スコア・波高・風・うねり・周期・潮位を表示し、1時間ごとの予報も見られます。' },
      { q: '由比ヶ浜の波予報はどこで確認できますか？', a: 'AI 波予報（jpwaveforecast.com）で由比ヶ浜の波予報をリアルタイムで確認できます。初心者向けのスポットで、AIが「今日行くべきか」をスコアで判断します。' },
      { q: '七里ヶ浜の波はどんな特徴がありますか？', a: '七里ヶ浜は急傾斜の地形でパワフルな波が立ちやすく、中〜上級者向きのスポットです。AI 波予報では七里ヶ浜のリアルタイムスコアと波質を確認できます。' },
      { q: '茅ヶ崎・辻堂・大磯の波予報も見られますか？', a: 'はい。AI 波予報では湘南の茅ヶ崎・辻堂・大磯・水族館前を含む7スポットすべての波予報をリアルタイムで確認できます。' },
      { q: 'スポット詳細ページではどんな情報が見られますか？', a: '朝・昼・夕方の星評価・AIコメント・波高・風速・うねり方向・周期・波質・潮位グラフ・1時間ごとの予報を確認できます。' },
    ],
  },
  {
    en: 'BEGINNER',
    jp: 'サーフィン初心者向け',
    items: [
      { q: 'サーフィン初心者でも使えますか？', a: 'はい。AIコメントは初心者にもわかりやすい表現で波の状況を解説しています。★の数が多いほどサーフィンに適したコンディションです。用語集でサーフィン用語も学べます。' },
      { q: 'ロングボードとショートボードでスコアは変わりますか？', a: '現在のスコアは波のコンディションを総合的にAIが評価した共通スコアです。AIコメントの中でボードの種類に応じたアドバイス（「ロングボード日和」「ショートボーダー向き」等）を提供しています。' },
      { q: 'サーフィンに最適な潮位はいつですか？', a: '湘南ビーチブレイクでは80〜120cmのミドルタイドが最も波が割れやすくおすすめです。AI 波予報では潮位グラフと潮の動き方向も考慮してスコアを計算します。' },
      { q: 'グランドスウェルとは何ですか？', a: '遠洋（数千km先）から届く長周期（12秒以上）のうねりです。整ったパワフルな波が立ちやすく、サーフィンに最高のコンディションをもたらします。AI 波予報ではグランドスウェルを自動判定して表示します。' },
      { q: 'オフショアとオンショアの違いは何ですか？', a: 'オフショアは陸から海へ吹く風で波面をホールドしてクリーンな波を作ります。オンショアは海から陸へ吹く風で波面を崩してチョッピーにします。朝イチはオフショアになりやすくサーフィンのベストタイムです。' },
    ],
  },
  {
    en: 'AI & DATA',
    jp: 'AI技術・データ',
    items: [
      { q: '波予報にAIを使うメリットは何ですか？', a: '人間のフォーキャスターなしで24時間365日自動更新できます。波高・風・うねり・潮位・周期・波エネルギーなど多数の変数をAIが瞬時に分析し、初心者にもわかりやすいスコアとコメントをリアルタイムで提供できます。' },
      { q: 'どんなAPIデータを使っていますか？', a: 'StormGlass APIから波高・波周期・うねり高さ・風速・潮位などをリアルタイムで取得しています。複数の気象モデルを統合した高精度データを使用しています。' },
      { q: 'Surf Logとは何ですか？', a: '実際にサーフィンした日のコンディション・スポット・評価を記録できる機能です。今年の通算日数や履歴を管理できます。' },
      { q: '週間予報はどこで見られますか？', a: '波予報タブの「週間」を選ぶと7日分の予報が確認できます。AIが今週のベストな日を自動コメントで教えてくれます。' },
      { q: '千葉・茨城エリアはテスト運用中ですか？', a: 'はい、千葉北・千葉南・茨城エリアは現在テスト運用中です。データや表示内容は予告なく変更される場合があります。湘南エリアは正式サービスとして提供しています。' },
    ],
  },
]

export default function HowToPage() {
  const chapters = CHAPTER_ORDER
    .map(slug => howtoArticles.find(a => a.slug === slug))
    .filter((a): a is (typeof howtoArticles)[number] => !!a)

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
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
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">HOW TO SURF</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">サーフィンの始め方</div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {/* Chapter cards */}
        {chapters.length > 0 && (
          <div style={{ borderBottom: '4px solid var(--ink-900)' }}>
            {chapters.map((article, i) => {
              const altBg = i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
              const num = String(i + 1).padStart(2, '0')
              return (
                <Link
                  key={article.slug}
                  href={`/howto/${article.slug}`}
                  className="block p-5"
                  style={{
                    background: altBg,
                    color: 'var(--ink-900)',
                    borderBottom: '1px solid var(--ink-900)',
                    textDecoration: 'none',
                  }}
                >
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-display text-[10px] tracking-[0.08em]"
                        style={{ color: 'var(--ink-500)' }}
                      >
                        CHAPTER {num}
                      </div>
                      <div className="font-jp text-base font-black mt-1.5 leading-tight">
                        {article.title}
                      </div>
                      <div
                        className="font-jp text-[12px] font-medium mt-1.5 leading-[1.6]"
                        style={{ color: 'var(--ink-500)' }}
                      >
                        {article.subtitle}
                      </div>
                      <div
                        className="font-jp text-[11px] font-bold mt-2.5"
                        style={{ color: 'var(--ink-700)' }}
                      >
                        {article.category} · {article.readingTime}
                      </div>
                    </div>
                    <ArrowButton variant="dark" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>記事を準備中です</p>
          </div>
        )}

        {/* FAQ */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="mb-5">
            <div className="font-display text-xl leading-none">FAQ</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              よくある質問
            </div>
          </div>
          <div style={{ border: '1px solid var(--ink-900)' }}>
            {FAQ_CATEGORIES.map((cat, i) => {
              const altBg = i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
              return (
                <details
                  key={cat.en}
                  style={{
                    background: altBg,
                    borderBottom: i < FAQ_CATEGORIES.length - 1 ? '1px solid var(--ink-900)' : 'none',
                  }}
                >
                  <summary
                    className="flex items-center justify-between cursor-pointer px-4 py-4 select-none"
                    style={{ listStyle: 'none' }}
                  >
                    <div>
                      <div
                        className="font-display text-[10px] tracking-[0.08em]"
                        style={{ color: 'var(--ink-500)' }}
                      >
                        {cat.en}
                      </div>
                      <div className="font-jp text-sm font-bold mt-0.5">{cat.jp}</div>
                    </div>
                    <div
                      className="font-jp text-[11px] font-bold"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      {cat.items.length}問
                    </div>
                  </summary>
                  <div
                    className="px-4 pb-4 space-y-4"
                    style={{ borderTop: '1px solid var(--rule-thin)', paddingTop: 12 }}
                  >
                    {cat.items.map((item, j) => (
                      <div
                        key={j}
                        style={{
                          paddingTop: j > 0 ? 12 : 0,
                          borderTop: j > 0 ? '1px solid var(--rule-thin)' : 'none',
                        }}
                      >
                        <p
                          className="font-jp text-[13px] font-bold leading-[1.55]"
                          style={{ color: 'var(--ink-900)' }}
                        >
                          Q. {item.q}
                        </p>
                        <p
                          className="font-jp text-[12px] font-medium leading-[1.7] mt-2"
                          style={{ color: 'var(--ink-700)' }}
                        >
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
