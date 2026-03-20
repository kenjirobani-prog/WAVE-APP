'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/lib/userProfile'
import { SPOTS } from '@/data/spots'
import { calculateScore } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'

type DateTab = 'today' | 'tomorrow' | 'weekend'

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'オーバーヘッド'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸〜肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ以下'
}

export default function TopPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<SpotScore[]>([])
  const [conditions, setConditions] = useState<Record<string, WaveCondition | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DateTab>('today')
  const [summary, setSummary] = useState<{ waveAvg: number; windAvg: number; weather: string } | null>(null)

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
    loadForecast()
  }, [profile, tab])

  async function loadForecast() {
    setLoading(true)
    setError(null)
    try {
      const activeSpots = SPOTS.filter(s => s.isActive)
      const condMap: Record<string, WaveCondition | null> = {}

      await Promise.all(
        activeSpots.map(async spot => {
          try {
            const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const hourlyConditions: WaveCondition[] = data.conditions ?? []
            const noon = hourlyConditions.find(c => new Date(c.timestamp).getHours() === 12)
            condMap[spot.id] = noon ?? hourlyConditions[0] ?? null
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
        const waveAvg = validConds.reduce((s, c) => s + c.waveHeight, 0) / validConds.length
        const windAvg = validConds.reduce((s, c) => s + c.windSpeed, 0) / validConds.length
        const sunny = validConds.filter(c => c.weather === 'sunny').length
        setSummary({
          waveAvg: Math.round(waveAvg * 10) / 10,
          windAvg: Math.round(windAvg * 10) / 10,
          weather: sunny > validConds.length / 2 ? '晴れ' : '曇り',
        })
      }

      if (newScores.length === 0 && validConds.length === 0) {
        setError('波データを取得できませんでした。通信状況を確認して再試行してください。')
      }
    } catch {
      setError('データの取得に失敗しました。通信状況を確認して再試行してください。')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return null

  const tabs: { value: DateTab; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'tomorrow', label: '明日' },
    { value: 'weekend', label: '週末' },
  ]

  const allBad = !loading && !error && scores.length > 0 && scores.every(s => s.grade === '×')

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-4 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-4">湘南波予報</h1>
        {summary && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs opacity-80">波高</p>
              <p className="text-2xl font-bold">{summary.waveAvg}m</p>
              <p className="text-xs opacity-70">{waveHeightLabel(summary.waveAvg)}</p>
            </div>
            <div className="text-center border-x border-white/30">
              <p className="text-xs opacity-80">風速</p>
              <p className="text-2xl font-bold">{summary.windAvg}m/s</p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80">天気</p>
              <p className="text-2xl font-bold">{summary.weather}</p>
            </div>
          </div>
        )}
      </header>

      {/* タブ */}
      <div className="flex bg-white border-b border-slate-100 px-4">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* スポットリスト */}
      <main className="flex-1 p-4 space-y-3 overflow-auto pb-24">
        {loading ? (
          <SpotListSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-slate-500 text-sm text-center px-4">{error}</p>
            <button
              onClick={loadForecast}
              className="px-6 py-2 bg-sky-500 text-white rounded-full text-sm font-medium"
            >
              再試行
            </button>
          </div>
        ) : allBad ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="text-5xl">🌧️</div>
            <p className="text-lg font-bold text-slate-600">今日はどこも厳しいです</p>
            <p className="text-sm text-slate-400 px-8">コンディションが全スポットで× です。のんびりリサーチデーにしましょう。</p>
            <div className="mt-2 space-y-3 w-full">
              {scores.map(score => {
                const spot = SPOTS.find(s => s.id === score.spotId)!
                return (
                  <SpotCard
                    key={score.spotId}
                    spot={spot}
                    score={score}
                    isFavorite={profile.favoriteSpots.includes(spot.id)}
                    waveHeight={conditions[spot.id]?.waveHeight}
                  />
                )
              })}
            </div>
          </div>
        ) : (
          scores.map(score => {
            const spot = SPOTS.find(s => s.id === score.spotId)!
            return (
              <SpotCard
                key={score.spotId}
                spot={spot}
                score={score}
                isFavorite={profile.favoriteSpots.includes(spot.id)}
                waveHeight={conditions[spot.id]?.waveHeight}
              />
            )
          })
        )}
      </main>

      {/* ボトムナビ */}
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

function BottomNav({ current }: { current: 'forecast' | 'spots' | 'mypage' }) {
  const router = useRouter()
  const items = [
    { id: 'forecast', label: '波予報', icon: '🌊', href: '/' },
    { id: 'spots', label: 'スポット', icon: '📍', href: '/' },
    { id: 'mypage', label: 'マイページ', icon: '👤', href: '/onboarding' },
  ] as const

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 flex">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => router.push(item.href)}
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
            current === item.id ? 'text-sky-500' : 'text-slate-400'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
