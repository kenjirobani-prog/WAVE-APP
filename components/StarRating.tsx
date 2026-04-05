'use client'

interface Props {
  stars: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'yellow' | 'red'
}

const sizeMap = { sm: 12, md: 16, lg: 20 }

export default function StarRating({ stars, size = 'md', color = 'yellow' }: Props) {
  const s = sizeMap[size]
  const fill = color === 'red' ? '#ef4444' : '#f59e0b'
  const empty = '#d1d5db'
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={s} height={s} viewBox="0 0 20 20" fill={i <= stars ? fill : empty}>
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  )
}
