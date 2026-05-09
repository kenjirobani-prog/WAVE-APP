'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

interface TyphoonInfo {
  name: string
  number: number
}

export default function TyphoonBanner() {
  const [typhoons, setTyphoons] = useState<TyphoonInfo[]>([])

  useEffect(() => {
    async function fetch() {
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const year = String(new Date().getFullYear())
        const ref = collection(db, 'typhoons', year, 'list')
        const q = query(ref, where('isActive', '==', true), where('isWithin800km', '==', true))
        const snap = await getDocs(q)
        const results: TyphoonInfo[] = []
        snap.forEach(doc => {
          const d = doc.data()
          results.push({ name: d.name ?? '', number: d.number ?? 0 })
        })
        setTyphoons(results)
      } catch {
        // 台風データ未作成やFirestoreエラー時は非表示
      }
    }
    fetch()
  }, [])

  if (typhoons.length === 0) return null

  const year = new Date().getFullYear()
  const mainText = typhoons.length === 1
    ? `台風${typhoons[0].number}号 発生中`
    : `${typhoons.map(t => `台風${t.number}号`).join('・')} 発生中`

  return (
    <>
      <style jsx>{`
        @keyframes typhoon-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .typhoon-vortex {
          animation: typhoon-spin 8s linear infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .typhoon-vortex {
            animation: none;
          }
        }
      `}</style>
      <Link href={`/typhoon/${year}`} style={{ display: 'block', marginBottom: 12, textDecoration: 'none' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0B2545 100%)',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <g className="typhoon-vortex" style={{ transformOrigin: '12px 12px' }}>
                <circle cx="12" cy="12" r="2" fill="#fbbf24" />
                <path
                  d="M12 4 Q 18 7, 17 12 Q 15 16, 12 17"
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M12 20 Q 6 17, 7 12 Q 9 8, 12 7"
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              </g>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{
                fontSize: 10,
                color: '#94a3b8',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}>
                TYPHOON
              </span>
              <span style={{
                fontSize: 13,
                color: '#fff',
                fontWeight: 600,
                letterSpacing: '-0.2px',
              }}>
                {mainText}
              </span>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </Link>
    </>
  )
}
