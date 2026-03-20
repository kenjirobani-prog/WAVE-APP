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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-3 pb-4 pt-2">
      <div className="flex bg-[#f0f4f8] rounded-[20px] p-2">
        {NAV_ITEMS.map(item => {
          const isActive = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="flex-1 py-3 rounded-xl transition-all text-sm"
              style={isActive ? {
                background: '#ffffff',
                color: '#0c4a6e',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(12,74,110,0.12), 0 1px 2px rgba(12,74,110,0.06)',
              } : {
                background: 'transparent',
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
