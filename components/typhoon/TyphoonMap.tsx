'use client'
import { useEffect, useRef } from 'react'
import type { ForecastPoint } from '@/types/typhoon'

interface Props {
  position: { lat: number; lon: number }
  forecastPath: ForecastPoint[]
}

export default function TyphoonMap({ position, forecastPath }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return
    let map: import('leaflet').Map | null = null

    // 動的import（SSR対策）
    import('leaflet').then((mod) => {
      const L = mod.default ?? mod
      if (!mapRef.current) return

      // Leaflet CSSを動的に読み込み
      const existing = document.querySelector('link[data-leaflet-css]')
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.setAttribute('data-leaflet-css', 'true')
        document.head.appendChild(link)
      }

      map = L.map(mapRef.current).setView([position.lat, position.lon], 4)

      // OpenStreetMapタイル
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // 現在地マーカー（赤丸）
      const currentIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#EF4444;border-radius:50%;border:2px solid white;box-shadow:0 0 0 2px #EF4444;"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([position.lat, position.lon], { icon: currentIcon }).addTo(map)

      // 予報円（+24h / +48h / +72h）— 半径は仮値
      const radii = [150000, 250000, 350000]
      const labels = ['+24h', '+48h', '+72h']
      const path = forecastPath ?? []
      path.slice(0, 3).forEach((point, i) => {
        L.circle([point.lat, point.lon], {
          radius: radii[i],
          color: '#EC4899',
          fill: true,
          fillColor: '#EC4899',
          fillOpacity: 0.1,
          weight: 1.2,
          dashArray: '4, 4',
        }).addTo(map!)

        // 予報ポイントラベル
        const labelIcon = L.divIcon({
          html: `<div style="font-size:10px;font-weight:600;color:#BE185D;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:4px;white-space:nowrap;">${labels[i] || ''}</div>`,
          className: '',
          iconSize: [40, 16],
          iconAnchor: [20, 8],
        })
        L.marker([point.lat, point.lon], { icon: labelIcon }).addTo(map!)
      })

      // 進路ライン（破線）
      if (path.length > 0) {
        const pathPoints: [number, number][] = [
          [position.lat, position.lon],
          ...path.map(p => [p.lat, p.lon] as [number, number]),
        ]
        L.polyline(pathPoints, {
          color: '#0284C7',
          weight: 2.5,
          dashArray: '6, 4',
        }).addTo(map)
      }
    }).catch(err => {
      console.error('[TyphoonMap] Leaflet load failed:', err)
    })

    return () => {
      if (map) {
        map.remove()
        map = null
      }
    }
  }, [position, forecastPath])

  return (
    <div
      ref={mapRef}
      style={{ height: '360px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  )
}
