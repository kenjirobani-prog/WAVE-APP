import type { WaveCondition } from './types'
import type { Spot, Grade, SpotScore, ScoreBreakdown, WindType, BathymetryProfile } from '@/types'
import type { UserProfile } from '@/types'

// ブレイクタイプ
export type BreakType = 'plunging' | 'spilling' | 'closeout' | 'surging'

export type BreakTypeInfo = {
  type: BreakType
  label: string
  labelJa: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export function predictBreakType(
  bathymetryType: BathymetryProfile['type'],
  tideLevel: number,
  waveHeight: number,
  swellRatio: number,
  closeoutRisk: BathymetryProfile['closeoutRisk'],
): BreakTypeInfo {
  // クローズアウトリスク高 × 強うねり × 干潮
  if (closeoutRisk !== 'low' && waveHeight >= 1.0 && tideLevel < 60) {
    return {
      type: 'closeout',
      label: 'Closeout',
      labelJa: 'クローズアウト',
      description: '波が一気に崩れて乗れる場所がない状態。見送り推奨。',
      difficulty: 'advanced',
    }
  }
  // 急傾斜 × グランドスウェル × 適正潮位 → プランジング
  if (bathymetryType === 'steep' && swellRatio >= 0.6 && tideLevel >= 60 && tideLevel <= 120) {
    return {
      type: 'plunging',
      label: 'Plunging',
      labelJa: 'ホレた波',
      description: '波のリップが前に飛び出すパワフルな波。チューブが生まれやすい。中上級者向き。',
      difficulty: 'advanced',
    }
  }
  // 急傾斜 × 満潮 → サージング
  if (bathymetryType === 'steep' && tideLevel > 130) {
    return {
      type: 'surging',
      label: 'Surging',
      labelJa: 'サージング',
      description: '波が崩れずに砂浜を駆け上がる状態。乗れる波が少ない。',
      difficulty: 'advanced',
    }
  }
  // 緩傾斜 × 満潮 → スピリング（トロい）
  if (bathymetryType === 'gradual' && tideLevel > 120) {
    return {
      type: 'spilling',
      label: 'Spilling',
      labelJa: 'トロい波',
      description: '波がゆっくり崩れる柔らかい波。初心者の練習に最適。',
      difficulty: 'beginner',
    }
  }
  // デフォルト：スピリング（緩やか）
  return {
    type: 'spilling',
    label: 'Spilling',
    labelJa: 'スピリング',
    description: '波がゆっくり崩れる安定した波。',
    difficulty: 'beginner',
  }
}

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

// 【役割】潮位の絶対的な良し悪しを評価（スポット固有の最適潮位帯を使用）
// 　　　　最適潮位帯の中心に近いほど高スコア、帯外はペナルティ
// 　　　　潮の動き方向ボーナスを加算
// 【配点】0〜10点（メインスコアの10点枠）
// 潮位基準: 最低水面（横浜 平均水面=115cm, 大潮干潮≈20cm, 大潮高潮≈185cm）
function scoreTideWithBathymetry(
  tideLevel: number,
  tideTrend: number,
  optimalTideRange: [number, number],
): number {
  const [minTide, maxTide] = optimalTideRange
  const midTide = (minTide + maxTide) / 2

  // ベーススコア（スポット最適潮位帯に基づく）
  let base = 0
  if (tideLevel >= minTide && tideLevel <= maxTide) {
    // 中心に近いほど高スコア
    const distFromMid = Math.abs(tideLevel - midTide)
    const rangeHalf = (maxTide - minTide) / 2
    base = Math.round(10 * (1 - distFromMid / rangeHalf))
  } else {
    // 最適潮位帯外のペナルティ
    const distFromRange = tideLevel < minTide ? minTide - tideLevel : tideLevel - maxTide
    base = Math.max(0, 8 - Math.floor(distFromRange / 10))
  }

  // 潮の動き方向ボーナス
  // 「上げ三分・下げ七分」の日本格言 + BCM湘南レポートに基づく
  let trendBonus = 0
  if (tideTrend >= 3 && tideTrend <= 8)        trendBonus = 2   // 上げ潮中盤：最良
  else if (tideTrend < -2 && tideTrend >= -8)  trendBonus = 1   // 引き潮中盤：良い
  else if (Math.abs(tideTrend) < 2)            trendBonus = -1  // 停滞（満干潮ピーク）
  else if (Math.abs(tideTrend) > 10)           trendBonus = -1  // 急激な変化

  return Math.min(10, Math.max(0, base + trendBonus))
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

// 【役割】波高×潮位の組み合わせ特性を評価（湘南ビーチブレイク特有）
// 　　　　強うねり×干潮のワイド化、強うねり×中潮のボーナスなど
// 【配点】-10〜+3点（波質スコアの補正値）
function getSwellTideBonus(waveHeight: number, tideLevel: number): number {
  // 干潮×強うねり → ワイド・ダンパー（湘南ビーチブレイク特性）
  if (waveHeight >= 1.5 && tideLevel <= 40) return -10
  if (waveHeight >= 1.5 && tideLevel <= 60) return -8
  if (waveHeight >= 1.2 && tideLevel <= 40) return -9
  if (waveHeight >= 1.2 && tideLevel <= 60) return -7
  if (waveHeight >= 1.0 && tideLevel <= 40) return -6
  if (waveHeight >= 1.0 && tideLevel <= 60) return -4
  if (waveHeight >= 0.8 && tideLevel <= 40) return -2
  // 中潮×強うねり → ボーナス（最高のコンディション）
  if (waveHeight >= 1.2 && tideLevel >= 80 && tideLevel <= 120) return 3
  if (waveHeight >= 1.0 && tideLevel >= 80 && tideLevel <= 120) return 2
  // 満潮×強うねり → 波が崩れにくい
  // ※ 満潮×弱うねりのペナルティは scoreTide 側に移管済み
  if (waveHeight >= 1.2 && tideLevel >= 150) return -5
  if (waveHeight >= 0.8 && tideLevel >= 150) return -4
  // 中満潮ペナルティ（120〜150cm）
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
  secondarySwellHeight?: number,
  secondarySwellDirection?: number,
): number {
  // セカンダリースウェルが存在する場合: primarySwell vs secondarySwell で判定
  if (secondarySwellHeight != null && secondarySwellHeight >= 0.3 && secondarySwellDirection != null) {
    const diff = getDirectionDiff(swellDirection, secondarySwellDirection)
    if (diff < 30)  return 0
    if (diff < 60)  return -2
    if (diff <= 90) return -4
    return -6
  }

  // フォールバック: primarySwell vs windWave で判定
  if (windWaveHeight < 0.2) return 0
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
  secondarySwellHeight?: number,
  secondarySwellDirection?: number,
): number {
  const windType = classifyWind(windDir, windSpeed)
  const base = getBaseWaveQuality(wavePeriod, windType)
  const swellTide = getSwellTideBonus(waveHeight, tideHeight)
  const periodTide = getPeriodTideBonus(wavePeriod, tideHeight)
  const swellRatio = getSwellRatio(swellWaveHeight, waveHeight)
  const windSwellPenalty = getWindSwellPenalty(swellRatio, waveHeight)
  const crossSwellPenalty = getCrossSwellPenalty(swellDirection, windWaveDirection, windWaveHeight, waveHeight, secondarySwellHeight, secondarySwellDirection)
  const energy = calcWaveEnergy(waveHeight, wavePeriod)
  const energyBonus = getWaveEnergyBonus(energy)
  return Math.min(20, Math.max(0, base + swellTide + periodTide + windSwellPenalty + crossSwellPenalty + energyBonus))
}

// 体感コンフォートスコア（+5点）
// 晴れ=5base, 気温15-26℃快適ボーナス+1, UV≥9→-1
function scoreComfort(weather: WaveCondition['weather'], temperature: number, uvIndex: number): number {
  let base = 0
  if (weather === 'sunny') base = 5
  else if (weather === 'cloudy') base = 2
  const tempBonus = temperature >= 15 && temperature <= 26 ? 1 : 0
  const uvPenalty = uvIndex >= 9 ? -1 : 0
  return Math.max(0, base + tempBonus + uvPenalty)
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
  const optimalTideRange = spot.bathymetryProfile?.optimalTideRange ?? [80, 120]
  const tide = scoreTideWithBathymetry(condition.tideHeight, condition.tideTrend, optimalTideRange)
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
    condition.secondarySwellHeight,
    condition.secondarySwellDirection,
  )
  const weatherBonus = scoreComfort(condition.weather, condition.temperature, condition.uvIndex)
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
