'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/lib/userProfile'
import { SPOTS } from '@/data/spots'
import { calculateScore, classifyWind, windTypeLabel } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore, WindType } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import BottomNav from '@/components/BottomNav'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

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

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'オーバーヘッド'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸〜肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ以下'
}

function avgWindDir(conds: WaveCondition[]): number {
  const sinSum = conds.reduce((s, c) => s + Math.sin((c.windDir * Math.PI) / 180), 0)
  const cosSum = conds.reduce((s, c) => s + Math.cos((c.windDir * Math.PI) / 180), 0)
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360
}

interface Summary {
  waveAvg: number
  windAvg: number
  windType: WindType
  weather: string
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
  const [summary, setSummary] = useState<Summary | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showRefreshToast, setShowRefreshToast] = useState(false)

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

      const validConds = Object.values(condMap).filter((c): c is WaveCondition => c !== null)
      if (validConds.length > 0) {
        const waveAvg = Math.round(validConds.reduce((s, c) => s + c.waveHeight, 0) / validConds.length * 10) / 10
        const windAvg = Math.round(validConds.reduce((s, c) => s + c.windSpeed, 0) / validConds.length * 10) / 10
        const avgDir = avgWindDir(validConds)
        const sunny = validConds.filter(c => c.weather === 'sunny').length
        setSummary({
          waveAvg,
          windAvg,
          windType: classifyWind(avgDir, windAvg),
          weather: sunny > validConds.length / 2 ? '晴れ' : '曇り',
        })
      }

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
          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full tracking-widest uppercase">
            {DOW_ENG[today.getDay()]} · {today.getMonth() + 1}/{today.getDate()}
          </span>
        </div>
      </header>

      {/* サマリーストリップ */}
      {summary && (
        <div className="bg-sky-50 border-b border-sky-100 px-4 pt-2 pb-3">
          {lastUpdated && (
            <p className="text-right text-[10px] text-sky-600 mb-1.5">{formatTime(lastUpdated)}</p>
          )}
          <div className="grid grid-cols-3">
            <div className="text-center pr-3 border-r border-sky-100">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-700 mb-0.5">波高</p>
              <p className="text-lg font-bold text-sky-900">{summary.waveAvg}m</p>
              <p className="text-[10px] text-sky-700">{waveHeightLabel(summary.waveAvg)}</p>
            </div>
            <div className="text-center px-3 border-r border-sky-100">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-700 mb-0.5">風</p>
              <p className="text-sm font-bold text-sky-900">{windTypeLabel(summary.windType)}</p>
              <p className="text-[10px] text-sky-700">{summary.windAvg}m/s</p>
            </div>
            <div className="text-center pl-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-700 mb-0.5">天気</p>
              <p className="text-lg font-bold text-sky-900">{summary.weather}</p>
            </div>
          </div>
        </div>
      )}

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
                    waveHeight={conditions[spot.id]?.waveHeight}

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
                waveHeight={conditions[spot.id]?.waveHeight}
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
