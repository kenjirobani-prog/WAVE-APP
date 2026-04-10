'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const AREAS = [
  { key: 'shonan', label: '湘南', href: '/' },
  { key: 'chiba-north', label: '千葉北', href: '/chiba-north' },
  { key: 'chiba-south', label: '千葉南', href: '/chiba-south' },
  { key: 'ibaraki', label: '茨城', href: '/ibaraki' },
]

export default function AreaTabs() {
  const pathname = usePathname()
  const activeKey = AREAS.find(a => a.href === pathname)?.key ?? 'shonan'

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', minWidth: 'max-content' }}>
        {AREAS.map(a => (
          <Link key={a.key} href={a.href}
            style={{
              flex: 1,
              padding: '12px 18px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: activeKey === a.key ? 600 : 400,
              color: activeKey === a.key ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none',
              borderBottom: activeKey === a.key ? '2px solid var(--accent)' : '2px solid transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              transition: 'all 0.15s',
            }}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
