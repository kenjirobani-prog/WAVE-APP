'use client'
import { useState } from 'react'

export default function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  function handleRefresh() {
    if (isRefreshing) return
    setIsRefreshing(true)
    setTimeout(() => {
      window.location.reload()
    }, 600)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label="更新"
      style={{
        width: '36px',
        height: '36px',
        border: '1px solid var(--ink-900)',
        background: 'var(--paper-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isRefreshing ? 'default' : 'pointer',
        borderRadius: '50%',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
        style={{
          color: 'var(--ink-900)',
          animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
        }}
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  )
}
