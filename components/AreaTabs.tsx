'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const AREAS = [
  { key: 'shonan', nameEn: 'SHONAN', nameJp: '湘南', href: '/' },
  { key: 'chiba-north', nameEn: 'CHIBA·N', nameJp: '千葉北', href: '/chiba-north' },
  { key: 'chiba-south', nameEn: 'CHIBA·S', nameJp: '千葉南', href: '/chiba-south' },
  { key: 'ibaraki', nameEn: 'IBARAKI', nameJp: '茨城', href: '/ibaraki' },
]

export default function AreaTabs() {
  const pathname = usePathname()
  const activeKey = AREAS.find(a => a.href === pathname)?.key ?? 'shonan'

  return (
    <nav
      className="flex border-b-4"
      style={{ borderColor: 'var(--ink-900)', background: 'var(--ink-900)' }}
    >
      {AREAS.map(area => {
        const isActive = activeKey === area.key
        return (
          <Link
            key={area.key}
            href={area.href}
            className="flex-1 py-3 px-1 text-center transition-colors"
            style={{
              background: isActive ? 'var(--paper-100)' : 'transparent',
              color: isActive ? 'var(--ink-900)' : 'rgba(237,229,213,0.6)',
              textDecoration: 'none',
            }}
          >
            <div className="font-display text-base leading-none">{area.nameEn}</div>
            <div
              className="font-jp text-[10px] mt-1"
              style={{ fontWeight: isActive ? 700 : 500 }}
            >
              {area.nameJp}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
