import type { SurfLog } from '@/types'

const STORAGE_KEY = 'wave_app_surf_logs'

export function getSurfLogs(): SurfLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SurfLog[]
  } catch {
    return []
  }
}

export function addSurfLog(log: Omit<SurfLog, 'id'>): SurfLog {
  const logs = getSurfLogs()
  const newLog: SurfLog = { ...log, id: String(Date.now()) }
  logs.unshift(newLog)  // 新しい順
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  return newLog
}

export function deleteSurfLog(id: string): void {
  const logs = getSurfLogs().filter(l => l.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
}

/** 年間の surf 日数（同日複数回でも1日としてカウント） */
export function countDaysInYear(logs: SurfLog[], year: number): number {
  const dates = new Set(logs.filter(l => l.date.startsWith(String(year))).map(l => l.date))
  return dates.size
}

/** 通算の surf 日数 */
export function countTotalDays(logs: SurfLog[]): number {
  return new Set(logs.map(l => l.date)).size
}
