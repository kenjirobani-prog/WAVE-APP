import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ）| AI波予報',
  description: 'AI波予報のよくある質問。使い方・スコアの仕組み・対応エリア・更新頻度についてまとめています。',
}

const FAQ_CATEGORIES = [
  {
    title: 'サービス基本情報',
    items: [
      { q: 'AI 波予報とは何ですか？', a: 'AI 波予報（jpwaveforecast.com）は、AIが湘南・千葉北・千葉南・茨城の波をリアルタイムで自動分析する波予報アプリです。波高・風・うねり・潮位などのデータをAIが総合的に判断し、AIがコンディションをスコア化し、★1〜5の星で表示します。完全無料・登録不要で利用できます。' },
      { q: '対応エリア・スポットはどこですか？', a: '湘南7スポット（由比ヶ浜・七里ヶ浜・水族館前・鵠沼・辻堂・茅ヶ崎・大磯）に加え、千葉北6スポット（屏風浦・飯岡・片貝・一宮・太東・御宿）、千葉南3スポット（鴨川・千倉・平砂浦）、茨城4スポット（大洗・鉾田・鹿島・波崎）の合計20スポットの最新コンディションを無料で確認できます。1日11回AIが自動更新します。' },
      { q: '利用料金はかかりますか？', a: 'AI 波予報は完全無料でご利用いただけます。アカウント登録も不要です。' },
      { q: 'どのくらいの頻度で更新されますか？', a: '1日11回（3・4・6・8・10・12・14・16・18・20・21時）AIが自動でデータを取得・更新します。朝イチサーフィン前の最新情報も確認できます。' },
      { q: 'アカウント登録は必要ですか？', a: '不要です。登録なしですぐに使えます。' },
    ],
  },
  {
    title: 'スコア・波予報の仕組み',
    items: [
      { q: '波のスコアはどうやって計算されますか？', a: '波高（25点）・風（22点）・うねり方向（18点）・波質（20点）・潮位（10点）・天気（5点）の合計100点満点でAIがスコア化し、朝・昼・夕方の3時間帯ごとに★1〜5の星で表示します。' },
      { q: 'スコアはどう見ればいいですか？', a: '朝・昼・夕方の3つの時間帯ごとに★1〜5の星で表示しています。★★★★★（5つ）が最高で、月に1回出るかどうかのレアなコンディションです。普段は★2〜3がベースで、★4なら十分良いコンディション。★1でも「クローズアウト」の赤字表示がない場合は入れますが、初心者の方には難しいかもしれません。' },
      { q: '波質ラベル（キレた波・ダンパーなど）とは何ですか？', a: 'AIが波の質を5段階で判定します。キレた波・グッドウェーブ・まあまあ・ワイド気味・ダンパーの5種類で、周期・うねり比率・潮位などを総合的に判断します。' },
      { q: 'AIコメントはどのように生成されますか？', a: 'Claude AI（Anthropic社）が7日分の波データを分析して、今週のベストな日や注目ポイントを自然な日本語で要約します。今日・明日タブでも時間帯別のAIコメントが自動生成されます。' },
    ],
  },
  {
    title: 'スポット・エリア',
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
    title: 'サーフィン初心者向け',
    items: [
      { q: 'サーフィン初心者でも使えますか？', a: 'はい。どなたでも使えます。用語集でサーフィン用語を学べます。' },
      { q: 'サーフィンに最適な潮位はいつですか？', a: '湘南ビーチブレイクでは80〜120cmのミドルタイドが最も波が割れやすくおすすめです。AI 波予報では潮位グラフと潮の動き方向も考慮してスコアを計算します。' },
      { q: 'グランドスウェルとは何ですか？', a: '遠洋（数千km先）から届く長周期（12秒以上）のうねりです。整ったパワフルな波が立ちやすく、サーフィンに最高のコンディションをもたらします。AI 波予報ではグランドスウェルを自動判定して表示します。' },
      { q: 'オフショアとオンショアの違いは何ですか？', a: 'オフショアは陸から海へ吹く風で波面をホールドしてクリーンな波を作ります。オンショアは海から陸へ吹く風で波面を崩してチョッピーにします。朝イチはオフショアになりやすくサーフィンのベストタイムです。' },
    ],
  },
  {
    title: 'AI技術・データ',
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
  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>よくある質問</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>FAQ</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4 px-4 pt-4 space-y-3">
        <p style={{ fontSize: 13, color: '#8899aa', marginBottom: 8 }}>全{FAQ_CATEGORIES.reduce((s, c) => s + c.items.length, 0)}問</p>

        {FAQ_CATEGORIES.map(cat => (
          <details key={cat.title} style={{ background: '#f0f9ff', borderRadius: 12, border: '1px solid #e0f2fe', overflow: 'hidden' }}>
            <summary style={{ padding: '14px 16px', fontSize: 15, fontWeight: 800, color: '#0284c7', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {cat.title}
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{cat.items.length}問</span>
            </summary>
            <div style={{ padding: '0 16px 14px' }}>
              {cat.items.map((item, i) => (
                <div key={i} style={{ borderTop: i > 0 ? '1px solid #e0f2fe' : 'none', paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0a1628', marginBottom: 6, lineHeight: 1.5 }}>Q. {item.q}</p>
                  <p style={{ fontSize: 13, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </main>
    </div>
  )
}
