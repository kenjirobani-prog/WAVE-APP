import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AI 波予報 — 湘南のサーフィン波予報',
  description: 'AIが湘南の波をリアルタイム分析。あなたのレベル・ボードに合わせたパーソナライズスコアで「今日行くべきか」を即判断。由比ヶ浜・鵠沼・七里ヶ浜など7スポット対応。',
  openGraph: {
    title: 'AI 波予報',
    description: 'AIが湘南の波を読む。あなたに合った波予報。',
    url: 'https://jpwaveforecast.com',
    siteName: 'AI 波予報',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: 'https://jpwaveforecast.com/ogp.svg',
        width: 1200,
        height: 630,
        alt: 'AI 波予報 — AIが湘南の波をリアルタイム分析',
      },
    ],
  },
  keywords: '湘南, 波予報, サーフィン, 鵠沼, 辻堂, 茅ヶ崎, 七里ヶ浜, 由比ヶ浜, 波情報, サーフ',
  twitter: {
    card: 'summary_large_image',
    title: 'AI 波予報',
    description: 'AIが湘南の波をリアルタイム分析。あなたのレベル・ボードに合わせたパーソナライズスコアで今日行くべきか即判断。',
    images: ['https://jpwaveforecast.com/ogp.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://jpwaveforecast.com',
  },
  other: {
    'google-site-verification': 'JZHJ4_W4TnbZrH13d0t3-AqqDss1GUWC_L1Vs9hIoYU',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI 波予報',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#0284c7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
        <meta name="apple-mobile-web-app-title" content="AI 波予報" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "AI 波予報",
            "url": "https://jpwaveforecast.com",
            "description": "AIが湘南の波をリアルタイム分析。サーファーのレベルとボードに合わせたパーソナライズスコアで今日行くべきか即判断。",
            "applicationCategory": "SportsApplication",
            "operatingSystem": "Web",
            "inLanguage": "ja",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "JPY"
            },
            "keywords": "AI 波予報, 湘南 波予報, サーフィン 波予報, AI サーフィン, 鵠沼 波, 由比ヶ浜 波, 七里ヶ浜 波"
          })}}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "AI 波予報とは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報（jpwaveforecast.com）は、AIが湘南の波をリアルタイムで自動分析する波予報アプリです。波高・風・うねり・潮位などのデータをAIが総合的に判断し、サーファーのレベルとボードに合わせたパーソナライズスコアを提供します。完全無料・登録不要で利用できます。" } },
              { "@type": "Question", "name": "湘南の波予報はどこで確認できますか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報（jpwaveforecast.com）で湘南7スポット（由比ヶ浜・七里ヶ浜・水族館前・鵠沼・辻堂・茅ヶ崎・大磯）の最新コンディションを無料で確認できます。1日11回AIが自動更新します。" } },
              { "@type": "Question", "name": "利用料金はかかりますか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報は完全無料でご利用いただけます。アカウント登録も不要です。" } },
              { "@type": "Question", "name": "どのくらいの頻度で更新されますか？", "acceptedAnswer": { "@type": "Answer", "text": "1日11回（3・4・6・8・10・12・14・16・18・20・21時）AIが自動でデータを取得・更新します。朝イチサーフィン前の最新情報も確認できます。" } },
              { "@type": "Question", "name": "アカウント登録は必要ですか？", "acceptedAnswer": { "@type": "Answer", "text": "不要です。My Pageでレベル・ボード・好みの波サイズを設定するだけですぐに使えます。設定はブラウザに保存されます。" } },
              { "@type": "Question", "name": "波のスコアはどうやって計算されますか？", "acceptedAnswer": { "@type": "Answer", "text": "波高（25点）・風（22点）・うねり方向（18点）・波質（20点）・潮位（10点）・天気（5点）の合計100点満点でAIがスコア化します。設定したレベルとボードに合わせて補正されます。" } },
              { "@type": "Question", "name": "グレード（◎○△×）の意味は何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "◎（85点以上）はエピックコンディション、○（65〜84点）はグッド、△（45〜64点）はフェア、×（44点以下）は行かなくていい日を意味します。" } },
              { "@type": "Question", "name": "波質ラベル（キレた波・ダンパーなど）とは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "AIが波の質を5段階で判定します。キレた波・グッドウェーブ・まあまあ・ワイド気味・ダンパーの5種類で、周期・うねり比率・潮位などを総合的に判断します。" } },
              { "@type": "Question", "name": "パーソナライズスコアとは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "My Pageでサーフィンレベル（初級・中級・上級）、ボードの種類（ショートボード・ミッドレングス・ロングボード）、好みの波サイズを設定すると、それに合わせたスコアに自動調整されます。" } },
              { "@type": "Question", "name": "AIコメントはどのように生成されますか？", "acceptedAnswer": { "@type": "Answer", "text": "Claude AI（Anthropic社）が7日分の波データを分析して、今週のベストな日や注目ポイントを自然な日本語で要約します。今日・明日タブでも時間帯別のAIコメントが自動生成されます。" } },
              { "@type": "Question", "name": "鵠沼の波はどこで見られますか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報（jpwaveforecast.com）の波予報タブで鵠沼のリアルタイムコンディションを確認できます。スコア・波高・風・うねり・周期・潮位を表示し、1時間ごとの予報も見られます。" } },
              { "@type": "Question", "name": "由比ヶ浜の波予報はどこで確認できますか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報（jpwaveforecast.com）で由比ヶ浜の波予報をリアルタイムで確認できます。初心者向けのスポットで、AIが「今日行くべきか」をスコアで判断します。" } },
              { "@type": "Question", "name": "七里ヶ浜の波はどんな特徴がありますか？", "acceptedAnswer": { "@type": "Answer", "text": "七里ヶ浜は急傾斜の地形でパワフルな波が立ちやすく、中〜上級者向きのスポットです。AI 波予報では七里ヶ浜のリアルタイムスコアと波質を確認できます。" } },
              { "@type": "Question", "name": "茅ヶ崎・辻堂・大磯の波予報も見られますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。AI 波予報では湘南の茅ヶ崎・辻堂・大磯・水族館前を含む7スポットすべての波予報をリアルタイムで確認できます。" } },
              { "@type": "Question", "name": "スポット詳細ページではどんな情報が見られますか？", "acceptedAnswer": { "@type": "Answer", "text": "AIスコア・グレード・波高・風速・うねり方向・周期・波質・潮位グラフ・1時間ごとの予報・Windyマップ・近隣サーフショップ情報を確認できます。" } },
              { "@type": "Question", "name": "サーフィン初心者でも使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。My Pageで「初級」レベルを設定すると、初心者に適したコンディションが高評価になるようスコアが自動調整されます。また用語集でサーフィン用語を学べます。" } },
              { "@type": "Question", "name": "ロングボードとショートボードでスコアは変わりますか？", "acceptedAnswer": { "@type": "Answer", "text": "変わります。ロングボードは小波でもボーナスが付き、ショートボードは小波でペナルティが入ります。My Pageでボードの種類を設定するとパーソナライズされます。" } },
              { "@type": "Question", "name": "サーフィンに最適な潮位はいつですか？", "acceptedAnswer": { "@type": "Answer", "text": "湘南ビーチブレイクでは80〜120cmのミドルタイドが最も波が割れやすくおすすめです。AI 波予報では潮位グラフと潮の動き方向も考慮してスコアを計算します。" } },
              { "@type": "Question", "name": "グランドスウェルとは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "遠洋（数千km先）から届く長周期（12秒以上）のうねりです。整ったパワフルな波が立ちやすく、サーフィンに最高のコンディションをもたらします。AI 波予報ではグランドスウェルを自動判定して表示します。" } },
              { "@type": "Question", "name": "オフショアとオンショアの違いは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "オフショアは陸から海へ吹く風で波面をホールドしてクリーンな波を作ります。オンショアは海から陸へ吹く風で波面を崩してチョッピーにします。朝イチはオフショアになりやすくサーフィンのベストタイムです。" } },
              { "@type": "Question", "name": "波予報にAIを使うメリットは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "人間のフォーキャスターなしで24時間365日自動更新できます。波高・風・うねり・潮位・周期・波エネルギーなど多数の変数を瞬時に計算し、個人のレベルとボードに合わせたパーソナライズスコアを提供できます。" } },
              { "@type": "Question", "name": "どんなAPIデータを使っていますか？", "acceptedAnswer": { "@type": "Answer", "text": "StormGlass APIから波高・波周期・うねり高さ・風速・潮位などをリアルタイムで取得しています。複数の気象モデルを統合した高精度データを使用しています。" } },
              { "@type": "Question", "name": "Surf Logとは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "実際にサーフィンした日のコンディション・スポット・グレードを記録できる機能です。今年の通算日数や履歴を管理できます。" } },
              { "@type": "Question", "name": "週間予報はどこで見られますか？", "acceptedAnswer": { "@type": "Answer", "text": "波予報タブの「週間」を選ぶと7日分の予報が確認できます。AIが今週のベストな日を自動コメントで教えてくれます。" } },
              { "@type": "Question", "name": "今後エリア拡張の予定はありますか？", "acceptedAnswer": { "@type": "Answer", "text": "現在は湘南エリア（7スポット）に対応しています。千葉・伊豆など他のエリアへの拡張を検討しています。" } }
            ]
          })}}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#f0f9ff]`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}
