'use client'
import { useEffect, useState } from 'react'
import { getUserProfile, saveUserProfile } from '@/lib/userProfile'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { SPOTS } from '@/data/spots'
import { calculateScore, scoreToGrade, classifyWind, windTypeLabel, waveQualityLabel } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore, Grade } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import BottomNav from '@/components/BottomNav'

interface WeatherFullData {
  current: { weatherCode: number; temperature: number }
  daily: Array<{ date: string; weatherCode: number; temperatureMax: number; uvIndex: number }>
}

interface ActiveWeather {
  weatherCode: number
  temperature: number
  temperatureMax: number
  uvIndex: number
}

interface WeeklyDayData {
  date: Date
  dateStr: string
  avgScore: number
  grade: Grade
}

type DateTab = 'today' | 'tomorrow' | 'weekly'

const DOW_ENG = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

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

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 更新`
}

function getActiveWeather(
  weather: WeatherFullData,
  tab: 'today' | 'tomorrow'
): { active: ActiveWeather; isToday: boolean } | null {
  if (tab === 'today') {
    const d = weather.daily[0]
    return {
      active: {
        weatherCode: weather.current.weatherCode,
        temperature: weather.current.temperature,
        temperatureMax: d?.temperatureMax ?? weather.current.temperature,
        uvIndex: d?.uvIndex ?? 0,
      },
      isToday: true,
    }
  }
  const target = getTargetDate(tab)
  const dateStr = toDateStr(target)
  const d = weather.daily.find(x => x.date === dateStr)
  if (!d) return null
  return {
    active: {
      weatherCode: d.weatherCode,
      temperature: d.temperatureMax,
      temperatureMax: d.temperatureMax,
      uvIndex: d.uvIndex,
    },
    isToday: false,
  }
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
  const [scores, setScores] = useState<SpotScore[]>([])
  const [conditions, setConditions] = useState<Record<string, WaveCondition | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherFullData | null>(null)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  const [draftLevel, setDraftLevel] = useState<UserProfile['level']>('intermediate')
  const [draftBoard, setDraftBoard] = useState<UserProfile['boardType']>('funboard')
  const [draftSize, setDraftSize] = useState<UserProfile['preferredSize']>('waist-chest')
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyComment, setWeeklyComment] = useState<string | null>(null)
  const [weeklyCommentAt, setWeeklyCommentAt] = useState<string | null>(null)
  const [weeklyCommentLoading, setWeeklyCommentLoading] = useState(false)
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null)
  const [dailyComment, setDailyComment] = useState<string | null>(null)
  const [dailyCommentAt, setDailyCommentAt] = useState<string | null>(null)
  const [dailyCommentLoading, setDailyCommentLoading] = useState(false)

  const today = new Date(); today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  useEffect(() => {
    const p = getUserProfile()
    setProfile(p)
  }, [])

  useEffect(() => {
    fetch('/api/weather')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && !d.error && setWeather(d))
      .catch(() => {})
  }, [])

  // Firestoreキャッシュの最終更新時刻を取得
  useEffect(() => {
    async function fetchCacheTime() {
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const dateKey = toDateStr(new Date())
        const cacheRef = doc(db, 'forecastCache', `kugenuma_${dateKey}`)
        const snap = await getDoc(cacheRef)
        if (snap.exists()) {
          const updatedAt = snap.data().updatedAt
          if (updatedAt) {
            const d = new Date(updatedAt)
            setCacheUpdatedAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
          }
        }
      } catch {}
    }
    fetchCacheTime()
  }, [])

  // 今日/明日タブのAIコメント取得
  useEffect(() => {
    if (tab === 'weekly') return
    const target = tab === 'today' ? 'today' : 'tomorrow'
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const scheduleHour = getLatestScheduleHour(target, jstHour)
    if (scheduleHour === null) {
      setDailyComment(null)
      return
    }
    setDailyCommentLoading(true)
    fetch(`/api/daily-comment?target=${target}&hour=${padHour(scheduleHour)}`)
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
  }, [tab])

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

    try {
      const activeSpots = SPOTS.filter(s => s.isActive)
      const condMap: Record<string, WaveCondition | null> = {}

      await Promise.all(
        activeSpots.map(async spot => {
          try {
            const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const hourly: WaveCondition[] = data.conditions ?? []
            const noon = hourly.find(c => new Date(c.timestamp).getHours() === 12)
            condMap[spot.id] = noon ?? hourly[0] ?? null
          } catch {
            condMap[spot.id] = null
          }
        })
      )
      // スコアは生の波高で計算（scoring.ts内でwaveHeightMultiplierを適用）
      const newScores = activeSpots
        .map(spot => {
          const cond = condMap[spot.id]
          if (!cond || !profile) return null
          return calculateScore(cond, spot, profile)
        })
        .filter((s): s is SpotScore => s !== null)
        .sort((a, b) => {
          const aFav = profile!.favoriteSpots.includes(a.spotId)
          const bFav = profile!.favoriteSpots.includes(b.spotId)
          if (aFav && !bFav) return -1
          if (!aFav && bFav) return 1
          // よく行くスポット同士はスコア順
          if (aFav && bFav) return b.score - a.score
          // それ以外は defaultOrder 固定順
          const aOrder = SPOTS.find(s => s.id === a.spotId)?.defaultOrder ?? 99
          const bOrder = SPOTS.find(s => s.id === b.spotId)?.defaultOrder ?? 99
          return aOrder - bOrder
        })
      setScores(newScores)

      // 表示用に波高を補正（スコア計算後に適用して二重適用を防ぐ）
      activeSpots.forEach(spot => {
        const m = spot.waveHeightMultiplier ?? 1.0
        if (m !== 1.0 && condMap[spot.id]) {
          condMap[spot.id] = { ...condMap[spot.id]!, waveHeight: condMap[spot.id]!.waveHeight * m }
        }
      })
      setConditions(condMap)

      if (newScores.length === 0 && Object.values(condMap).every(v => v === null)) {
        setError('波データを取得できませんでした。')
      } else {
        setLastUpdated(new Date())
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

    const activeSpots = SPOTS.filter(s => s.isActive)
    const result: WeeklyDayData[] = []
    const commentData: Array<{ date: string; avgScore: number; waveHeight?: number; windType?: string; swellDirection?: string; period?: number; waveQualityLabel?: string }> = []

    for (const day of days) {
      const dateStr = toDateStr(day)
      const condResults = await Promise.all(
        activeSpots.map(async spot => {
          try {
            const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
            if (!res.ok) return null
            const data = await res.json()
            const hourly: WaveCondition[] = data.conditions ?? []
            return hourly.find(c => new Date(c.timestamp).getHours() === 12) ?? hourly[0] ?? null
          } catch {
            return null
          }
        })
      )

      const dayScores = activeSpots
        .map((spot, i) => {
          const cond = condResults[i]
          if (!cond) return null
          return calculateScore(cond, spot, profile!)
        })
        .filter((s): s is SpotScore => s !== null)

      const avgScore = dayScores.length > 0
        ? Math.round(dayScores.reduce((s, sc) => s + sc.score, 0) / dayScores.length)
        : 0

      result.push({ date: day, dateStr, avgScore, grade: scoreToGrade(avgScore) })

      // AI週間コメント用データ収集（代表スポットの代表条件）
      const repCond = condResults.find(c => c !== null) ?? null
      const repScore = dayScores[0] ?? null
      const COMPASS_8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
      commentData.push({
        date: dateStr,
        avgScore,
        waveHeight: repCond ? Math.round(repCond.waveHeight * 10) / 10 : undefined,
        windType: repCond ? windTypeLabel(classifyWind(repCond.windDir, repCond.windSpeed)) : undefined,
        swellDirection: repCond ? COMPASS_8[Math.round(repCond.swellDir / 45) % 8] : undefined,
        period: repCond ? Math.round(repCond.wavePeriod) : undefined,
        waveQualityLabel: repScore ? waveQualityLabel(repScore.breakdown.waveQuality) : undefined,
      })
    }

    setWeeklyData(result)
    setWeeklyLoading(false)

    // AI週間コメント取得
    loadWeeklyComment(commentData)
  }

  async function loadWeeklyComment(data: Array<{ date: string; avgScore: number; waveHeight?: number; windType?: string; swellDirection?: string; period?: number; waveQualityLabel?: string }>) {
    setWeeklyCommentLoading(true)
    try {
      await ensureAnonymousAuth()
      const dateKey = toDateStr(new Date())
      const db = getDb()
      const docRef = doc(db, 'weeklyComment', dateKey)

      // Firestoreキャッシュ確認
      let cachedHit = false
      try {
        const cached = await getDoc(docRef)
        if (cached.exists()) {
          const d = cached.data()
          setWeeklyComment(d.comment)
          const ts = d.generatedAt?.toDate?.() ?? new Date()
          setWeeklyCommentAt(`${ts.getMonth() + 1}/${ts.getDate()} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`)
          cachedHit = true
        }
      } catch (cacheErr) {
        console.error('[WeeklyComment] Firestore cache read error:', cacheErr)
      }
      if (cachedHit) {
        setWeeklyCommentLoading(false)
        return
      }

      // Claude APIで生成
      const res = await fetch('/api/weekly-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyData: data }),
      })
      if (!res.ok) {
        const errBody = await res.text()
        console.error('[WeeklyComment] API error:', res.status, errBody)
        setWeeklyComment('AI予報コメントを取得できませんでした。')
        return
      }
      const { comment, generatedAt } = await res.json()
      setWeeklyComment(comment)
      const d = new Date(generatedAt)
      setWeeklyCommentAt(`${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)

      // Firestoreにキャッシュ保存（失敗してもコメント表示には影響しない）
      try {
        await setDoc(docRef, { comment, generatedAt: new Date() })
      } catch (writeErr) {
        console.error('[WeeklyComment] Firestore cache write error:', writeErr)
      }
    } catch (err) {
      console.error('[WeeklyComment] error:', err)
      setWeeklyComment('AI予報コメントを取得できませんでした。')
    } finally {
      setWeeklyCommentLoading(false)
    }
  }

  if (!profile) return null

  const targetDate = tab !== 'weekly' ? getTargetDate(tab) : today


  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header className="header-gradient" style={{ padding: '16px 1rem 1rem', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>jpwaveforecast.com</div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 99,
                padding: '3px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {cacheUpdatedAt ? `${cacheUpdatedAt} 更新` : '更新中...'}
                </span>
              </div>
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
                background: '#fff',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                color: '#0284c7',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: 'none',
                cursor: 'pointer',
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

      {/* 日付タブ */}
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

      {/* 天気バー（今日・明日のみ） */}
      {weather && tab !== 'weekly' && (() => {
        const aw = getActiveWeather(weather, tab)
        return aw ? <WeatherBar active={aw.active} isToday={aw.isToday} /> : null
      })()}

      {/* スポットリスト / 週間予報 */}
      <main className="flex-1 p-4 space-y-2.5 overflow-auto pb-28">
        {tab === 'weekly' ? (
          weeklyLoading ? (
            <WeeklyListSkeleton />
          ) : (
            <>
            {/* AI週間予報コメント */}
            {weeklyCommentLoading ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI週間予報</div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>AIが今週の波を分析中...</p>
              </div>
            ) : weeklyComment ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI週間予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{weeklyComment}</p>
                {weeklyCommentAt && (
                  <div style={{ fontSize: 10, color: '#a0bac8', marginTop: 8, textAlign: 'right' }}>{weeklyCommentAt} 生成</div>
                )}
              </div>
            ) : null}
            {weeklyData.map(day => {
              const dow = DOW_JA[day.date.getDay()]
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
              const dowColor = day.date.getDay() === 0 ? '#ef4444' : day.date.getDay() === 6 ? '#3b82f6' : '#0a1628'
              const dayWeather = weather?.daily.find(w => w.date === day.dateStr)
              const { type: wType } = weatherInfo(dayWeather?.weatherCode ?? 3)
              const scoreColor = day.avgScore >= 85 ? '#0284c7' : day.avgScore >= 65 ? '#0ea5e9' : '#94a3b8'
              return (
                <div
                  key={day.dateStr}
                  style={{ background: '#fff', border: '0.5px solid #eef1f4', borderRadius: 12, padding: '12px 16px' }}
                  className="flex items-center"
                >
                  {/* 曜日・日付 */}
                  <div style={{ width: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: dowColor, lineHeight: 1.1 }}>{dow}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMD(day.date)}</div>
                  </div>
                  {/* 天気アイコン・最高気温 */}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <WeatherIcon type={wType} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0a1628' }}>
                      {dayWeather ? `${dayWeather.temperatureMax}°` : '—'}
                    </span>
                  </div>
                  {/* 平均スコア・グレード */}
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 30, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                      {day.avgScore}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#fff',
                      background: scoreColor, borderRadius: 6, padding: '3px 7px',
                    }}>
                      {day.grade}
                    </span>
                  </div>
                </div>
              )
            })}
            </>
          )
        ) : (
          <>
            {/* AI日次予報コメント */}
            {dailyCommentLoading ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI{tab === 'today' ? '今日' : '明日'}の予報</div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>AIが波を分析中...</p>
              </div>
            ) : dailyComment ? (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI{tab === 'today' ? '今日' : '明日'}の予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{dailyComment}</p>
                {dailyCommentAt && (
                  <div style={{ fontSize: 10, color: '#a0bac8', marginTop: 8, textAlign: 'right' }}>{dailyCommentAt} 生成</div>
                )}
              </div>
            ) : null}
            {!loading && !error && scores.length > 0 && (
              <AvgScoreHero scores={scores} />
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
              scores.map((score, i) => {
                const spot = SPOTS.find(s => s.id === score.spotId)!
                return (
                  <SpotCard key={score.spotId} spot={spot} score={score}
                    isFavorite={profile.favoriteSpots.includes(spot.id)}
                    condition={conditions[spot.id]}
                    date={targetDate}
                    isTop={i === 0}
                  />
                )
              })
            )}
          </>
        )}
      </main>

      {/* 設定ボトムシート */}
      {showSettingsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettingsSheet(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-[#dde3ea] rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0a1628] mb-5">サーフィン設定</h3>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">レベル</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SETTING_LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setDraftLevel(l.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftLevel === l.value
                    ? { background: '#0284c7', color: '#fff' }
                    : { background: '#f0f9ff', color: '#8899aa' }
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">ボード</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SETTING_BOARDS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setDraftBoard(b.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftBoard === b.value
                    ? { background: '#0284c7', color: '#fff' }
                    : { background: '#f0f9ff', color: '#8899aa' }
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-2">好みの波サイズ</p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {SETTING_SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setDraftSize(s.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={draftSize === s.value
                    ? { background: '#0284c7', color: '#fff' }
                    : { background: '#f0f9ff', color: '#8899aa' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const updated: UserProfile = {
                  ...profile,
                  level: draftLevel,
                  boardType: draftBoard,
                  preferredSize: draftSize,
                }
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

function barColor(s: number): string {
  if (s >= 80) return '#0284c7'
  if (s >= 50) return '#38bdf8'
  return '#94a3b8'
}

function AvgScoreHero({ scores }: { scores: SpotScore[] }) {
  const avg = Math.floor(scores.reduce((s, sc) => s + sc.score, 0) / scores.length)
  return (
    <div style={{ background: '#f8fafc', border: '0.5px solid #eef1f4', borderRadius: 14, padding: '.85rem 1rem' }}
      className="flex gap-4"
    >
      <div className="flex flex-col justify-center shrink-0">
        <p className="font-semibold uppercase tracking-widest text-[#94a3b8] mb-1" style={{ fontSize: 10 }}>
          Shonan avg score
        </p>
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
                <div style={{ width: `${sc.score}%`, background: barColor(sc.score) }} className="h-full rounded-full" />
              </div>
              <span className="shrink-0 text-center text-[#94a3b8]" style={{ fontSize: 9, width: 14 }}>{sc.grade}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function weatherInfo(code: number): { name: string; type: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { name: '快晴', type: 'sunny' }
  if (code === 1) return { name: '晴れ', type: 'sunny' }
  if (code === 2) return { name: '晴れ時々曇', type: 'cloudy' }
  if (code === 3) return { name: '曇り', type: 'cloudy' }
  if (code === 45 || code === 48) return { name: '霧', type: 'cloudy' }
  if (code >= 51 && code <= 67) return { name: '雨', type: 'rain' }
  if (code >= 71 && code <= 77) return { name: '雪', type: 'snow' }
  if (code >= 80 && code <= 82) return { name: 'にわか雨', type: 'rain' }
  if (code >= 95) return { name: '雷雨', type: 'storm' }
  return { name: '—', type: 'cloudy' }
}

function uvLabel(uv: number): string {
  if (uv <= 2) return '低い'
  if (uv <= 5) return '中程度'
  if (uv <= 7) return '高い'
  if (uv <= 10) return '非常に高い'
  return '極端'
}

function WeatherIcon({ type }: { type: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' }) {
  if (type === 'sunny') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" fill="#f59e0b" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1="12" y1="12" x2={12 + 9 * Math.cos(a * Math.PI / 180)} y2={12 + 9 * Math.sin(a * Math.PI / 180)}
          stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"
          style={{ transformOrigin: 'center' }}
        />
      ))}
    </svg>
  )
  if (type === 'rain') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 14a6 6 0 1 1 12 0" fill="#378ADD" />
      <rect x="6" y="14" width="12" height="3" rx="1.5" fill="#378ADD" />
      <line x1="9" y1="19" x2="8" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="11" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="19" x2="14" y2="22" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
  if (type === 'snow') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 13a6 6 0 1 1 12 0" fill="#85B7EB" />
      <rect x="6" y="13" width="12" height="3" rx="1.5" fill="#85B7EB" />
      <circle cx="9" cy="20" r="1.5" fill="#85B7EB" />
      <circle cx="12" cy="21" r="1.5" fill="#85B7EB" />
      <circle cx="15" cy="20" r="1.5" fill="#85B7EB" />
    </svg>
  )
  if (type === 'storm') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 12a7 7 0 1 1 14 0" fill="#94a3b8" />
      <rect x="5" y="12" width="14" height="3" rx="1.5" fill="#94a3b8" />
      <polyline points="13,17 11,21 13,21 11,24" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  // cloudy
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 16a4.5 4.5 0 1 1 8.9-.5H17a3 3 0 0 1 0 6H6.5a4.5 4.5 0 0 1 0-9z" fill="#94a3b8" />
    </svg>
  )
}

function WeatherBar({ active, isToday }: { active: ActiveWeather; isToday: boolean }) {
  const { name: weatherName, type: weatherType } = weatherInfo(active.weatherCode)
  return (
    <div style={{ background: '#f8fafc', borderBottom: '0.5px solid #eef1f4', padding: '.55rem 1rem' }}
      className="flex items-center"
    >
      <div className="flex-1 flex items-center gap-1.5 justify-center">
        <WeatherIcon type={weatherType} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#0a1628' }}>{weatherName}</span>
      </div>
      <div style={{ width: '0.5px', background: '#eef1f4', height: 24 }} />
      <div className="flex-1 flex flex-col items-center">
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0a1628' }}>{active.temperature}°</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>
          {isToday ? `最高 ${active.temperatureMax}°` : '最高気温'}
        </span>
      </div>
      <div style={{ width: '0.5px', background: '#eef1f4', height: 24 }} />
      <div className="flex-1 flex flex-col items-center">
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0a1628' }}>UV {active.uvIndex}</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>
          {isToday ? uvLabel(active.uvIndex) : '最大UV'}
        </span>
      </div>
    </div>
  )
}

function SpotListSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ minHeight: 160 }} className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-4 animate-pulse">
          <div className="w-14 h-14 bg-[#f0f9ff] rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f0f9ff] rounded w-1/3" />
            <div className="h-3 bg-[#f0f9ff] rounded w-2/3" />
          </div>
          <div className="w-10 h-8 bg-[#f0f9ff] rounded shrink-0" />
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
          <div className="flex-1 flex justify-center">
            <div className="w-16 h-6 bg-[#f0f9ff] rounded" />
          </div>
          <div className="w-16 h-8 bg-[#f0f9ff] rounded shrink-0" />
        </div>
      ))}
    </>
  )
}
