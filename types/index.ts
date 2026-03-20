// ユーザープロフィール
export interface UserProfile {
  level: 'beginner' | 'intermediate' | 'advanced'
  boardType: 'longboard' | 'funboard' | 'shortboard' | 'fish'
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
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

// グレード
export type Grade = '◎' | '○' | '△' | '×'

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

// コミュニティレポート
export interface Report {
  id: string
  spotId: string
  content: string
  grade: Grade
  createdAt: string
  authorName: string
}
