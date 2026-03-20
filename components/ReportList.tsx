'use client'
import type { Report } from '@/types'
import ScoreGrade from './ScoreGrade'

interface Props {
  reports: Report[]
  spotId: string
}

export default function ReportList({ reports, spotId }: Props) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>まだレポートがありません</p>
        <p className="text-sm mt-1">最初のレポートを書いてみましょう</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map(report => (
        <div key={report.id} className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ScoreGrade grade={report.grade} size="sm" />
            <span className="font-medium text-slate-700">{report.authorName}</span>
            <span className="text-xs text-slate-400 ml-auto">{formatDate(report.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-600">{report.content}</p>
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'たった今'
  if (diffH < 24) return `${diffH}時間前`
  return `${Math.floor(diffH / 24)}日前`
}
