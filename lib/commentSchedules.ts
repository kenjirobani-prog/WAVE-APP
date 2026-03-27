export const COMMENT_SCHEDULES = {
  today: [4, 9, 12, 15],        // 今日タブの生成時刻（JST）← ここを変えるだけで追加・変更可能
  tomorrow: [4, 9, 12, 15, 18], // 明日タブの生成時刻（JST）
} as const

export type CommentTarget = 'today' | 'tomorrow'

/** 現在のJST時刻から、最新の生成済み時間帯を返す（例: 10時→9, 8時→4） */
export function getLatestScheduleHour(target: CommentTarget, jstHour: number): number | null {
  const hours = COMMENT_SCHEDULES[target]
  let latest: number | null = null
  for (const h of hours) {
    if (h <= jstHour) latest = h
  }
  return latest
}

/** 時間帯をゼロ埋め2桁に変換 */
export function padHour(hour: number): string {
  return String(hour).padStart(2, '0')
}
