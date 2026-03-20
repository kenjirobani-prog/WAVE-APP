import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '湘南波予報',
  description: '湘南特化・パーソナライズ波診断アプリ。あなたのレベルに合ったサーフスポットをランキング表示',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
