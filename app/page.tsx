'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/lib/userProfile'
import { SPOTS } from '@/data/spots'
import { calculateScore } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import BottomNav from '@/components/BottomNav'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

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

type DateTab = 'today' | 'tomorrow' | 'weekend'

const DOW_ENG = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getUpcomingWeekend(): { sat: Date; sun: Date } {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow = today.getDay()
  const daysToSat = dow === 0 ? 6 : (6 - dow + 7) % 7
  const sat = new Date(today)
  sat.setDate(sat.getDate() + daysToSat)
  sat.setHours(12, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sun.getDate() + 1)
  return { sat, sun }
}

function getTargetDate(tab: DateTab, weekendDay: 'sat' | 'sun'): Date {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  if (tab === 'today') return today
  if (tab === 'tomorrow') {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return d
  }
  const { sat, sun } = getUpcomingWeekend()
  return weekendDay === 'sat' ? sat : sun
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 更新`
}

function getActiveWeather(
  weather: WeatherFullData,
  tab: DateTab,
  weekendDay: 'sat' | 'sun'
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
  const target = getTargetDate(tab, weekendDay)
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


export default function TopPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<SpotScore[]>([])
  const [conditions, setConditions] = useState<Record<string, WaveCondition | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [weekendDay, setWeekendDay] = useState<'sat' | 'sun'>('sat')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showRefreshToast, setShowRefreshToast] = useState(false)
  const [weather, setWeather] = useState<WeatherFullData | null>(null)

  const { sat, sun } = getUpcomingWeekend()
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  useEffect(() => {
    const p = getUserProfile()
    if (!p.onboardingDone) {
      router.replace('/onboarding')
      return
    }
    setProfile(p)
  }, [router])

  useEffect(() => {
    fetch('/api/weather')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && !d.error && setWeather(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile) return
    loadForecast(getTargetDate(tab, weekendDay))
  }, [profile, tab, weekendDay])

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
      setConditions(condMap)

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
          return b.score - a.score
        })
      setScores(newScores)

      if (newScores.length === 0 && Object.values(condMap).every(v => v === null)) {
        setError('波データを取得できませんでした。画面を引っ張って再読み込みしてください。')
      } else {
        setLastUpdated(new Date())
      }
    } catch {
      setError('データの取得に失敗しました。画面を引っ張って再読み込みしてください。')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = useCallback(async () => {
    await loadForecast(getTargetDate(tab, weekendDay))
    setShowRefreshToast(true)
    setTimeout(() => setShowRefreshToast(false), 2000)
  }, [tab, weekendDay, profile])

  const { scrollRef, pullDistance, isRefreshing, threshold } = usePullToRefresh(handleRefresh)

  if (!profile) return null

  const targetDate = getTargetDate(tab, weekendDay)
  const allBad = !loading && !error && scores.length > 0 && scores.every(s => s.grade === '×')

  const dateLabel =
    tab === 'today' ? '今日' :
    tab === 'tomorrow' ? '明日' :
    weekendDay === 'sat' ? `${formatMD(sat)}(土)` : `${formatMD(sun)}(日)`

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8]">
      {/* ヘッダー */}
      <header className="bg-white px-4 pt-10 pb-4 border-b border-[#eef1f4]">
        <div className="flex items-center justify-between">
          <img src="/images/header.png" alt="Shonan Wave Forecast" style={{ height: 32, width: 'auto' }} />
          <div className="text-right">
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full tracking-widest uppercase">
              {DOW_ENG[today.getDay()]} · {today.getMonth() + 1}/{today.getDate()}
            </span>
            {lastUpdated && (
              <p className="text-[10px] text-[#94a3b8] mt-1">{formatTime(lastUpdated)}</p>
            )}
          </div>
        </div>
      </header>

      {/* 日付タブ */}
      <div className="bg-white border-b border-[#eef1f4] px-3 flex items-center gap-1 py-2">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'today' ? 'bg-sky-900 text-white' : 'text-[#8899aa]'
          }`}
        >
          今日 {formatMD(today)}
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'tomorrow' ? 'bg-sky-900 text-white' : 'text-[#8899aa]'
          }`}
        >
          明日 {formatMD(tomorrow)}
        </button>
        <button
          onClick={() => setTab('weekend')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors leading-tight ${
            tab === 'weekend' ? 'bg-sky-900 text-white' : 'text-[#8899aa]'
          }`}
        >
          週末
          <span className="block text-[9px] opacity-80">
            {formatMD(sat)}土・{formatMD(sun)}日
          </span>
        </button>
      </div>

      {/* 週末サブタブ */}
      {tab === 'weekend' && (
        <div className="flex bg-[#f0f4f8] border-b border-[#eef1f4] px-4 gap-2 py-2">
          <button
            onClick={() => setWeekendDay('sat')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-semibold transition-colors ${
              weekendDay === 'sat' ? 'bg-sky-900 text-white' : 'bg-white text-[#8899aa] border border-[#eef1f4]'
            }`}
          >
            土 {formatMD(sat)}
          </button>
          <button
            onClick={() => setWeekendDay('sun')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-semibold transition-colors ${
              weekendDay === 'sun' ? 'bg-sky-900 text-white' : 'bg-white text-[#8899aa] border border-[#eef1f4]'
            }`}
          >
            日 {formatMD(sun)}
          </button>
        </div>
      )}

      {/* 天気バー */}
      {weather && (() => {
        const aw = getActiveWeather(weather, tab, weekendDay)
        return aw ? <WeatherBar active={aw.active} isToday={aw.isToday} /> : null
      })()}

      {/* プルリフレッシュインジケーター */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
          style={{ paddingTop: `${Math.min(pullDistance * 0.6, 16) + 8}px` }}>
          <div className="bg-sky-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
            {isRefreshing ? '更新中...' : pullDistance >= threshold ? '離して更新' : '引っ張って更新'}
          </div>
        </div>
      )}

      {/* 更新トースト */}
      {showRefreshToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0a1628] text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold">
          更新しました
        </div>
      )}

      {/* スポットリスト */}
      <main ref={scrollRef as React.RefObject<HTMLElement>} className="flex-1 p-4 space-y-2.5 overflow-auto pb-28">
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
              className="px-6 py-2 bg-sky-900 text-white rounded-full text-sm font-semibold"
            >
              再試行
            </button>
          </div>
        ) : allBad ? (
          <div className="flex flex-col items-center justify-center pt-12 pb-4 gap-3 text-center">
            <p className="text-lg font-bold text-[#0a1628]">{dateLabel}はどこも厳しいです</p>
            <p className="text-sm text-[#8899aa] px-8">のんびりリサーチデーにしましょう。</p>
            <div className="mt-2 space-y-2.5 w-full">
              {scores.map((score, i) => {
                const spot = SPOTS.find(s => s.id === score.spotId)!
                return (
                  <SpotCard key={score.spotId} spot={spot} score={score}
                    isFavorite={profile.favoriteSpots.includes(spot.id)}
                    condition={conditions[spot.id]}
                    date={targetDate}
                    isTop={i === 0}
                  />
                )
              })}
            </div>
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
      </main>

      <BottomNav current="forecast" />
    </div>
  )
}

function barColor(s: number): string {
  if (s >= 80) return '#0c4a6e'
  if (s >= 50) return '#0ea5e9'
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
        <p style={{ fontSize: 52, fontWeight: 700, color: '#0c4a6e', lineHeight: 1 }}>{avg}</p>
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
        <div key={i} className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-4 animate-pulse">
          <div className="w-14 h-14 bg-[#f0f4f8] rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f0f4f8] rounded w-1/3" />
            <div className="h-3 bg-[#f0f4f8] rounded w-2/3" />
          </div>
          <div className="w-10 h-8 bg-[#f0f4f8] rounded shrink-0" />
        </div>
      ))}
    </>
  )
}
