'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { SPOTS } from '@/data/spots'
import { calculateScore, getStarRating } from '@/lib/wave/scoring'
import { getNextUpdateTime, UPDATE_HOURS_JST } from '@/lib/updateSchedule'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import AreaTabs from '@/components/AreaTabs'
import HamburgerMenu from '@/components/HamburgerMenu'
import AiCommentLoading from '@/components/AiCommentLoading'
import WeeklyDayCard from '@/components/WeeklyDayCard'
import TyphoonBanner from '@/components/TyphoonBanner'

const AREA = 'chiba-south'
const AREA_LABEL = '千葉南'
const WEEKLY_COMMENT_KEY = 'chiba-south'

type DateTab = 'today' | 'tomorrow' | 'weekly'

interface TimeSlotStars { morning: number; midday: number; evening: number }
interface TimeSlotWaveHeights { morning: number; midday: number; evening: number }
interface SpotCardData { spotId: string; stars: TimeSlotStars; waveHeights: TimeSlotWaveHeights; isCloseout: boolean }
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

function computeSpotStars(conditions: WaveCondition[], spot: typeof SPOTS[number]) {
  const multiplier = spot.waveHeightMultiplier ?? 1.0
  const slots = (['morning', 'midday', 'evening'] as const).map(slot => {
    const cond = findConditionAtHour(conditions, TIME_SLOT_HOURS[slot])
    if (!cond) return { slot, stars: 1, closeout: false, waveHeight: 0 }
    const score = calculateScore(cond, spot)
    const closeout = score.reasonTags.includes('クローズアウト')
    return { slot, stars: getStarRating(score.score, closeout), closeout, waveHeight: cond.waveHeight * multiplier }
  })
  return {
    stars: { morning: slots[0].stars, midday: slots[1].stars, evening: slots[2].stars },
    waveHeights: { morning: slots[0].waveHeight, midday: slots[1].waveHeight, evening: slots[2].waveHeight },
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

export default function ChibaSouthPage() {
  const router = useRouter()
  const [spotCards, setSpotCards] = useState<SpotCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [bestSlot, setBestSlot] = useState<{ label: string; stars: number } | null>(null)
  const [dailyComment, setDailyComment] = useState<string | null>(null)
  const [dailyCommentAt, setDailyCommentAt] = useState<string | null>(null)
  const [dailyCommentLoading, setDailyCommentLoading] = useState(false)
  const [weeklyComments, setWeeklyComments] = useState<Record<string, string>>({})
  const [weeklyCommentsAt, setWeeklyCommentsAt] = useState<string | null>(null)

  const today = new Date(); today.setHours(12,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)

  // 週間コメント+スコアをFirestoreから一括取得
  useEffect(() => {
    if (tab !== 'weekly') return
    if (weeklyData.length > 0) return
    async function loadWeeklyFromCache() {
      setWeeklyLoading(true)
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const snap = await getDoc(doc(db, 'weeklyComments', WEEKLY_COMMENT_KEY))
        if (snap.exists()) {
          const data = snap.data()
          setWeeklyComments(data.days ?? {})
          setWeeklyCommentsAt(data.generatedAt ?? null)
          const stars: Record<string, { bestStars: number; isCloseout: boolean }> = data.stars ?? {}
          const base = new Date(); base.setHours(12,0,0,0)
          const result: WeeklyDayData[] = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base); d.setDate(d.getDate()+i)
            const dateStr = toDateStr(d)
            const ds = stars[dateStr]
            return { date: d, dateStr, bestStars: ds?.bestStars ?? 1, isCloseout: ds?.isCloseout ?? false }
          })
          setWeeklyData(result)
        }
      } catch {}
      setWeeklyLoading(false)
    }
    loadWeeklyFromCache()
  }, [tab])

  // AIコメント取得
  useEffect(() => {
    if (tab === 'weekly') { setDailyComment(null); return }
    const target = tab === 'today' ? 'today' : 'tomorrow'
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const scheduleHour = getLatestScheduleHour(target, jstHour)
    if (scheduleHour === null) { setDailyComment(null); return }
    setDailyCommentLoading(true)
    fetch(`/api/daily-comment?target=${target}&hour=${padHour(scheduleHour)}&areaLabel=${AREA_LABEL}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.comment) {
          setDailyComment(data.comment)
          const d = new Date(data.generatedAt)
          setDailyCommentAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
        } else { setDailyComment(null) }
      })
      .catch(() => setDailyComment(null))
      .finally(() => setDailyCommentLoading(false))
  }, [tab])

  useEffect(() => {
    if (tab === 'weekly') return
    loadForecast(getTargetDate(tab))
  }, [tab])

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
          const { stars, waveHeights, isCloseout } = computeSpotStars(data.conditions ?? [], spot)
          results.push({ spotId: spot.id, stars, waveHeights, isCloseout })
          if (!isCloseout) allStars.push(stars)
        } catch { results.push({ spotId: spot.id, stars: { morning: 1, midday: 1, evening: 1 }, waveHeights: { morning: 0, midday: 0, evening: 0 }, isCloseout: false }) }
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

  const targetDate = tab !== 'weekly' ? getTargetDate(tab) : today

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* Header (Ace Hotel風) */}
      <header
        className="px-5 pt-6 pb-5 border-b-4"
        style={{ background: 'var(--paper-100)', color: 'var(--ink-900)', borderColor: 'var(--ink-900)' }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="inline-block px-3.5 py-2" style={{ border: '2px solid var(--ink-900)' }}>
              <div className="font-display text-[32px] leading-[0.95] tracking-[0.02em]">
                AI WAVE FORECAST
              </div>
            </div>
            <div className="font-jp text-[11px] font-medium mt-2" style={{ color: 'var(--ink-500)' }}>
              AI波予報
            </div>
            <div
              className="flex items-center gap-2 mt-3.5 pt-2.5"
              style={{ borderTop: '1px solid var(--ink-900)' }}
            >
              <div className="font-jp text-[10px] font-bold tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>
                UPDATE
              </div>
              <div className="font-jp text-[10px] font-medium" style={{ color: 'var(--ink-900)' }}>
                {UPDATE_HOURS_JST.join('・')}時
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="font-jp text-[10px] font-bold tracking-[0.08em]" style={{ color: 'var(--ink-500)' }}>
                NEXT
              </div>
              <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-900)' }}>
                {getNextUpdateTime()}
              </div>
            </div>
          </div>
          <HamburgerMenu />
        </div>
      </header>

      <AreaTabs />

      {/* Date tabs (Ace Hotel風) */}
      <div
        className="flex border-b-2"
        style={{ background: 'var(--paper-100)', borderColor: 'var(--ink-900)' }}
      >
        <button
          onClick={() => setTab('today')}
          className="flex-1 py-3.5 px-1 text-center"
          style={{
            background: tab === 'today' ? 'var(--ink-900)' : 'transparent',
            color: tab === 'today' ? 'var(--paper-100)' : 'var(--ink-900)',
          }}
        >
          <div className="font-jp text-[15px]" style={{ fontWeight: tab === 'today' ? 700 : 500 }}>
            本日 {formatMD(today)}
          </div>
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className="flex-1 py-3.5 px-1 text-center"
          style={{
            background: tab === 'tomorrow' ? 'var(--ink-900)' : 'transparent',
            color: tab === 'tomorrow' ? 'var(--paper-100)' : 'var(--ink-900)',
            borderLeft: '1px solid var(--ink-900)',
            borderRight: '1px solid var(--ink-900)',
          }}
        >
          <div className="font-jp text-[15px]" style={{ fontWeight: tab === 'tomorrow' ? 700 : 500 }}>
            明日 {formatMD(tomorrow)}
          </div>
        </button>
        <button
          onClick={() => setTab('weekly')}
          className="flex-1 py-3.5 px-1 text-center"
          style={{
            background: tab === 'weekly' ? 'var(--ink-900)' : 'transparent',
            color: tab === 'weekly' ? 'var(--paper-100)' : 'var(--ink-900)',
          }}
        >
          <div className="font-jp text-[15px]" style={{ fontWeight: tab === 'weekly' ? 700 : 500 }}>
            週間
          </div>
        </button>
      </div>

      <main className="flex-1 p-4 space-y-2.5 overflow-auto pb-4">
        {tab === 'weekly' ? (
          weeklyLoading ? (
            <div className="flex items-center justify-center py-16"><p className="text-[#8899aa] text-sm">週間データを読み込み中...</p></div>
          ) : (
            weeklyData.map(day => (
              <WeeklyDayCard
                key={day.dateStr}
                date={day.date}
                dateStr={day.dateStr}
                bestStars={day.bestStars}
                isCloseout={day.isCloseout}
                comment={weeklyComments[day.dateStr]}
                generatedAt={weeklyCommentsAt ?? undefined}
              />
            ))
          )
        ) : (
          <>
            <TyphoonBanner />
            {/* Recommendation banner (Ace Hotel風 黒帯) */}
            {!loading && bestSlot && (
              <div className="-mx-4 py-4 px-5" style={{ background: 'var(--paper-100)' }}>
                <div
                  className="flex items-center justify-between"
                  style={{
                    background: 'var(--ink-900)',
                    color: 'var(--paper-100)',
                    padding: '14px 18px',
                  }}
                >
                  <div>
                    <div
                      className="font-jp text-[10px] font-bold tracking-[0.08em] mb-1"
                      style={{ color: 'rgba(251,248,243,0.7)' }}
                    >
                      {tab === 'today' ? '本日' : '明日'}のおすすめ
                    </div>
                    <div className="font-jp text-base font-black">
                      {bestSlot.label}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span
                        key={i}
                        className="text-lg"
                        style={{ color: i <= bestSlot.stars ? 'var(--paper-100)' : 'rgba(251,248,243,0.25)' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* AI comment */}
            {!loading && (dailyCommentLoading ? (
              <AiCommentLoading />
            ) : dailyComment ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI{tab === 'today' ? '今日' : '明日'}の予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{dailyComment}</p>
                {dailyCommentAt && (
                  <div style={{ fontSize: 10, color: '#a0bac8', marginTop: 8, textAlign: 'right' }}>{dailyCommentAt} 生成</div>
                )}
              </div>
            ) : null)}
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
                return <SpotCard key={card.spotId} spot={spot} stars={card.stars} waveHeights={card.waveHeights} isCloseout={card.isCloseout} date={targetDate} />
              })
            )}
          </>
        )}
      </main>

    </div>
  )
}
