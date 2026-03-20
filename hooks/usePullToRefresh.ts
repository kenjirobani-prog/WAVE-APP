'use client'
import { useRef, useState, useEffect } from 'react'

const THRESHOLD = 70

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const scrollRef = useRef<HTMLElement>(null)
  const startY = useRef(0)
  const currentDist = useRef(0)
  const isRefreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollEl = el

    function onTouchStart(e: TouchEvent) {
      startY.current = e.touches[0].clientY
      currentDist.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (isRefreshingRef.current) return
      if (scrollEl.scrollTop > 0) {
        currentDist.current = 0
        return
      }
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        e.preventDefault()
        currentDist.current = Math.min(delta * 0.5, THRESHOLD + 24)
        setPullDistance(currentDist.current)
      }
    }

    async function onTouchEnd() {
      const dist = currentDist.current
      currentDist.current = 0
      if (dist >= THRESHOLD) {
        isRefreshingRef.current = true
        setIsRefreshing(true)
        setPullDistance(0)
        try {
          await onRefreshRef.current()
        } finally {
          isRefreshingRef.current = false
          setIsRefreshing(false)
        }
      } else {
        setPullDistance(0)
      }
    }

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true })
    scrollEl.addEventListener('touchmove', onTouchMove, { passive: false })
    scrollEl.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart)
      scrollEl.removeEventListener('touchmove', onTouchMove)
      scrollEl.removeEventListener('touchend', onTouchEnd)
    }
  }, []) // stable: threshold constant, onRefresh via ref

  return { scrollRef, pullDistance, isRefreshing, threshold: THRESHOLD }
}
