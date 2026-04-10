// 台風の現在位置を日本の主要地点からの距離・方位で表現

interface ReferencePoint {
  name: string
  lat: number
  lon: number
}

const JAPAN_REFERENCES: ReferencePoint[] = [
  { name: '東京',       lat: 35.7, lon: 139.7 },
  { name: '大阪',       lat: 34.7, lon: 135.5 },
  { name: '沖縄',       lat: 26.2, lon: 127.7 },
  { name: '鹿児島',     lat: 31.6, lon: 130.6 },
  { name: '小笠原諸島', lat: 27.1, lon: 142.2 },
]

const DIRECTIONS_16 = [
  '北', '北北東', '北東', '東北東',
  '東', '東南東', '南東', '南南東',
  '南', '南南西', '南西', '西南西',
  '西', '西北西', '北西', '北北西',
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

// 基準点から目標点への方位を16方位で返す
function bearingLabel16(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
  const dLon = (toLon - fromLon) * Math.PI / 180
  const lat1 = fromLat * Math.PI / 180
  const lat2 = toLat * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  const idx = Math.round(bearing / 22.5) % 16
  return DIRECTIONS_16[idx]
}

// カンマ区切りで見やすい数値に
function formatKm(km: number): string {
  return km.toLocaleString('en-US')
}

export function getApproximateLocation(lat: number, lon: number): string {
  // 最も近い日本の基準点を選ぶ
  let nearest = JAPAN_REFERENCES[0]
  let minDist = Infinity
  for (const ref of JAPAN_REFERENCES) {
    const d = haversineKm(lat, lon, ref.lat, ref.lon)
    if (d < minDist) {
      minDist = d
      nearest = ref
    }
  }
  const dir = bearingLabel16(nearest.lat, nearest.lon, lat, lon)
  const roundedKm = Math.round(minDist / 100) * 100
  return `${nearest.name}の${dir} 約${formatKm(roundedKm)}km`
}
