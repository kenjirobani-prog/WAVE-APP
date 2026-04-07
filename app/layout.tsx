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
  metadataBase: new URL('https://jpwaveforecast.com'),
  title: 'AI波予報 | 湘南・千葉の波予報をAIがスコア化',
  description: '湘南・千葉北・千葉南・茨城の20スポットをAIがリアルタイム分析。波のコンディションを★1〜5でスコア化。完全無料・登録不要。',
  openGraph: {
    title: 'AI波予報 | 湘南・千葉の波予報をAIがスコア化',
    description: '湘南・千葉北・千葉南・茨城の20スポットをAIがリアルタイム分析。★1〜5でスコア化。完全無料。',
    url: 'https://jpwaveforecast.com',
    siteName: 'AI波予報',
    locale: 'ja_JP',
    type: 'website',
  },
  keywords: '湘南, 波予報, サーフィン, 鵠沼, 辻堂, 茅ヶ崎, 七里ヶ浜, 由比ヶ浜, 千葉, 茨城, 一宮, 波情報, サーフ',
  twitter: {
    card: 'summary_large_image',
    title: 'AI波予報 | 湘南・千葉の波予報をAIがスコア化',
    description: '湘南・千葉北・千葉南・茨城の20スポットをAIがリアルタイム分析。',
    site: '@ichinisantaro',
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
            "description": "AIが湘南・千葉の波をリアルタイム分析する波予報アプリ",
            "applicationCategory": "SportsApplication",
            "operatingSystem": "Web",
            "inLanguage": "ja",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "JPY"
            },
            "keywords": "AI 波予報, 湘南 波予報, 千葉 波予報, 茨城 波予報, サーフィン 波予報, AI サーフィン, 鵠沼 波, 一宮 波, 大洗 波"
          })}}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "AI 波予報とは何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "AI 波予報（jpwaveforecast.com）は、AIが湘南・千葉北・千葉南・茨城の波をリアルタイムで自動分析する波予報アプリです。AIがコンディションをスコア化し、★1〜5の星で表示します。完全無料・登録不要で利用できます。" } },
              { "@type": "Question", "name": "波のスコアはどうやって計算されますか？", "acceptedAnswer": { "@type": "Answer", "text": "波高（25点）・風（22点）・うねり方向（18点）・波質（20点）・潮位（10点）・天気（5点）の合計100点満点でAIがスコア化し、朝・昼・夕方の3時間帯ごとに★1〜5の星で表示します。" } },
              { "@type": "Question", "name": "星評価（★1〜5）の見方は？", "acceptedAnswer": { "@type": "Answer", "text": "★5が最高で月に1回出るかどうかのレアなコンディションです。普段は★2〜3がベースで、★4なら十分良いコンディション。★1でもクローズアウトの赤字表示がなければ入れますが、初心者には難しいかもしれません。" } },
              { "@type": "Question", "name": "どのくらいの頻度で更新されますか？", "acceptedAnswer": { "@type": "Answer", "text": "1日11回AIが自動でデータを取得・更新します。" } },
              { "@type": "Question", "name": "サーフィン初心者でも使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい。どなたでも使えます。用語集でサーフィン用語を学べます。" } }
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
