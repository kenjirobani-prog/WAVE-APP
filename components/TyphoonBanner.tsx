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
  const tagLabel = typhoons.length === 1
    ? `台風${typhoons[0].number}号`
    : typhoons.map(t => `台風${t.number}号`).join('・')

  return (
    <Link href={`/typhoon/${year}`} style={{ display: 'block', marginBottom: 12 }}>
      <div style={{
        background: 'white',
        border: '0.5px solid #85B7EB',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            background: '#E6F1FB',
            color: '#0C447C',
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {tagLabel}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0a1628' }}>
            発生中 — 進路や影響を確認する
          </span>
        </div>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#378ADD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
