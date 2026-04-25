import type { Metadata } from 'next'
import { Inter, Anton, Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import Footer from '@/components/Footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
})

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

const notoJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-jp',
  display: 'swap',
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
    images: [
      {
        url: 'https://jpwaveforecast.com/ogp.png',
        width: 1200,
        height: 630,
        alt: 'AI WAVE FORECAST - AI波予報',
      },
    ],
  },
  keywords: '湘南, 波予報, サーフィン, 鵠沼, 辻堂, 茅ヶ崎, 七里ヶ浜, 由比ヶ浜, 千葉, 茨城, 一宮, 波情報, サーフ',
  twitter: {
    card: 'summary_large_image',
    title: 'AI波予報 | 湘南・千葉の波予報をAIがスコア化',
    description: '湘南・千葉北・千葉南・茨城の20スポットをAIがリアルタイム分析。',
    site: '@ichinisantaro',
    images: ['https://jpwaveforecast.com/ogp.png'],
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
        <meta name="theme-color" content="#1a2845" />
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
      </head>
      <body className={`${inter.variable} ${anton.variable} ${notoJp.variable} ${inter.className} min-h-screen bg-[#f0f9ff]`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  )
}
