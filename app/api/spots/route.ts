import { NextRequest, NextResponse } from 'next/server'
import { SPOTS } from '@/data/spots'

// Phase 1: 静的データを返す
// Phase 2以降: Firestoreと統合
export async function GET() {
  const activeSpots = SPOTS.filter(s => s.isActive).sort((a, b) => a.order - b.order)
  return NextResponse.json({ spots: activeSpots })
}

export async function POST(request: NextRequest) {
  // Phase 2: 管理画面からのスポット作成
  // 現在はFirebase未設定のため501を返す
  return NextResponse.json({ error: 'Not implemented in Phase 1' }, { status: 501 })
}
