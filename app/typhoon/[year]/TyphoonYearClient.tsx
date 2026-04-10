'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import TyphoonCard from '@/components/typhoon/TyphoonCard'
import TyphoonArchiveRow from '@/components/typhoon/TyphoonArchiveRow'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

interface Typhoon {
  id: string
  name: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  isActive: boolean
  isWithin800km: boolean
  updatedAt?: string
}

export default function TyphoonYearClient({ year }: { year: string }) {
  const [typhoons, setTyphoons] = useState<Typhoon[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const ref = collection(db, 'typhoons', year, 'list')
        const q = query(ref, orderBy('updatedAt', 'desc'))
        const snap = await getDocs(q)
        const results: Typhoon[] = []
        snap.forEach(doc => {
          const d = doc.data()
          results.push({
            id: doc.id,
            name: d.name ?? '',
            number: d.number ?? 0,
            position: d.position ?? { lat: 0, lon: 0 },
            pressure: d.pressure ?? 0,
            windSpeed: d.windSpeed ?? 0,
            isActive: d.isActive ?? false,
            isWithin800km: d.isWithin800km ?? false,
            updatedAt: d.updatedAt,
          })
        })
        setTyphoons(results)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setTyphoons([])
      }
    }
    load()
  }, [year])

  const activeTyphoons = typhoons?.filter(t => t.isActive && t.isWithin800km) ?? []
  const pastTyphoons = typhoons?.filter(t => !t.isActive || !t.isWithin800km) ?? []

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span>
              </Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>台風情報</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{year}年</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4 px-4 pt-4">
        {typhoons === null ? (
          <p className="text-sm text-[#8899aa] text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-sm text-[#8899aa] text-center py-8">データを取得できませんでした。</p>
        ) : activeTyphoons.length > 0 ? (
          <section>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-700 font-medium text-sm">現在、日本へのうねり影響が見込まれる台風があります</p>
            </div>
            {activeTyphoons.map(t => (
              <TyphoonCard key={t.id} year={year} typhoon={t} />
            ))}
            {pastTyphoons.length > 0 && (
              <div className="mt-8">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">{year}年の台風一覧</h2>
                {pastTyphoons.map(t => (
                  <TyphoonArchiveRow key={t.id} year={year} typhoon={t} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="bg-white border border-[#eef1f4] rounded-xl p-6 text-center mb-6">
              <p className="text-sm text-[#8899aa]">現在、日本への影響が見込まれる台風はありません。</p>
            </div>
            {pastTyphoons.length > 0 && (
              <div>
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">{year}年の台風一覧</h2>
                {pastTyphoons.map(t => (
                  <TyphoonArchiveRow key={t.id} year={year} typhoon={t} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
