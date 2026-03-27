'use client'
import { useEffect, useRef, useState } from 'react'
import { SPOTS } from '@/data/spots'
import { calculateScore } from '@/lib/wave/scoring'
import {
  subscribeSurfLogs,
  saveSurfLog,
  deleteSurfLog,
  migrateLocalStorageToFirestore,
  saveLocalSurfLog,
  getLocalSurfLogs,
  countDaysInYear,
  countTotalDays,
} from '@/lib/surfLog'
import { getUserProfile } from '@/lib/userProfile'
import type { SurfLog, Grade } from '@/types'
import type { Spot } from '@/types'
import BottomNav from '@/components/BottomNav'

const GRADE_BG: Record<Grade, string> = {
  '◎': 'bg-[#0284c7] text-white',
  '○': 'bg-sky-700 text-white',
  '△': 'bg-slate-200 text-slate-600',
  '×': 'bg-red-100 text-red-400',
}

const GRADE_DOT: Record<Grade, string> = {
  '◎': 'bg-[#0284c7]',
  '○': 'bg-sky-700',
  '△': 'bg-slate-300',
  '×': 'bg-red-200',
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

// ---- スケルトンUI ----
function SkeletonLog() {
  return (
    <div className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/5" />
        <div className="h-3 bg-slate-100 rounded w-2/5" />
      </div>
    </div>
  )
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
        <div className="px-6 pt-6 pb-4 border-b border-[#eef1f4] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0a1628]">スポットを選択</h2>
          <button onClick={onClose} className="p-2 text-[#8899aa] text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {activeSpots.map(spot => (
            <button
              key={spot.id}
              onClick={() => handleSpotSelect(spot)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                selectedSpot?.id === spot.id
                  ? 'border-[#0284c7] bg-sky-50'
                  : 'border-[#eef1f4] bg-white'
              }`}
            >
              <p className="font-semibold text-[#0a1628]">{spot.name}</p>
              <p className="text-xs text-[#8899aa]">{spot.nameEn}</p>
            </button>
          ))}
        </div>

        {selectedSpot && (
          <div className="p-4 border-t border-[#eef1f4]">
            {fetching ? (
              <p className="text-sm text-[#8899aa] text-center mb-3">スコアを取得中...</p>
            ) : fetchedScore !== null ? (
              <p className="text-sm text-[#8899aa] text-center mb-3">
                今日の{selectedSpot.name}: <span className="font-bold text-sky-700">{fetchedScore}点</span>
              </p>
            ) : null}
            <p className="text-xs text-[#8899aa] font-semibold uppercase tracking-wide mb-2">今日の体感は？</p>
            <div className="flex gap-2 mb-4">
              {(['◎', '○', '△', '×'] as Grade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`flex-1 py-2 rounded-xl text-lg font-bold transition-colors ${
                    selectedGrade === g ? GRADE_BG[g] : 'bg-[#f0f9ff] text-[#8899aa]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              onClick={() => { try { navigator.vibrate(20) } catch {}; handleConfirm() }}
              className="w-full py-3 bg-[#0284c7] text-white rounded-xl font-bold text-base"
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
function MonthCalendar({ year, month, logs }: { year: number; month: number; logs: SurfLog[] }) {
  const logMap = new Map<string, Grade>()
  logs.forEach(l => { if (!logMap.has(l.date)) logMap.set(l.date, l.grade) })

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const DOW = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#8899aa] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const grade = logMap.get(dateStr)
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 py-1">
              <span className="text-xs text-[#0a1628]">{day}</span>
              {grade ? (
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${GRADE_BG[grade]}`}>
                  {grade}
                </span>
              ) : (
                <span className="w-5 h-5" />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-center gap-4 mt-3">
        {(['◎', '○', '△'] as Grade[]).map(g => (
          <div key={g} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${GRADE_DOT[g]}`} />
            <span className="text-xs text-[#8899aa]">{g}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- メインページ ----
export default function SurfLogPage() {
  const [logs, setLogs] = useState<SurfLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // オフライン時は localStorage にフォールバック
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLogs(getLocalSurfLogs())
        setLoading(false)
        return
      }

      try {
        // localStorage → Firestore 移行（初回のみ実行される）
        await migrateLocalStorageToFirestore()

        const unsub = await subscribeSurfLogs(
          (firestoreLogs) => {
            if (!cancelled) {
              setLogs(firestoreLogs)
              setLoading(false)
            }
          },
          () => {
            // Firestore エラー時は localStorage にフォールバック
            if (!cancelled) {
              setLogs(getLocalSurfLogs())
              setLoading(false)
            }
          },
        )

        if (cancelled) {
          unsub()
        } else {
          unsubscribeRef.current = unsub
        }
      } catch {
        if (!cancelled) {
          setLogs(getLocalSurfLogs())
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
  }, [])

  async function handleRecordSurf(spot: Spot, grade: Grade, score: number) {
    const logData = {
      date: toDateStr(new Date()),
      spotId: spot.id,
      spotName: spot.name,
      grade,
      score,
    }

    try { navigator.vibrate([10, 50, 20]) } catch {}

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine

    if (isOnline) {
      try {
        await saveSurfLog(logData)
        // onSnapshot が自動でlogsを更新するため手動更新不要
      } catch {
        const newLog = saveLocalSurfLog(logData)
        setLogs(prev => [newLog, ...prev])
      }
    } else {
      const newLog = saveLocalSurfLog(logData)
      setLogs(prev => [newLog, ...prev])
    }

    setShowDialog(false)
  }

  async function handleDelete(id: string) {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine

    if (isOnline) {
      try {
        await deleteSurfLog(id)
        // onSnapshot が自動でlogsを更新するため手動更新不要
      } catch {
        setLogs(prev => prev.filter(l => l.id !== id))
      }
    } else {
      setLogs(prev => prev.filter(l => l.id !== id))
    }
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
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header className="bg-white px-4 pt-10 pb-5 border-b border-[#eef1f4]">
        <h1 className="text-xl font-bold tracking-tight text-[#0a1628] mb-4">Surf Log</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-700 mb-1">今年の日数</p>
            {loading ? (
              <div className="h-9 flex items-center justify-center">
                <div className="w-12 h-7 bg-sky-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-sky-900">{daysThisYear}</p>
                <p className="text-xs text-sky-700">日</p>
              </>
            )}
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-700 mb-1">通算日数</p>
            {loading ? (
              <div className="h-9 flex items-center justify-center">
                <div className="w-12 h-7 bg-sky-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-sky-900">{daysTotal}</p>
                <p className="text-xs text-sky-700">日</p>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-28 space-y-4">
        {/* 記録ボタン */}
        <div className="px-4 pt-4">
          <button
            onClick={() => { try { navigator.vibrate(20) } catch {}; setShowDialog(true) }}
            className="w-full py-4 bg-[#0284c7] text-white rounded-xl text-base font-bold active:scale-[0.98] transition-transform"
          >
            今日サーフィンした！
          </button>
        </div>

        {/* カレンダー */}
        <section className="bg-white mx-4 rounded-xl p-4 border border-[#eef1f4]">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-[#8899aa]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-sm font-bold text-[#0a1628]">{calYear}年{calMonth + 1}月</h2>
            <button onClick={nextMonth} className="p-2 text-[#8899aa]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <MonthCalendar year={calYear} month={calMonth} logs={logs} />
        </section>

        {/* 最近のログ */}
        <section className="mx-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">最近のログ</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <SkeletonLog key={i} />)}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-[#eef1f4]">
              <p className="text-[#0a1628] font-semibold text-base mb-1">まだ記録がありません</p>
              <p className="text-[#8899aa] text-sm mb-5">サーフィン後に記録して、自分のサーフ履歴を作ろう！</p>
              <button
                onClick={() => { try { navigator.vibrate(20) } catch {}; setShowDialog(true) }}
                className="px-6 py-3 bg-[#0284c7] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
              >
                今日のサーフを記録する
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => {
                const d = new Date(`${log.date}T12:00:00+09:00`)
                const DOW = ['日', '月', '火', '水', '木', '金', '土']
                const label = `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`
                return (
                  <div key={log.id} className="bg-white rounded-xl border border-[#eef1f4] p-4 flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${GRADE_BG[log.grade]}`}>
                      {log.grade}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0a1628]">{log.spotName}</p>
                      <p className="text-xs text-[#8899aa]">{label} · {log.score}点</p>
                    </div>
                    <button onClick={() => handleDelete(log.id)} className="p-2 text-[#dde3ea] active:text-red-400">
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
        <SpotSelectDialog onSelect={handleRecordSurf} onClose={() => setShowDialog(false)} />
      )}

      <BottomNav current="surflog" />
    </div>
  )
}
