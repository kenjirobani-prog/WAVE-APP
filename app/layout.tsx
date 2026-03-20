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
  title: 'Shonan Wave Forecast',
  description: '湘南特化・パーソナライズ波診断アプリ。あなたのレベルに合ったサーフスポットをランキング表示',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shonan Wave',
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
        <meta name="theme-color" content="#0c4a6e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shonan Wave" />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#f0f4f8]`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
