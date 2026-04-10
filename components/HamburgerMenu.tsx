'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const CURRENT_YEAR = new Date().getFullYear()
const MENU_ITEMS = [
  { label: 'About Us', href: '/about' },
  { label: '波予報', href: '/' },
  { label: '台風情報', href: `/typhoon/${CURRENT_YEAR}` },
  { label: 'サーフィンの始め方', href: '/howto' },
  { label: '用語集', href: '/glossary' },
  { label: 'サーフボード図鑑', href: '/surfboards' },
  { label: 'FAQ', href: '/faq' },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Hamburger icon */}
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, alignSelf: 'flex-end', marginBottom: 2 }}
        aria-label="メニューを開く"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="21" y2="5" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="19" x2="21" y2="19" />
        </svg>
      </button>

      {/* Overlay + Menu */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
          {/* Menu panel */}
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 260, height: '100%',
            background: '#0B2545', padding: '20px 0',
            animation: 'slideIn 0.2s ease-out',
          }}>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 16px' }}>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label="メニューを閉じる"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {/* Menu items */}
            <nav>
              {MENU_ITEMS.map(item => {
                const isActive = pathname === item.href || (item.href === '/' && ['/', '/chiba-north', '/chiba-south', '/ibaraki'].includes(pathname))
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 20px',
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {isActive && (
                      <span style={{ width: 3, height: 20, borderRadius: 2, background: '#fff', flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: 15, fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                      marginLeft: isActive ? 0 : 15,
                    }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
