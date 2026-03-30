import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'AI波予報について | AI 波予報',
  description: '湘南特化の波予報アプリ「AI波予報」のスコアロジックと技術的背景。StormGlass・相模トラフ・海上保安庁検潮データなど世界水準のデータを活用した湘南専用の波予報システムを解説します。',
}

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>About</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>About This App</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28 px-4 pt-5 space-y-4">
        {/* キャッチコピー */}
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', lineHeight: 1.3 }}>波を、AIが読む時代。</h1>
        </div>

        {/* AI 波予報とは */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">AI 波予報とは</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            AI 波予報は、湘南の波をリアルタイムに分析する波予報アプリです。波の高さ、風向き、うねりの方向、潮位、周期——これらをAIが瞬時に計算し、あなたのレベルとボードに合わせたスコアに変換します。サーファーが長年かけて身につける「コンディションの読み方」を、デジタルの力で誰でも使えるかたちに。
          </p>
        </div>

        {/* データの源泉 */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">データの源泉</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            波データはStormGlass APIを通じて、NOAA（米国海洋大気庁）・ECMWF（欧州中期予報センター）・MeteoFranceなど世界トップの気象機関のモデルを統合して取得しています。複数モデルのブレンドにより、単一モデルでは捉えきれないスウェルの挙動を高精度で予測します。
          </p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            潮位は多くのアプリが推定値を使うところ、AI波予報は海上保安庁・横浜観測点のリアルタイム検潮データを使用しています。天気はJMAのWMO天気コードから取得し、UV指数も実データで計算します。
          </p>
        </div>

        {/* 湘南専用のロジック */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">湘南専用のロジック</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            AI波予報は最初から湘南だけを見て設計されています。
          </p>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginBottom: 6 }}>相模トラフの地形的優位性</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            湘南のビーチから沖に出るとわずか1kmで水深1,000m、10km以上沖では9,000mという深海溝「相模トラフ」が走っています。この地形がSE方向からのうねりを海底摩擦で減衰させることなく直接届ける役割を果たしており、湘南が比較的安定してうねりを受け取れる理由のひとつです。
          </p>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginBottom: 6 }}>湘南のスウェル窓</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            最適なうねり方向はSSE 170度〜SW 212度です。江ノ島を含む島鎖がこの窓の一部をブロックするため、スポットごとの屈折・回り込みの影響も計算に入れています。北系のうねり（NW〜NE）は千葉・房総半島が遮蔽するため湘南には届きません。
          </p>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginBottom: 6 }}>各スポット固有の海底地形（バソメトリー）</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            七里ヶ浜のような急傾斜（steep）のスポットでは、グランドスウェル時にプランジング（ホレた波）が発生しやすく適正潮位帯が狭くなります。鵠沼・辻堂のような遠浅（gradual）のスポットはスピリング（ゆっくり崩れる波）が多く、満潮時でも比較的乗りやすい。こうした地形の違いを7スポットそれぞれに設定しています。
          </p>
        </div>

        {/* 100点満点スコアの内訳 */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">100点満点スコアの内訳</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            スコアは単純な波高ではありません。6つの軸で評価されます。
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: '波高', score: '25点' },
              { label: '風', score: '22点' },
              { label: 'うねり方向', score: '18点' },
              { label: '波質', score: '20点' },
              { label: '潮位', score: '10点' },
              { label: '天気', score: '5点' },
            ].map(item => (
              <div key={item.label} className="bg-[#f0f9ff] rounded-lg p-2.5 text-center">
                <p style={{ fontSize: 10, color: '#8899aa' }}>{item.label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0284c7' }}>{item.score}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            波質スコア（20点）の中では、周期を14/12/10/8/6秒の6段階で評価し、台風スウェルのような長周期グランドスウェルを最高評価とします。StormGlassから取得したセカンダリースウェルとのクロスうねり干渉、波エネルギー（kJ）計算、潮位との組み合わせボーナス——これらが複合的に計算されます。「上げ三分・下げ七分」という日本の格言さえ、潮の動き方向ボーナスとして数値化されています。
          </p>
        </div>

        {/* 台風スウェルを見逃さない */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">台風スウェルを見逃さない</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8 }}>
            周期14秒以上のピュアグランドスウェルを最高評価とし、台風スウェルが接近した際には「台風スウェル🌀」タグで表示します。プライマリースウェルの周期が短くてもセカンダリースウェルの周期が長い場合（例：プライマリー9秒＋セカンダリー14秒）は長い方を採用するため、混合スウェルも見逃しません。
          </p>
        </div>

        {/* お問い合わせ */}
        <div className="bg-white rounded-xl border border-[#eef1f4] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-3">お問い合わせ</p>
          <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.8, marginBottom: 14 }}>
            バグ報告・機能要望・感想などお気軽にどうぞ。Googleフォームよりお送りください。
          </p>
          <a
            href="https://forms.gle/bR4gctV1d3zHx9w8A"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#0284c7] text-white rounded-full text-sm font-semibold"
          >
            お問い合わせフォームへ →
          </a>
        </div>
      </main>

      <BottomNav current="mypage" />
    </div>
  )
}
