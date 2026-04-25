'use client'
import { useState, useEffect } from 'react'

const MESSAGES = [
  '波高・風・うねりデータを取得中',
  '潮位・周期を計算中',
  'コンディションをスコア化中',
]

export default function AiCommentLoading() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(prev => (prev + 1) % MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        background: 'var(--paper-100)',
        border: '1px solid var(--ink-900)',
        borderRadius: 0,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
          {[0, 0.15, 0.3].map((delay, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 4,
                height: 20,
                borderRadius: 0,
                background: 'var(--ink-900)',
                animation: `wave 0.8s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
        <span
          className="font-jp"
          style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)' }}
        >
          AIが波を分析中...
        </span>
      </div>
      <p
        className="font-jp"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ink-500)',
          margin: '8px 0 0 0',
          paddingLeft: 36,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {MESSAGES[index]}
      </p>
      <p
        className="font-jp"
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--ink-300)',
          margin: '6px 0 0 0',
          paddingLeft: 36,
        }}
      >
        通常3秒ほどお待ちください
      </p>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  )
}
