'use client'
import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      aria-label="戻る"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          border: '2px solid var(--ink-900)',
          borderRadius: '50%',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M8 2L4 6l4 4"
            stroke="#1a1815"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  )
}
