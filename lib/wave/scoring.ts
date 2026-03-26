import type { WaveCondition } from './types'
import type { Spot, Grade, SpotScore, ScoreBreakdown, WindType } from '@/types'
import type { UserProfile } from '@/types'

/**
 * 風向き種別を判定する（湘南は海岸線が東西方向・海は南側）
 * windDir: 気象学的風向き（風が吹いてくる方向、0°=北）
 * windSpeed: m/s
 */
export function classifyWind(windDir: number, windSpeed: number): WindType {
  if (windSpeed <= 2) return 'calm'
  // 北風 315°〜45° → オフショア（海岸が南向き、北風は海方向へ吹く）
  if (windDir >= 315 || windDir < 45) return 'offshore'
  // 北東・北西寄り → サイドオフ
  if ((windDir >= 45 && windDir < 90) || (windDir >= 270 && windDir < 315)) return 'side-offshore'
  // 南東・南西寄り → サイドオン
  if ((windDir >= 90 && windDir < 135) || (windDir >= 225 && windDir < 270)) return 'side-onshore'
  // 南風 135°〜225° → オンショア
  return 'onshore'
}

export function windTypeLabel(type: WindType): string {
  const labels: Record<WindType, string> = {
    calm: '無風',
    offshore: 'オフショア',
    'side-offshore': 'サイドオフ',
    'side-onshore': 'サイドオン',
    onshore: 'オンショア',
  }
  return labels[type]
}

export function compassLabel(dir: number): string {
  const labels = ['N 北', 'NE 北東', 'E 東', 'SE 南東', 'S 南', 'SW 南西', 'W 西', 'NW 北西']
  return labels[Math.round(dir / 45) % 8]
}

// 波高スコア（25点満点）
function scoreWaveHeight(waveHeight: number, preferredSize: UserProfile['preferredSize']): number {
  const sizeThresholds: Record<UserProfile['preferredSize'], number> = {
    'ankle': 0.3,
    'waist-chest': 0.8,
    'head': 1.5,
    'overhead': 2.0,
  }
  const preferred = sizeThresholds[preferredSize]
  if (waveHeight <= 0.15) return 0               // フラット
  if (waveHeight >= preferred) return 25         // 好みサイズ以上
  if (waveHeight >= preferred - 0.2) return 18  // −20cm以内
  if (waveHeight >= preferred - 0.4) return 8   // −20〜40cm
  return 2                                        // −40cm超
}

// 風スコア（22点満点）
function scoreWind(windSpeed: number, windDir: number): number {
  const type = classifyWind(windDir, windSpeed)
  if (type === 'calm') return 22
  if (type === 'offshore') {
    if (windSpeed <= 5) return 21
    if (windSpeed <= 10) return 16
    return 7
  }
  if (type === 'side-offshore') return windSpeed <= 5 ? 12 : 7
  if (type === 'side-onshore') return 6
  // onshore
  if (windSpeed <= 8) return 2
  return 0
}

// うねり方向スコア（18点満点）
function scoreSwellDir(swellDir: number, bestSwellDir: number): number {
  const diff = Math.abs(((swellDir - bestSwellDir + 540) % 360) - 180)
  if (diff <= 20) return 18
  if (diff <= 45) return 11
  if (diff <= 70) return 4
  return 0
}

// 潮スコア（10点満点）
// 潮位基準: 最低水面（横浜 平均水面=115cm, 大潮干潮≈20cm, 大潮高潮≈185cm）
function scoreTide(
  tideHeight: number,
  tideMovement: WaveCondition['tideMovement'],
): number {
  if (tideHeight >= 80 && tideHeight <= 120) {
    return tideMovement === 'rising' ? 10 : 5
  }
  if ((tideHeight >= 60 && tideHeight < 80) || (tideHeight > 120 && tideHeight <= 150)) return 3
  return 1
}

