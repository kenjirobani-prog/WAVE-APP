'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { calculateScore, getStarRating } from '@/lib/wave/scoring'
import { getUserProfile } from '@/lib/userProfile'
import { getNextUpdateTime, UPDATE_HOURS_JST } from '@/lib/updateSchedule'
import type { UserProfile } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import StarRating from '@/components/StarRating'
import AreaTabs from '@/components/AreaTabs'
import BottomNav from '@/components/BottomNav'

const AREA = 'ibaraki'
const AREA_LABEL = '茨城'

type DateTab = 'today' | 'tomorrow' | 'weekly'

interface TimeSlotStars { morning: number; midday: number; evening: number }
interface SpotCardData { spotId: string; stars: TimeSlotStars; isCloseout: boolean }
interface WeeklyDayData { date: Date; dateStr: string; bestStars: number; isCloseout: boolean }

const TIME_SLOT_HOURS = { morning: 6, midday: 12, evening: 16 }
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '朝（4〜10時）', midday: '昼（10〜15時）', evening: '夕方（15〜18時）',
}
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatMD(d: Date) { return `${d.getMonth()+1}/${d.getDate()}` }
function getTargetDate(tab: DateTab): Date {
  const d = new Date(); d.setHours(12,0,0,0)
  if (tab === 'tomorrow') d.setDate(d.getDate() + 1)
  return d
}

function findConditionAtHour(conditions: WaveCondition[], targetHour: number): WaveCondition | null {
  return conditions.find(c => { const h = (new Date(c.timestamp).getUTCHours() + 9) % 24; return h === targetHour }) ?? null
}

function computeSpotStars(conditions: WaveCondition[], spot: typeof SPOTS[number], profile: UserProfile) {
  const slots = (['morning', 'midday', 'evening'] as const).map(slot => {
    const cond = findConditionAtHour(conditions, TIME_SLOT_HOURS[slot])
    if (!cond) return { slot, stars: 1, closeout: false }
    const score = calculateScore(cond, spot, profile)
    const closeout = score.reasonTags.includes('クローズアウト')
    return { slot, stars: getStarRating(score.score, closeout), closeout }
  })
  return {
    stars: { morning: slots[0].stars, midday: slots[1].stars, evening: slots[2].stars },
    isCloseout: slots.every(s => s.closeout),
  }
}

function getBestTimeSlot(stars: TimeSlotStars) {
  const entries = [
    { slot: 'morning', label: TIME_SLOT_LABELS.morning, stars: stars.morning },
    { slot: 'midday', label: TIME_SLOT_LABELS.midday, stars: stars.midday },
    { slot: 'evening', label: TIME_SLOT_LABELS.evening, stars: stars.evening },
  ]
  return entries.reduce((best, e) => e.stars > best.stars ? e : best, entries[0])
}

