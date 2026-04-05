'use client'
import { useEffect, useState } from 'react'
import { getUserProfile, saveUserProfile } from '@/lib/userProfile'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { SPOTS } from '@/data/spots'
import { calculateScore, getStarRating, isCloseout as checkCloseout } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import StarRating from '@/components/StarRating'
import { getLatestUpdateHour, getNextUpdateTime, UPDATE_HOURS_JST } from '@/lib/updateSchedule'
import AreaTabs from '@/components/AreaTabs'
import BottomNav from '@/components/BottomNav'

type DateTab = 'today' | 'tomorrow' | 'weekly'
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

interface TimeSlotStars {
  morning: number
  midday: number
  evening: number
}

interface SpotCardData {
  spotId: string
  stars: TimeSlotStars
  isCloseout: boolean
}

interface WeeklyDayData {
  date: Date
  dateStr: string
  bestStars: number
  isCloseout: boolean
}

const TIME_SLOT_HOURS = { morning: 6, midday: 12, evening: 16 }
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '朝（4〜10時）',
  midday: '昼（10〜15時）',
  evening: '夕方（15〜18時）',
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

function getTargetDate(tab: 'today' | 'tomorrow'): Date {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  if (tab === 'today') return today
  const d = new Date(today)
  d.setDate(d.getDate() + 1)
  return d
}

function findConditionAtHour(conditions: WaveCondition[], targetHour: number): WaveCondition | null {
  return conditions.find(c => {
    const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
    return h === targetHour
  }) ?? null
}

function computeSpotStars(
  conditions: WaveCondition[],
  spot: typeof SPOTS[number],
  profile: UserProfile,
): { stars: TimeSlotStars; isCloseout: boolean } {
  const slots = (['morning', 'midday', 'evening'] as const).map(slot => {
    const cond = findConditionAtHour(conditions, TIME_SLOT_HOURS[slot])
    if (!cond) return { slot, stars: 1, closeout: false }
    const score = calculateScore(cond, spot, profile)
    const closeout = score.reasonTags.includes('クローズアウト')
    return { slot, stars: getStarRating(score.score, closeout), closeout }
  })
  const allCloseout = slots.every(s => s.closeout)
  return {
    stars: {
      morning: slots[0].stars,
      midday: slots[1].stars,
      evening: slots[2].stars,
    },
    isCloseout: allCloseout,
  }
}

function getBestTimeSlot(stars: TimeSlotStars): { slot: string; label: string; stars: number } {
  const entries = [
    { slot: 'morning', label: TIME_SLOT_LABELS.morning, stars: stars.morning },
    { slot: 'midday', label: TIME_SLOT_LABELS.midday, stars: stars.midday },
    { slot: 'evening', label: TIME_SLOT_LABELS.evening, stars: stars.evening },
  ]
  return entries.reduce((best, e) => e.stars > best.stars ? e : best, entries[0])
}

const SETTING_LEVELS: { value: UserProfile['level']; label: string }[] = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
]
const SETTING_BOARDS: { value: UserProfile['boardType']; label: string }[] = [
  { value: 'longboard', label: 'ロング' },
  { value: 'funboard', label: 'ミッド' },
  { value: 'shortboard', label: 'ショート' },
]
const SETTING_SIZES: { value: UserProfile['preferredSize']; label: string }[] = [
  { value: 'ankle', label: 'モモ' },
  { value: 'waist-chest', label: '腰' },
  { value: 'head', label: '胸' },
  { value: 'overhead', label: '肩↑' },
]

function levelLabel(v: UserProfile['level']): string {
  return SETTING_LEVELS.find(x => x.value === v)?.label ?? v
}
function boardLabel(v: UserProfile['boardType']): string {
  return SETTING_BOARDS.find(x => x.value === v)?.label ?? v
}
function sizeLabel(v: UserProfile['preferredSize']): string {
  return SETTING_SIZES.find(x => x.value === v)?.label ?? v
}

