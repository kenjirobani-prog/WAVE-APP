// ユーザープロフィール
export interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced'
  boardType: 'longboard' | 'funboard' | 'shortboard'
  preferredSize: 'ankle' | 'waist-chest' | 'head' | 'overhead'
  favoriteSpots: string[]
  onboardingDone: boolean
}

// スポット
export interface Spot {
  id: string
  name: string
  nameEn: string
  lat: number
  lng: number
  bestSwellDir: number
  swellDirRange: number
  optimalTideMin: number
  optimalTideMax: number
  bestTideMovement: 'rising' | 'falling' | 'slack'
  beginnerScore: number        // 1-5
  waveType: 'beach' | 'point' | 'reef'
  waveCharacter: string
  parking: 'free' | 'paid' | 'none'
  shower: boolean
  access: string
  liveCameraUrl?: string
  isActive: boolean
  order: number
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
  weatherBonus: number
  levelCorrection: number
}
