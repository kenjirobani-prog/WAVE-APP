'use client'
import { useEffect, useState } from 'react'
import { SPOTS } from '@/data/spots'
import { calculateScore } from '@/lib/wave/scoring'
import { getSurfLogs, addSurfLog, deleteSurfLog, countDaysInYear, countTotalDays } from '@/lib/surfLog'
import { getUserProfile } from '@/lib/userProfile'
import type { SurfLog, Grade } from '@/types'
import type { Spot } from '@/types'
import BottomNav from '@/components/BottomNav'

const GRADE_COLOR: Record<Grade, string> = {
  '◎': 'bg-emerald-500 text-white',
  '○': 'bg-green-400 text-white',
  '△': 'bg-lime-300 text-slate-700',
  '×': 'bg-slate-200 text-slate-500',
}

const GRADE_DOT: Record<Grade, string> = {
  '◎': 'bg-emerald-500',
  '○': 'bg-green-400',
  '△': 'bg-lime-300',
  '×': 'bg-slate-300',
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// ---- スポット選択ダイアログ ----
function SpotSelectDialog({
  onSelect,
  onClose,
}: {
  onSelect: (spot: Spot, grade: Grade, score: number) => void
  onClose: () => void
}) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<Grade>('○')
  const [fetchedScore, setFetchedScore] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)
  const activeSpots = SPOTS.filter(s => s.isActive)

  async function handleSpotSelect(spot: Spot) {
    setSelectedSpot(spot)
    setFetchedScore(null)
    setFetching(true)
    try {
      const profile = getUserProfile()
      const today = toDateStr(new Date())
      const res = await fetch(`/api/forecast?spotId=${spot.id}&type=daily&date=${today}`)
      if (res.ok) {
        const data = await res.json()
        const conditions = data.conditions ?? []
        const noon = conditions.find((c: { timestamp: string }) => new Date(c.timestamp).getHours() === 12)
        const cond = noon ?? conditions[0]
        if (cond) {
          const sc = calculateScore(cond, spot, profile)
          setFetchedScore(sc.score)
          setSelectedGrade(sc.grade)
        }
      }
    } catch {
      // スコア取得失敗は無視
    } finally {
      setFetching(false)
    }
  }

  function handleConfirm() {
    if (!selectedSpot) return
    onSelect(selectedSpot, selectedGrade, fetchedScore ?? 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">スポットを選択</h2>
          <button onClick={onClose} className="p-2 text-slate-400">✕</button>
        </div>

        {/* スポット一覧 */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {activeSpots.map(spot => (
            <button
              key={spot.id}
              onClick={() => handleSpotSelect(spot)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedSpot?.id === spot.id
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <p className="font-medium text-slate-800">{spot.name}</p>
              <p className="text-xs text-slate-400">{spot.nameEn}</p>
            </button>
          ))}
        </div>

        {/* グレード選択＋確定 */}
        {selectedSpot && (
          <div className="p-4 border-t border-slate-100">
            {fetching ? (
              <p className="text-sm text-slate-400 text-center mb-3">スコアを取得中...</p>
            ) : fetchedScore !== null ? (
              <p className="text-sm text-slate-500 text-center mb-3">
                今日の{selectedSpot.name}: <span className="font-bold text-sky-600">{fetchedScore}点</span>
              </p>
            ) : null}
            <p className="text-xs text-slate-500 mb-2">今日の体感は？</p>
            <div className="flex gap-2 mb-4">
              {(['◎', '○', '△', '×'] as Grade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`flex-1 py-2 rounded-xl text-lg font-bold transition-colors ${
                    selectedGrade === g ? GRADE_COLOR[g] : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold text-base"
            >
              記録する
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- カレンダー ----
function MonthCalendar({
  year,
  month,
  logs,
}: {
  year: number
  month: number
  logs: SurfLog[]
}) {
  const logMap = new Map<string, Grade>()
  logs.forEach(l => {
    if (!logMap.has(l.date)) logMap.set(l.date, l.grade)
  })

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  // 6行になるよう末尾を埋める
  while (cells.length % 7 !== 0) cells.push(null)

  const DOW = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const grade = logMap.get(dateStr)
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 py-1">
              <span className="text-xs text-slate-600">{day}</span>
              {grade ? (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${GRADE_COLOR[grade]}`}>
                  {grade}
                </span>
              ) : (
                <span className="w-5 h-5" />
              )}
            </div>
          )
        })}
      </div>
      {/* 凡例 */}
      <div className="flex justify-center gap-4 mt-3">
        {(['◎', '○', '△'] as Grade[]).map(g => (
          <div key={g} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${GRADE_DOT[g]}`} />
            <span className="text-xs text-slate-500">{g}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- メインページ ----
export default function SurfLogPage() {
  const [logs, setLogs] = useState<SurfLog[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  useEffect(() => {
    setLogs(getSurfLogs())
  }, [])

  function handleRecordSurf(spot: Spot, grade: Grade, score: number) {
    const newLog = addSurfLog({
      date: toDateStr(new Date()),
      spotId: spot.id,
      spotName: spot.name,
      grade,
      score,
    })
    setLogs(prev => [newLog, ...prev])
    setShowDialog(false)
  }

  function handleDelete(id: string) {
    deleteSurfLog(id)
    setLogs(getSurfLogs())
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const daysThisYear = countDaysInYear(logs, today.getFullYear())
  const daysTotal = countTotalDays(logs)
  const recentLogs = logs.slice(0, 20)

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-4 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-4">サーフログ</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <p className="text-xs opacity-80">今年の日数</p>
            <p className="text-3xl font-bold">{daysThisYear}</p>
            <p className="text-xs opacity-70">日</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <p className="text-xs opacity-80">通算日数</p>
            <p className="text-3xl font-bold">{daysTotal}</p>
            <p className="text-xs opacity-70">日</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28 space-y-4">
        {/* 記録ボタン */}
        <div className="px-4 pt-4">
          <button
            onClick={() => setShowDialog(true)}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-lg font-bold shadow-md active:scale-[0.98] transition-transform"
          >
            今日サーフィンした！
          </button>
        </div>

        {/* カレンダー */}
        <section className="bg-white mx-4 rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-base font-bold text-slate-700">
              {calYear}年{calMonth + 1}月
            </h2>
            <button onClick={nextMonth} className="p-2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <MonthCalendar year={calYear} month={calMonth} logs={logs} />
        </section>

        {/* 最近のログ */}
        <section className="mx-4">
          <h2 className="text-sm font-bold text-slate-500 mb-3">最近のログ</h2>
          {recentLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <p className="text-slate-400 text-sm">まだ記録がありません</p>
              <p className="text-slate-300 text-xs mt-1">サーフィン後に記録してみよう！</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => {
                const d = new Date(`${log.date}T12:00:00+09:00`)
                const DOW = ['日', '月', '火', '水', '木', '金', '土']
                const label = `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3"
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${GRADE_COLOR[log.grade]}`}>
                      {log.grade}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{log.spotName}</p>
                      <p className="text-xs text-slate-400">{label} · {log.score}点</p>
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2 text-slate-300 active:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {showDialog && (
        <SpotSelectDialog
          onSelect={handleRecordSurf}
          onClose={() => setShowDialog(false)}
        />
      )}

      <BottomNav current="surflog" />
    </div>
  )
}
