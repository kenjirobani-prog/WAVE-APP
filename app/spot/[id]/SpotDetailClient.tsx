'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { calculateScore, classifyWind, windTypeLabel, compassLabel, getStarRating } from '@/lib/wave/scoring'
import type { WaveCondition } from '@/lib/wave/types'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import StarRating from '@/components/StarRating'
import ArrowButton from '@/components/ui/ArrowButton'
import { getWaveSizeLabel } from '@/lib/wave/waveSize'
import TideCurve from '@/components/TideCurve'
import TideCardStrip from '@/components/TideCardStrip'
import TideStatusBar from '@/components/TideStatusBar'
import type { TideEvent } from '@/lib/wave/types'

const AREA_EN: Record<string, string> = {
  'shonan': 'SHONAN',
  'chiba-north': 'CHIBA·N',
  'chiba-south': 'CHIBA·S',
  'ibaraki': 'IBARAKI',
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function SpotDetailSkeleton() {
  return (
    <div className="animate-pulse" style={{ background: 'var(--paper-300)' }}>
      <section className="px-5 py-5" style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}>
        <div className="h-8 w-48" style={{ background: 'var(--paper-300)' }} />
        <div className="h-4 w-32 mt-3" style={{ background: 'var(--paper-300)' }} />
      </section>
      <section className="px-5 py-5" style={{ background: 'var(--ink-900)' }}>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24" style={{ background: 'var(--paper-300)' }} />
          ))}
        </div>
      </section>
    </div>
  )
}

function calcSetInterval(period: number): string {
  const minMin = Math.round((period * 5) / 60 * 10) / 10
  const maxMin = Math.round((period * 7) / 60 * 10) / 10
  if (minMin < 1) return `約${Math.round(period * 6 / 60 * 10) / 10}分`
  return `約${Math.floor(minMin)}〜${Math.ceil(maxMin)}分`
}

const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
function swellDir8(deg: number): string { return COMPASS_8[Math.round(deg / 45) % 8] }

function seasonLabel(s: string): string {
  const labels: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  return labels[s] ?? s
}

interface TimeSlotData {
  stars: number
  isCloseout: boolean
  waveHeight: number
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