// 波質スコア（周期ベース・20点満点）
function scoreWaveQuality(
  wavePeriod: number,
  windDir: number,
  windSpeed: number,
  swellDir: number,
  bestSwellDir: number,
  tideHeight: number,
): number {
  const windType = classifyWind(windDir, windSpeed)
  const swellDiff = Math.abs(((swellDir - bestSwellDir + 540) % 360) - 180)
  const isFrontal = swellDiff <= 20
  const isOffshore = windType === 'offshore'
  const isOnshore = windType === 'onshore'

  // マイナス評価（ワイド・ダンパー）
  if (wavePeriod <= 5) {
    if (isOnshore && tideHeight > 150) return 0
    if (isOnshore) return 1
    return 3
  }

  // プラス評価（キレた波）
  if (wavePeriod >= 10 && isOffshore) return 20
  if (wavePeriod >= 8 && isOffshore) return 17
  if (wavePeriod >= 8 && isFrontal) return 15
  if (wavePeriod >= 8) return 12
  if (wavePeriod >= 6) return 8
  return 5 // 周期5秒台
}

// 天気ボーナス（+5点）
function scoreWeather(weather: WaveCondition['weather']): number {
  if (weather === 'sunny') return 5
  if (weather === 'cloudy') return 2
  return 0
}

// ボードタイプ補正（±5点）
function boardCorrection(condition: WaveCondition, profile: UserProfile): number {
  const sizeThresholds: Record<UserProfile['preferredSize'], number> = {
    'ankle': 0.3,
    'waist-chest': 0.8,
    'head': 1.5,
    'overhead': 2.0,
  }
  const preferred = sizeThresholds[profile.preferredSize]
  const isSmallerThanPreferred = condition.waveHeight < preferred

  if (profile.boardType === 'longboard' && isSmallerThanPreferred) return 5
  if (profile.boardType === 'shortboard' && isSmallerThanPreferred) return -5
  return 0
}

export function calculateScore(
  condition: WaveCondition,
  spot: Spot,
  profile: UserProfile
): SpotScore {
  // スポット固有の波高補正（例: 水族館前は江ノ島の影響で0.8倍）
  const multiplier = spot.waveHeightMultiplier ?? 1.0
  const effCondition = multiplier !== 1.0
    ? { ...condition, waveHeight: condition.waveHeight * multiplier }
    : condition

  const waveHeight = scoreWaveHeight(effCondition.waveHeight, profile.preferredSize)
  const wind = scoreWind(condition.windSpeed, condition.windDir)
  const swellDir = scoreSwellDir(condition.swellDir, spot.bestSwellDir)
  const tide = scoreTide(condition.tideHeight, condition.tideMovement)
  const waveQuality = scoreWaveQuality(
    condition.wavePeriod,
    condition.windDir,
    condition.windSpeed,
    condition.swellDir,
    spot.bestSwellDir,
    condition.tideHeight,
  )
  const weatherBonus = scoreWeather(condition.weather)
  const correction = boardCorrection(effCondition, profile)

  const total = Math.max(0, Math.min(100, waveHeight + wind + swellDir + tide + waveQuality + weatherBonus + correction))

  const breakdown: ScoreBreakdown = {
    waveHeight,
    wind,
    swellDir,
    tide,
    waveQuality,
    weatherBonus,
    levelCorrection: correction,
  }

  return {
    spotId: spot.id,
    score: Math.round(total),
    grade: scoreToGrade(total),
    breakdown,
    reasonTags: buildReasonTags(condition, spot, profile, breakdown),
  }
}

export function scoreToGrade(score: number): Grade {
  if (score >= 85) return '◎'
  if (score >= 65) return '○'
  if (score >= 45) return '△'
  return '×'
}

function buildReasonTags(
  condition: WaveCondition,
  spot: Spot,
  _profile: UserProfile,
  breakdown: ScoreBreakdown
): string[] {
  const tags: string[] = []

  if (breakdown.waveHeight >= 25) tags.push('波サイズぴったり')
  else if (breakdown.waveHeight >= 18) tags.push('波やや小さめ')
  else tags.push('波が小さい')

  const windType = classifyWind(condition.windDir, condition.windSpeed)
  if (windType === 'calm') tags.push('無風')
  else if (windType === 'offshore') tags.push(condition.windSpeed <= 5 ? 'オフショア良好' : 'オフショア強め')
  else if (windType === 'side-offshore') tags.push('サイドオフ')
  else if (windType === 'side-onshore') tags.push('サイドオン')
  else tags.push('オンショア')

  if (breakdown.waveQuality >= 15) tags.push('周期◎')
  else if (breakdown.waveQuality <= 3) tags.push('波質注意')

  if (breakdown.tide >= 10) tags.push('潮位◎')
  else if (breakdown.tide <= 2) tags.push('潮位注意')

  return tags
}
