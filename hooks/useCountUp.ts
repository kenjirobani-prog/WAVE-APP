'use client'
import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLElement>(null)
  const firedRef = useRef(false)

  // target が変わったらリセット
  useEffect(() => {
    firedRef.current = false
    setCount(0)
  }, [target])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !firedRef.current) {
          firedRef.current = true
          const start = performance.now()
          function tick(now: number) {
            const t = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
            setCount(Math.round(target * eased))
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}
