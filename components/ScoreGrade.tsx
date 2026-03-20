import type { Grade } from '@/types'

interface Props {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
}

const gradeConfig: Record<Grade, { label: string; className: string }> = {
  '◎': { label: '◎', className: 'text-emerald-600 bg-emerald-50 border-emerald-300' },
  '○': { label: '○', className: 'text-blue-600 bg-blue-50 border-blue-300' },
  '△': { label: '△', className: 'text-amber-600 bg-amber-50 border-amber-300' },
  '×': { label: '×', className: 'text-gray-500 bg-gray-100 border-gray-300' },
}

const sizeClass = {
  sm: 'text-lg w-9 h-9',
  md: 'text-2xl w-12 h-12',
  lg: 'text-4xl w-16 h-16',
}

export default function ScoreGrade({ grade, size = 'md' }: Props) {
  const config = gradeConfig[grade]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 font-bold ${config.className} ${sizeClass[size]}`}
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
