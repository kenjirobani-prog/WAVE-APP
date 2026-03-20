import type { WaveCondition } from './types'
import type { Spot, Grade, SpotScore, ScoreBreakdown } from '@/types'
import type { UserProfile } from '@/types'

// 風向きからオフショア/サイド/オンショアを判定
export function classifyWind(windDir: number, spotFacing: number): 'offshore' | 'side-offshore' | 'side' | 'onshore' {
  const diff = Math.abs(((windDir - spotFacing + 540) % 360) - 180)
  if (diff <= 45) return 'offshore'
  if (diff <= 90) return 'side-offshore'
  if (diff <= 135) return 'side'
  return 'onshore'
}

// 波高スコア（30点満点）
function scoreWaveHeight(waveHeight: number, preferredSize: UserProfile['preferredSize']): number {
  // 好みサイズの閾値（m）
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
function scoreWind(windSpeed: number, windDir: number, spotFacing: number): number {
  const type = classifyWind(windDir, spotFacing)
  if (type === 'offshore') {
    if (windSpeed <= 5) return 30
    if (windSpeed <= 10) return 22
    return 15
  }
  if (type === 'side-offshore') {
    if (windSpeed <= 5) return 18
    return 10
  }
  if (type === 'side') return 12
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
  const inOptimal = tideHeight >= optimalTideMin && tideHeight <= optimalTideMax
  if (inOptimal && tideMovement === 'rising') return 15
  if (inOptimal) return 10
  if (tideHeight >= 60 && tideHeight < optimalTideMin) return 7
  if (tideHeight > optimalTideMax && tideHeight <= 150) return 7
  if (tideHeight < 60) return 3
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
  spot: Spot,
  profile: UserProfile
): number {
  let correction = 0
  const windType = classifyWind(condition.windDir, spot.bestSwellDir)

  if (profile.level === 'beginner') {
    // オーバーヘッド以上で -10点
    if (condition.waveHeight >= 2.0) correction -= 10
    // オンショア強風で -5点
    if (windType === 'onshore' && condition.windSpeed > 8) correction -= 5
    // 干潮時（60cm以下）で -5点
    if (condition.tideHeight <= 60) correction -= 5
  } else if (profile.level === 'advanced') {
    // 胸以下で -10点
    if (condition.waveHeight < 0.8) correction -= 10
    // オフショア強風で +3点
    if (windType === 'offshore' && condition.windSpeed > 5) correction += 3
  }

  return correction
}

// スポットのスコアを計算
export function calculateScore(
  condition: WaveCondition,
  spot: Spot,
  profile: UserProfile
): SpotScore {
  const waveHeight = scoreWaveHeight(condition.waveHeight, profile.preferredSize)
  const wind = scoreWind(condition.windSpeed, condition.windDir, spot.bestSwellDir)
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
  profile: UserProfile,
  breakdown: ScoreBreakdown
): string[] {
  const tags: string[] = []

  // 波高タグ
  if (breakdown.waveHeight >= 30) tags.push('波サイズぴったり')
  else if (breakdown.waveHeight >= 20) tags.push('波やや小さめ')
  else tags.push('波が小さい')

  // 風タグ
  const windType = classifyWind(condition.windDir, spot.bestSwellDir)
  if (windType === 'offshore') tags.push(condition.windSpeed <= 5 ? 'オフショア良好' : 'オフショア強め')
  else if (windType === 'side-offshore') tags.push('サイドオフ')
  else if (windType === 'side') tags.push('サイド風')
  else tags.push('オンショア')

  // 潮タグ
  if (breakdown.tide >= 15) tags.push('潮位◎')
  else if (breakdown.tide <= 3) tags.push('潮位注意')

  return tags
}
