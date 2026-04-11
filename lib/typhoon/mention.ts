// 台風への言及可否判定・推奨コメント表現

export interface MentionableTyphoon {
  position: { lat: number; lon: number }
  pressure: number
}

const TOKYO = { lat: 35.7, lon: 139.7 }

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distanceToTokyoKm(typhoon: MentionableTyphoon): number {
  return haversineDistance(typhoon.position.lat, typhoon.position.lon, TOKYO.lat, TOKYO.lon)
}

/**
 * 台風への言及可否を判定
 * - 3,000km超 または 気圧990hPa以上 → 言及しない
 * - 3,000km以内 かつ 970hPa以下 → 言及する
 */
export function shouldMentionTyphoon(typhoon: MentionableTyphoon): boolean {
  const distanceKm = distanceToTokyoKm(typhoon)
  const pressure = typhoon.pressure
  if (distanceKm > 3000 || pressure >= 990) return false
  if (distanceKm <= 3000 && pressure <= 970) return true
  return false
}

/**
 * 距離・気圧に応じた推奨コメント表現
 */
export function getTyphoonComment(distanceKm: number, pressure: number): string {
  if (distanceKm <= 500) {
    return '台風が非常に近く危険。絶対に海に近づかないこと。暴風・高波・離岸流に注意。'
  }
  if (distanceKm <= 1000) {
    return '台風接近によりサイズが急激にアップ。上級者以外は入水を控えること。'
  }
  if (distanceKm <= 1700 && pressure <= 950) {
    return '台風うねりが到達。周期の長いグランドスウェルに期待。朝イチが狙い目。'
  }
  if (distanceKm <= 1700 && pressure <= 970) {
    return '台風からのうねりが届き始める可能性あり。周期・サイズの変化に注目。'
  }
  if (distanceKm <= 3000 && pressure <= 970) {
    return '台風が発達中。北緯20度を越えてくればうねりへの期待が高まる。今後の進路に注目。'
  }
  return ''
}
