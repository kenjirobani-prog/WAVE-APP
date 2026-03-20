'use client'
// Phase 2: Firebase Auth + Firestore と統合予定
// Phase 1では静的スポットデータを表示するのみ
import { SPOTS } from '@/data/spots'
import type { Spot } from '@/types'

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">管理画面</h1>
      <p className="text-sm text-slate-500 mb-6">
        Phase 2でFirebase Auth + Firestoreと統合予定。現在は静的データのみ表示。
      </p>
      <div className="space-y-3">
        {SPOTS.map(spot => (
          <SpotRow key={spot.id} spot={spot} />
        ))}
      </div>
    </div>
  )
}

function SpotRow({ spot }: { spot: Spot }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800">{spot.name}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${spot.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
            {spot.isActive ? '公開中' : '非公開'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          ベストうねり: {spot.bestSwellDir}° / 最適潮位: {spot.optimalTideMin}〜{spot.optimalTideMax}cm
        </p>
      </div>
      <span className="text-sm text-slate-400">#{spot.order}</span>
    </div>
  )
}
