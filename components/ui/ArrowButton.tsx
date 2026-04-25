interface Props {
  variant?: 'dark' | 'light'
  size?: number
}

export default function ArrowButton({ variant = 'dark', size = 32 }: Props) {
  const bg = variant === 'dark' ? '#1a1815' : '#fbf8f3'
  const stroke = variant === 'dark' ? '#fbf8f3' : '#1a1815'
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
