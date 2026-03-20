import type { Grade } from '@/types'

interface Props {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
}

const gradeConfig: Record<Grade, { label: string; className: string }> = {
  '◎': { label: '◎', className: 'bg-sky-900 text-white' },
  '○': { label: '○', className: 'bg-sky-700 text-white' },
  '△': { label: '△', className: 'bg-slate-200 text-slate-600' },
  '×': { label: '×', className: 'bg-red-100 text-red-400' },
}

const sizeClass = {
  sm: 'text-base w-8 h-8',
  md: 'text-xl w-11 h-11',
  lg: 'text-3xl w-14 h-14',
}

export default function ScoreGrade({ grade, size = 'md' }: Props) {
  const config = gradeConfig[grade]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl font-bold ${config.className} ${sizeClass[size]}`}
    >
      {config.label}
    </span>
  )
}

export function gradeLabel(grade: Grade): string {
  const labels: Record<Grade, string> = {
    '◎': '今日は絶対行け',
    '○': 'まあまあ楽しめる',
    '△': '微妙、他と比較して',
    '×': '今日は見送り推奨',
  }
  return labels[grade]
}