export default function IbarakiPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [spotCards, setSpotCards] = useState<SpotCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [bestSlot, setBestSlot] = useState<{ label: string; stars: number } | null>(null)

  const today = new Date(); today.setHours(12,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)

  useEffect(() => { setProfile(getUserProfile()) }, [])

  useEffect(() => {
    if (!profile || tab === 'weekly') return
    loadForecast(getTargetDate(tab))
  }, [profile, tab])

  useEffect(() => {
    if (tab !== 'weekly' || !profile || weeklyData.length > 0) return
    loadWeeklyForecast()
  }, [tab, profile])

  async function loadForecast(targetDate: Date) {
    setLoading(true); setError(null)
    const dateStr = toDateStr(targetDate)
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === AREA)
    try {
      const results: SpotCardData[] = []
      const allStars: TimeSlotStars[] = []
      await Promise.all(activeSpots.map(async spot => {
        try {
          const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
          if (!res.ok) throw new Error()
          const data = await res.json()
          const { stars, isCloseout } = computeSpotStars(data.conditions ?? [], spot, profile!)
          results.push({ spotId: spot.id, stars, isCloseout })
          if (!isCloseout) allStars.push(stars)
        } catch { results.push({ spotId: spot.id, stars: { morning: 1, midday: 1, evening: 1 }, isCloseout: false }) }
      }))
      results.sort((a, b) => (SPOTS.find(s => s.id === a.spotId)?.order ?? 99) - (SPOTS.find(s => s.id === b.spotId)?.order ?? 99))
      setSpotCards(results)
      if (allStars.length > 0) {
        const avg: TimeSlotStars = {
          morning: Math.round(allStars.reduce((s, st) => s + st.morning, 0) / allStars.length),
          midday: Math.round(allStars.reduce((s, st) => s + st.midday, 0) / allStars.length),
          evening: Math.round(allStars.reduce((s, st) => s + st.evening, 0) / allStars.length),
        }
        const best = getBestTimeSlot(avg)
        setBestSlot({ label: best.label, stars: best.stars })
      } else { setBestSlot(null) }
      if (results.length === 0) setError('波データを取得できませんでした。')
    } catch { setError('データの取得に失敗しました。') }
    finally { setLoading(false) }
  }

  async function loadWeeklyForecast() {
    setWeeklyLoading(true)
    const base = new Date(); base.setHours(12,0,0,0)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate()+i); return d })
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === AREA)
    const result: WeeklyDayData[] = []
    for (const day of days) {
      const dateStr = toDateStr(day)
      let dayBestStars = 1; let dayAllCloseout = true
      await Promise.all(activeSpots.map(async spot => {
        try {
          const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
          if (!res.ok) return
          const data = await res.json()
          const { stars, isCloseout } = computeSpotStars(data.conditions ?? [], spot, profile!)
          const spotMax = Math.max(stars.morning, stars.midday, stars.evening)
          if (spotMax > dayBestStars) dayBestStars = spotMax
          if (!isCloseout) dayAllCloseout = false
        } catch {}
      }))
      result.push({ date: day, dateStr, bestStars: dayBestStars, isCloseout: dayAllCloseout })
    }
    setWeeklyData(result)
    setWeeklyLoading(false)
  }

  if (!profile) return null
  const targetDate = tab !== 'weekly' ? getTargetDate(tab) : today

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header className="header-gradient" style={{ padding: '16px 1rem 1rem', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', marginTop: 4 }}>{AREA_LABEL}エリア</div>
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>更新時刻：{UPDATE_HOURS_JST.join(', ')}時</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>次回更新：{getNextUpdateTime()}</p>
            </div>
          </div>
          <button onClick={() => router.push('/settings')} style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 14 }}>⚙</span> マイ設定
          </button>
        </div>
      </header>

      <AreaTabs />

      <div className="bg-white border-b border-[#eef1f4] px-3 flex items-center gap-1 py-2">
        <button onClick={() => setTab('today')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'today' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'}`}>今日 {formatMD(today)}</button>
        <button onClick={() => setTab('tomorrow')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'tomorrow' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'}`}>明日 {formatMD(tomorrow)}</button>
        <button onClick={() => setTab('weekly')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'weekly' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'}`}>週間</button>
      </div>

      <main className="flex-1 p-4 space-y-2.5 overflow-auto pb-28">
        {tab === 'weekly' ? (
          weeklyLoading ? (
            <div className="flex items-center justify-center py-16"><p className="text-[#8899aa] text-sm">週間データを読み込み中...</p></div>
          ) : (
            weeklyData.map(day => {
              const dow = DOW_JA[day.date.getDay()]
              const dowColor = day.date.getDay() === 0 ? '#ef4444' : day.date.getDay() === 6 ? '#3b82f6' : '#0a1628'
              return (
                <div key={day.dateStr} style={{ background: '#fff', border: day.isCloseout ? '2px solid #ef4444' : '0.5px solid #eef1f4', borderRadius: 12, padding: '12px 16px' }} className="flex items-center">
                  <div style={{ width: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: dowColor, lineHeight: 1.1 }}>{dow}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMD(day.date)}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-end">
                    {day.isCloseout ? (
                      <span className="text-xs font-bold text-red-500">終日クローズアウト</span>
                    ) : (
                      <StarRating stars={day.bestStars} size="md" />
                    )}
                  </div>
                </div>
              )
            })
          )
        ) : (
          <>
            {!loading && bestSlot && (
              <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', borderRadius: 14, padding: '14px 18px', color: '#fff' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6, opacity: 0.8 }}>{tab === 'today' ? '今日' : '明日'}のおすすめ</p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{bestSlot.label}</span>
                  <StarRating stars={bestSlot.stars} size="lg" />
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16"><p className="text-[#8899aa] text-sm">読み込み中...</p></div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-[#8899aa] text-sm text-center px-4">{error}</p>
                <button onClick={() => loadForecast(targetDate)} className="px-6 py-2 bg-[#0284c7] text-white rounded-full text-sm font-semibold">再試行</button>
              </div>
            ) : (
              spotCards.map(card => {
                const spot = SPOTS.find(s => s.id === card.spotId)!
                return <SpotCard key={card.spotId} spot={spot} stars={card.stars} isCloseout={card.isCloseout} isFavorite={profile.favoriteSpots.includes(spot.id)} date={targetDate} />
              })
            )}
          </>
        )}
      </main>

      <BottomNav current="forecast" />
    </div>
  )
}
