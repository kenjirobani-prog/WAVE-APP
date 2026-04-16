import type { WaveCondition } from './types'
import type { Spot, Grade, SpotScore, ScoreBreakdown, WindType, BathymetryProfile } from '@/types'

// クローズアウト閾値
export const CLOSEOUT_WAVE_HEIGHT = 2.5       // m：単独でクローズアウト
export const CLOSEOUT_WAVE_HEIGHT_WIND = 2.0  // m：強風との複合条件
export const CLOSEOUT_WIND_SPEED = 10         // m/s：複合条件の風速閾値

export function isCloseout(waveHeight: number, windSpeed: number, windDir: number): boolean {
  if (waveHeight >= CLOSEOUT_WAVE_HEIGHT) return true
  if (windSpeed >= 25) return true  // 暴風: 風向きに関わらずサーフィン不可
  if (waveHeight > CLOSEOUT_WAVE_HEIGHT_WIND && windSpeed > CLOSEOUT_WIND_SPEED) {
    const windClass = classifyWind(windDir, windSpeed)
    if (windClass === 'onshore') return true
  }
  return false
}

// ブレイクタイプ
export type BreakType = 'plunging' | 'spilling' | 'closeout' | 'surging' | 'wide'

export type BreakTypeInfo = {
  type: BreakType
  label: string
  labelJa: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

// ワイド判定の補助情報（プロンプトへ反映するため外部公開）
export interface WideDetection {
  isWide: boolean
  crossAngle: number        // swellDirと(bestSwellDir or windDir)の最大角度差
  windSwellRatio: number    // windWaveHeight / swellWaveHeight
}

function angleDiff180(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * ワイド（横に広がって崩れやすい状態）判定
 * - gradualスポット: cross >= 70° AND 風波比 > 0.6
 * - それ以外（steep/moderate）: cross >= 80° AND 風波比 >= 0.7
 * cross = max(|swellDir - bestSwellDir|, |swellDir - windDir|)
 */
export function detectWide(
  bathymetryType: BathymetryProfile['type'],
  swellDir: number,
  bestSwellDir: number,
  windDir: number,
  swellWaveHeight: number,
  windWaveHeight: number,
): WideDetection {
  if (swellWaveHeight <= 0) {
    return { isWide: false, crossAngle: 0, windSwellRatio: 0 }
  }
  const windSwellRatio = windWaveHeight / swellWaveHeight
  const bestDirDiff = angleDiff180(swellDir, bestSwellDir)
  const windSwellAngleDiff = angleDiff180(swellDir, windDir)
  const crossAngle = Math.max(bestDirDiff, windSwellAngleDiff)

  const isWide =
    bathymetryType === 'gradual'
      ? crossAngle >= 70 && windSwellRatio > 0.6
      : crossAngle >= 80 && windSwellRatio >= 0.7

  return { isWide, crossAngle, windSwellRatio }
}

export function predictBreakType(
  bathymetryType: BathymetryProfile['type'],
  tideLevel: number,
  waveHeight: number,
  swellRatio: number,
  closeoutRisk: BathymetryProfile['closeoutRisk'],
  // ワイド判定用（省略可。渡さない場合はワイド判定をスキップ）
  swellDir?: number,
  bestSwellDir?: number,
  windDir?: number,
  swellWaveHeight?: number,
  windWaveHeight?: number,
): BreakTypeInfo {
  // 1) クローズアウト（最優先）: リスク高 × 強うねり × 干潮
  if (closeoutRisk !== 'low' && waveHeight >= 1.0 && tideLevel < 60) {
    return {
      type: 'closeout',
      label: 'Closeout',
      labelJa: 'クローズアウト',
      description: '波が一気に崩れて乗れる場所がない状態。見送り推奨。',
      difficulty: 'advanced',
    }
  }
  // 2) ワイド: クロスうねり × 風波比率（任意パラメータが揃っている場合のみ）
  if (
    swellDir != null && bestSwellDir != null && windDir != null &&
    swellWaveHeight != null && windWaveHeight != null
  ) {
    const { isWide } = detectWide(
      bathymetryType, swellDir, bestSwellDir, windDir, swellWaveHeight, windWaveHeight,
    )
    if (isWide) {
      return {
        type: 'wide',
        label: 'Wide',
        labelJa: 'ワイド気味',
        description: '波が横に広がって崩れやすい状態。セクションが短く乗りにくい。',
        difficulty: 'intermediate',
      }
    }
  }
  // 3) プランジング: 急傾斜 × グランドスウェル × 適正潮位
  if (bathymetryType === 'steep' && swellRatio >= 0.6 && tideLevel >= 60 && tideLevel <= 120) {
    return {
      type: 'plunging',
      label: 'Plunging',
      labelJa: 'ホレた波',
      description: '波のリップが前に飛び出すパワフルな波。チューブが生まれやすい。中上級者向き。',
      difficulty: 'advanced',
    }
  }
  // 4) サージング: 急傾斜 × 満潮
  if (bathymetryType === 'steep' && tideLevel > 130) {
    return {
      type: 'surging',
      label: 'Surging',
      labelJa: 'サージング',
      description: '波が崩れずに砂浜を駆け上がる状態。乗れる波が少ない。',
      difficulty: 'advanced',
    }
  }
  // 5) スピリング（緩傾斜 × 満潮）
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
export function classifyWind(windDir: number, windSpeed: number, spot?: Spot): WindType {
  if (windSpeed <= 2) return 'calm'
  const offDir = spot?.offshoreWindDir ?? 0
  const offRange = spot?.offshoreWindRange ?? 45
  const diff = Math.abs(((windDir - offDir) + 540) % 360 - 180)
  if (diff <= offRange) return 'offshore'
  if (diff <= offRange + 22) return 'side-offshore'
  if (diff <= offRange + 67) return 'side-onshore'
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

// 波高スコア（28点満点）— 基準: 腰サイズ（0.8m）
const PREFERRED_SIZE = 0.8
function scoreWaveHeight(waveHeight: number): number {
  if (waveHeight <= 0.15) return 0               // フラット
  if (waveHeight >= PREFERRED_SIZE) return 28    // 基準サイズ以上
  if (waveHeight >= PREFERRED_SIZE - 0.2) return 20  // −20cm以内
  if (waveHeight >= PREFERRED_SIZE - 0.4) return 9   // −20〜40cm
  return 2                                        // −40cm超
}

// 風スコア（22点満点）
function scoreWind(windSpeed: number, windDir: number, spot?: Spot): number {
  const type = classifyWind(windDir, windSpeed, spot)
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

// うねり方向スコア（18点満点）— swellDirScoreTable ベースで評価
function scoreSwellDir(swellDir: number, spot: Spot): number {
  const table = spot.swellDirScoreTable
  if (!table || table.length === 0) {
    const diff = Math.abs(((swellDir - spot.bestSwellDir + 540) % 360) - 180)
    if (diff <= 20) return 18
    if (diff <= 45) return 11
    if (diff <= 70) return 4
    return 0
  }
  let bestScore = 0
  let minDiff = 360
  for (const entry of table) {
    const diff = Math.abs(((swellDir - entry.dir) + 540) % 360 - 180)
    if (diff < minDiff) {
      minDiff = diff
      bestScore = entry.score
    }
  }
  return bestScore
}

// 【役割】潮位の絶対的な良し悪しを評価（スポット固有の最適潮位帯を使用）
// 　　　　最適潮位帯の中心に近いほど高スコア、帯外はペナルティ
// 　　　　潮の動き方向ボーナスを加算
// 【配点】0〜10点（メインスコアの10点枠）
// 潮位基準: StormGlass Tide APIが観測点を自動選択。単位はcm（MSL基準）。フォールバック値115cm
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

// 波質スコア（3ステップ設計・22点満点）
// 日本の海（周期5〜8秒が多い）に合わせた複合条件スコア

function getBaseWaveQuality(period: number, windType: WindType): number {
  // キレた波帯（周期 ≥ 10秒）
  if (period >= 14) {
    // ピュアグランドスウェル（台風・遠洋低気圧）
    if (windType === 'offshore')      return 22
    if (windType === 'calm')          return 21
    if (windType === 'side-offshore') return 19
    if (windType === 'side-onshore')  return 17
    return 15 // onshore
  }
  if (period >= 10) {
    // グランドスウェル〜良い周期
    if (windType === 'offshore')      return 21
    if (windType === 'calm')          return 20
    if (windType === 'side-offshore') return 18
    if (windType === 'side-onshore')  return 15
    return 14 // onshore
  }
  // グッドウェーブ帯（周期 8〜9秒・風向き問わず）
  if (period >= 8) {
    if (windType === 'offshore')      return 19
    if (windType === 'calm')          return 18
    if (windType === 'side-offshore') return 17
    if (windType === 'side-onshore')  return 15
    return 14 // onshore
  }
  // 周期 6〜7秒: offshore/calm → グッドウェーブ, sideshore → まあまあ, onshore → ワイド気味
  if (period >= 6) {
    if (windType === 'offshore')      return 17
    if (windType === 'calm')          return 14
    if (windType === 'side-offshore') return 11
    if (windType === 'side-onshore')  return 9
    return 4 // onshore → ワイド気味
  }
  // 周期 5秒: onshore → ワイド気味, それ以外 → まあまあ
  if (period >= 5) {
    if (windType === 'offshore')      return 11
    if (windType === 'calm')          return 10
    if (windType === 'side-offshore') return 9
    if (windType === 'side-onshore')  return 9
    return 3 // onshore → ワイド気味
  }
  // 周期 < 5秒: offshore/calm → ワイド気味, sideshore/onshore → ダンパー
  if (windType === 'offshore')      return 6
  if (windType === 'calm')          return 4
  if (windType === 'side-offshore') return 2
  if (windType === 'side-onshore')  return 1
  return 0 // onshore → ダンパー
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
  secondarySwellPeriod?: number,
): number {
  const effectivePeriod = Math.max(wavePeriod, secondarySwellPeriod ?? 0)
  const windType = classifyWind(windDir, windSpeed)
  const base = getBaseWaveQuality(effectivePeriod, windType)
  const swellTide = getSwellTideBonus(waveHeight, tideHeight)
  const periodTide = getPeriodTideBonus(effectivePeriod, tideHeight)
  const swellRatio = getSwellRatio(swellWaveHeight, waveHeight)
  const windSwellPenalty = getWindSwellPenalty(swellRatio, waveHeight)
  const crossSwellPenalty = getCrossSwellPenalty(swellDirection, windWaveDirection, windWaveHeight, waveHeight, secondarySwellHeight, secondarySwellDirection)
  const energy = calcWaveEnergy(waveHeight, effectivePeriod)
  const energyBonus = getWaveEnergyBonus(energy)
  return Math.min(22, Math.max(0, base + swellTide + periodTide + windSwellPenalty + crossSwellPenalty + energyBonus))
}

// 雨判定（雨天時ペナルティ用）
export function isRainy(weather: WaveCondition['weather']): boolean {
  return weather === 'rainy'
}

export function calculateScore(
  condition: WaveCondition,
  spot: Spot,
): SpotScore {
  // スポット固有の波高補正（例: 水族館前は江ノ島の影響で0.8倍）
  const multiplier = spot.waveHeightMultiplier ?? 1.0
  const effCondition = multiplier !== 1.0
    ? { ...condition, waveHeight: condition.waveHeight * multiplier }
    : condition

  // 地形補正係数
  const tb = spot.terrainBonus ?? { offshoreMultiplier: 1.0, swellFocusing: 1.0, shelterFactor: 1.0 }
  const windClass = classifyWind(condition.windDir, condition.windSpeed, spot)
  const isOffshoreOrCalm = windClass === 'offshore' || windClass === 'calm'
  const offMul = isOffshoreOrCalm ? tb.offshoreMultiplier : 1.0

  const waveHeight = Math.round(scoreWaveHeight(effCondition.waveHeight) * offMul * tb.swellFocusing * tb.shelterFactor)
  const wind = scoreWind(condition.windSpeed, condition.windDir, spot)
  const swellDir = Math.round(scoreSwellDir(condition.swellDir, spot) * tb.swellFocusing * tb.shelterFactor)
  const optimalTideRange = spot.bathymetryProfile?.optimalTideRange ?? [80, 120]
  const tide = scoreTideWithBathymetry(condition.tideHeight, condition.tideTrend, optimalTideRange)
  const waveQuality = Math.round(scoreWaveQuality(
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
    condition.secondarySwellPeriod,
  ) * offMul)

  const baseScore = Math.min(100, waveHeight + wind + swellDir + tide + waveQuality)
  const rainPenalty = isRainy(condition.weather) ? -3 : 0
  const total = Math.max(0, baseScore + rainPenalty)

  const breakdown: ScoreBreakdown = {
    waveHeight,
    wind,
    swellDir,
    tide,
    waveQuality,
    weatherBonus: rainPenalty,
    levelCorrection: 0,
  }

  const tags = buildReasonTags(condition, spot, breakdown)

  // クローズアウト判定: 複合条件でグレード×固定
  if (isCloseout(effCondition.waveHeight, condition.windSpeed, condition.windDir)) {
    tags.unshift('クローズアウト')
    return {
      spotId: spot.id,
      score: 0,
      grade: '×',
      breakdown,
      reasonTags: tags,
    }
  }

  // 暴風ペナルティ: 風速が15m/s以上のとき風向きに関わらず総合スコアを強制的に抑制
  // 波高が良くても暴風下ではサーフィン不可能なため、総合スコアを上限でキャップする
  // - 25m/s以上: クローズアウト扱い（★1固定）
  // - 20m/s以上: スコア上限30（★2相当）
  // - 15m/s以上: スコア上限50（★2〜3相当）
  const ws = condition.windSpeed
  let cappedTotal = total
  if (ws >= 25) {
    tags.unshift('暴風（サーフィン不可）')
    return {
      spotId: spot.id,
      score: 0,
      grade: '×',
      breakdown,
      reasonTags: tags,
    }
  }
  if (ws >= 20) {
    tags.unshift('暴風')
    cappedTotal = Math.min(cappedTotal, 30)
  } else if (ws >= 15) {
    tags.unshift('強風')
    cappedTotal = Math.min(cappedTotal, 50)
  }

  return {
    spotId: spot.id,
    score: Math.round(cappedTotal),
    grade: scoreToGrade(cappedTotal),
    breakdown,
    reasonTags: tags,
  }
}

/**
 * 波質ラベルを周期と風向きの複合条件で判定（日本の海の実態に合わせた閾値）
 */
export function waveQualityLabel(period: number, windClass: WindType): string {
  // 周期 ≥ 10秒 → キレた波（風向き問わず）
  if (period >= 10) return 'キレた波'
  // 周期 8〜9秒 → グッドウェーブ（風向き問わず）
  if (period >= 8) return 'グッドウェーブ'
  // 周期 6〜7秒
  if (period >= 6) {
    if (windClass === 'offshore' || windClass === 'calm') return 'グッドウェーブ'
    if (windClass === 'side-offshore' || windClass === 'side-onshore') return 'まあまあ'
    return 'ワイド気味' // onshore
  }
  // 周期 5秒（≥5 <6）
  if (period >= 5) {
    if (windClass === 'onshore') return 'ワイド気味'
    return 'まあまあ' // offshore, calm, sideshore
  }
  // 周期 < 5秒
  if (windClass === 'offshore' || windClass === 'calm') return 'ワイド気味'
  return 'ダンパー' // sideshore or onshore
}

export function waveQualityColor(score: number): { text: string; bg: string } {
  if (score >= 20) return { text: '#0c4a6e', bg: '#dbeafe' }
  if (score >= 14) return { text: '#0369a1', bg: '#e0f2fe' }
  if (score >= 9)  return { text: '#64748b', bg: '#f8fafc' }
  if (score >= 3)  return { text: '#d97706', bg: '#fef9c3' }
  return { text: '#dc2626', bg: '#fee2e2' }
}

export function waveQualitySub(
  score: number,
  wavePeriod: number,
  windType: WindType,
): string {
  const period = Math.round(wavePeriod)
  if (score >= 20) {
    if (windType === 'offshore') return `周期${period}秒 × オフショア`
    return `周期${period}秒 × うねり正面`
  }
  if (score >= 14) return `周期${period}秒・コンディション良好`
  if (score >= 9)  return `周期${period}秒・標準的なコンディション`
  if (score >= 3)  return '周期短め・やや荒れ気味'
  return '周期短め × オンショア・波が崩れやすい'
}

export function getStarRating(score: number, isCloseout: boolean): number {
  if (isCloseout) return 1
  if (score >= 95) return 5
  if (score >= 83) return 4
  if (score >= 65) return 3
  if (score >= 40) return 2
  return 1
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
  breakdown: ScoreBreakdown
): string[] {
  const tags: string[] = []

  if (breakdown.waveHeight >= 28) tags.push('波サイズぴったり')
  else if (breakdown.waveHeight >= 20) tags.push('波やや小さめ')
  else tags.push('波が小さい')

  const windType = classifyWind(condition.windDir, condition.windSpeed, spot)
  if (windType === 'calm') tags.push('無風')
  else if (windType === 'offshore') tags.push(condition.windSpeed <= 5 ? 'オフショア良好' : 'オフショア強め')
  else if (windType === 'side-offshore') tags.push('サイドオフ')
  else if (windType === 'side-onshore') tags.push('サイドオン')
  else tags.push('オンショア')

  if (breakdown.waveQuality >= 17) tags.push('周期◎')
  else if (breakdown.waveQuality <= 3) tags.push('波質注意')

  if (breakdown.tide >= 10) tags.push('潮位◎')
  else if (breakdown.tide <= 2) tags.push('潮位注意')

  // グランドスウェル / 台風スウェル判定
  const swellRatio = getSwellRatio(condition.swellWaveHeight, condition.waveHeight)
  if (swellRatio >= 0.7) {
    if (condition.wavePeriod >= 14) {
      tags.push('台風スウェル🌀')
    } else if (condition.wavePeriod >= 12) {
      tags.push('グランドスウェル🌊')
    }
  }

  // セカンダリースウェル干渉（クロスうねり）
  if (
    condition.secondarySwellHeight != null && condition.secondarySwellHeight >= 0.5 &&
    condition.secondarySwellDirection != null
  ) {
    const crossDiff = getDirectionDiff(condition.swellDir, condition.secondarySwellDirection)
    if (crossDiff >= 60) {
      tags.push('クロスうねり注意')
    }
  }

  return tags
}
