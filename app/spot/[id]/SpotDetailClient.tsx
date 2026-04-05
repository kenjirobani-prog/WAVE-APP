'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { getUserProfile } from '@/lib/userProfile'
import { calculateScore, classifyWind, windTypeLabel, compassLabel, getStarRating } from '@/lib/wave/scoring'
import { saveSurfLog } from '@/lib/surfLog'
import type { UserProfile, Grade } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import ScoreGrade from '@/components/ScoreGrade'
import StarRating from '@/components/StarRating'
import TideCurve from '@/components/TideCurve'
import TideCardStrip from '@/components/TideCardStrip'
import TideStatusBar from '@/components/TideStatusBar'
import BottomNav from '@/components/BottomNav'
import type { TideEvent } from '@/lib/wave/types'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getSurfDateOptions() {
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = today.getDay()
  const daysToSat = dow === 0 ? 6 : (6 - dow + 7) % 7
  const sat = new Date(today); sat.setDate(sat.getDate() + daysToSat)
  const sun = new Date(sat); sun.setDate(sun.getDate() + 1)
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return [
    { label: `今日 ${fmt(today)}`, dateStr: toDateStr(today) },
    { label: `明日 ${fmt(tomorrow)}`, dateStr: toDateStr(tomorrow) },
    { label: `土曜 ${fmt(sat)}`, dateStr: toDateStr(sat) },
    { label: `日曜 ${fmt(sun)}`, dateStr: toDateStr(sun) },
  ]
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

const PREFERRED_SIZE_M: Record<UserProfile['preferredSize'], number> = {
  'ankle': 0.3, 'waist-chest': 0.8, 'head': 1.5, 'overhead': 2.0,
}

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

  const [profile, setProfile] = useState<UserProfile | null>(null)
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

  const [dailyComment, setDailyComment] = useState<string | null>(null)
  const [dailyCommentAt, setDailyCommentAt] = useState<string | null>(null)
  const [dailyCommentLoading, setDailyCommentLoading] = useState(false)

  const [showSurfLogSheet, setShowSurfLogSheet] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState(toDateStr(new Date()))
  const [selectedSurfGrade, setSelectedSurfGrade] = useState<Grade | null>(null)
  const [showToast, setShowToast] = useState(false)

  const GRADE_SCORE: Record<Grade, number> = { '◎': 90, '○': 70, '△': 50, '×': 20 }
  const surfDateOptions = getSurfDateOptions()

  useEffect(() => { setProfile(getUserProfile()) }, [])

  // AIコメント取得
  useEffect(() => {
    if (!spot) return
    const isToday = !dateParam || dateParam === toDateStr(new Date())
    const target = isToday ? 'today' : 'tomorrow'
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const scheduleHour = getLatestScheduleHour(target, jstHour)
    if (scheduleHour === null) { setDailyComment(null); return }
    const areaLabelMap: Record<string, string> = {
      shonan: '湘南', 'chiba-north': '千葉北', 'chiba-south': '千葉南', ibaraki: '茨城',
    }
    const areaLabel = areaLabelMap[spot.area] ?? '湘南'
    setDailyCommentLoading(true)
    fetch(`/api/daily-comment?target=${target}&hour=${padHour(scheduleHour)}&areaLabel=${areaLabel}&spotName=${encodeURIComponent(spot.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.comment) {
          setDailyComment(data.comment)
          const d = new Date(data.generatedAt)
          setDailyCommentAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
        } else {
          setDailyComment(null)
        }
      })
      .catch(() => setDailyComment(null))
      .finally(() => setDailyCommentLoading(false))
  }, [spot, dateParam])

  useEffect(() => {
    if (!profile || !spot) return
    loadData()
  }, [profile, spot, dateParam])

  async function loadData() {
    if (!spot || !profile) return
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
        const sc = calculateScore(cond, spot, profile)
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

  function handleSurfLogSave() {
    if (!spot || !selectedSurfGrade) return
    saveSurfLog({ date: selectedDateStr, spotId: spot.id, spotName: spot.name, grade: selectedSurfGrade, score: GRADE_SCORE[selectedSurfGrade] })
    try { navigator.vibrate([10, 50, 20]) } catch {}
    setShowSurfLogSheet(false)
    setSelectedSurfGrade(null)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
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

      <main className="flex-1 overflow-auto pb-28">
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

            {/* AI comment */}
            {dailyCommentLoading ? (
              <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI予報コメント</div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>AIが波を分析中...</p>
              </section>
            ) : dailyComment ? (
              <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI予報コメント</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{dailyComment}</p>
                {dailyCommentAt && (
                  <div style={{ fontSize: 10, color: '#a0bac8', marginTop: 8, textAlign: 'right' }}>{dailyCommentAt} 生成</div>
                )}
              </section>
            ) : null}

            {/* 2. Five indicator grid */}
            {current && (
              <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">
                  {dateParam && dateParam !== toDateStr(new Date()) ? '明日朝 6時のコンディション' : '現在のコンディション'}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f0f9ff] rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-1">波高</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-[#0a1628]">{current.waveHeight.toFixed(1)}m</p>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8' }}>
                        {waveHeightLabel(current.waveHeight)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#f0f9ff] rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-1">風</p>
                    <p className="text-xl font-bold text-[#0a1628]">{current.windSpeed.toFixed(1)}m/s</p>
                    <p className="text-xs text-[#8899aa] mt-0.5">{windTypeLabel(classifyWind(current.windDir, current.windSpeed))} ({compassLabel(current.windDir)})</p>
                  </div>
                  <div className="bg-[#f0f9ff] rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-1">うねり方向</p>
                    <p className="text-xl font-bold text-[#0a1628]">{swellDir8(current.swellDir)}</p>
                  </div>
                  <div className="bg-[#f0f9ff] rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-1">周期</p>
                    <p className="text-xl font-bold text-[#0a1628]">{current.wavePeriod.toFixed(0)}秒</p>
                    <p className="text-xs text-[#8899aa] mt-0.5">{calcSetInterval(current.wavePeriod)}/set</p>
                  </div>
                  <div className="bg-[#f0f9ff] rounded-xl p-3" style={{ gridColumn: '1 / -1' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] mb-1">波質</p>
                    <p className="text-xl font-bold text-[#0a1628]">
                      {waveQualitySimple(current.wavePeriod, classifyWind(current.windDir, current.windSpeed))}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Hourly chart — 4-row layout */}
            {hourly.length > 0 && profile && (() => {
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
                              <span style={{ fontSize: 8, fontWeight: 600, color: labelColor, marginTop: 1, lineHeight: 1 }}>{windTypeShort(wt)}</span>
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

            {/* Surf Log button */}
            <section className="bg-white mt-2 p-4 border-b border-[#eef1f4]">
              <button
                onClick={() => { try { navigator.vibrate(20) } catch {}; setSelectedSurfGrade(null); setShowSurfLogSheet(true) }}
                className="w-full py-4 bg-[#0284c7] text-white rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
              >
                今日サーフィンした！
              </button>
            </section>
          </>
        )}
      </main>

      {/* Surf Log sheet */}
      {showSurfLogSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSurfLogSheet(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-[#dde3ea] rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold text-[#0a1628] mb-1">Surf Log に記録</h3>
            <p className="text-sm text-[#8899aa] mb-4">{spot.name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">いつ？</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {surfDateOptions.map(opt => (
                <button key={opt.dateStr} onClick={() => setSelectedDateStr(opt.dateStr)}
                  className={`p-3 rounded-xl border-2 text-center font-semibold transition-colors ${selectedDateStr === opt.dateStr ? 'border-[#0284c7] bg-sky-50 text-[#0284c7]' : 'border-[#eef1f4] text-[#8899aa]'}`}
                >{opt.label}</button>
              ))}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">今日の波どうだった？</p>
            <div className="space-y-2 mb-6">
              {(['◎', '○', '△', '×'] as Grade[]).map(g => (
                <button key={g} onClick={() => setSelectedSurfGrade(g)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${selectedSurfGrade === g ? 'border-[#0284c7] bg-sky-50' : 'border-[#eef1f4] bg-white'}`}
                >
                  <ScoreGrade grade={g} size="sm" />
                  <span className={`font-semibold text-sm ${selectedSurfGrade === g ? 'text-[#0284c7]' : 'text-[#8899aa]'}`}>
                    {g === '◎' ? '最高！' : g === '○' ? 'まあまあ' : g === '△' ? 'いまいち' : '残念'}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={handleSurfLogSave} disabled={!selectedSurfGrade}
              className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${selectedSurfGrade ? 'bg-[#0284c7] text-white' : 'bg-[#eef1f4] text-[#8899aa] cursor-not-allowed'}`}
            >記録する</button>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0a1628] text-white px-6 py-3 rounded-xl shadow-lg text-sm font-semibold">
          記録しました！
        </div>
      )}

      <BottomNav current="forecast" />
    </div>
  )
}
