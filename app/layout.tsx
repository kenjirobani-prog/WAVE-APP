import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'S/W Shonan Wave Forecast — 湘南の波予報アプリ',
  description: 'AIが湘南の波をリアルタイム分析。あなたのレベル・ボードに合わせたパーソナライズスコアで「今日行くべきか」を即判断。由比ヶ浜・鵠沼・七里ヶ浜など7スポット対応。',
  openGraph: {
    title: 'S/W Shonan Wave Forecast',
    description: 'AIが湘南の波を読む。あなたに合った波予報。',
    url: 'https://jpwaveforecast.com',
    siteName: 'S/W Shonan Wave Forecast',
    locale: 'ja_JP',
    type: 'website',
  },
  keywords: '湘南, 波予報, サーフィン, 鵠沼, 辻堂, 茅ヶ崎, 七里ヶ浜, 由比ヶ浜, 波情報, サーフ',
  twitter: {
    card: 'summary',
    title: 'S/W Shonan Wave Forecast',
    description: 'AIが湘南の波を読む。あなたに合った波予報。',
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
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'S/W Shonan Wave',
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
        <meta name="apple-mobile-web-app-title" content="Shonan Wave" />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#f0f9ff]`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