export default function TopPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [spotCards, setSpotCards] = useState<SpotCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  const [draftLevel, setDraftLevel] = useState<UserProfile['level']>('intermediate')
  const [draftBoard, setDraftBoard] = useState<UserProfile['boardType']>('funboard')
  const [draftSize, setDraftSize] = useState<UserProfile['preferredSize']>('waist-chest')
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [bestSlot, setBestSlot] = useState<{ label: string; stars: number } | null>(null)

  const today = new Date(); today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  useEffect(() => {
    setProfile(getUserProfile())
  }, [])

  useEffect(() => {
    if (!profile) return
    if (tab === 'weekly') return
    loadForecast(getTargetDate(tab))
  }, [profile, tab])

  useEffect(() => {
    if (tab !== 'weekly' || !profile) return
    if (weeklyData.length > 0) return
    loadWeeklyForecast()
  }, [tab, profile])

  async function loadForecast(targetDate: Date) {
    setLoading(true)
    setError(null)
    const dateStr = toDateStr(targetDate)
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === 'shonan')

    try {
      const results: SpotCardData[] = []
      let allStars: TimeSlotStars[] = []

      await Promise.all(
        activeSpots.map(async spot => {
          try {
            const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const conditions: WaveCondition[] = data.conditions ?? []
            const { stars, isCloseout } = computeSpotStars(conditions, spot, profile!)
            results.push({ spotId: spot.id, stars, isCloseout })
            if (!isCloseout) allStars.push(stars)
          } catch {
            results.push({ spotId: spot.id, stars: { morning: 1, midday: 1, evening: 1 }, isCloseout: false })
          }
        })
      )

      results.sort((a, b) => (SPOTS.find(s => s.id === a.spotId)?.order ?? 99) - (SPOTS.find(s => s.id === b.spotId)?.order ?? 99))
      setSpotCards(results)

      // Best time slot banner
      if (allStars.length > 0) {
        const avgStars: TimeSlotStars = {
          morning: Math.round(allStars.reduce((s, st) => s + st.morning, 0) / allStars.length),
          midday: Math.round(allStars.reduce((s, st) => s + st.midday, 0) / allStars.length),
          evening: Math.round(allStars.reduce((s, st) => s + st.evening, 0) / allStars.length),
        }
        const best = getBestTimeSlot(avgStars)
        setBestSlot({ label: best.label, stars: best.stars })
      } else {
        setBestSlot(null)
      }

      if (results.length === 0) {
        setError('波データを取得できませんでした。')
      }
    } catch {
      setError('データの取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  async function loadWeeklyForecast() {
    setWeeklyLoading(true)
    const base = new Date()
    base.setHours(12, 0, 0, 0)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      return d
    })

    const activeSpots = SPOTS.filter(s => s.isActive && s.area === 'shonan')
    const result: WeeklyDayData[] = []

    for (const day of days) {
      const dateStr = toDateStr(day)
      let dayBestStars = 1
      let dayAllCloseout = true

      await Promise.all(
        activeSpots.map(async spot => {
          try {
            const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
            if (!res.ok) return
            const data = await res.json()
            const conditions: WaveCondition[] = data.conditions ?? []
            const { stars, isCloseout } = computeSpotStars(conditions, spot, profile!)
            const spotMax = Math.max(stars.morning, stars.midday, stars.evening)
            if (spotMax > dayBestStars) dayBestStars = spotMax
            if (!isCloseout) dayAllCloseout = false
          } catch {}
        })
      )

      result.push({ date: day, dateStr, bestStars: dayBestStars, isCloseout: dayAllCloseout })
    }

    setWeeklyData(result)
    setWeeklyLoading(false)
  }

  if (!profile) return null

  const targetDate = tab !== 'weekly' ? getTargetDate(tab) : today

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* Header */}
      <header className="header-gradient" style={{ padding: '16px 1rem 1rem', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>jpwaveforecast.com</div>
            </div>
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
                更新時刻：{UPDATE_HOURS_JST.join(', ')}時
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
                次回更新：{getNextUpdateTime()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <button
              onClick={() => {
                setDraftLevel(profile.level)
                setDraftBoard(profile.boardType)
                setDraftSize(profile.preferredSize)
                setShowSettingsSheet(true)
              }}
              style={{
                background: '#fff', borderRadius: 10, padding: '8px 16px',
                fontSize: 12, fontWeight: 800, color: '#0284c7',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14 }}>⚙</span> マイ設定
            </button>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', textAlign: 'right' }}>
              {levelLabel(profile.level)}・{boardLabel(profile.boardType)}・{sizeLabel(profile.preferredSize)}
            </div>
          </div>
        </div>
      </header>

      <AreaTabs />

      {/* Date tabs */}
      <div className="bg-white border-b border-[#eef1f4] px-3 flex items-center gap-1 py-2">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'today' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'
          }`}
        >
          今日 {formatMD(today)}
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'tomorrow' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'
          }`}
        >
          明日 {formatMD(tomorrow)}
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'weekly' ? 'bg-[#0284c7] text-white' : 'text-[#8899aa]'
          }`}
        >
          週間
        </button>
      </div>

      <main className="flex-1 p-4 space-y-2.5 overflow-auto pb-28">
        {tab === 'weekly' ? (
          weeklyLoading ? (
            <WeeklyListSkeleton />
          ) : (
            weeklyData.map(day => {
              const dow = DOW_JA[day.date.getDay()]
              const dowColor = day.date.getDay() === 0 ? '#ef4444' : day.date.getDay() === 6 ? '#3b82f6' : '#0a1628'
              return (
                <div
                  key={day.dateStr}
                  style={{
                    background: '#fff',
                    border: day.isCloseout ? '2px solid #ef4444' : '0.5px solid #eef1f4',
                    borderRadius: 12,
                    padding: '12px 16px',
                  }}
                  className="flex items-center"
                >
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
            {/* Recommendation banner */}
            {!loading && bestSlot && (
              <div style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                borderRadius: 14, padding: '14px 18px',
                color: '#fff',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6, opacity: 0.8 }}>
                  {tab === 'today' ? '今日' : '明日'}のおすすめ
                </p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{bestSlot.label}</span>
                  <StarRating stars={bestSlot.stars} size="lg" />
                </div>
              </div>
            )}
            {loading ? (
              <SpotListSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-[#8899aa] text-sm text-center px-4">{error}</p>
                <button
                  onClick={() => loadForecast(targetDate)}
                  className="px-6 py-2 bg-[#0284c7] text-white rounded-full text-sm font-semibold"
                >
                  再試行
                </button>
              </div>
            ) : (
              spotCards.map(card => {
                const spot = SPOTS.find(s => s.id === card.spotId)!
                return (
                  <SpotCard
                    key={card.spotId}
                    spot={spot}
                    stars={card.stars}
                    isCloseout={card.isCloseout}
                    isFavorite={profile.favoriteSpots.includes(spot.id)}
                    date={targetDate}
                  />
                )
              })
            )}
          </>
        )}
      </main>

      {/* Settings bottom sheet */}
      {showSettingsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettingsSheet(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-[#dde3ea] rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0a1628] mb-5">サーフィン設定</h3>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">レベル</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SETTING_LEVELS.map(l => (
                <button key={l.value} onClick={() => setDraftLevel(l.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftLevel === l.value ? { background: '#0284c7', color: '#fff' } : { background: '#f0f9ff', color: '#8899aa' }}
                >{l.label}</button>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">ボード</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SETTING_BOARDS.map(b => (
                <button key={b.value} onClick={() => setDraftBoard(b.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftBoard === b.value ? { background: '#0284c7', color: '#fff' } : { background: '#f0f9ff', color: '#8899aa' }}
                >{b.label}</button>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">好みの波サイズ</p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {SETTING_SIZES.map(s => (
                <button key={s.value} onClick={() => setDraftSize(s.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftSize === s.value ? { background: '#0284c7', color: '#fff' } : { background: '#f0f9ff', color: '#8899aa' }}
                >{s.label}</button>
              ))}
            </div>

            <button
              onClick={() => {
                const updated: UserProfile = { ...profile, level: draftLevel, boardType: draftBoard, preferredSize: draftSize }
                saveUserProfile(updated)
                setProfile(updated)
                setShowSettingsSheet(false)
              }}
              className="w-full py-4 bg-[#0284c7] text-white rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
            >
              保存して再計算
            </button>
          </div>
        </div>
      )}

      <BottomNav current="forecast" />
    </div>
  )
}

function SpotListSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-4 animate-pulse" style={{ minHeight: 60 }}>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f0f9ff] rounded w-1/3" />
          </div>
          <div className="w-32 h-4 bg-[#f0f9ff] rounded shrink-0" />
        </div>
      ))}
    </>
  )
}

function WeeklyListSkeleton() {
  return (
    <>
      {[...Array(7)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-4 animate-pulse">
          <div className="w-12 h-10 bg-[#f0f9ff] rounded shrink-0" />
          <div className="flex-1 flex justify-end">
            <div className="w-24 h-5 bg-[#f0f9ff] rounded" />
          </div>
        </div>
      ))}
    </>
  )
}
