'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { calculateScore, scoreToGrade, classifyWind, windTypeLabel, waveQualityLabel } from '@/lib/wave/scoring'
import { getUserProfile } from '@/lib/userProfile'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import type { UserProfile, SpotScore, Grade } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import AreaTabs from '@/components/AreaTabs'
import BottomNav from '@/components/BottomNav'

const AREA = 'chiba-north'
const AREA_LABEL = '千葉北'
const REP_SPOT = 'ichinomiya'

type DateTab = 'today' | 'tomorrow' | 'weekly'
interface WeeklyDayData { date: Date; dateStr: string; avgScore: number; grade: Grade }

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatMD(d: Date) { return `${d.getMonth()+1}/${d.getDate()}` }
function getTargetDate(tab: DateTab): Date {
  const d = new Date(); d.setHours(12,0,0,0)
  if (tab === 'tomorrow') d.setDate(d.getDate() + 1)
  return d
}

function AvgScore({ scores }: { scores: SpotScore[] }) {
  const avg = scores.length > 0 ? Math.floor(scores.reduce((s, sc) => s + sc.score, 0) / scores.length) : 0
  return (
    <div style={{ background: '#f8fafc', border: '0.5px solid #eef1f4', borderRadius: 14, padding: '.85rem 1rem' }} className="flex gap-4">
      <div className="flex flex-col justify-center shrink-0">
        <p className="font-semibold uppercase tracking-widest text-[#94a3b8] mb-1" style={{ fontSize: 10 }}>{AREA_LABEL} avg score</p>
        <p style={{ fontSize: 52, fontWeight: 700, color: '#0284c7', lineHeight: 1 }}>{avg}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {scores.map(sc => {
          const spot = SPOTS.find(s => s.id === sc.spotId)
          if (!spot) return null
          return (
            <div key={sc.spotId} className="flex items-center gap-1.5">
              <span className="shrink-0 truncate text-[#94a3b8]" style={{ fontSize: 9, width: 52 }}>{spot.name}</span>
              <div className="flex-1 h-1.5 bg-[#eef1f4] rounded-full overflow-hidden">
                <div style={{ width: `${sc.score}%`, background: sc.score >= 65 ? '#0284c7' : sc.score >= 45 ? '#0ea5e9' : '#94a3b8' }} className="h-full rounded-full" />
              </div>
              <span className="shrink-0 text-center text-[#94a3b8]" style={{ fontSize: 9, width: 14 }}>{sc.grade}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ChibaNorthPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<SpotScore[]>([])
  const [conditions, setConditions] = useState<Record<string, WaveCondition | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null)
  const [dailyComment, setDailyComment] = useState<string | null>(null)
  const [dailyCommentLoading, setDailyCommentLoading] = useState(false)
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyComment, setWeeklyComment] = useState<string | null>(null)
  const [weeklyCommentLoading, setWeeklyCommentLoading] = useState(false)

  const today = new Date(); today.setHours(12,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)

  useEffect(() => {
    setProfile(getUserProfile())
    async function fetchCacheTime() {
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const snap = await getDoc(doc(db, 'forecastCache', `${REP_SPOT}_${toDateStr(today)}`))
        if (snap.exists()) {
          const d = new Date(snap.data().updatedAt)
          setCacheUpdatedAt(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
        }
      } catch {}
    }
    fetchCacheTime()
  }, [])

  // AIコメント
  useEffect(() => {
    if (tab === 'weekly') return
    const target = tab === 'today' ? 'today' : 'tomorrow'
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const scheduleHour = getLatestScheduleHour(target, jstHour)
    if (scheduleHour === null) { setDailyComment(null); return }
    setDailyCommentLoading(true)
    fetch(`/api/daily-comment?target=${target}&hour=${padHour(scheduleHour)}&areaLabel=${AREA_LABEL}&spotName=一宮`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.comment) setDailyComment(data.comment); else setDailyComment(null) })
      .catch(() => setDailyComment(null))
      .finally(() => setDailyCommentLoading(false))
  }, [tab])

  // 今日/明日データ
  useEffect(() => {
    if (!profile || tab === 'weekly') return
    loadForecast(getTargetDate(tab))
  }, [profile, tab])

  // 週間データ
  useEffect(() => {
    if (tab !== 'weekly' || !profile || weeklyData.length > 0) return
    loadWeeklyForecast()
  }, [tab, profile])

  async function loadForecast(targetDate: Date) {
    setLoading(true); setError(null)
    const dateStr = toDateStr(targetDate)
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === AREA)
    try {
      const condMap: Record<string, WaveCondition | null> = {}
      await Promise.all(activeSpots.map(async spot => {
        try {
          const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          const hourly: WaveCondition[] = data.conditions ?? []
          const displayHour = tab === 'today' ? getLatestUpdateHour() : 6
          const target = hourly.find(c => { const h = (new Date(c.timestamp).getUTCHours()+9)%24; return h === displayHour }) ?? hourly[0]
          condMap[spot.id] = target ?? null
        } catch { condMap[spot.id] = null }
      }))
      const newScores = activeSpots
        .map(spot => { const c = condMap[spot.id]; if (!c || !profile) return null; return calculateScore(c, spot, profile) })
        .filter((s): s is SpotScore => s !== null)
        .sort((a, b) => b.score - a.score)
      setScores(newScores)
      setConditions(condMap)
      if (newScores.length === 0) setError('波データを取得できませんでした。')
    } catch { setError('データの取得に失敗しました。') }
    finally { setLoading(false) }
  }

  async function loadWeeklyForecast() {
    setWeeklyLoading(true)
    const base = new Date(); base.setHours(12,0,0,0)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate()+i); return d })
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === AREA)
    const result: WeeklyDayData[] = []
    const commentData: Array<{ date: string; avgScore: number; waveHeight?: number; windType?: string; swellDirection?: string; period?: number; waveQualityLabel?: string }> = []
    const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
    for (const day of days) {
      const dateStr = toDateStr(day)
      const condResults = await Promise.all(activeSpots.map(async spot => {
        try {
          const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
          if (!res.ok) return null
          const data = await res.json()
          const hourly: WaveCondition[] = data.conditions ?? []
          return hourly.find(c => new Date(c.timestamp).getHours() === 12) ?? hourly[0] ?? null
        } catch { return null }
      }))
      const dayScores = activeSpots.map((spot, i) => { const c = condResults[i]; if (!c) return null; return calculateScore(c, spot, profile!) }).filter((s): s is SpotScore => s !== null)
      const avgScore = dayScores.length > 0 ? Math.round(dayScores.reduce((s, sc) => s + sc.score, 0) / dayScores.length) : 0
      result.push({ date: day, dateStr, avgScore, grade: scoreToGrade(avgScore) })
      const repCond = condResults.find(c => c !== null) ?? null
      const repScore = dayScores[0] ?? null
      commentData.push({
        date: dateStr, avgScore,
        waveHeight: repCond ? Math.round(repCond.waveHeight * 10) / 10 : undefined,
        windType: repCond ? windTypeLabel(classifyWind(repCond.windDir, repCond.windSpeed)) : undefined,
        swellDirection: repCond ? COMPASS_8[Math.round(repCond.swellDir / 45) % 8] : undefined,
        period: repCond ? Math.round(repCond.wavePeriod) : undefined,
        waveQualityLabel: repScore ? waveQualityLabel(repScore.breakdown.waveQuality) : undefined,
      })
    }
    setWeeklyData(result)
    setWeeklyLoading(false)
    // AI週間コメント
    setWeeklyCommentLoading(true)
    try {
      const res = await fetch('/api/weekly-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyData: commentData, areaLabel: AREA_LABEL, spotName: '一宮' }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setWeeklyComment(comment)
      }
    } catch {}
    finally { setWeeklyCommentLoading(false) }
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
            {cacheUpdatedAt && (
              <div style={{ marginTop: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{cacheUpdatedAt} 更新</span>
              </div>
            )}
          </div>
          <button onClick={() => router.push('/settings')} style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 14 }}>⚙</span> マイ設定
          </button>
        </div>
      </header>

      <AreaTabs />
      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '8px 16px', margin: '8px 12px', fontSize: 13, color: '#856404', textAlign: 'center' }}>
        🚧 テスト運用中 — データや表示内容は予告なく変更される場合があります
      </div>

      {/* 日付タブ */}
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
            <>
            {weeklyCommentLoading ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI週間予報</div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>AIが今週の波を分析中...</p>
              </div>
            ) : weeklyComment ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI週間予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{weeklyComment}</p>
              </div>
            ) : null}
            {weeklyData.map(day => {
              const dow = ['日','月','火','水','木','金','土'][day.date.getDay()]
              const dowColor = day.date.getDay() === 0 ? '#ef4444' : day.date.getDay() === 6 ? '#3b82f6' : '#0a1628'
              const scoreColor = day.avgScore >= 85 ? '#0284c7' : day.avgScore >= 65 ? '#0ea5e9' : '#94a3b8'
              return (
                <div key={day.dateStr} style={{ background: '#fff', border: '0.5px solid #eef1f4', borderRadius: 12, padding: '12px 16px' }} className="flex items-center">
                  <div style={{ width: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: dowColor, lineHeight: 1.1 }}>{dow}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMD(day.date)}</div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 30, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{day.avgScore}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: scoreColor, borderRadius: 6, padding: '3px 7px' }}>{day.grade}</span>
                  </div>
                </div>
              )
            })}
            </>
          )
        ) : (
          <>
            {dailyCommentLoading ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI{tab === 'today' ? '今日' : '明日'}の予報</div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>AIが波を分析中...</p>
              </div>
            ) : dailyComment ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI{tab === 'today' ? '今日' : '明日'}の予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{dailyComment}</p>
              </div>
            ) : null}
            {!loading && !error && scores.length > 0 && <AvgScore scores={scores} />}
            {loading ? (
              <div className="flex items-center justify-center py-16"><p className="text-[#8899aa] text-sm">読み込み中...</p></div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-[#8899aa] text-sm text-center px-4">{error}</p>
                <button onClick={() => loadForecast(targetDate)} className="px-6 py-2 bg-[#0284c7] text-white rounded-full text-sm font-semibold">再試行</button>
              </div>
            ) : (
              scores.map(score => {
                const spot = SPOTS.find(s => s.id === score.spotId)!
                return <SpotCard key={score.spotId} spot={spot} score={score} isFavorite={profile.favoriteSpots.includes(spot.id)} condition={conditions[spot.id]} date={targetDate} isTop={false} />
              })
            )}
          </>
        )}
      </main>

      <BottomNav current="forecast" />
    </div>
  )
}
