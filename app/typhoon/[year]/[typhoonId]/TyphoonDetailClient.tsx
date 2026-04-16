'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import TyphoonMap from '@/components/typhoon/TyphoonMap'
import AreaCommentCard from '@/components/typhoon/AreaCommentCard'
import { getApproximateLocation } from '@/lib/typhoon/location'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'

interface ForecastPoint {
  lat: number
  lon: number
  time: string
  pressure: number
  windSpeed: number
}

interface Typhoon {
  name: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  maxWindGust?: number
  intensity?: string
  size?: string
  forecastPath: ForecastPoint[]
  isActive: boolean
  updatedAt?: string
  startedAt?: string
}

interface AreaComment {
  text: string
  generatedAt?: string
}

function formatDateTime(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch {
    return ''
  }
}

function formatUpdatedAt(iso?: string): string {
  const t = formatDateTime(iso)
  return t ? `${t} 更新` : ''
}

export default function TyphoonDetailClient({ year, typhoonId }: { year: string; typhoonId: string }) {
  const [typhoon, setTyphoon] = useState<Typhoon | null>(null)
  const [areaComments, setAreaComments] = useState<Record<string, AreaComment>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        await ensureAnonymousAuth()
        const db = getDb()

        // 台風本体
        const tRef = doc(db, 'typhoons', year, 'list', typhoonId)
        const tSnap = await getDoc(tRef)
        if (!tSnap.exists()) {
          console.warn(`[typhoon-detail] Document not found: typhoons/${year}/list/${typhoonId}`)
          setNotFound(true)
          setLoading(false)
          return
        }
        const d = tSnap.data()
        setTyphoon({
          name: d.name ?? '',
          number: d.number ?? 0,
          position: d.position ?? { lat: 0, lon: 0 },
          pressure: d.pressure ?? 0,
          windSpeed: d.windSpeed ?? 0,
          maxWindGust: d.maxWindGust,
          intensity: d.intensity,
          size: d.size,
          forecastPath: d.forecastPath ?? [],
          isActive: d.isActive ?? false,
          updatedAt: d.updatedAt,
          startedAt: d.startedAt,
        })

        // エリア別コメント（サブコレクションが存在しない場合はスキップ）
        try {
          const cRef = collection(db, 'typhoons', year, 'list', typhoonId, 'areaComments')
          const cSnap = await getDocs(cRef)
          const comments: Record<string, AreaComment> = {}
          cSnap.forEach(c => {
            const data = c.data()
            comments[c.id] = {
              text: data.text ?? '',
              generatedAt: data.generatedAt,
            }
          })
          setAreaComments(comments)
        } catch (commentErr) {
          console.warn('[typhoon-detail] areaComments fetch failed:', commentErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[typhoon-detail] load error:', msg)
        setErrorMsg(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, typhoonId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f9ff]">
        <p className="text-sm text-[#8899aa]">読み込み中...</p>
      </div>
    )
  }

  if (notFound || !typhoon) {
    return (
      <div className="flex-1 flex flex-col bg-[#f0f9ff]">
        <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BackButton />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>台風情報</span>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2">
          <p className="text-sm text-[#8899aa]">台風データが見つかりませんでした。</p>
          <p className="text-[10px] text-[#c0ccd8]">path: typhoons/{year}/list/{typhoonId}</p>
          {errorMsg && <p className="text-[10px] text-red-400">{errorMsg}</p>}
          <Link href={`/typhoon/${year}`} className="text-xs text-sky-700 font-semibold mt-2">
            ← {year}年の台風一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href={`/typhoon/${year}`} style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>{year}年 台風</span>
              </Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{typhoon.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4 px-4 pt-4 space-y-4">
        {/* ① 台風基本情報カード */}
        <section className="bg-white border border-[#eef1f4] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#0a1628]">台風{typhoon.number}号 基本情報</h2>
            {typhoon.updatedAt && (
              <span className="text-[10px] text-[#8899aa]">{formatUpdatedAt(typhoon.updatedAt)}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#f0f9ff] rounded-lg p-2.5" style={{ gridColumn: '1 / -1' }}>
              <p className="text-[9px] text-[#8899aa]">現在位置</p>
              <p className="text-sm font-semibold text-[#0a1628]">
                {getApproximateLocation(typhoon.position.lat, typhoon.position.lon)}
              </p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2.5">
              <p className="text-[9px] text-[#8899aa]">中心気圧</p>
              <p className="text-sm font-semibold text-[#0a1628]">{typhoon.pressure} hPa</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2.5">
              <p className="text-[9px] text-[#8899aa]">最大風速</p>
              <p className="text-sm font-semibold text-[#0a1628]">{Number(typhoon.windSpeed).toFixed(1)} m/s</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2.5">
              <p className="text-[9px] text-[#8899aa]">強さ</p>
              <p className="text-sm font-semibold text-[#0a1628]">{typhoon.intensity || '-'}</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2.5">
              <p className="text-[9px] text-[#8899aa]">大きさ</p>
              <p className="text-sm font-semibold text-[#0a1628]">{typhoon.size || '-'}</p>
            </div>
            {typhoon.startedAt && (
              <div className="bg-[#f0f9ff] rounded-lg p-2.5" style={{ gridColumn: '1 / -1' }}>
                <p className="text-[9px] text-[#8899aa]">発生時刻</p>
                <p className="text-sm font-semibold text-[#0a1628]">{formatDateTime(typhoon.startedAt)} 発生</p>
              </div>
            )}
          </div>
        </section>

        {/* ② SVG進路マップ */}
        <section className="bg-white border border-[#eef1f4] rounded-xl p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">進路予報</h2>
          <TyphoonMap position={typhoon.position} forecastPath={typhoon.forecastPath} />
        </section>

        {/* ③ エリア別影響コメント */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">エリア別うねり影響</h2>
          <div className="grid grid-cols-1 gap-3">
            <AreaCommentCard area="湘南" comment={areaComments.shonan} />
            <AreaCommentCard area="千葉" comment={areaComments.chiba} />
            <AreaCommentCard area="茨城" comment={areaComments.ibaraki} />
          </div>
        </section>
      </main>
    </div>
  )
}
