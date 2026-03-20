'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { getUserProfile } from '@/lib/userProfile'
import { calculateScore } from '@/lib/wave/scoring'
import { classifyWind } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore, Report } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import ScoreGrade, { gradeLabel } from '@/components/ScoreGrade'
import ForecastChart from '@/components/ForecastChart'
import TideBar from '@/components/TideBar'
import ReportList from '@/components/ReportList'

interface Props {
  params: Promise<{ id: string }>
}

export default function SpotDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const spot = SPOTS.find(s => s.id === id)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [current, setCurrent] = useState<WaveCondition | null>(null)
  const [hourly, setHourly] = useState<WaveCondition[]>([])
  const [score, setScore] = useState<SpotScore | null>(null)
  const [loading, setLoading] = useState(true)

  // Phase 1ではレポートはモックデータ
  const mockReports: Report[] = []

  useEffect(() => {
    const p = getUserProfile()
    setProfile(p)
  }, [])

  useEffect(() => {
    if (!profile || !spot) return
    loadData()
  }, [profile, spot])

  async function loadData() {
    if (!spot || !profile) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily`)
      const data = await res.json()
      const conditions: WaveCondition[] = data.conditions ?? []
      setHourly(conditions)

      const nowHour = new Date().getHours()
      const closest = conditions.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.timestamp).getHours() - nowHour)
        const currDiff = Math.abs(new Date(curr.timestamp).getHours() - nowHour)
        return currDiff < prevDiff ? curr : prev
      }, conditions[0])

      if (closest) {
        setCurrent(closest)
        setScore(calculateScore(closest, spot, profile))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!spot) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">スポットが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{spot.name}</h1>
          <p className="text-xs text-slate-500">{spot.nameEn}</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">データを取得中...</p>
          </div>
        ) : (
          <>
            {/* グレード＋おすすめ理由 */}
            <section className="bg-white p-6 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                {score && <ScoreGrade grade={score.grade} size="lg" />}
                <div>
                  <p className="font-bold text-slate-700 text-lg">
                    {score ? gradeLabel(score.grade) : '—'}
                  </p>
                  <p className="text-sm text-slate-500">スコア: {score?.score ?? '—'} / 100</p>
                </div>
              </div>
              {score && (
                <div className="flex flex-wrap gap-2">
                  {score.reasonTags.map(tag => (
                    <span key={tag} className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 現在の4指標 */}
            {current && (
              <section className="bg-white mt-2 p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 mb-3">現在の状況</h2>
                <div className="grid grid-cols-2 gap-3">
                  <ConditionCard
                    label="波の高さ"
                    value={`${current.waveHeight.toFixed(1)}m`}
                    sub={waveHeightLabel(current.waveHeight)}
                    icon="🌊"
                  />
                  <ConditionCard
                    label="風"
                    value={`${current.windSpeed.toFixed(1)}m/s`}
                    sub={classifyWind(current.windDir, spot.bestSwellDir) === 'offshore' ? 'オフショア' :
                         classifyWind(current.windDir, spot.bestSwellDir) === 'side-offshore' ? 'サイドオフ' :
                         classifyWind(current.windDir, spot.bestSwellDir) === 'side' ? 'サイド' : 'オンショア'}
                    icon="💨"
                  />
                  <ConditionCard
                    label="うねり方向"
                    value={`${current.swellDir}°`}
                    sub={swellDirLabel(current.swellDir, spot.bestSwellDir)}
                    icon="🧭"
                  />
                  <ConditionCard
                    label="周期"
                    value={`${current.wavePeriod.toFixed(0)}秒`}
                    sub={current.wavePeriod >= 10 ? 'うねりあり' : 'うねりなし'}
                    icon="⏱"
                  />
                </div>
              </section>
            )}

            {/* 1時間ごと予報チャート */}
            {hourly.length > 0 && profile && (
              <section className="bg-white mt-2 p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 mb-3">1時間ごと予報</h2>
                <ForecastChart conditions={hourly} profile={profile} spotFacing={spot.bestSwellDir} />
                <div className="flex gap-4 mt-3 text-xs text-slate-400">
                  <span><span className="inline-block w-3 h-3 bg-emerald-400 rounded-sm mr-1" />好みサイズ</span>
                  <span><span className="inline-block w-3 h-3 bg-blue-400 rounded-sm mr-1" />やや小さめ</span>
                  <span><span className="inline-block w-3 h-3 bg-sky-200 rounded-sm mr-1" />小さい</span>
                </div>
              </section>
            )}

            {/* 潮位バー */}
            {current && (
              <section className="bg-white mt-2 p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 mb-3">潮位</h2>
                <TideBar
                  tideHeight={current.tideHeight}
                  tideMovement={current.tideMovement}
                />
              </section>
            )}

            {/* スポット情報 */}
            <section className="bg-white mt-2 p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-500 mb-3">スポット情報</h2>
              <p className="text-sm text-slate-600 mb-3">{spot.waveCharacter}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-lg block">🅿️</span>
                  <span className="text-slate-600">{spot.parking === 'free' ? '無料' : spot.parking === 'paid' ? '有料' : 'なし'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-lg block">🚿</span>
                  <span className="text-slate-600">{spot.shower ? 'あり' : 'なし'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-lg block">🔰</span>
                  <span className="text-slate-600">{'⭐'.repeat(spot.beginnerScore)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{spot.access}</p>
            </section>

            {/* コミュニティレポート */}
            <section className="bg-white mt-2 p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-slate-500">コミュニティレポート</h2>
                <button className="text-xs text-sky-500 font-medium">
                  今日のレポートを書く
                </button>
              </div>
              <ReportList reports={mockReports} spotId={spot.id} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function ConditionCard({
  label, value, sub, icon
}: {
  label: string; value: string; sub: string; icon: string
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

function waveHeightLabel(h: number): string {
  if (h >= 2.0) return 'オーバーヘッド'
  if (h >= 1.5) return '頭'
  if (h >= 0.8) return '胸〜肩'
  if (h >= 0.5) return '腰'
  return 'ヒザ以下'
}

function swellDirLabel(swellDir: number, bestDir: number): string {
  const diff = Math.abs(((swellDir - bestDir + 540) % 360) - 180)
  if (diff <= 30) return '正面'
  if (diff <= 60) return '斜め'
  return '外れ'
}
