// 台風の現在位置をざっくりとした日本語の説明に変換

interface ReferencePoint {
  name: string
  lat: number
  lon: number
}

const REFERENCES: ReferencePoint[] = [
  { name: '沖縄', lat: 26.2, lon: 127.7 },
  { name: '東京', lat: 35.7, lon: 139.7 },
  { name: '九州南端', lat: 31.0, lon: 130.5 },
  { name: 'フィリピン', lat: 12.0, lon: 122.0 },
  { name: 'グアム', lat: 13.5, lon: 144.8 },
]

// Haversine公式で2点間の距離（km）
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 2点間の方位を8方位で返す（基準点から見た台風の方向）
function bearingLabel(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
  const dLon = (toLon - fromLon) * Math.PI / 180
  const lat1 = fromLat * Math.PI / 180
  const lat2 = toLat * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  let bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  const labels = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
  const idx = Math.round(bearing / 45) % 8
  return labels[idx]
}

// 距離を見やすい単位に丸める
function roundDistance(km: number): string {
  if (km < 100) return `約${Math.round(km / 10) * 10}km`
  if (km < 1000) return `約${Math.round(km / 50) * 50}km`
  return `約${Math.round(km / 100) * 100}km`
}

export function getApproximateLocation(lat: number, lon: number): string {
  // 最も近い基準点を選ぶ
  let nearest = REFERENCES[0]
  let minDist = Infinity
  for (const ref of REFERENCES) {
    const d = haversineKm(lat, lon, ref.lat, ref.lon)
    if (d < minDist) {
      minDist = d
      nearest = ref
    }
  }
  const dir = bearingLabel(nearest.lat, nearest.lon, lat, lon)
  return `${nearest.name}の${dir} ${roundDistance(minDist)}`
}
