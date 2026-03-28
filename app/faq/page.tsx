import type { Metadata } from 'next'
import BackButton from '@/components/BackButton'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ） | AI 波予報',
  description: 'AI 波予報の使い方・スコアの仕組み・湘南スポット情報などよくある質問25問に回答。',
}

const FAQ_CATEGORIES = [
  {
    title: 'サービス基本情報',
    items: [
      { q: 'AI 波予報とは何ですか？', a: 'AI 波予報（jpwaveforecast.com）は、AIが湘南の波をリアルタイムで自動分析する波予報アプリです。波高・風・うねり・潮位などのデータをAIが総合的に判断し、サーファーのレベルとボードに合わせたパーソナライズスコアを提供します。完全無料・登録不要で利用できます。' },
      { q: '湘南の波予報はどこで確認できますか？', a: 'AI 波予報（jpwaveforecast.com）で湘南7スポット（由比ヶ浜・七里ヶ浜・水族館前・鵠沼・辻堂・茅ヶ崎・大磯）の最新コンディションを無料で確認できます。1日11回AIが自動更新します。' },
      { q: '利用料金はかかりますか？', a: 'AI 波予報は完全無料でご利用いただけます。アカウント登録も不要です。' },
      { q: 'どのくらいの頻度で更新されますか？', a: '1日11回（3・4・6・8・10・12・14・16・18・20・21時）AIが自動でデータを取得・更新します。朝イチサーフィン前の最新情報も確認できます。' },
      { q: 'アカウント登録は必要ですか？', a: '不要です。My Pageでレベル・ボード・好みの波サイズを設定するだけですぐに使えます。設定はブラウザに保存されます。' },
    ],
  },
  {
    title: 'スコア・波予報の仕組み',
    items: [
      { q: '波のスコアはどうやって計算されますか？', a: '波高（25点）・風（22点）・うねり方向（18点）・波質（20点）・潮位（10点）・天気（5点）の合計100点満点でAIがスコア化します。設定したレベルとボードに合わせて補正されます。' },
      { q: 'グレード（◎○△×）の意味は何ですか？', a: '◎（85点以上）はエピックコンディション、○（65〜84点）はグッド、△（45〜64点）はフェア、×（44点以下）は行かなくていい日を意味します。' },
      { q: '波質ラベル（キレた波・ダンパーなど）とは何ですか？', a: 'AIが波の質を5段階で判定します。キレた波・グッドウェーブ・まあまあ・ワイド気味・ダンパーの5種類で、周期・うねり比率・潮位などを総合的に判断します。' },
      { q: 'パーソナライズスコアとは何ですか？', a: 'My Pageでサーフィンレベル（初級・中級・上級）、ボードの種類（ショートボード・ミッドレングス・ロングボード）、好みの波サイズを設定すると、それに合わせたスコアに自動調整されます。' },
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
      { q: 'スポット詳細ページではどんな情報が見られますか？', a: 'AIスコア・グレード・波高・風速・うねり方向・周期・波質・潮位グラフ・1時間ごとの予報・Windyマップ・近隣サーフショップ情報を確認できます。' },
    ],
  },
  {
    title: 'サーフィン初心者向け',
    items: [
      { q: 'サーフィン初心者でも使えますか？', a: 'はい。My Pageで「初級」レベルを設定すると、初心者に適したコンディションが高評価になるようスコアが自動調整されます。また用語集でサーフィン用語を学べます。' },
      { q: 'ロングボードとショートボードでスコアは変わりますか？', a: '変わります。ロングボードは小波でもボーナスが付き、ショートボードは小波でペナルティが入ります。My Pageでボードの種類を設定するとパーソナライズされます。' },
      { q: 'サーフィンに最適な潮位はいつですか？', a: '湘南ビーチブレイクでは80〜120cmのミドルタイドが最も波が割れやすくおすすめです。AI 波予報では潮位グラフと潮の動き方向も考慮してスコアを計算します。' },
      { q: 'グランドスウェルとは何ですか？', a: '遠洋（数千km先）から届く長周期（12秒以上）のうねりです。整ったパワフルな波が立ちやすく、サーフィンに最高のコンディションをもたらします。AI 波予報ではグランドスウェルを自動判定して表示します。' },
      { q: 'オフショアとオンショアの違いは何ですか？', a: 'オフショアは陸から海へ吹く風で波面をホールドしてクリーンな波を作ります。オンショアは海から陸へ吹く風で波面を崩してチョッピーにします。朝イチはオフショアになりやすくサーフィンのベストタイムです。' },
    ],
  },
  {
    title: 'AI技術・データ',
    items: [
      { q: '波予報にAIを使うメリットは何ですか？', a: '人間のフォーキャスターなしで24時間365日自動更新できます。波高・風・うねり・潮位・周期・波エネルギーなど多数の変数を瞬時に計算し、個人のレベルとボードに合わせたパーソナライズスコアを提供できます。' },
      { q: 'どんなAPIデータを使っていますか？', a: 'StormGlass APIから波高・波周期・うねり高さ・風速・潮位などをリアルタイムで取得しています。複数の気象モデルを統合した高精度データを使用しています。' },
      { q: 'Surf Logとは何ですか？', a: '実際にサーフィンした日のコンディション・スポット・グレードを記録できる機能です。今年の通算日数や履歴を管理できます。' },
      { q: '週間予報はどこで見られますか？', a: '波予報タブの「週間」を選ぶと7日分の予報が確認できます。AIが今週のベストな日を自動コメントで教えてくれます。' },
      { q: '今後エリア拡張の予定はありますか？', a: '現在は湘南エリア（7スポット）に対応しています。千葉・伊豆など他のエリアへの拡張を検討しています。' },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BackButton />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>よくある質問</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>FAQ</div>
              </div>
            </div>
            <div style={{ marginTop: 8, visibility: 'hidden', background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '3px 10px', display: 'inline-flex' }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>00:00 更新</span>
            </div>
          </div>
          <div style={{ visibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#0284c7' }}>⚙ マイ設定</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>中級・ミッド・腰</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28 px-4 pt-4 space-y-3">
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
