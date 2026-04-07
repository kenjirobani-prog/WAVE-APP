// ユーザープロフィール
export interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced'
  boardType: 'longboard' | 'funboard' | 'shortboard'
  preferredSize: 'ankle' | 'waist-chest' | 'head' | 'overhead'
  favoriteSpots: string[]
  onboardingDone: boolean
}

// スポット固有の海底地形プロファイル
export interface BathymetryProfile {
  type: 'gradual' | 'moderate' | 'steep'
  // gradual: 遠浅・スピリング傾向（鵠沼・辻堂・由比ヶ浜）
  // moderate: 中間（茅ヶ崎・大磯）
  // steep: 急傾斜・プランジング傾向（七里ヶ浜）
  optimalTideRange: [number, number]   // 最適潮位帯（cm）
  swellSensitivity: 'high' | 'medium' | 'low'  // うねりの拾いやすさ
  closeoutRisk: 'high' | 'medium' | 'low'      // クローズアウトリスク
}

// エリア
export type AreaKey = 'shonan' | 'chiba-north' | 'chiba-south' | 'ibaraki'

// 地形補正係数
export interface TerrainBonus {
  offshoreMultiplier: number  // オフショア時の波高・波質スコアへの乗数（1.0=補正なし）
  swellFocusing: number       // 地形によるうねり集中度（1.0=標準）
  shelterFactor: number       // 堤防・漁港等によるうねり軽減係数（1.0=遮蔽なし）
}

// スポット
export interface Spot {
  id: string
  name: string
  nameEn: string
  lat: number
  lng: number
  area: AreaKey
  areaLabel: string
  bestSwellDir: number
  swellDirRange: number
  swellDirScoreTable: Array<{ dir: number; score: number }>
  optimalTideMin: number
  optimalTideMax: number
  bestTideMovement: 'rising' | 'falling' | 'any'
  beginnerScore: number        // 1-5
  waveType: 'beach' | 'point' | 'reef'
  waveCharacter: string
  parking: 'free' | 'paid' | 'none'
  shower: boolean
  access: string
  liveCameraUrl?: string
  livecam?: {
    type: 'link' | null
    url?: string
    channelName?: string
  }
  mapUrl?: string
  mapPlaceName?: string
  mapCenter?: { lat: number; lng: number }
  waveHeightMultiplier: number    // スポット固有の波高補正係数
  offshoreWindDir: number         // オフショア風の中心方向（度、真北基準）
  offshoreWindRange: number       // オフショアとみなす範囲 ±度
  terrainBonus: TerrainBonus
  coastlineAngle?: number            // 海岸線の方角（度数、真北基準）
  bathymetryProfile?: BathymetryProfile
  description?: string
  bestSeasons: ('spring' | 'summer' | 'autumn' | 'winter')[]
  bestTide?: string
  tideType?: string               // 潮のタイプ（ミドルタイド優勢 etc）
  offshoreLabel?: string           // オフショア風の方角（日本語表記）
  swellDirLabel?: string           // 対応うねり方向（日本語表記）
  waveTypeTags?: string[]
  facilities?: string[]
  beginnerNote?: string
  isActive: boolean
  order: number
  defaultOrder?: number
  createdAt: string
  updatedAt: string
}

// グレード
export type Grade = '◎' | '○' | '△' | '×'

// 風向き種別（湘南は海岸線が東西方向）
export type WindType = 'calm' | 'offshore' | 'side-offshore' | 'side-onshore' | 'onshore'

// サーフログ
export interface SurfLog {
  id: string          // Date.now() の文字列
  date: string        // "2026-03-20"
  spotId: string
  spotName: string
  grade: Grade
  score: number
}

// スポットスコア結果
export interface SpotScore {
  spotId: string
  score: number
  grade: Grade
  breakdown: ScoreBreakdown
  reasonTags: string[]
}

export interface ScoreBreakdown {
  waveHeight: number
  wind: number
  swellDir: number
  tide: number
  waveQuality: number
  weatherBonus: number
  levelCorrection: number
}
