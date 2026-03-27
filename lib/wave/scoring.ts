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

// 波質スコア（3ステップ設計・20点満点）

function getBaseWaveQuality(period: number, windType: WindType): number {
  if (period >= 10) {
    if (windType === 'offshore')      return 20
    if (windType === 'calm')          return 18
    if (windType === 'side-offshore') return 16
    if (windType === 'side-onshore')  return 10
    return 5 // onshore
  }
  if (period >= 8) {
    if (windType === 'offshore')      return 17
    if (windType === 'calm')          return 15
    if (windType === 'side-offshore') return 13
    if (windType === 'side-onshore')  return 8
    return 3 // onshore
  }
  if (period >= 6) {
    if (windType === 'offshore')      return 10
    if (windType === 'calm')          return 9
    if (windType === 'side-offshore') return 8
    if (windType === 'side-onshore')  return 5
    return 2 // onshore
  }
  if (period >= 5) {
    if (windType === 'offshore')      return 5
    if (windType === 'calm')          return 4
    if (windType === 'side-offshore') return 4
    if (windType === 'side-onshore')  return 2
    return 1 // onshore
  }
  // 4秒以下
  if (windType === 'onshore') return 0
  return 2
}

function getSwellTideBonus(waveHeight: number, tideLevel: number): number {
  // 干潮ペナルティ（強化）
  if (waveHeight >= 1.5 && tideLevel <= 40) return -10
  if (waveHeight >= 1.5 && tideLevel <= 60) return -8
  if (waveHeight >= 1.2 && tideLevel <= 40) return -9
  if (waveHeight >= 1.2 && tideLevel <= 60) return -7
  if (waveHeight >= 1.0 && tideLevel <= 40) return -6
  if (waveHeight >= 1.0 && tideLevel <= 60) return -4
  if (waveHeight >= 0.8 && tideLevel <= 40) return -2
  // 中潮ボーナス
  if (waveHeight >= 1.2 && tideLevel >= 80 && tideLevel <= 120) return 3
  if (waveHeight >= 1.0 && tideLevel >= 80 && tideLevel <= 120) return 2
  // 満潮ペナルティ（強化・湘南ビーチブレイク特性に合わせて120cmから段階適用）
  if (waveHeight >= 1.2 && tideLevel >= 150) return -5
  if (waveHeight >= 0.8 && tideLevel >= 150) return -4
  if (waveHeight <  0.6 && tideLevel >= 150) return -3
  // 新規追加：120〜150cmの中満潮ペナルティ
  if (waveHeight >= 0.8 && tideLevel >= 120 && tideLevel < 150) return -2
  if (waveHeight >= 0.5 && tideLevel >= 120 && tideLevel < 150) return -1
  return 0
}

// swell比率の計算（0〜1）
// 1.0に近いほどグランドスウェル、0に近いほど風波
export function getSwellRatio(swellWaveHeight: number, waveHeight: number): number {
  if (waveHeight <= 0) return 0
  return Math.min(1, swellWaveHeight / waveHeight)
}

// Wind Swellペナルティ（波質スコアから差し引く）
function getWindSwellPenalty(swellRatio: number, waveHeight: number): number {
  // 波が小さい場合はペナルティ軽減（小波は風波でも影響が少ない）
  const heightFactor = waveHeight < 0.5 ? 0.5 : 1.0

  if (swellRatio < 0.3) return Math.round(-8 * heightFactor)  // ほぼ風波・ダンパー必至
  if (swellRatio < 0.5) return Math.round(-5 * heightFactor)  // 風波優勢・ワイド気味
  if (swellRatio < 0.7) return Math.round(-2 * heightFactor)  // 混在
  return 0  // グランドスウェル優勢
}

function getDirectionDiff(dir1: number, dir2: number): number {
  const diff = Math.abs(dir1 - dir2)
  return diff > 180 ? 360 - diff : diff
}

