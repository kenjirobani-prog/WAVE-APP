'use client'
import { useRouter } from 'next/navigation'

export type NavTab = 'forecast' | 'surflog' | 'mypage'

const NAV_ITEMS = [
  { id: 'forecast' as NavTab, label: '波予報', href: '/' },
  { id: 'surflog' as NavTab, label: 'Surf Log', href: '/surf-log' },
  { id: 'mypage' as NavTab, label: 'マイページ', href: '/my-page' },
]

export default function BottomNav({ current }: { current: NavTab }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 flex">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => router.push(item.href)}
          className={`flex-1 flex flex-col items-center py-6 gap-1 text-base font-medium transition-colors ${
            current === item.id ? 'text-sky-500' : 'text-slate-400'
          }`}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
