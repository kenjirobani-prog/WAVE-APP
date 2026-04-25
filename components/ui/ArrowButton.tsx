interface Props {
  variant?: 'dark' | 'light' | 'red'
  size?: number
}

const VARIANT_COLORS: Record<NonNullable<Props['variant']>, { bg: string; stroke: string }> = {
  dark: { bg: '#1a1815', stroke: '#fbf8f3' },
  light: { bg: '#fbf8f3', stroke: '#1a1815' },
  red: { bg: '#a82a1f', stroke: '#fbf8f3' },
}

export default function ArrowButton({ variant = 'dark', size = 32 }: Props) {
  const { bg, stroke } = VARIANT_COLORS[variant]
  const innerSize = Math.round(size * 0.375)

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 animate-pulse-right rounded-full"
      style={{ width: size, height: size, background: bg }}
    >
      <svg width={innerSize} height={innerSize} viewBox="0 0 12 12" fill="none">
        <path
          d="M4 2l4 4-4 4"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
