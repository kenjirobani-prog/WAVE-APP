'use client'

interface Props {
  stars: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  onDark?: boolean
}

const sizeMap = { xs: 11, sm: 14, md: 18, lg: 26 }

export default function StarRating({ stars, size = 'sm', onDark = false }: Props) {
  const fontSize = sizeMap[size]
  const activeColor = onDark ? 'var(--paper-100)' : 'var(--ink-900)'
  const inactiveColor = onDark ? 'rgba(251,248,243,0.25)' : 'var(--rule-thin)'
  const filled = Math.max(0, Math.min(5, Math.round(stars)))

  return (
    <span className="inline-flex gap-px" style={{ lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            fontSize,
            lineHeight: 1,
            color: i <= filled ? activeColor : inactiveColor,
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}
