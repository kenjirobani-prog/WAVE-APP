// 更新スケジュール（JST時）
export const UPDATE_HOURS_JST = [3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21]

// 現在時刻に最も近い過去の更新時刻を返す
export function getLatestUpdateHour(): number {
  const jstHour = (new Date().getUTCHours() + 9) % 24
  const past = UPDATE_HOURS_JST.filter(h => h <= jstHour)
  // 3時前（深夜）は前日最終更新の21時を返す
  return past.length === 0 ? 21 : past[past.length - 1]
}
