import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'

export const metadata: Metadata = {
  title: 'AI波予報について | AI波予報',
  description: 'AI波予報のスコアロジック・データソース・開発背景について',
}

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>About</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>AI波予報について</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4 px-4 pt-4 space-y-3">
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid #eef1f4' }}>
          <h1 className="text-2xl font-medium mb-6 text-[#0a1628]">波を、AIが読む時代。</h1>

          <h2 className="text-base font-bold mt-8 mb-2 text-[#0a1628]">AI 波予報とは</h2>
          <p className="text-sm leading-7 text-[#4a6fa5]">
            AI 波予報は、全国のサーフスポットの波をリアルタイムに分析する波予報アプリです。波の高さ、風向き、うねりの方向、潮位、周期——これらをAIが瞬時に計算し、コンディションスコアに変換します。サーファーが長年かけて身につける「コンディションの読み方」を、デジタルの力で誰でも使えるかたちに。
          </p>

          <hr className="border-[#eef1f4] my-6" />

          <h2 className="text-base font-bold mt-6 mb-2 text-[#0a1628]">データの源泉</h2>
          <p className="text-sm leading-7 text-[#4a6fa5]">
            波データはStormGlass APIを通じて、NOAA・ECMWF・MeteoFranceなど世界トップの気象機関のモデルを統合して取得しています。潮位は海上保安庁・横浜観測点のリアルタイム検潮データを使用。天気はWMO天気コードから取得し、UV指数も実データで計算します。
          </p>

          <hr className="border-[#eef1f4] my-6" />

          <h2 className="text-base font-bold mt-6 mb-2 text-[#0a1628]">エリア・スポット専用のロジック</h2>
          <p className="text-sm leading-7 text-[#4a6fa5]">
            湘南なら、相模トラフ（沿岸から1kmで水深1,000mの深海溝）がSEうねりを減衰なく届ける地形的優位性、スウェル最適方向（SSE 170度〜SW 212度）、江ノ島の遮蔽効果、スポットごとの海底地形——これらすべてが評価ロジックに組み込まれています。
          </p>

          <hr className="border-[#eef1f4] my-6" />

          <h2 className="text-base font-bold mt-6 mb-2 text-[#0a1628]">6つの軸で100点満点 → ★1〜5の星で表示</h2>
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr>
                <th className="border border-[#eef1f4] px-4 py-2 text-left text-[#0a1628] bg-[#f0f9ff]">評価軸</th>
                <th className="border border-[#eef1f4] px-4 py-2 text-left text-[#0a1628] bg-[#f0f9ff]">配点</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['波高', '25点'],
                ['風', '22点'],
                ['うねり方向', '18点'],
                ['波質', '20点'],
                ['潮位', '10点'],
                ['天気', '5点'],
              ].map(([axis, score]) => (
                <tr key={axis}>
                  <td className="border border-[#eef1f4] px-4 py-2 text-[#4a6fa5]">{axis}</td>
                  <td className="border border-[#eef1f4] px-4 py-2 text-[#4a6fa5]">{score}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="text-sm leading-8 text-[#4a6fa5] list-none pl-0 mb-4">
            <li>★★★★★ 最高のコンディション（月1回出るかのレア）</li>
            <li>★★★★☆ 良いコンディション</li>
            <li>★★★☆☆ まずまず。楽しめます</li>
            <li>★★☆☆☆ やや難しめ。上級者向け</li>
            <li>★☆☆☆☆ おすすめしません</li>
          </ul>

          <p className="text-sm leading-7 text-[#4a6fa5]">
            クローズアウト時は★1の赤字で表示されます。波質スコアは周期・セカンダリースウェル・クロスうねり干渉・波エネルギーを複合計算しています。
          </p>

          <hr className="border-[#eef1f4] my-6" />

          <h2 className="text-base font-bold mt-6 mb-2 text-[#0a1628]">このアプリができた理由</h2>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-4">
            AI 波予報は、商用サービスではありません。
          </p>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-4">
            きっかけはシンプルで、「AIがどこまでできるか試したかった」のと、「好きなサーフィンの波のことを、もっと自分自身が深く知りたかった」という2つの動機からはじまった個人プロジェクトです。
          </p>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-4">
            開発も運用も、99%はAIが担っています。コードを書くのもAI、データを集めるのもAI、このページの文章を整えるのもAI。人間がやっていることは、方向を決めることと、海に入ることだけ。そのことが、AIの可能性をいちばん実感できた部分でもあります。
          </p>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-4">
            ターゲットとして想定しているのは、週末サーファーや、これからサーフィンをはじめる人たちです。長年の経験でコンディションを読める上級者には物足りないかもしれません。でも、「今日は行くべきか」を数字で判断したい人や、波のことを少しずつ勉強したい人には、きっと役立てると思っています。
          </p>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-4">
            今後は湘南や千葉以外のエリアにも、さらに広げていきたいと考えています。サーフィンとテクノロジーの可能性を、これからも海の近くで試し続けます。
          </p>
          <p className="text-sm leading-7 text-[#4a6fa5]">
            波情報はXでも発信しています。<br />
            <a href="https://x.com/ichinisantaro" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-semibold">
              AI 波予報 / AI Wave Forecast →
            </a>
          </p>

          <hr className="border-[#eef1f4] my-6" />

          <h2 className="text-base font-bold mt-6 mb-2 text-[#0a1628]">お問い合わせ</h2>
          <p className="text-sm leading-7 text-[#4a6fa5] mb-3">
            バグ報告・機能要望などお気軽にどうぞ。
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
      </main>
    </div>
  )
}
