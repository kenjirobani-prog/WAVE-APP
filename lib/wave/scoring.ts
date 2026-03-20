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

// 波高スコア（30点満点）
function scoreWaveHeight(waveHeight: number, preferredSize: UserProfile['preferredSize']): number {
  const sizeThresholds: Record<UserProfile['preferredSize'], number> = {
    'ankle': 0.3,
    'waist-chest': 0.8,
    'head': 1.5,
    'overhead': 2.0,
  }
  const preferred = sizeThresholds[preferredSize]
  if (waveHeight === 0) return 0
  if (waveHeight >= preferred) return 30
  if (waveHeight >= preferred - 0.3) return 20
  return 5
}

// 風スコア（30点満点）
// 無風・オフショア≤5m/s: 30, オフショア5〜10: 22, サイドオフ: 18,
// サイドオン: 10, オンショア≤8: 5, オンショア>8: 0
function scoreWind(windSpeed: number, windDir: number): number {
  const type = classifyWind(windDir, windSpeed)
  if (type === 'calm') return 30
  if (type === 'offshore') {
    if (windSpeed <= 5) return 30
    if (windSpeed <= 10) return 22
    return 15
  }
  if (type === 'side-offshore') return 18
  if (type === 'side-onshore') return 10
  // onshore
  if (windSpeed <= 8) return 5
  return 0
}

// うねり方向スコア（20点満点）
function scoreSwellDir(swellDir: number, bestSwellDir: number, swellDirRange: number): number {
  const diff = Math.abs(((swellDir - bestSwellDir + 540) % 360) - 180)
  if (diff <= 30) return 20
  if (diff <= 60) return 13
  if (diff <= swellDirRange) return 6
  return 0
}

// 潮スコア（15点満点）
function scoreTide(
  tideHeight: number,
  tideMovement: WaveCondition['tideMovement'],
  optimalTideMin: number,
  optimalTideMax: number
): number {
  // 潮位基準: 最低水面（横浜 平均水面=115cm, 大潮干潮≈20cm, 大潮高潮≈185cm）
  const inOptimal = tideHeight >= optimalTideMin && tideHeight <= optimalTideMax
  if (inOptimal && tideMovement === 'rising') return 15
  if (inOptimal) return 10
  if (tideHeight >= 80 && tideHeight < optimalTideMin) return 7
  if (tideHeight > optimalTideMax && tideHeight <= 175) return 7
  if (tideHeight < 80) return 3
  return 3
}

// 天気ボーナス（+5点）
function scoreWeather(weather: WaveCondition['weather']): number {
  if (weather === 'sunny') return 5
  if (weather === 'cloudy') return 2
  return 0
}

// レベル補正（±最大15点）
function levelCorrection(
  condition: WaveCondition,
  _spot: Spot,
  profile: UserProfile
): number {
  let correction = 0
  const windType = classifyWind(condition.windDir, condition.windSpeed)

  if (profile.level === 'beginner') {
    if (condition.waveHeight >= 2.0) correction -= 10
    if (windType === 'onshore' && condition.windSpeed > 8) correction -= 5
    if (condition.tideHeight <= 80) correction -= 5
  } else if (profile.level === 'advanced') {
    if (condition.waveHeight < 0.8) correction -= 10
    if (windType === 'offshore' && condition.windSpeed > 5) correction += 3
  }

  return correction
}

export function calculateScore(
  condition: WaveCondition,
  spot: Spot,
  profile: UserProfile
): SpotScore {
  const waveHeight = scoreWaveHeight(condition.waveHeight, profile.preferredSize)
  const wind = scoreWind(condition.windSpeed, condition.windDir)
  const swellDir = scoreSwellDir(condition.swellDir, spot.bestSwellDir, spot.swellDirRange)
  const tide = scoreTide(condition.tideHeight, condition.tideMovement, spot.optimalTideMin, spot.optimalTideMax)
  const weatherBonus = scoreWeather(condition.weather)
  const correction = levelCorrection(condition, spot, profile)

  const total = Math.max(0, Math.min(100, waveHeight + wind + swellDir + tide + weatherBonus + correction))

  const breakdown: ScoreBreakdown = {
    waveHeight,
    wind,
    swellDir,
    tide,
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
  if (score >= 80) return '◎'
  if (score >= 60) return '○'
  if (score >= 40) return '△'
  return '×'
}

function buildReasonTags(
  condition: WaveCondition,
  spot: Spot,
  _profile: UserProfile,
  breakdown: ScoreBreakdown
): string[] {
  const tags: string[] = []

  if (breakdown.waveHeight >= 30) tags.push('波サイズぴったり')
  else if (breakdown.waveHeight >= 20) tags.push('波やや小さめ')
  else tags.push('波が小さい')

  const windType = classifyWind(condition.windDir, condition.windSpeed)
  if (windType === 'calm') tags.push('無風')
  else if (windType === 'offshore') tags.push(condition.windSpeed <= 5 ? 'オフショア良好' : 'オフショア強め')
  else if (windType === 'side-offshore') tags.push('サイドオフ')
  else if (windType === 'side-onshore') tags.push('サイドオン')
  else tags.push('オンショア')

  if (breakdown.tide >= 15) tags.push('潮位◎')
  else if (breakdown.tide <= 3) tags.push('潮位注意')

  return tags
}
