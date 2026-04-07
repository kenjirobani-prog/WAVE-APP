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
    <div style={{ background: '#E8F4F2', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Wave bars */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
          {[0, 0.15, 0.3].map((delay, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 4,
                height: 20,
                borderRadius: 2,
                background: '#1A7A6E',
                animation: `wave 0.8s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A7A6E' }}>
          AIが波を分析中...
        </span>
      </div>
      <p
        style={{
          fontSize: 12, color: '#1A7A6E', margin: '8px 0 0 0', paddingLeft: 36,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {MESSAGES[index]}
      </p>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '6px 0 0 0', paddingLeft: 36 }}>
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
