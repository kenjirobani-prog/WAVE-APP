'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const CURRENT_YEAR = new Date().getFullYear()
const MENU_ITEMS: { labelEn: string; labelJp: string; href: string }[] = [
  { labelEn: 'ABOUT', labelJp: 'About Us', href: '/about' },
  { labelEn: 'FORECAST', labelJp: '波予報', href: '/' },
  { labelEn: 'TYPHOON', labelJp: '台風情報', href: `/typhoon/${CURRENT_YEAR}` },
  { labelEn: 'HOW TO', labelJp: 'サーフィンの始め方', href: '/howto' },
  { labelEn: 'GLOSSARY', labelJp: '用語集', href: '/glossary' },
  { labelEn: 'SURFBOARDS', labelJp: 'サーフボード図鑑', href: '/surfboards' },
  { labelEn: 'FAQ', labelJp: 'よくある質問', href: '/faq' },
]

const FORECAST_PATHS = ['/', '/chiba-north', '/chiba-south', '/ibaraki']

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
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, alignSelf: 'flex-end', marginBottom: 2 }}
        aria-label="メニューを開く"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1815" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="21" y2="5" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="19" x2="21" y2="19" />
        </svg>
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="flex flex-col"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 280,
              height: '100%',
              background: 'var(--ink-900)',
              color: 'var(--paper-100)',
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-5 flex justify-between items-start"
              style={{ borderBottom: '1px solid rgba(251,248,243,0.15)' }}
            >
              <div>
                <div className="inline-block" style={{ border: '2px solid var(--paper-100)', padding: '6px 12px' }}>
                  <div className="font-display text-2xl leading-[0.95] tracking-[0.02em]">AI WAVE FORECAST</div>
                </div>
                <div
                  className="font-jp text-[10px] mt-2 font-medium"
                  style={{ color: 'rgba(251,248,243,0.6)' }}
                >
                  AI波予報
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label="メニューを閉じる"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbf8f3" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            {/* Menu items */}
            <nav className="flex-1 py-2 overflow-auto">
              {MENU_ITEMS.map(item => {
                const isActive =
                  item.href === '/'
                    ? FORECAST_PATHS.includes(pathname)
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="w-full text-left flex items-center gap-3 px-5 py-3.5"
                    style={{
                      background: isActive ? 'rgba(251,248,243,0.08)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {isActive && (
                      <span
                        style={{
                          width: 3,
                          height: 28,
                          background: 'var(--paper-100)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      className="flex-1"
                      style={{ marginLeft: isActive ? 0 : 15 }}
                    >
                      <div
                        className="font-display text-sm leading-none tracking-[0.06em]"
                        style={{
                          color: isActive ? 'var(--paper-100)' : 'rgba(251,248,243,0.5)',
                        }}
                      >
                        {item.labelEn}
                      </div>
                      <div
                        className="font-jp text-[12px] mt-1"
                        style={{
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--paper-100)' : 'rgba(251,248,243,0.65)',
                        }}
                      >
                        {item.labelJp}
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>

            {/* Footer */}
            <div
              className="px-5 py-5"
              style={{ borderTop: '1px solid rgba(251,248,243,0.15)' }}
            >
              <div
                className="font-display text-xs leading-none tracking-[0.06em]"
                style={{ color: 'rgba(251,248,243,0.5)' }}
              >
                JPWAVEFORECAST.COM
              </div>
              <div
                className="font-jp text-[9px] mt-1 font-medium"
                style={{ color: 'rgba(251,248,243,0.4)' }}
              >
                AI波予報
              </div>
            </div>
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
