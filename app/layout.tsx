import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '湘南 波予報',
  description: '湘南特化・パーソナライズ波診断アプリ。あなたのレベルに合ったサーフスポットをランキング表示',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="波予報" />
      </head>
      <body className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
