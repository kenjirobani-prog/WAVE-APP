// 更新スケジュール（JST時）
export const UPDATE_HOURS_JST = [4, 6, 9, 12, 15, 18]

// 現在時刻に最も近い過去の更新時刻を返す
export function getLatestUpdateHour(): number {
  const jstHour = (new Date().getUTCHours() + 9) % 24
  const past = UPDATE_HOURS_JST.filter(h => h <= jstHour)
  return past.length === 0 ? 21 : past[past.length - 1]
}

// 次回更新時刻を "H:00" 形式で返す
export function getNextUpdateTime(): string {
  const jstHour = (new Date().getUTCHours() + 9) % 24
  const next = UPDATE_HOURS_JST.find(h => h > jstHour) ?? UPDATE_HOURS_JST[0]
  return `${next}:00`
}
