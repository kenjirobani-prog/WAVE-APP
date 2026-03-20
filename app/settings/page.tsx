'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { getUserProfile, saveUserProfile } from '@/lib/userProfile'
import type { UserProfile } from '@/types'

const LEVELS: { value: UserProfile['level']; label: string; desc: string }[] = [
  { value: 'beginner', label: '初級者', desc: '波乗り歴1年未満、ホワイトウォーターメイン' },
  { value: 'intermediate', label: '中級者', desc: 'テイクオフ安定、フェイスを滑れる' },
  { value: 'advanced', label: '上級者', desc: 'カービング・チューブなど高度な技あり' },
]

const BOARDS: { value: UserProfile['boardType']; label: string }[] = [
  { value: 'longboard', label: 'ロングボード' },
  { value: 'funboard', label: 'ファンボード' },
  { value: 'shortboard', label: 'ショートボード' },
]

const SIZES: { value: UserProfile['preferredSize']; label: string; height: string }[] = [
  { value: 'ankle', label: '〜腰', height: '〜0.5m' },
  { value: 'waist-chest', label: '胸〜肩', height: '0.5〜1m' },
  { value: 'head', label: '頭', height: '1〜1.5m' },
  { value: 'overhead', label: 'オーバーヘッド', height: '1.5m〜' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile())

  function handleSave() {
    saveUserProfile({ ...profile, onboardingDone: true })
    router.push('/my-page')
  }

  function toggleSpot(spotId: string) {
    const favs = profile.favoriteSpots.includes(spotId)
      ? profile.favoriteSpots.filter(id => id !== spotId)
      : [...profile.favoriteSpots, spotId]
    setProfile({ ...profile, favoriteSpots: favs })
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-800">設定変更</h1>
      </header>

      <main className="flex-1 overflow-auto pb-32 px-4 pt-4 space-y-6">
        {/* レベル */}
        <section>
          <p className="text-sm font-medium text-slate-600 mb-3">サーフィンレベル</p>
          <div className="space-y-2">
            {LEVELS.map(l => (
              <button
                key={l.value}
                onClick={() => setProfile({ ...profile, level: l.value })}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                  profile.level === l.value
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="font-semibold text-slate-800">{l.label}</span>
                <span className="text-sm text-slate-500 block mt-0.5">{l.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ボード */}
        <section>
          <p className="text-sm font-medium text-slate-600 mb-3">使用ボード</p>
          <div className="grid grid-cols-3 gap-2">
            {BOARDS.map(b => (
              <button
                key={b.value}
                onClick={() => setProfile({ ...profile, boardType: b.value })}
                className={`p-4 rounded-xl border-2 transition-colors text-center ${
                  profile.boardType === b.value
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="text-sm font-medium text-slate-700">{b.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 波サイズ */}
        <section>
          <p className="text-sm font-medium text-slate-600 mb-3">好みの波サイズ</p>
          <div className="grid grid-cols-2 gap-2">
            {SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setProfile({ ...profile, preferredSize: s.value })}
                className={`p-4 rounded-xl border-2 transition-colors text-center ${
                  profile.preferredSize === s.value
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="font-bold text-slate-800">{s.label}</span>
                <span className="text-xs text-slate-500 block mt-0.5">{s.height}</span>
              </button>
            ))}
          </div>
        </section>

        {/* スポット */}
        <section>
          <p className="text-sm font-medium text-slate-600 mb-3">よく行くスポット（複数可）</p>
          <div className="space-y-2">
            {SPOTS.filter(s => s.isActive).map(spot => (
              <button
                key={spot.id}
                onClick={() => toggleSpot(spot.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                  profile.favoriteSpots.includes(spot.id)
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  profile.favoriteSpots.includes(spot.id)
                    ? 'border-sky-500 bg-sky-500'
                    : 'border-slate-300'
                }`}>
                  {profile.favoriteSpots.includes(spot.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <div>
                  <span className="font-semibold text-slate-800">{spot.name}</span>
                  <span className="text-xs text-slate-500 block">{spot.access}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* 保存ボタン（固定フッター） */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-white border-t border-slate-100">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
        >
          保存する
        </button>
      </div>
    </div>
  )
}