  const [morningSlot, setMorningSlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false, waveHeight: 0 })
  const [middaySlot, setMiddaySlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false, waveHeight: 0 })
  const [eveningSlot, setEveningSlot] = useState<TimeSlotData>({ stars: 1, isCloseout: false, waveHeight: 0 })

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

      const slotHours = [6, 12, 16]
      const slotMultiplier = spot.waveHeightMultiplier ?? 1.0
      const slotResults = slotHours.map(h => {
        const cond = conditions.find(c => (new Date(c.timestamp).getUTCHours() + 9) % 24 === h)
        if (!cond) return { stars: 1, isCloseout: false, waveHeight: 0 }
        const sc = calculateScore(cond, spot)
        const co = sc.reasonTags.includes('クローズアウト')
        return { stars: getStarRating(sc.score, co), isCloseout: co, waveHeight: cond.waveHeight * slotMultiplier }
      })
      setMorningSlot(slotResults[0])
      setMiddaySlot(slotResults[1])
      setEveningSlot(slotResults[2])

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

      const isToday = !dateParam || dateParam === toDateStr(new Date())
      const accessHour = (new Date().getUTCHours() + 9) % 24
      const startHour = !isToday ? 4 : accessHour >= 3 && accessHour <= 8 ? 4 : accessHour >= 9 && accessHour <= 14 ? 9 : 15
      const fromStart = conditions.filter(c => { const h = (new Date(c.timestamp).getUTCHours() + 9) % 24; return h >= startHour }).map(applyMult)
      setHourly(fromStart)
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
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: 'var(--paper-300)' }}
      >
        <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>スポットが見つかりません</p>
      </div>
    )
  }

  const isTomorrow = dateParam && dateParam !== toDateStr(new Date())
  const displayDate = isTomorrow ? new Date(dateParam!) : new Date()
  const dateLabel = isTomorrow ? `明日 ${formatMD(displayDate)}` : `本日 ${formatMD(displayDate)}`
  const updatedLabel = lastUpdated ? `${formatHM(lastUpdated)} 更新` : ''
  const areaEn = AREA_EN[spot.area] ?? spot.area.toUpperCase()
  const nameEn = (spot.nameEn || spot.name).toUpperCase()

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      {/* Header (Ace Hotel風) */}
      <header
        className="px-5 pt-5 pb-5"
        style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
      >
        <div className="flex items-center gap-3 mb-3.5">
          <button
            onClick={() => router.back()}
            aria-label="戻る"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                border: '2px solid var(--ink-900)',
                borderRadius: '50%',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M8 2L4 6l4 4"
                  stroke="#1a1815"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
          <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
            エリア一覧へ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">
            {nameEn}
          </div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">{spot.name}</div>
        <div
          className="flex items-center gap-3 mt-3 pt-2.5"
          style={{ borderTop: '1px solid var(--ink-900)' }}
        >
          <div
            className="font-display text-[10px] tracking-[0.08em]"
            style={{ color: 'var(--ink-500)' }}
          >
            {areaEn}
          </div>
          <div className="font-jp text-[10px] font-medium">
            {spot.areaLabel}
          </div>
        </div>
        <div className="font-jp text-[11px] font-bold mt-1">
          {dateLabel}{updatedLabel ? ` · ${updatedLabel}` : ''}
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {loading ? (
          <SpotDetailSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-center px-4 font-jp" style={{ color: 'var(--ink-500)' }}>
              {error}
            </p>
            <button
              onClick={loadData}
              className="px-6 py-2 font-jp text-sm font-bold"
              style={{ background: 'var(--ink-900)', color: 'var(--paper-100)' }}
            >
              再試行
            </button>
          </div>
        ) : (
          <>
            {/* 1. Time slot conditions (black section) */}
            <section
              className="px-5 py-5"
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
                時間帯別コンディション
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'morning', label: '朝', timeRange: '4〜10時', data: morningSlot },
                  { id: 'midday', label: '昼', timeRange: '10〜15時', data: middaySlot },
                  { id: 'evening', label: '夕方', timeRange: '15〜18時', data: eveningSlot },
                ].map(slot => {
                  const allSlots = [morningSlot, middaySlot, eveningSlot]
                  const validScores = allSlots.filter(s => !s.isCloseout).map(s => s.stars)
                  const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0
                  const isBest = !slot.data.isCloseout && bestScore > 0 && slot.data.stars === bestScore

                  if (slot.data.isCloseout) {
                    return (
                      <div
                        key={slot.id}
                        className="text-center"
                        style={{
                          background: 'var(--alert-red-bg)',
                          color: 'var(--ink-900)',
                          padding: '16px 8px',
                        }}
                      >
                        <div className="font-jp text-lg font-black">{slot.label}</div>
                        <div
                          className="font-jp text-[9px] mt-1 font-medium"
                          style={{ color: 'var(--ink-500)' }}
                        >
                          {slot.timeRange}
                        </div>
                        <div
                          className="my-3 font-jp text-[10px] font-bold tracking-[0.08em]"
                          style={{ color: 'var(--alert-red)' }}
                        >
                          クローズ
                        </div>
                        <div className="font-jp text-[11px] font-bold">-</div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={slot.id}
                      className="text-center"
                      style={{
                        background: isBest ? 'var(--paper-100)' : 'var(--paper-300)',
                        color: 'var(--ink-900)',
                        padding: '16px 8px',
                      }}
                    >
                      <div className="font-jp text-lg font-black">{slot.label}</div>
                      <div
                        className="font-jp text-[9px] mt-1 font-medium"
                        style={{ color: 'var(--ink-500)' }}
                      >
                        {slot.timeRange}
                      </div>
                      <div className="my-3 flex justify-center">
                        <StarRating stars={slot.data.stars} size="sm" />
                      </div>
                      <div className="font-jp text-[11px] font-bold">
                        {slot.data.waveHeight > 0 ? getWaveSizeLabel(slot.data.waveHeight) : '-'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 2. Five-indicator strip */}
            {current && (() => {
              const wt = classifyWind(current.windDir, current.windSpeed)
              const wtShort = windTypeShort(wt)
              return (
                <section
                  className="px-5 py-5"
                  style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
                >
                  <div
                    className="font-jp text-[11px] mb-4 font-bold tracking-[0.1em]"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    {isTomorrow ? '明日朝6時のコンディション' : '現在のコンディション'}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <div className="text-center" style={{ border: '1px solid var(--ink-900)', padding: '10px 4px' }}>
                      <div className="font-display text-[9px] tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>WAVE</div>
                      <div className="font-jp text-[10px] font-medium mt-0.5">波高</div>
                      <div className="font-jp text-base font-black mt-2 leading-none">{current.waveHeight.toFixed(1)}m</div>
                    </div>
                    <div className="text-center" style={{ border: '1px solid var(--ink-900)', padding: '10px 4px' }}>
                      <div className="font-display text-[9px] tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>PERIOD</div>
                      <div className="font-jp text-[10px] font-medium mt-0.5">周期</div>
                      <div className="font-jp text-base font-black mt-2 leading-none">{current.wavePeriod.toFixed(0)}秒</div>
                    </div>
                    <div className="text-center" style={{ border: '1px solid var(--ink-900)', padding: '10px 4px' }}>
                      <div className="font-display text-[9px] tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>SWELL</div>
                      <div className="font-jp text-[10px] font-medium mt-0.5">うねり</div>
                      <div className="font-jp text-base font-black mt-2 leading-none">{swellDir8(current.swellDir)}</div>
                    </div>
                    <div className="text-center" style={{ border: '1px solid var(--ink-900)', padding: '10px 4px' }}>
                      <div className="font-display text-[9px] tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>WIND</div>
                      <div className="font-jp text-[10px] font-medium mt-0.5">風</div>
                      <div className="font-jp text-base font-black mt-2 leading-none">{current.windSpeed.toFixed(0)}m</div>
                      <div
                        className="font-jp text-[9px] font-bold mt-1"
                        style={{ color: wt === 'onshore' || wt === 'side-onshore' ? 'var(--alert-red)' : 'var(--ink-700)' }}
                      >
                        {wtShort}
                      </div>
                    </div>
                    <div className="text-center" style={{ border: '1px solid var(--ink-900)', padding: '10px 4px' }}>
                      <div className="font-display text-[9px] tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>TIDE</div>
                      <div className="font-jp text-[10px] font-medium mt-0.5">潮位</div>
                      <div className="font-jp text-base font-black mt-2 leading-none">{Math.round(current.tideHeight)}cm</div>
                    </div>
                  </div>
                  <div
                    className="font-jp text-[10px] mt-3 font-medium"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    周期セット間隔：{calcSetInterval(current.wavePeriod)} · うねり方角 {compassLabel(current.swellDir)} · 風 {windTypeLabel(wt)}
                  </div>
                </section>
              )
            })()}

            {/* 3. Hourly chart */}
            {hourly.length > 0 && (() => {
              const maxHeight = Math.max(...hourly.map(h => h.waveHeight), 1)
              const maxWind = Math.max(...hourly.map(h => h.windSpeed), 1)
              const colW = 36
              const gap = 2
              const labelW = 28
              const rowSep = { height: 1, background: 'var(--rule-thin)', margin: '3px 0' } as const
              return (
                <section
                  className="px-5 py-5"
                  style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
                >
                  <div className="mb-4">
                    <div className="font-display text-xl leading-none">HOURLY FORECAST</div>
                    <div
                      className="font-jp text-[10px] font-medium mt-1"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      1時間ごと予報
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: `${labelW + hourly.length * (colW + gap)}px` }}>
                      <div style={{ display: 'flex', gap, marginBottom: 4 }}>
                        <div style={{ width: labelW, flexShrink: 0 }} />
                        {hourly.map((c, i) => {
                          const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
                          const now = new Date()
                          const isNow = Math.abs(new Date(c.timestamp).getTime() - now.getTime()) < 1800000
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                              <span
                                className="font-jp"
                                style={{ fontSize: 9, fontWeight: 700, color: isNow ? 'var(--ink-900)' : 'var(--ink-500)' }}
                              >
                                {isNow ? '▲' : ''}{h}時
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'flex', gap, alignItems: 'flex-end' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 58 }}>
                          <span className="font-jp" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-500)' }}>波高</span>
                        </div>
                        {hourly.map((c, i) => {
                          const barH = Math.round((c.waveHeight / maxHeight) * 44)
                          const co = c.waveHeight > 2.5
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ height: 44, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                                <div style={{ width: '100%', height: Math.max(barH, 3), background: co ? 'var(--alert-red)' : 'var(--ink-900)' }} />
                              </div>
                              <span className="font-jp" style={{ fontSize: 8, color: 'var(--ink-700)', fontWeight: 600, marginTop: 1, lineHeight: 1 }}>{c.waveHeight.toFixed(1)}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={rowSep} />

                      <div style={{ display: 'flex', gap, alignItems: 'flex-end' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38 }}>
                          <span className="font-jp" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-500)' }}>風</span>
                        </div>
                        {hourly.map((c, i) => {
                          const barH = Math.round((c.windSpeed / maxWind) * 24)
                          const wt = classifyWind(c.windDir, c.windSpeed)
                          const isOff = wt === 'offshore' || wt === 'calm' || wt === 'side-offshore'
                          const barColor = isOff ? 'var(--ink-900)' : 'var(--alert-red)'
                          const labelColor = isOff ? 'var(--ink-700)' : 'var(--alert-red)'
                          return (
                            <div key={i} style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ height: 24, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                                <div style={{ width: '100%', height: Math.max(barH, 2), background: barColor }} />
                              </div>
                              <span className="font-jp" style={{ fontSize: 8, color: 'var(--ink-500)', marginTop: 1, lineHeight: 1 }}>{c.windSpeed.toFixed(1)}</span>
                              <span className="font-jp" style={{ fontSize: 8, fontWeight: 700, color: labelColor, lineHeight: 1 }}>{windTypeShort(wt)}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={rowSep} />

                      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 18 }}>
                          <span className="font-jp" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-500)' }}>うねり</span>
                        </div>
                        {hourly.map((c, i) => (
                          <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                            <span
                              className="font-jp"
                              style={{
                                fontSize: 8,
                                fontWeight: 700,
                                color: 'var(--ink-900)',
                                background: 'var(--paper-300)',
                                padding: '1px 3px',
                                display: 'inline-block',
                                lineHeight: 1.3,
                              }}
                            >
                              {swellDir8(c.swellDir)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={rowSep} />

                      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
                        <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 18 }}>
                          <span className="font-jp" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-500)' }}>周期</span>
                        </div>
                        {hourly.map((c, i) => (
                          <div key={i} style={{ width: colW, flexShrink: 0, textAlign: 'center' }}>
                            <span
                              className="font-jp"
                              style={{
                                fontSize: 8,
                                fontWeight: 700,
                                color: 'var(--ink-900)',
                                background: 'var(--paper-300)',
                                padding: '1px 3px',
                                display: 'inline-block',
                                lineHeight: 1.3,
                              }}
                            >
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
                <section
                  className="px-5 py-5"
                  style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
                >
                  <div className="mb-4">
                    <div className="font-display text-xl leading-none">TIDE</div>
                    <div
                      className="font-jp text-[10px] font-medium mt-1"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      {isToday ? '潮位' : '潮位（明日）'}
                    </div>
                  </div>
                  <TideCurve tideSeries={tideArr} currentHour={currentHour} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {['0:00', '6:00', '12:00', '18:00', '24:00'].map(t => (
                      <span
                        key={t}
                        className="font-jp"
                        style={{ fontSize: 10, color: 'var(--ink-500)', fontWeight: 600 }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <TideCardStrip events={tideEvents} />
                  {isToday && <TideStatusBar currentLevel={currentLevel} trend={trend} />}
                </section>
              )
            })()}

            {/* 5. Windy map */}
            <section
              className="px-5 py-5"
              style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
            >
              <div className="mb-4">
                <div className="font-display text-xl leading-none">WIND &amp; WAVE MAP</div>
                <div
                  className="font-jp text-[10px] font-medium mt-1"
                  style={{ color: 'var(--ink-500)' }}
                >
                  風・波のマップ
                </div>
              </div>
              <div className="relative" style={{ overflow: 'hidden', height: 300, border: '1px solid var(--ink-900)' }}>
                {!windyLoaded && (
                  <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--paper-300)' }} />
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

            {/* 6. Google map */}
            <section
              className="px-5 py-5"
              style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
            >
              <div className="mb-4">
                <div className="font-display text-xl leading-none">SPOT MAP</div>
                <div
                  className="font-jp text-[10px] font-medium mt-1"
                  style={{ color: 'var(--ink-500)' }}
                >
                  ポイントマップ
                </div>
              </div>
              <div className="relative" style={{ overflow: 'hidden', height: 200, border: '1px solid var(--ink-900)' }}>
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
                className="flex items-center justify-end gap-1 mt-3 font-jp text-xs font-bold"
                style={{ color: 'var(--ink-900)' }}
              >
                Google Mapで開く
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </section>

            {/* 7. Spot info */}
            <section
              className="px-5 py-6"
              style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
            >
              <div className="mb-5">
                <div className="font-display text-xl leading-none">SPOT INFO</div>
                <div
                  className="font-jp text-[10px] font-medium mt-1"
                  style={{ color: 'var(--ink-500)' }}
                >
                  スポット情報
                </div>
              </div>
              <div className="space-y-5">
                {spot.description && (
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em] mb-2"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      FEATURE / スポットの特徴
                    </div>
                    <p
                      className="font-jp text-[13px] font-medium leading-[1.85]"
                      style={{ color: 'var(--ink-900)' }}
                    >
                      {spot.description}
                    </p>
                  </div>
                )}
                <div>
                  <div
                    className="font-display text-[10px] tracking-[0.08em] mb-2"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    BEST SEASON / ベストシーズン
                  </div>
                  <div className="flex gap-1.5">
                    {(['spring', 'summer', 'autumn', 'winter'] as const).map(s => {
                      const isBest = spot.bestSeasons?.includes(s) ?? false
                      return (
                        <div
                          key={s}
                          className="flex-1 text-center font-jp text-xs font-bold py-2"
                          style={{
                            background: isBest ? 'var(--ink-900)' : 'transparent',
                            color: isBest ? 'var(--paper-100)' : 'var(--ink-300)',
                            border: '1px solid var(--ink-900)',
                          }}
                        >
                          {seasonLabel(s)}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {spot.bestTide && (
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em] mb-2"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      BEST TIDE / ベスト潮回り
                    </div>
                    <p
                      className="font-jp text-[13px] font-medium leading-[1.7]"
                      style={{ color: 'var(--ink-900)' }}
                    >
                      {spot.bestTide}
                    </p>
                  </div>
                )}
                {spot.tideType && (
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em] mb-2"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      TIDE TYPE / 潮のタイプ
                    </div>
                    <p
                      className="font-jp text-[13px] font-medium leading-[1.7]"
                      style={{ color: 'var(--ink-900)' }}
                    >
                      {spot.tideType}
                    </p>
                  </div>
                )}
                {(spot.offshoreLabel || spot.swellDirLabel) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {spot.offshoreLabel && (
                      <div style={{ border: '1px solid var(--ink-900)', padding: '10px 12px' }}>
                        <div
                          className="font-display text-[9px] tracking-[0.08em]"
                          style={{ color: 'var(--ink-500)' }}
                        >
                          OFFSHORE
                        </div>
                        <div className="font-jp text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-500)' }}>
                          オフショア風向
                        </div>
                        <div className="font-jp text-sm font-bold mt-1.5" style={{ color: 'var(--ink-900)' }}>
                          {spot.offshoreLabel}
                        </div>
                      </div>
                    )}
                    {spot.swellDirLabel && (
                      <div style={{ border: '1px solid var(--ink-900)', padding: '10px 12px' }}>
                        <div
                          className="font-display text-[9px] tracking-[0.08em]"
                          style={{ color: 'var(--ink-500)' }}
                        >
                          SWELL DIR
                        </div>
                        <div className="font-jp text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-500)' }}>
                          対応うねり方向
                        </div>
                        <div className="font-jp text-sm font-bold mt-1.5" style={{ color: 'var(--ink-900)' }}>
                          {spot.swellDirLabel}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {spot.waveTypeTags && spot.waveTypeTags.length > 0 && (
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em] mb-2"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      WAVE TYPE / 波のタイプ
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {spot.waveTypeTags.map(tag => (
                        <span
                          key={tag}
                          className="font-jp text-xs font-bold px-3 py-1"
                          style={{
                            border: '1px solid var(--ink-900)',
                            color: 'var(--ink-900)',
                            background: 'var(--paper-300)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {spot.facilities && spot.facilities.length > 0 && (
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em] mb-2"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      FACILITIES / 周辺施設
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {spot.facilities.map(f => (
                        <span
                          key={f}
                          className="font-jp text-xs font-bold px-3 py-1"
                          style={{
                            border: '1px solid var(--ink-900)',
                            color: 'var(--ink-900)',
                            background: 'var(--paper-300)',
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  className="font-jp text-[11px] font-medium pt-3"
                  style={{ color: 'var(--ink-500)', borderTop: '1px solid var(--rule-thin)' }}
                >
                  {spot.access}
                </div>
              </div>
            </section>

            {/* 8. Beginner note */}
            {spot.beginnerNote && (
              <section
                className="px-5 py-6"
                style={{
                  background: 'var(--alert-red-bg)',
                  borderLeft: '4px solid var(--alert-red)',
                  borderBottom: '2px solid var(--ink-900)',
                }}
              >
                <div className="mb-3">
                  <div
                    className="font-display text-xl leading-none"
                    style={{ color: 'var(--alert-red)' }}
                  >
                    BEGINNER NOTE
                  </div>
                  <div
                    className="font-jp text-[10px] font-medium mt-1"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    初心者メモ
                  </div>
                </div>
                <p
                  className="font-jp text-[13px] font-medium leading-[1.85]"
                  style={{ color: 'var(--ink-900)' }}
                >
                  {spot.beginnerNote}
                </p>
              </section>
            )}

            {/* 9. Live camera CTA */}
            {spot.liveCameraUrl && (
              <a
                href={spot.liveCameraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-6"
                style={{
                  background: 'var(--ink-900)',
                  color: 'var(--paper-100)',
                  borderBottom: '4px solid var(--ink-900)',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em]"
                      style={{ color: 'rgba(251,248,243,0.6)' }}
                    >
                      LIVE CAMERA
                    </div>
                    <div className="font-jp text-base font-black mt-1">
                      ライブカメラを見る
                    </div>
                  </div>
                  <ArrowButton variant="light" />
                </div>
              </a>
            )}
          </>
        )}
      </main>
    </div>
  )
}
