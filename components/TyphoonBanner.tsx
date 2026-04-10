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

  const label = typhoons.length === 1
    ? `台風${typhoons[0].number}号が発生中`
    : `台風${typhoons.map(t => `${t.number}号`).join('・')}が発生中`

  const year = new Date().getFullYear()

  return (
    <Link href={`/typhoon/${year}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between active:scale-[0.98] transition-transform" style={{ cursor: 'pointer' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-blue-600 text-sm font-medium shrink-0">🌀 {label}</span>
          <span className="text-blue-500 text-sm truncate">— うねり影響を確認する</span>
        </div>
        <span className="text-blue-400 text-sm shrink-0 ml-2">→</span>
      </div>
    </Link>
  )
}
