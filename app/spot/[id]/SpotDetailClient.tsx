'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { calculateScore, classifyWind, windTypeLabel, compassLabel, getStarRating } from '@/lib/wave/scoring'
import type { WaveCondition } from '@/lib/wave/types'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import StarRating from '@/components/StarRating'
import TideCurve from '@/components/TideCurve'
import TideCardStrip from '@/components/TideCardStrip'
import TideStatusBar from '@/components/TideStatusBar'
import type { TideEvent } from '@/lib/wave/types'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function SpotDetailSkeleton() {
  return (
    <div className="animate-pulse bg-[#f0f9ff]">
      <section className="bg-white p-6 border-b border-[#eef1f4]">
        <div className="flex gap-4 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 bg-[#f0f9ff] rounded-xl p-4 h-20" />
          ))}
        </div>
      </section>
      <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#f0f9ff] rounded-xl p-3 space-y-2">
              <div className="h-3 bg-white rounded w-16" />
              <div className="h-6 bg-white rounded w-12" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function waveHeightLabel(h: number): string {
  if (h >= 2.0)  return 'オーバーヘッド'
  if (h >= 1.8)  return '頭〜オーバーヘッド'
  if (h >= 1.6)  return '頭'
  if (h >= 1.5)  return '肩〜頭'
  if (h >= 1.35) return '肩'
  if (h >= 1.2)  return '胸'
  if (h >= 1.0)  return '腹〜胸'
  if (h >= 0.8)  return '腹'
  if (h >= 0.65) return '腰〜腹'
  if (h >= 0.5)  return '腰'
  if (h >= 0.4)  return 'モモ〜腰'
  if (h >= 0.3)  return 'モモ'
  if (h >= 0.2)  return 'ヒザ〜モモ'
  if (h >= 0.1)  return 'ヒザ'
  return 'スネ以下'
}

function calcSetInterval(period: number): string {
  const minMin = Math.round((period * 5) / 60 * 10) / 10
  const maxMin = Math.round((period * 7) / 60 * 10) / 10
  if (minMin < 1) return `約${Math.round(period * 6 / 60 * 10) / 10}分`
  return `約${Math.floor(minMin)}〜${Math.ceil(maxMin)}分`
}

const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
function swellDir8(deg: number): string { return COMPASS_8[Math.round(deg / 45) % 8] }

function waveQualitySimple(period: number, windType: string): string {
  if (period >= 10) return 'キレた波'
  if (period >= 8) return 'グッドウェーブ'
  if (period >= 6) {
    if (windType === 'offshore' || windType === 'calm') return 'グッドウェーブ'
    if (windType === 'onshore') return 'ワイド気味'
    return 'まあまあ'
  }
  if (period >= 5) return windType === 'onshore' ? 'ワイド気味' : 'まあまあ'
  return windType === 'offshore' || windType === 'calm' ? 'ワイド気味' : 'ダンパー'
}

function seasonLabel(s: string): string {
  const labels: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  return labels[s] ?? s
}

interface TimeSlotData {
  stars: number
  isCloseout: boolean
}

const PREFERRED_SIZE_M = 0.8  // 基準: 腰サイズ

function getBarColor(waveHeight: number, preferred: number): string {
  if (waveHeight >= preferred) return 'bg-emerald-400'
  if (waveHeight >= preferred - 0.3) return 'bg-blue-400'
  return 'bg-sky-200'
}

function windTypeColor(type: string): string {
  if (type === 'calm') return 'text-slate-300'
  if (type === 'offshore') return 'text-emerald-500'
  if (type === 'side-offshore') return 'text-blue-400'
  if (type === 'side-onshore') return 'text-amber-400'
  return 'text-red-400'
}

function windTypeShort(type: string): string {
  if (type === 'calm') return '無風'
  if (type === 'offshore') return 'OFF'
  if (type === 'side-offshore') return 'S-OFF'
  if (type === 'side-onshore') return 'S-ON'
  return 'ON'
}

