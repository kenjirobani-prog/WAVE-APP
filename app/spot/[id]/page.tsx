'use client'
import { use, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { getUserProfile } from '@/lib/userProfile'
import { calculateScore, classifyWind, windTypeLabel, compassLabel } from '@/lib/wave/scoring'
import type { UserProfile, SpotScore, Report } from '@/types'
import type { WaveCondition } from '@/lib/wave/types'
import ScoreGrade, { gradeLabel } from '@/components/ScoreGrade'
import ForecastChart from '@/components/ForecastChart'
import TideBar from '@/components/TideBar'
import ReportList from '@/components/ReportList'
import BottomNav from '@/components/BottomNav'

interface Props {
  params: Promise<{ id: string }>
}

function SpotDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date') // YYYY-MM-DD or null
  const spot = SPOTS.find(s => s.id === id)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [current, setCurrent] = useState<WaveCondition | null>(null)
  const [hourly, setHourly] = useState<WaveCondition[]>([])
  const [score, setScore] = useState<SpotScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Phase 1ではレポートはモックデータ
  const mockReports: Report[] = []

  useEffect(() => {
    const p = getUserProfile()
    setProfile(p)
  }, [])

  useEffect(() => {
    if (!profile || !spot) return
    loadData()
  }, [profile, spot, dateParam])

  async function loadData() {
    if (!spot || !profile) return
    setLoading(true)
    setError(null)
    try {
      const dateQuery = dateParam ? `&date=${dateParam}` : ''
      const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily${dateQuery}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const conditions: WaveCondition[] = data.conditions ?? []
      setHourly(conditions)

      if (conditions.length === 0) throw new Error('No data')

      // 正午(12時)を代表値に、なければ最近の時間
      const noon = conditions.find(c => new Date(c.timestamp).getHours() === 12)
      const representative = noon ?? conditions[Math.floor(conditions.length / 2)] ?? conditions[0]

      if (representative) {
        setCurrent(representative)
        setScore(calculateScore(representative, spot, profile))
      }
    } catch {
      setError('データの取得に失敗しました。通信状況を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  // 日付ラベル
  const dateLabel = dateParam
    ? (() => {
        const d = new Date(`${dateParam}T12:00:00+09:00`)
        return `${d.getMonth() + 1}/${d.getDate()} の状況`
      })()
    : '現在の状況'

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

      <main className="flex-1 overflow-auto pb-24">
        {loading ? (
          <SpotDetailSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-slate-500 text-sm text-center px-4">{error}</p>
            <button
              onClick={loadData}
              className="px-6 py-2 bg-sky-500 text-white rounded-full text-sm font-medium"
            >
              再試行
            </button>
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
                <h2 className="text-sm font-bold text-slate-500 mb-3">{dateLabel}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <ConditionCard
                    label="波の高さ"
                    value={`${current.waveHeight.toFixed(1)}m`}
                    sub={waveHeightLabel(current.waveHeight)}
                  />
                  <ConditionCard
                    label="風"
                    value={`${current.windSpeed.toFixed(1)}m/s`}
                    sub={`${windTypeLabel(classifyWind(current.windDir, current.windSpeed))} (${compassLabel(current.windDir)})`}
                  />
                  <ConditionCard
                    label="うねり方向"
                    value={`${current.swellDir}°`}
                    sub={swellDirLabel(current.swellDir, spot.bestSwellDir)}
                  />
                  <ConditionCard
                    label="周期"
                    value={`${current.wavePeriod.toFixed(0)}秒`}
                    sub={current.wavePeriod >= 10 ? 'うねりあり' : 'うねりなし'}
                  />
                </div>
              </section>
            )}

            {/* 1時間ごと予報チャート */}
            {hourly.length > 0 && profile && (
              <section className="bg-white mt-2 p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 mb-3">1時間ごと予報</h2>
                <ForecastChart conditions={hourly} profile={profile} />
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
                  <span className="text-slate-500 block text-[10px] mb-1">駐車場</span>
                  <span className="text-slate-700 font-medium">{spot.parking === 'free' ? '無料' : spot.parking === 'paid' ? '有料' : 'なし'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-slate-500 block text-[10px] mb-1">シャワー</span>
                  <span className="text-slate-700 font-medium">{spot.shower ? 'あり' : 'なし'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-slate-500 block text-[10px] mb-1">初心者</span>
                  <span className="text-slate-700 font-medium">{'★'.repeat(spot.beginnerScore)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{spot.access}</p>

              {/* ライブカメラボタン */}
              {spot.liveCameraUrl && (
                <a
                  href={spot.liveCameraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-sky-50 border border-sky-200 text-sky-600 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  ライブカメラを見る
                  <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
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

      <BottomNav current="forecast" />
    </div>
  )
}

export default function SpotDetailPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense fallback={<SpotDetailSkeleton />}>
      <SpotDetailContent id={id} />
    </Suspense>
  )
}

function SpotDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* グレード */}
      <section className="bg-white p-6 border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 bg-slate-100 rounded-full w-20" />
          <div className="h-7 bg-slate-100 rounded-full w-16" />
        </div>
      </section>
      {/* 指標 */}
      <section className="bg-white mt-2 p-4 border-b border-slate-100">
        <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-16" />
              <div className="h-6 bg-slate-200 rounded w-12" />
              <div className="h-3 bg-slate-100 rounded w-10" />
            </div>
          ))}
        </div>
      </section>
      {/* チャート */}
      <section className="bg-white mt-2 p-4 border-b border-slate-100">
        <div className="h-4 bg-slate-100 rounded w-28 mb-3" />
        <div className="h-24 bg-slate-100 rounded" />
      </section>
    </div>
  )
}

function ConditionCard({
  label, value, sub
}: {
  label: string; value: string; sub: string
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
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
