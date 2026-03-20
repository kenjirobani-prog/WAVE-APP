'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/lib/userProfile'
import { SPOTS } from '@/data/spots'
import { calculateScore, classifyWind, windTypeLabel } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore, WindType } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import BottomNav from '@/components/BottomNav'

type DateTab = 'today' | 'tomorrow' | 'weekend'

// ---- 日付ユーティリティ ----

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const DOW_LABELS = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)']

function getUpcomingWeekend(): { sat: Date; sun: Date } {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow = today.getDay()
  // 0=Sun: 次の土曜まで6日, 6=Sat: 0日, それ以外: (6-dow)日
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

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'オーバーヘッド'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸〜肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ以下'
}

// ベクトル平均で風向き計算
function avgWindDir(conds: WaveCondition[]): number {
  const sinSum = conds.reduce((s, c) => s + Math.sin((c.windDir * Math.PI) / 180), 0)
  const cosSum = conds.reduce((s, c) => s + Math.cos((c.windDir * Math.PI) / 180), 0)
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360
}

// ----

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

  const { sat, sun } = getUpcomingWeekend()

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
            // 正午(12時)を代表値に
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
        setError('波データを取得できませんでした。通信状況を確認して再試行してください。')
      }
    } catch {
      setError('データの取得に失敗しました。通信状況を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return null

  const targetDate = getTargetDate(tab, weekendDay)
  const allBad = !loading && !error && scores.length > 0 && scores.every(s => s.grade === '×')

  const dateLabel =
    tab === 'today' ? '今日' :
    tab === 'tomorrow' ? '明日' :
    weekendDay === 'sat' ? `${formatMD(sat)}(土)` : `${formatMD(sun)}(日)`

  // タブ行：今日・明日は1行、週末は2行（日付入り）
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-4 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-4">湘南波予報</h1>
        {summary && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs opacity-80">波高</p>
              <p className="text-xl font-bold">{summary.waveAvg}m</p>
              <p className="text-[11px] opacity-70">{waveHeightLabel(summary.waveAvg)}</p>
            </div>
            <div className="text-center border-x border-white/30">
              <p className="text-xs opacity-80">風</p>
              <p className="text-sm font-bold leading-tight">{windTypeLabel(summary.windType)}</p>
              <p className="text-[11px] opacity-80">{summary.windAvg}m/s</p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80">天気</p>
              <p className="text-xl font-bold">{summary.weather}</p>
            </div>
          </div>
        )}
      </header>

      {/* 日付タブ */}
      <div className="flex bg-white border-b border-slate-100 px-4">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'today' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400'
          }`}
        >
          今日 {formatMD(today)}
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tomorrow' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400'
          }`}
        >
          明日 {formatMD(tomorrow)}
        </button>
        <button
          onClick={() => setTab('weekend')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors leading-tight ${
            tab === 'weekend' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400'
          }`}
        >
          週末
          <span className="block text-[10px] opacity-70">
            {formatMD(sat)}{DOW_LABELS[6]}・{formatMD(sun)}{DOW_LABELS[0]}
          </span>
        </button>
      </div>

      {/* 週末サブタブ */}
      {tab === 'weekend' && (
        <div className="flex bg-slate-50 border-b border-slate-100 px-4 gap-2 py-2">
          <button
            onClick={() => setWeekendDay('sat')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              weekendDay === 'sat' ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            土 {formatMD(sat)}
          </button>
          <button
            onClick={() => setWeekendDay('sun')}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              weekendDay === 'sun' ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            日 {formatMD(sun)}
          </button>
        </div>
      )}

      {/* スポットリスト */}
      <main className="flex-1 p-4 space-y-3 overflow-auto pb-24">
        {loading ? (
          <SpotListSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-slate-500 text-sm text-center px-4">{error}</p>
            <button
              onClick={() => loadForecast(targetDate)}
              className="px-6 py-2 bg-sky-500 text-white rounded-full text-sm font-medium"
            >
              再試行
            </button>
          </div>
        ) : allBad ? (
          <div className="flex flex-col items-center justify-center pt-12 pb-4 gap-3 text-center">
            <p className="text-lg font-bold text-slate-600">{dateLabel}はどこも厳しいです</p>
            <p className="text-sm text-slate-400 px-8">のんびりリサーチデーにしましょう。</p>
            <div className="mt-2 space-y-3 w-full">
              {scores.map(score => {
                const spot = SPOTS.find(s => s.id === score.spotId)!
                return (
                  <SpotCard key={score.spotId} spot={spot} score={score}
                    isFavorite={profile.favoriteSpots.includes(spot.id)}
                    waveHeight={conditions[spot.id]?.waveHeight}
                    date={targetDate}
                  />
                )
              })}
            </div>
          </div>
        ) : (
          scores.map(score => {
            const spot = SPOTS.find(s => s.id === score.spotId)!
            return (
              <SpotCard key={score.spotId} spot={spot} score={score}
                isFavorite={profile.favoriteSpots.includes(spot.id)}
                waveHeight={conditions[spot.id]?.waveHeight}
                date={targetDate}
              />
            )
          })
        )}
      </main>

      <BottomNav current="forecast" />
    </div>
  )
}

function SpotListSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 animate-pulse">
          <div className="w-14 h-14 bg-slate-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-100 rounded-full w-16" />
              <div className="h-5 bg-slate-100 rounded-full w-16" />
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded shrink-0" />
        </div>
      ))}
    </>
  )
}
