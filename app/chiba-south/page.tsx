'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { calculateScore, scoreToGrade, classifyWind, windTypeLabel, waveQualityLabel } from '@/lib/wave/scoring'
import { getUserProfile } from '@/lib/userProfile'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getLatestUpdateHour, getNextUpdateTime, UPDATE_HOURS_JST } from '@/lib/updateSchedule'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import type { UserProfile, SpotScore, Grade } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import AreaTabs from '@/components/AreaTabs'
import BottomNav from '@/components/BottomNav'

const AREA = 'chiba-south'
const AREA_LABEL = '千葉南'
const REP_SPOT = 'kamogawa'

type DateTab = 'today' | 'tomorrow' | 'weekly'
interface WeeklyDayData { date: Date; dateStr: string; avgScore: number; grade: Grade }
interface WeatherDaily { date: string; weatherCode: number; temperatureMax: number; uvIndex: number }

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatMD(d: Date) { return `${d.getMonth()+1}/${d.getDate()}` }

function weatherInfo(code: number): { type: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' } {
  if (code <= 1) return { type: 'sunny' }
  if (code <= 3) return { type: 'cloudy' }
  if (code === 45 || code === 48) return { type: 'cloudy' }
  if (code >= 51 && code <= 67) return { type: 'rain' }
  if (code >= 71 && code <= 77) return { type: 'snow' }
  if (code >= 80 && code <= 82) return { type: 'rain' }
  if (code >= 95) return { type: 'storm' }
  return { type: 'cloudy' }
}

function WeatherIcon({ type }: { type: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' }) {
  if (type === 'sunny') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" fill="#f59e0b" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1="12" y1="12" x2={12+9*Math.cos(a*Math.PI/180)} y2={12+9*Math.sin(a*Math.PI/180)} stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  )
  if (type === 'rain') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 14a6 6 0 1 1 12 0" fill="#378ADD" /><rect x="6" y="14" width="12" height="3" rx="1.5" fill="#378ADD" />
      <line x1="9" y1="19" x2="8" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="11" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="19" x2="14" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
  if (type === 'snow') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 13a6 6 0 1 1 12 0" fill="#85B7EB" /><rect x="6" y="13" width="12" height="3" rx="1.5" fill="#85B7EB" />
      <circle cx="9" cy="20" r="1.5" fill="#85B7EB" /><circle cx="12" cy="21" r="1.5" fill="#85B7EB" /><circle cx="15" cy="20" r="1.5" fill="#85B7EB" />
    </svg>
  )
  if (type === 'storm') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 12a7 7 0 1 1 14 0" fill="#94a3b8" /><rect x="5" y="12" width="14" height="3" rx="1.5" fill="#94a3b8" />
      <polyline points="13,17 11,21 13,21 11,24" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 16a4.5 4.5 0 1 1 8.9-.5H17a3 3 0 0 1 0 6H6.5a4.5 4.5 0 0 1 0-9z" fill="#94a3b8" />
    </svg>
  )
}
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

export default function ChibaSouthPage() {
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
  const [weatherDaily, setWeatherDaily] = useState<WeatherDaily[]>([])

  useEffect(() => {
    fetch('/api/weather').then(r => r.ok ? r.json() : null).then(d => { if (d?.daily) setWeatherDaily(d.daily) }).catch(() => {})
  }, [])

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
    fetch(`/api/daily-comment?target=${target}&hour=${padHour(scheduleHour)}&areaLabel=${AREA_LABEL}&spotName=鴨川`)
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
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          const aOrder = SPOTS.find(s => s.id === a.spotId)?.order ?? 99
          const bOrder = SPOTS.find(s => s.id === b.spotId)?.order ?? 99
          return aOrder - bOrder
        })
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
        body: JSON.stringify({ weeklyData: commentData, areaLabel: AREA_LABEL, spotName: '鴨川' }),
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
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
                更新時刻：{UPDATE_HOURS_JST.join(', ')}時
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
                次回更新：{getNextUpdateTime()}
              </p>
            </div>
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
              const dayW = weatherDaily.find(w => w.date === day.dateStr)
              const { type: wType } = weatherInfo(dayW?.weatherCode ?? 3)
              const scoreColor = day.avgScore >= 85 ? '#0284c7' : day.avgScore >= 65 ? '#0ea5e9' : '#94a3b8'
              return (
                <div key={day.dateStr} style={{ background: '#fff', border: '0.5px solid #eef1f4', borderRadius: 12, padding: '12px 16px' }} className="flex items-center">
                  <div style={{ width: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: dowColor, lineHeight: 1.1 }}>{dow}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMD(day.date)}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <WeatherIcon type={wType} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0a1628' }}>{dayW ? `${dayW.temperatureMax}°` : '—'}</span>
                  </div>
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
