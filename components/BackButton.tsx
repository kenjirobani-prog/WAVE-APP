'use client'
import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.85)',
        fontSize: 22,
        cursor: 'pointer',
        padding: '0 8px 0 0',
        lineHeight: 1,
      }}
    >
      ←
    </button>
  )
}
