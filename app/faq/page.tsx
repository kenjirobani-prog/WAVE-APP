import type { Metadata } from 'next'
import BackButton from '@/components/BackButton'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ）| AI波予報',
  description: 'AI波予報のよくある質問。使い方・スコアの仕組み・対応エリア・更新頻度についてまとめています。',
}

const FAQ_CATEGORIES: { en: string; jp: string; items: { q: string; a: string }[] }[] = [
  {
    en: 'SERVICE',
    jp: 'サービス基本情報',
    items: [
      { q: 'AI 波予報とは何ですか？', a: 'AI 波予報（jpwaveforecast.com）は、AIが湘南・千葉北・千葉南・茨城の波をリアルタイムで自動分析する波予報アプリです。波高・風・うねり・潮位などのデータをAIが総合的に判断し、AIがコンディションをスコア化し、★1〜5の星で表示します。完全無料・登録不要で利用できます。' },
      { q: '対応エリア・スポットはどこですか？', a: '湘南7スポット（由比ヶ浜・七里ヶ浜・水族館前・鵠沼・辻堂・茅ヶ崎・大磯）に加え、千葉北6スポット（屏風浦・飯岡・片貝・一宮・太東・御宿）、千葉南3スポット（鴨川・千倉・平砂浦）、茨城4スポット（大洗・鉾田・鹿島・波崎）の合計20スポットの最新コンディションを無料で確認できます。1日6回AIが自動更新します。' },
      { q: '利用料金はかかりますか？', a: 'AI 波予報は完全無料でご利用いただけます。アカウント登録も不要です。' },
      { q: 'どのくらいの頻度で更新されますか？', a: '1日6回（4・6・9・12・15・18時）AIが自動でデータを取得・更新します。朝イチサーフィン前の最新情報も確認できます。' },
      { q: 'アカウント登録は必要ですか？', a: '不要です。登録なしで全機能を無料でご利用いただけます。' },
    ],
  },
  {
    en: 'SCORE',
    jp: 'スコア・波予報の仕組み',
    items: [
      { q: '波のスコアはどうやって計算されますか？', a: '波高（28点）・風（22点）・うねり方向（18点）・波質（22点）・潮位（10点）の合計100点満点でAIがスコア化し（雨天時は-3点）、朝・昼・夕方の3時間帯ごとに★1〜5の星で表示します。' },
      { q: 'スコアはどう見ればいいですか？', a: '朝・昼・夕方の3つの時間帯ごとに★1〜5の星で表示しています。★★★★★（5つ）が最高で、半年に1回出るかどうかのレアなコンディションです。★4は月に1〜3回程度、★3が普通に楽しめる日の目安です。普段は★2〜3がベースで、★4なら十分良いコンディション。★1でも「クローズアウト」の赤字表示がない場合は入れますが、初心者の方には難しいかもしれません。' },
      { q: '波質ラベル（キレた波・ダンパーなど）とは何ですか？', a: 'AIが波の質を5段階で判定します。キレた波・グッドウェーブ・まあまあ・ワイド気味・ダンパーの5種類で、周期・うねり比率・潮位などを総合的に判断します。' },
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
      { q: 'クローズアウトとは何ですか？', a: '波が大きすぎてサーフィンができない危険な状態です。AI 波予報では波高2.5mを超える場合、またはオンショアの強風（10m/s以上）が伴う場合にクローズアウトと判定し、★1の赤字で「クローズアウト」と表示します。このコンディションでは絶対に海に入らないでください。' },
      { q: 'スポット詳細ページではどんな情報が見られますか？', a: '朝・昼・夕方の星評価・AIコメント・波高・風速・うねり方向・周期・波質・潮位グラフ・1時間ごとの予報を確認できます。' },
    ],
  },
  {
    en: 'BEGINNER',
    jp: 'サーフィン初心者向け',
    items: [
      { q: 'サーフィン初心者でも使えますか？', a: 'はい。スコアを参考に、★2〜3の穏やかなコンディションの日から始めるのがおすすめです。用語集やサーフボード図鑑、「サーフィンの始め方」ガイドもご活用ください。' },
      { q: 'サーフィンに最適な潮位はいつですか？', a: '湘南ビーチブレイクでは80〜120cmのミドルタイドが最も波が割れやすくおすすめです。AI 波予報では潮位グラフと潮の動き方向も考慮してスコアを計算します。' },
      { q: 'グランドスウェルとは何ですか？', a: '遠洋（数千km先）から届く長周期（12秒以上）のうねりです。整ったパワフルな波が立ちやすく、サーフィンに最高のコンディションをもたらします。AI 波予報ではグランドスウェルを自動判定して表示します。' },
      { q: 'オフショアとオンショアの違いは何ですか？', a: 'オフショアは陸から海へ吹く風で波面をホールドしてクリーンな波を作ります。オンショアは海から陸へ吹く風で波面を崩してチョッピーにします。朝イチはオフショアになりやすくサーフィンのベストタイムです。' },
    ],
  },
  {
    en: 'AI & DATA',
    jp: 'AI技術・データ',
    items: [
      { q: '波予報にAIを使うメリットは何ですか？', a: '人間のフォーキャスターなしで24時間365日自動更新できます。波高・風・うねり・潮位・周期・波エネルギーなど多数の変数を瞬時に計算し、コンディションを★1〜5の星で表示します。' },
      { q: 'どんなAPIデータを使っていますか？', a: 'StormGlass APIから波高・波周期・うねり高さ・風速・潮位などをリアルタイムで取得しています。複数の気象モデルを統合した高精度データを使用しています。' },
      { q: '週間予報はどこで見られますか？', a: '波予報タブの「週間」を選ぶと7日分の予報が確認できます。AIが今週のベストな日を自動コメントで教えてくれます。' },
      { q: '千葉・茨城エリアはテスト運用中ですか？', a: 'はい、千葉北・千葉南・茨城エリアは現在テスト運用中です。データや表示内容は予告なく変更される場合があります。湘南エリアは正式サービスとして提供しています。' },
    ],
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_CATEGORIES.flatMap(cat =>
    cat.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
}

export default function FaqPage() {
  const totalCount = FAQ_CATEGORIES.reduce((s, c) => s + c.items.length, 0)

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">FAQ</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">よくある質問</div>
        <div
          className="font-jp text-[11px] font-bold mt-2"
          style={{ color: 'var(--ink-500)' }}
        >
          全 {totalCount} 問
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        <div style={{ borderBottom: '4px solid var(--ink-900)' }}>
          {FAQ_CATEGORIES.map((cat, i) => {
            const altBg = i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)'
            const num = String(i + 1).padStart(2, '0')
            return (
              <details
                key={cat.en}
                className="group"
                style={{
                  background: altBg,
                  borderBottom: '1px solid var(--ink-900)',
                }}
              >
                <summary
                  className="flex items-center justify-between cursor-pointer px-5 py-5 select-none"
                  style={{ listStyle: 'none' }}
                >
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em]"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      CATEGORY {num}
                    </div>
                    <div className="font-jp text-base font-black mt-1">{cat.jp}</div>
                    <div
                      className="font-jp text-[11px] font-bold mt-1"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      {cat.en} · {cat.items.length}問
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      border: '2px solid var(--ink-900)',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="font-display text-lg leading-none group-open:hidden"
                      style={{ color: 'var(--ink-900)' }}
                    >
                      +
                    </span>
                    <span
                      className="font-display text-lg leading-none hidden group-open:block"
                      style={{ color: 'var(--ink-900)' }}
                    >
                      −
                    </span>
                  </div>
                </summary>
                <div
                  className="px-5 pb-5 space-y-4"
                  style={{ borderTop: '1px solid var(--rule-thin)', paddingTop: 16 }}
                >
                  {cat.items.map((item, j) => (
                    <div
                      key={j}
                      style={{
                        paddingTop: j > 0 ? 14 : 0,
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
                        className="font-jp text-[12px] font-medium leading-[1.75] mt-2"
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
      </main>
    </div>
  )
}