// セカンダリーうねり干渉ペナルティ
function getCrossSwellPenalty(
  swellDirection: number,
  windWaveDirection: number,
  windWaveHeight: number,
  waveHeight: number,
): number {
  // 風波が小さい場合は影響軽微
  if (windWaveHeight < 0.2) return 0
  // 風波の比率が低い場合は影響軽微
  const windRatio = windWaveHeight / waveHeight
  if (windRatio < 0.3) return 0

  const diff = getDirectionDiff(swellDirection, windWaveDirection)

  if (diff < 30)  return 0   // 同方向・問題なし
  if (diff < 60)  return -2  // やや交差・ジャンク気味
  if (diff <= 90) return -4  // クロスうねり・ジャンク
  return -6                   // 逆方向・最悪のコンディション
}

// 波エネルギー簡易計算（kJ/m）
// E ≈ H² × T × 0.97
export function calcWaveEnergy(waveHeight: number, period: number): number {
  return Math.pow(waveHeight, 2) * period * 0.97
}

// 波エネルギーによる波質スコア補正
function getWaveEnergyBonus(energy: number): number {
  if (energy < 3)  return -3  // 非常に弱い（風波・ほぼ乗れない）
  if (energy < 8)  return 0   // 普通
  if (energy < 15) return 1   // 良い
  if (energy < 25) return 2   // 非常に良い
  return 1                     // パワフル（強すぎ注意・少し抑制）
}

function getPeriodTideBonus(period: number, tideLevel: number): number {
  if (period >= 10 && tideLevel >= 80 && tideLevel <= 120) return 2
  if (period >= 10 && tideLevel >= 40 && tideLevel <  80)  return 1
  if (period >= 10 && tideLevel <  40)                     return -1
  if (period <= 6  && tideLevel <= 60)                     return -2
  if (period <= 6  && tideLevel >= 150)                    return -1
  return 0
}

function scoreWaveQuality(
  wavePeriod: number,
  windDir: number,
  windSpeed: number,
  waveHeight: number,
  tideHeight: number,
  swellWaveHeight: number,
  swellDirection: number,
  windWaveHeight: number,
  windWaveDirection: number,
): number {
  const windType = classifyWind(windDir, windSpeed)
  const base = getBaseWaveQuality(wavePeriod, windType)
  const swellTide = getSwellTideBonus(waveHeight, tideHeight)
  const periodTide = getPeriodTideBonus(wavePeriod, tideHeight)
  const swellRatio = getSwellRatio(swellWaveHeight, waveHeight)
  const windSwellPenalty = getWindSwellPenalty(swellRatio, waveHeight)
  const crossSwellPenalty = getCrossSwellPenalty(swellDirection, windWaveDirection, windWaveHeight, waveHeight)
  const energy = calcWaveEnergy(waveHeight, wavePeriod)
  const energyBonus = getWaveEnergyBonus(energy)
  return Math.min(20, Math.max(0, base + swellTide + periodTide + windSwellPenalty + crossSwellPenalty + energyBonus))
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
    effCondition.waveHeight,
    condition.tideHeight,
    condition.swellWaveHeight,
    condition.swellDir,
    condition.windWaveHeight,
    condition.windWaveDirection,
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

export function waveQualityLabel(score: number): string {
  if (score >= 18) return 'キレた波'
  if (score >= 13) return 'グッドウェーブ'
  if (score >= 8)  return 'まあまあ'
  if (score >= 3)  return 'ワイド気味'
  return 'ダンパー'
}

export function waveQualityColor(score: number): { text: string; bg: string } {
  if (score >= 18) return { text: '#0c4a6e', bg: '#dbeafe' }
  if (score >= 13) return { text: '#0369a1', bg: '#e0f2fe' }
  if (score >= 8)  return { text: '#64748b', bg: '#f8fafc' }
  if (score >= 3)  return { text: '#d97706', bg: '#fef9c3' }
  return { text: '#dc2626', bg: '#fee2e2' }
}

export function waveQualitySub(
  score: number,
  wavePeriod: number,
  windType: WindType,
): string {
  const period = Math.round(wavePeriod)
  if (score >= 18) {
    if (windType === 'offshore') return `周期${period}秒 × オフショア`
    return `周期${period}秒 × うねり正面`
  }
  if (score >= 13) return `周期${period}秒・コンディション良好`
  if (score >= 8)  return `周期${period}秒・標準的なコンディション`
  if (score >= 3)  return '周期短め・やや荒れ気味'
  return '周期短め × オンショア・波が崩れやすい'
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
