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

function MetricCell({ label, value, en }: { label: string; value: string; en: string }) {
  return (
    <div
      style={{
        background: 'var(--paper-300)',
        border: '1px solid var(--ink-900)',
        padding: '12px 14px',
      }}
    >
      <div
        className="font-display text-[9px] tracking-[0.05em]"
        style={{ color: 'var(--ink-500)' }}
      >
        {en}
      </div>
      <div
        className="font-jp text-[10px] font-medium mt-0.5"
        style={{ color: 'var(--ink-500)' }}
      >
        {label}
      </div>
      <div
        className="font-jp text-base font-black mt-1.5"
        style={{ color: 'var(--ink-900)' }}
      >
        {value}
      </div>
    </div>
  )
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
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--paper-300)' }}>
        <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>読み込み中...</p>
      </div>
    )
  }

  if (notFound || !typhoon) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
        <header
          className="px-5 pt-5 pb-5"
          style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
        >
          <div className="flex items-center gap-3 mb-3.5">
            <BackButton />
            <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
              戻る
            </div>
          </div>
          <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
            <div className="font-display text-3xl leading-[0.95] tracking-[0.02em]">TYPHOON</div>
          </div>
          <div className="font-jp text-sm font-bold mt-2">台風情報</div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
          <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>
            台風データが見つかりませんでした。
          </p>
          <p
            className="font-display text-[10px] tracking-[0.06em]"
            style={{ color: 'var(--ink-300)' }}
          >
            path: typhoons/{year}/list/{typhoonId}
          </p>
          {errorMsg && (
            <p className="font-jp text-[10px]" style={{ color: 'var(--alert-red)' }}>{errorMsg}</p>
          )}
          <Link
            href={`/typhoon/${year}`}
            className="font-jp text-xs font-bold mt-2 underline"
            style={{ color: 'var(--ink-900)' }}
          >
            ← {year}年の台風一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  const isActive = typhoon.isActive
  const titleEn = `TYPHOON ${typhoon.number}`

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      {/* Header */}
      <header
        className="px-5 pt-5 pb-5"
        style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
      >
        <div className="flex items-center gap-3 mb-3.5">
          <BackButton />
          <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
            {year}年の台風一覧へ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-3xl leading-[0.95] tracking-[0.02em]">{titleEn}</div>
        </div>
        <div className="font-jp text-base font-bold mt-2" style={{ color: 'var(--ink-900)' }}>
          {typhoon.name}
        </div>
        <div
          className="flex items-center gap-2 mt-3 pt-2.5 flex-wrap"
          style={{ borderTop: '1px solid var(--ink-900)' }}
        >
          <span
            className="font-display text-[10px] tracking-[0.08em] px-2 py-0.5"
            style={{
              background: isActive ? 'var(--alert-red)' : 'var(--ink-900)',
              color: 'var(--paper-100)',
            }}
          >
            {isActive ? 'ACTIVE' : 'ARCHIVED'}
          </span>
          <span
            className="font-jp text-[10px] font-bold"
            style={{ color: 'var(--ink-500)' }}
          >
            {year}年
            {typhoon.updatedAt && ` · ${formatUpdatedAt(typhoon.updatedAt)}`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {/* Status section (black bar) */}
        <section
          className="px-5 py-6"
          style={{
            background: 'var(--ink-900)',
            color: 'var(--paper-100)',
            borderBottom: '4px solid var(--ink-900)',
          }}
        >
          <div
            className="font-jp text-[11px] mb-3.5 font-bold tracking-[0.1em]"
            style={{ color: 'rgba(251,248,243,0.6)' }}
          >
            現在の状態
          </div>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div
                className="font-display text-[10px] tracking-[0.08em]"
                style={{ color: 'rgba(251,248,243,0.6)' }}
              >
                LOCATION
              </div>
              <div className="font-jp text-base font-black mt-1">
                {getApproximateLocation(typhoon.position.lat, typhoon.position.lon)}
              </div>
            </div>
            {typhoon.intensity && (
              <span
                className="font-display text-[11px] tracking-[0.08em] px-3 py-1.5"
                style={{
                  background: isActive ? 'var(--alert-red)' : 'var(--paper-300)',
                  color: isActive ? 'var(--paper-100)' : 'var(--ink-900)',
                }}
              >
                {typhoon.intensity.toUpperCase()}
              </span>
            )}
          </div>
          {typhoon.startedAt && (
            <div
              className="font-jp text-[11px] font-medium mt-3"
              style={{ color: 'rgba(251,248,243,0.7)' }}
            >
              {formatDateTime(typhoon.startedAt)} 発生
            </div>
          )}
        </section>

        {/* Metrics grid */}
        <section
          className="px-5 py-5"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="mb-4">
            <div className="font-display text-xl leading-none">METRICS</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              基本情報
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCell en="PRESSURE" label="中心気圧" value={`${typhoon.pressure} hPa`} />
            <MetricCell en="WIND" label="最大風速" value={`${Number(typhoon.windSpeed).toFixed(1)} m/s`} />
            {typhoon.maxWindGust && (
              <MetricCell en="GUST" label="最大瞬間風速" value={`${Number(typhoon.maxWindGust).toFixed(1)} m/s`} />
            )}
            {typhoon.size && (
              <MetricCell en="SIZE" label="大きさ" value={typhoon.size} />
            )}
          </div>
        </section>

        {/* Forecast map */}
        <section
          className="px-5 py-5"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="mb-4">
            <div className="font-display text-xl leading-none">FORECAST PATH</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              進路予報
            </div>
          </div>
          <div style={{ border: '1px solid var(--ink-900)', overflow: 'hidden' }}>
            <TyphoonMap position={typhoon.position} forecastPath={typhoon.forecastPath} />
          </div>
        </section>

        {/* Forecast path table */}
        {typhoon.forecastPath.length > 0 && (
          <section
            className="px-5 py-5"
            style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
          >
            <div className="mb-4">
              <div className="font-display text-xl leading-none">PATH DATA</div>
              <div
                className="font-jp text-[10px] font-medium mt-1"
                style={{ color: 'var(--ink-500)' }}
              >
                予報経路データ
              </div>
            </div>
            <div style={{ border: '1px solid var(--ink-900)', overflow: 'auto' }}>
              <table
                className="font-jp"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
              >
                <thead>
                  <tr style={{ background: 'var(--paper-300)' }}>
                    {[
                      { jp: '時刻', en: 'TIME' },
                      { jp: '位置', en: 'POSITION' },
                      { jp: '気圧', en: 'PRESSURE' },
                      { jp: '風速', en: 'WIND' },
                    ].map(h => (
                      <th
                        key={h.en}
                        className="font-display"
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          fontSize: 11,
                          letterSpacing: '0.06em',
                          color: 'var(--ink-900)',
                          borderBottom: '1px solid var(--ink-900)',
                          whiteSpace: 'nowrap',
                          fontWeight: 400,
                        }}
                      >
                        {h.en}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {typhoon.forecastPath.map((p, i) => (
                    <tr
                      key={i}
                      style={{
                        background: i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-200)',
                        borderBottom: i < typhoon.forecastPath.length - 1 ? '0.5px solid var(--rule-thin)' : 'none',
                      }}
                    >
                      <td className="font-jp" style={{ padding: '8px 10px', color: 'var(--ink-700)', fontWeight: 500 }}>
                        {formatDateTime(p.time)}
                      </td>
                      <td className="font-jp" style={{ padding: '8px 10px', color: 'var(--ink-700)', fontWeight: 500 }}>
                        {getApproximateLocation(p.lat, p.lon)}
                      </td>
                      <td className="font-jp" style={{ padding: '8px 10px', color: 'var(--ink-700)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {p.pressure} hPa
                      </td>
                      <td className="font-jp" style={{ padding: '8px 10px', color: 'var(--ink-700)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {Number(p.windSpeed).toFixed(1)} m/s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Area commentary */}
        <section
          style={{
            background: 'var(--paper-100)',
            borderTop: '2px solid var(--ink-900)',
            borderBottom: '4px solid var(--ink-900)',
          }}
        >
          <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--ink-900)' }}>
            <div className="font-display text-xl leading-none">AREA COMMENTARY</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              エリア別うねり影響
            </div>
          </div>
          <AreaCommentCard area="湘南" comment={areaComments.shonan} altBg="paper-100" />
          <AreaCommentCard area="千葉" comment={areaComments.chiba} altBg="paper-300" />
          <AreaCommentCard area="茨城" comment={areaComments.ibaraki} altBg="paper-100" />
        </section>
      </main>
    </div>
  )
}
