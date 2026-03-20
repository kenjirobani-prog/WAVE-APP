'use client'
import { useRouter } from 'next/navigation'

export type NavTab = 'forecast' | 'surflog' | 'mypage'

const NAV_ITEMS = [
  { id: 'forecast' as NavTab, label: '波予報', href: '/' },
  { id: 'surflog' as NavTab, label: 'Surf Log', href: '/surf-log' },
  { id: 'mypage' as NavTab, label: 'My Page', href: '/my-page' },
]

export default function BottomNav({ current }: { current: NavTab }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-[#eef1f4] flex">
      {NAV_ITEMS.map(item => {
        const isActive = current === item.id
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            className={`flex-1 flex flex-col items-center py-6 gap-1 transition-colors ${
              isActive ? 'text-sky-900' : 'text-[#8899aa]'
            }`}
          >
            <span
              className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
                isActive ? 'bg-sky-700 opacity-100' : 'opacity-0'
              }`}
            />
            <span className="text-base font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
