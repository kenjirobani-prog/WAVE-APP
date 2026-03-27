'use client'
import { useRouter } from 'next/navigation'

export type NavTab = 'forecast' | 'surflog' | 'glossary' | 'howto' | 'mypage'  // 全ページ用の型（互換性維持）

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 12C3 12 6 5 12 5C18 5 21 12 21 12C21 12 18 19 12 19C6 19 3 12 3 12Z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
      <path d="M16 2V6M8 2V6M3 10H21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" stroke="white" strokeWidth="2"/>
      <path d="M12 8V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
      <path d="M4 20C4 17.239 7.582 15 12 15C16.418 15 20 17.239 20 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

type LinkItem = { type: 'link'; id: NavTab; label: string; href: string; icon: React.ReactNode }

const NAV_ITEMS: LinkItem[] = [
  { type: 'link', id: 'forecast', label: '波予報',   href: '/',          icon: <IconEye /> },
  { type: 'link', id: 'surflog',  label: 'Surf Log', href: '/surf-log',  icon: <IconCalendar /> },
  { type: 'link', id: 'mypage',   label: 'My Page',  href: '/my-page',   icon: <IconUser /> },
]

export default function BottomNav({ current }: { current: NavTab }) {
  const router = useRouter()
  return (
    <>
      {/* ホームインジケーター背景 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 34, background: '#0284c7', zIndex: 39 }} />

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, zIndex: 40 }}>
        {/* ナビ本体 */}
        <div style={{ background: '#0284c7', padding: '.45rem .3rem', display: 'flex', gap: '.15rem' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = current === item.id
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  borderRadius: 8,
                  padding: '.45rem .1rem',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.45 }}>{item.icon}</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                  lineHeight: 1,
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* ホームインジケーターバー */}
        <div style={{ background: '#0284c7', display: 'flex', justifyContent: 'center', paddingBottom: 8, paddingTop: 4 }}>
          <div style={{ width: 134, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </nav>
    </>
  )
}
