'use client'
import { useEffect, useState } from 'react'
import { SPOTS } from '@/data/spots'
import { calculateScore } from '@/lib/wave/scoring'
import { getUserProfile } from '@/lib/userProfile'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import { getLatestScheduleHour, padHour } from '@/lib/commentSchedules'
import type { UserProfile, SpotScore } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import SpotCard from '@/components/SpotCard'
import AreaTabs from '@/components/AreaTabs'
import BottomNav from '@/components/BottomNav'

function AvgScore({ scores }: { scores: SpotScore[] }) {
  const avg = scores.length > 0 ? Math.floor(scores.reduce((s, sc) => s + sc.score, 0) / scores.length) : 0
  return (
    <div style={{ background: '#f8fafc', border: '0.5px solid #eef1f4', borderRadius: 14, padding: '.85rem 1rem' }} className="flex gap-4">
      <div className="flex flex-col justify-center shrink-0">
        <p className="font-semibold uppercase tracking-widest text-[#94a3b8] mb-1" style={{ fontSize: 10 }}>千葉北 avg score</p>
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<SpotScore[]>([])
  const [conditions, setConditions] = useState<Record<string, WaveCondition | null>>({})
  const [loading, setLoading] = useState(true)
  const [dailyComment, setDailyComment] = useState<string | null>(null)

  const today = new Date(); today.setHours(12, 0, 0, 0)
  function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

  useEffect(() => {
    setProfile(getUserProfile())
    const jstHour = (new Date().getUTCHours() + 9) % 24
    const scheduleHour = getLatestScheduleHour('today', jstHour)
    if (scheduleHour !== null) {
      fetch(`/api/daily-comment?target=today&hour=${padHour(scheduleHour)}&areaLabel=千葉北&spotName=一宮`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.comment) setDailyComment(data.comment) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!profile) return
    const dateStr = toDateStr(today)
    const activeSpots = SPOTS.filter(s => s.isActive && s.area === 'chiba-north')
    setLoading(true)

    Promise.all(activeSpots.map(async spot => {
      try {
        const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${dateStr}`)
        if (!res.ok) return { spotId: spot.id, cond: null }
        const data = await res.json()
        const hourly: WaveCondition[] = data.conditions ?? []
        const displayHour = getLatestUpdateHour()
        const target = hourly.find(c => { const h = (new Date(c.timestamp).getUTCHours() + 9) % 24; return h === displayHour }) ?? hourly[0]
        return { spotId: spot.id, cond: target ?? null }
      } catch { return { spotId: spot.id, cond: null } }
    })).then(results => {
      const condMap: Record<string, WaveCondition | null> = {}
      results.forEach(r => { condMap[r.spotId] = r.cond })
      setConditions(condMap)

      const newScores = activeSpots
        .map(spot => { const c = condMap[spot.id]; if (!c) return null; return calculateScore(c, spot, profile) })
        .filter((s): s is SpotScore => s !== null)
        .sort((a, b) => b.score - a.score)
      setScores(newScores)
      setLoading(false)
    })
  }, [profile])

  if (!profile) return null

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header className="header-gradient" style={{ padding: '16px 1rem 1rem', color: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', marginTop: 4 }}>千葉北エリア</div>
      </header>

      <AreaTabs />

      <main className="flex-1 p-4 space-y-2.5 overflow-auto pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-16"><p className="text-[#8899aa] text-sm">読み込み中...</p></div>
        ) : (
          <>
            {dailyComment && (
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', marginBottom: 8 }}>AI今日の予報</div>
                <p style={{ fontSize: 14, color: '#4a6fa5', lineHeight: 1.7, margin: 0 }}>{dailyComment}</p>
              </div>
            )}
            {scores.length > 0 && <AvgScore scores={scores} />}
            {scores.map(score => {
              const spot = SPOTS.find(s => s.id === score.spotId)!
              return <SpotCard key={score.spotId} spot={spot} score={score} isFavorite={profile.favoriteSpots.includes(spot.id)} condition={conditions[spot.id]} date={today} isTop={false} />
            })}
            {scores.length === 0 && <p className="text-center text-[#8899aa] py-16">データがありません</p>}
          </>
        )}
      </main>

      <BottomNav current="forecast" />
    </div>
  )
}
