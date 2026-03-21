import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from './firebase'
import type { SurfLog, Grade } from '@/types'

const STORAGE_KEY = 'wave_app_surf_logs'

// ---- localStorage ユーティリティ ----

function getLocalLogs(): SurfLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SurfLog[]
  } catch {
    return []
  }
}

export function getLocalSurfLogs(): SurfLog[] {
  return getLocalLogs()
}

export function saveLocalSurfLog(log: Omit<SurfLog, 'id'>): SurfLog {
  const logs = getLocalLogs()
  const newLog: SurfLog = { ...log, id: String(Date.now()) }
  logs.unshift(newLog)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  return newLog
}

// ---- Firestore ユーティリティ ----

function surfLogCol(uid: string) {
  return collection(db, `users/${uid}/surfLogs`)
}

// Firestoreに保存
export async function saveSurfLog(log: Omit<SurfLog, 'id'>): Promise<SurfLog> {
  const uid = await ensureAnonymousAuth()
  const docRef = await addDoc(surfLogCol(uid), {
    ...log,
    createdAt: serverTimestamp(),
  })
  return { ...log, id: docRef.id }
}

// Firestoreからリアルタイム購読。unsubscribe関数を返す
export async function subscribeSurfLogs(
  callback: (logs: SurfLog[]) => void,
  onError?: (err: Error) => void,
): Promise<() => void> {
  const uid = await ensureAnonymousAuth()
  const q = query(surfLogCol(uid), orderBy('createdAt', 'desc'))

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          date: data.date as string,
          spotId: data.spotId as string,
          spotName: data.spotName as string,
          grade: data.grade as Grade,
          score: data.score as number,
        }
      })
      callback(logs)
    },
    (err) => onError?.(err),
  )

  return unsubscribe
}

// Firestoreから削除
export async function deleteSurfLog(id: string): Promise<void> {
  const uid = await ensureAnonymousAuth()
  await deleteDoc(doc(db, `users/${uid}/surfLogs/${id}`))
}

// ---- localStorage → Firestore 移行 ----

export async function migrateLocalStorageToFirestore(): Promise<void> {
  const localLogs = getLocalLogs()
  if (localLogs.length === 0) return

  const uid = await ensureAnonymousAuth()
  const col = surfLogCol(uid)

  // Firestoreにすでにデータがあれば移行しない（重複防止）
  const existing = await getDocs(col)
  if (!existing.empty) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  // 古い順に追加して createdAt の並び順を保つ
  for (const log of [...localLogs].reverse()) {
    await addDoc(col, {
      date: log.date,
      spotId: log.spotId,
      spotName: log.spotName,
      grade: log.grade,
      score: log.score,
      createdAt: serverTimestamp(),
    })
  }

  localStorage.removeItem(STORAGE_KEY)
}

// ---- 純粋関数（ページで引き続き使用） ----

export function countDaysInYear(logs: SurfLog[], year: number): number {
  const dates = new Set(logs.filter((l) => l.date.startsWith(String(year))).map((l) => l.date))
  return dates.size
}

export function countTotalDays(logs: SurfLog[]): number {
  return new Set(logs.map((l) => l.date)).size
}
