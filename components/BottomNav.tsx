'use client'
import { useRouter } from 'next/navigation'

export type NavTab = 'forecast' | 'surflog' | 'glossary' | 'mypage'

const NAV_ITEMS: Array<
  | { type: 'link'; id: NavTab; label: string; href: string }
  | { type: 'disabled'; label: string; subLabel: string }
> = [
  { type: 'link', id: 'forecast',  label: '波予報',   href: '/' },
  { type: 'link', id: 'surflog',   label: 'Surf Log', href: '/surf-log' },
  { type: 'link', id: 'glossary',  label: '用語集',   href: '/glossary' },
  { type: 'disabled', label: 'How to', subLabel: 'coming soon' },
  { type: 'link', id: 'mypage',    label: 'My Page',  href: '/my-page' },
]

export default function BottomNav({ current }: { current: NavTab }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-3 pb-4 pt-2">
      <div className="flex bg-[#f0f4f8] rounded-[20px] p-1.5">
        {NAV_ITEMS.map((item, i) => {
          if (item.type === 'disabled') {
            return (
              <div
                key="howto"
                className="flex-1 flex flex-col items-center justify-center"
                style={{ padding: '.45rem .15rem' }}
              >
                <span style={{ fontSize: 9, fontWeight: 500, color: '#c8d0d8', lineHeight: 1.3 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 7, color: '#c8d0d8', lineHeight: 1.3, marginTop: 1 }}>
                  {item.subLabel}
                </span>
              </div>
            )
          }
          const isActive = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="flex-1 rounded-xl transition-all"
              style={{
                padding: '.45rem .15rem',
                fontSize: 9,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0c4a6e' : '#94a3b8',
                background: isActive ? '#ffffff' : 'transparent',
                boxShadow: isActive ? '0 2px 6px rgba(12,74,110,0.10)' : 'none',
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