export default function SpotDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const spot = SPOTS.find(s => s.id === id)

  const [current, setCurrent] = useState<WaveCondition | null>(null)
  const [hourly, setHourly] = useState<WaveCondition[]>([])
  const [tideSeries, setTideSeries] = useState<{ hour: number; tideHeight: number }[]>([])
  const [tideEvents, setTideEvents] = useState<TideEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [morningSlot, setMorningSlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false })
  const [middaySlot, setMiddaySlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false })
  const [eveningSlot, setEveningSlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false })

  const [windyLoaded, setWindyLoaded] = useState(false)

  useEffect(() => {
    if (!spot) return
    loadData()
  }, [spot, dateParam])

  async function loadData() {
    if (!spot) return
    setLoading(true)
    setError(null)
    try {
      const dateQuery = dateParam ? `&date=${dateParam}` : ''
      const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily${dateQuery}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const conditions: WaveCondition[] = data.conditions ?? []
      if (conditions.length === 0) throw new Error('No data')

      // Compute time slot stars
      const slotHours = [6, 12, 16]
      const slotResults = slotHours.map(h => {
        const cond = conditions.find(c => (new Date(c.timestamp).getUTCHours() + 9) % 24 === h)
        if (!cond) return { stars: 1, isCloseout: false }
        const sc = calculateScore(cond, spot)
        const co = sc.reasonTags.includes('クローズアウト')
        return { stars: getStarRating(sc.score, co), isCloseout: co }
      })
      setMorningSlot(slotResults[0])
      setMiddaySlot(slotResults[1])
      setEveningSlot(slotResults[2])

      // Representative condition: today = latest update hour, tomorrow = 6時
      const isTomorrow = dateParam && dateParam !== toDateStr(new Date())
      const displayHour = isTomorrow ? 6 : getLatestUpdateHour()
      const representative = conditions.find(c => {
        const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
        return h === displayHour
      }) ?? conditions[Math.floor(conditions.length / 2)] ?? conditions[0]

      setLastUpdated(new Date())

      const m = spot.waveHeightMultiplier ?? 1.0
      const applyMult = (c: WaveCondition): WaveCondition =>
        m !== 1.0 ? { ...c, waveHeight: c.waveHeight * m } : c

      // Next day conditions for chart
      const baseDate = dateParam ? new Date(`${dateParam}T12:00:00+09:00`) : new Date()
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + 1)
      let nextConditions: WaveCondition[] = []
      try {
        const res2 = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${toDateStr(nextDate)}`)
        if (res2.ok) { const data2 = await res2.json(); nextConditions = data2.conditions ?? [] }
      } catch {}

      const isToday = !dateParam || dateParam === toDateStr(new Date())
      const accessHour = (new Date().getUTCHours() + 9) % 24
      const startHour = !isToday ? 4 : accessHour >= 3 && accessHour <= 8 ? 4 : accessHour >= 9 && accessHour <= 14 ? 9 : 15
      const fromStart = conditions.filter(c => { const h = (new Date(c.timestamp).getUTCHours() + 9) % 24; return h >= startHour }).map(applyMult)
      const to3 = nextConditions.filter(c => { const h = (new Date(c.timestamp).getUTCHours() + 9) % 24; return h <= 3 }).map(applyMult)
      setHourly([...fromStart, ...to3])
      if (representative) setCurrent(applyMult(representative))

      const series = conditions.map(c => ({
        hour: (new Date(c.timestamp).getUTCHours() + 9) % 24,
        tideHeight: c.tideHeight,
      }))
      setTideSeries(series)
      if (data.tideEvents) setTideEvents(data.tideEvents)
    } catch {
      setError('データの取得に失敗しました。通信状況を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  if (!spot) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f9ff]">
        <p className="text-[#8899aa]">スポットが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', padding: '1rem 1rem 1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} className="p-2 -ml-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{spot.name}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{spot.nameEn}</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {loading ? (
          <SpotDetailSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-[#8899aa] text-sm text-center px-4">{error}</p>
            <button onClick={loadData} className="px-6 py-2 bg-[#0284c7] text-white rounded-full text-sm font-semibold">再試行</button>
          </div>
        ) : (
          <>
            {/* 1. Time slot stars (top) */}
            <section className="bg-white p-4 border-b border-[#eef1f4]">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '朝', sub: '4〜10時', data: morningSlot },
                  { label: '昼', sub: '10〜15時', data: middaySlot },
                  { label: '夕方', sub: '15〜18時', data: eveningSlot },
                ].map(({ label, sub, data }) => (
                  <div key={label} className={`rounded-xl p-3 text-center ${data.isCloseout ? 'border-2 border-red-400 bg-red-50' : 'bg-[#f0f9ff]'}`}>
                    <p className="text-xs font-semibold text-[#8899aa] mb-0.5">{label}</p>
                    <p className="text-[10px] text-[#94a3b8] mb-2">{sub}</p>
                    {data.isCloseout ? (
                      <p className="text-xs font-bold text-red-500">クローズアウト</p>
                    ) : (
                      <StarRating stars={data.stars} size="md" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Five indicator strip */}
            {current && (() => {
              const wt = classifyWind(current.windDir, current.windSpeed)
              const wtLabel = windTypeLabel(wt)
              const isOffshore = wt === 'offshore' || wt === 'calm' || wt === 'side-offshore'
              return (
                <section className="bg-white mt-2 px-4 py-3 border-b border-[#eef1f4]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">
                    {dateParam && dateParam !== toDateStr(new Date()) ? '明日朝 6時のコンディション' : '現在のコンディション'}
                  </h2>
                  <div style={{ display: 'flex', border: '0.5px solid #eef1f4', borderRadius: 10, overflow: 'hidden' }}>
                    {/* 波高 */}
                    <div style={{ flex: 1, padding: '8px 4px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>波高</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', margin: '2px 0' }}>{current.waveHeight.toFixed(1)}m</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{waveHeightLabel(current.waveHeight)}</p>
                    </div>
                    <div style={{ width: '0.5px', background: '#eef1f4' }} />
                    {/* 風 */}
                    <div style={{ flex: 1, padding: '8px 4px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>風</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', margin: '2px 0' }}>{current.windSpeed.toFixed(1)}m/s</p>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, display: 'inline-block', background: isOffshore ? '#dbeafe' : '#fee2e2', color: isOffshore ? '#1d4ed8' : '#dc2626' }}>
                        {wtLabel}
                      </span>
                    </div>
                    <div style={{ width: '0.5px', background: '#eef1f4' }} />
                    {/* うねり */}
                    <div style={{ flex: 1, padding: '8px 4px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>うねり</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', margin: '2px 0' }}>{swellDir8(current.swellDir)}</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{compassLabel(current.swellDir)}</p>
                    </div>
                    <div style={{ width: '0.5px', background: '#eef1f4' }} />
                    {/* 周期 */}
                    <div style={{ flex: 1, padding: '8px 4px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>周期</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', margin: '2px 0' }}>{current.wavePeriod.toFixed(0)}秒</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{calcSetInterval(current.wavePeriod)}</p>
                    </div>
                  </div>
                </section>
              )
            })()}

            {/* 3. Hourly chart — 4-row layout */}
            {hourly.length > 0 && (() => {
              const maxHeight = Math.max(...hourly.map(h => h.waveHeight), 1)
              const maxWind = Math.max(...hourly.map(h => h.windSpeed), 1)
              const colW = 36
              const gap = 2
              const labelW = 28
              const rowSep = { height: 1, background: '#eef1f4', margin: '3px 0' } as const
              return (
                <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">1時間ごと予報</h2>
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: `${labelW + hourly.length * (colW + gap)}px` }}>

                      {/* Header row — hours */}
                      <div style={{ display: 'flex', gap, marginBottom: 4 }}>
                        <div style={{ width: labelW, flexShrink: 0 }} />
                        {hourly.map((c, i) => {
                          const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
                          const now = new Date()
                          const isNow = Math.abs(new Date(c.timestamp).getTime() - now.getTime()) < 1800000
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 600, color: isNow ? '#0284c7' : '#94a3b8' }}>
                                {isNow ? '▲' : ''}{h}時
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Row 1 — 波高 */}
                      <div style={{ display: 'flex', gap, alignItems: 'flex-end' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 58 }}>
                          <span style={{ fontSize: 9, fontWeight: 500, color: '#94a3b8' }}>波高</span>
                        </div>
                        {hourly.map((c, i) => {
                          const barH = Math.round((c.waveHeight / maxHeight) * 44)
                          const co = c.waveHeight > 2.5
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ height: 44, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                                <div style={{ width: '100%', height: Math.max(barH, 3), borderRadius: '2px 2px 0 0', background: co ? '#ef4444' : '#1d9e75' }} />
                              </div>
                              <span style={{ fontSize: 8, color: '#64748b', fontWeight: 500, marginTop: 1, lineHeight: 1 }}>{c.waveHeight.toFixed(1)}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={rowSep} />

                      {/* Row 2 — 風 */}
                      <div style={{ display: 'flex', gap, alignItems: 'flex-end' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38 }}>
                          <span style={{ fontSize: 9, fontWeight: 500, color: '#94a3b8' }}>風</span>
                        </div>
                        {hourly.map((c, i) => {
                          const barH = Math.round((c.windSpeed / maxWind) * 24)
                          const wt = classifyWind(c.windDir, c.windSpeed)
                          const isOff = wt === 'offshore' || wt === 'calm' || wt === 'side-offshore'
                          const barColor = isOff ? '#85b7eb' : '#f0997b'
                          const labelColor = isOff ? '#185fa5' : '#b91c1c'
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ height: 24, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                                <div style={{ width: '100%', height: Math.max(barH, 2), borderRadius: '2px 2px 0 0', background: barColor }} />
                              </div>
                              <span style={{ fontSize: 8, color: '#94a3b8', marginTop: 1, lineHeight: 1 }}>{c.windSpeed.toFixed(1)}</span>
                              <span style={{ fontSize: 8, fontWeight: 600, color: labelColor, lineHeight: 1 }}>{windTypeShort(wt)}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={rowSep} />

                      {/* Row 3 — うねり */}
                      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 18 }}>
                          <span style={{ fontSize: 9, fontWeight: 500, color: '#94a3b8' }}>うねり</span>
                        </div>
                        {hourly.map((c, i) => (
                          <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                            <span style={{ fontSize: 8, fontWeight: 600, color: '#185fa5', background: '#e6f1fb', padding: '1px 3px', borderRadius: 3, display: 'inline-block', lineHeight: 1.3 }}>
                              {swellDir8(c.swellDir)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={rowSep} />

                      {/* Row 4 — 周期 */}
                      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 18 }}>
                          <span style={{ fontSize: 9, fontWeight: 500, color: '#94a3b8' }}>周期</span>
                        </div>
                        {hourly.map((c, i) => (
                          <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                            <span style={{ fontSize: 8, fontWeight: 600, color: '#0f6e56', background: '#e1f5ee', padding: '1px 3px', borderRadius: 3, display: 'inline-block', lineHeight: 1.3 }}>
                              {Math.round(c.wavePeriod)}秒
                            </span>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                </section>
              )
            })()}

            {/* 4. Tide chart */}
            {tideSeries.length > 0 && (() => {
              const isToday = !dateParam || dateParam === toDateStr(new Date())
              const jstHour = (new Date().getUTCHours() + 9) % 24
              const tideArr = Array.from({ length: 24 }, (_, h) => {
                const p = tideSeries.find(t => t.hour === h)
                return p?.tideHeight ?? 0
              })
              const currentHour = isToday ? jstHour : undefined
              const currentLevel = isToday ? (tideArr[jstHour] ?? 0) : 0
              const prevLevel = isToday ? (tideArr[Math.max(0, jstHour - 1)] ?? currentLevel) : 0
              const trend: 'rising' | 'falling' | 'steady' =
                currentLevel - prevLevel > 2 ? 'rising' :
                currentLevel - prevLevel < -2 ? 'falling' : 'steady'
              return (
                <section className="bg-white mt-2 px-4 pt-4 pb-5 border-b border-[#eef1f4]">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">
                    {isToday ? '潮位' : '潮位（明日）'}
                  </h2>
                  <TideCurve tideSeries={tideArr} currentHour={currentHour} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {['0:00', '6:00', '12:00', '18:00', '24:00'].map(t => (
                      <span key={t} style={{ fontSize: 10, color: '#8899aa', fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>
                  <TideCardStrip events={tideEvents} />
                  {isToday && <TideStatusBar currentLevel={currentLevel} trend={trend} />}
                </section>
              )
            })()}

            {/* Windy map */}
            <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">風・波のマップ</h2>
              <div className="relative" style={{ borderRadius: 12, overflow: 'hidden', height: 300 }}>
                {!windyLoaded && (
                  <div className="absolute inset-0 bg-[#f0f9ff] animate-pulse" />
                )}
                <iframe
                  src={`https://embed.windy.com/embed2.html?lat=${spot.lat}&lon=${spot.lng}&detailLat=${spot.lat}&detailLon=${spot.lng}&zoom=12&level=surface&overlay=waves&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default`}
                  width="100%"
                  height="300"
                  style={{ border: 'none' }}
                  onLoad={() => setWindyLoaded(true)}
                />
              </div>
            </section>

            {/* Google Map */}
            <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">ポイントマップ</h2>
              <div className="relative" style={{ borderRadius: 12, overflow: 'hidden', height: 200 }}>
                <iframe
                  src={(() => {
                    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                    const center = spot.mapCenter ?? { lat: spot.lat, lng: spot.lng }
                    return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${center.lat},${center.lng}&zoom=15&maptype=roadmap`
                  })()}
                  width="100%"
                  height="200"
                  style={{ border: 'none' }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <a
                href={spot.mapUrl ?? `https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-end gap-1 mt-2 text-xs font-semibold text-sky-700"
              >
                Google Mapで開く
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </section>

            {/* Spot info */}
            <section className="bg-white mt-2 p-4 border-b border-[#eef1f4] space-y-5">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa]">スポット情報</h2>
              {spot.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">スポットの特徴</p>
                  <p className="text-sm text-[#0a1628] leading-relaxed">{spot.description}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">ベストシーズン</p>
                <div className="flex gap-2">
                  {(['spring', 'summer', 'autumn', 'winter'] as const).map(s => {
                    const isBest = spot.bestSeasons?.includes(s) ?? false
                    return (
                      <span key={s} className={`flex-1 text-center text-xs font-semibold py-1.5 rounded-full ${isBest ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#c0ccd8]'}`}>
                        {seasonLabel(s)}
                      </span>
                    )
                  })}
                </div>
              </div>
              {spot.bestTide && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">ベスト潮回り</p>
                  <p className="text-sm text-[#0a1628] leading-relaxed">{spot.bestTide}</p>
                </div>
              )}
              {spot.waveTypeTags && spot.waveTypeTags.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">波のタイプ</p>
                  <div className="flex flex-wrap gap-2">
                    {spot.waveTypeTags.map(tag => (
                      <span key={tag} className="text-xs font-medium bg-[#f0f9ff] text-[#0a1628] px-3 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {spot.facilities && spot.facilities.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">周辺施設</p>
                  <div className="flex flex-wrap gap-2">
                    {spot.facilities.map(f => (
                      <span key={f} className="text-xs font-medium bg-[#f0f9ff] text-[#0a1628] px-3 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {spot.beginnerNote && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2">初心者メモ</p>
                  <p className="text-sm text-[#0a1628] leading-relaxed">{spot.beginnerNote}</p>
                </div>
              )}
              <p className="text-xs text-[#8899aa]">{spot.access}</p>
              {spot.liveCameraUrl && (
                <a
                  href={spot.liveCameraUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-sky-50 border border-sky-100 text-sky-700 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  ライブカメラを見る
                </a>
              )}
            </section>

          </>
        )}
      </main>

    </div>
  )
}
