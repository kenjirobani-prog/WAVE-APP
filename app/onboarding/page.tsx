'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPOTS } from '@/data/spots'
import { saveUserProfile, DEFAULT_PROFILE } from '@/lib/userProfile'
import type { UserProfile } from '@/types'

const LEVELS: { value: UserProfile['level']; label: string; desc: string }[] = [
  { value: 'beginner', label: '初級者', desc: '波乗り歴1年未満、ホワイトウォーターメイン' },
  { value: 'intermediate', label: '中級者', desc: 'テイクオフ安定、フェイスを滑れる' },
  { value: 'advanced', label: '上級者', desc: 'カービング・チューブなど高度な技あり' },
]

const BOARDS: { value: UserProfile['boardType']; label: string }[] = [
  { value: 'longboard', label: 'ロング' },
  { value: 'funboard', label: 'ミッドレングス' },
  { value: 'shortboard', label: 'ショート' },
]

const SIZES: { value: UserProfile['preferredSize']; label: string; height: string }[] = [
  { value: 'ankle', label: '〜腰', height: '〜0.5m' },
  { value: 'waist-chest', label: '胸〜肩', height: '0.5〜1m' },
  { value: 'head', label: '頭', height: '1〜1.5m' },
  { value: 'overhead', label: 'オーバーヘッド', height: '1.5m〜' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })

  function handleSkip() {
    saveUserProfile({ ...DEFAULT_PROFILE, onboardingDone: true })
    router.push('/')
  }

  function handleComplete() {
    saveUserProfile({ ...profile, onboardingDone: true })
    router.push('/')
  }

  const selectClass = (active: boolean) =>
    `border-2 transition-colors ${active ? 'border-sky-900 bg-sky-50' : 'border-[#eef1f4] bg-white'}`

  return (
    <div className="flex-1 flex flex-col p-6 bg-[#f0f4f8]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a1628]">Shonan Wave Forecast</h1>
          <p className="text-sm text-[#8899aa]">あなたに最適な波を診断します</p>
        </div>
        <button onClick={handleSkip} className="text-sm text-[#8899aa] underline">
          あとで設定する
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2].map(s => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sky-900' : 'bg-[#dde3ea]'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-lg font-bold text-[#0a1628] mb-6">Step 1 — レベルとボード</h2>

          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">サーフィンレベル</p>
            <div className="space-y-2">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setProfile({ ...profile, level: l.value })}
                  className={`w-full text-left p-4 rounded-xl ${selectClass(profile.level === l.value)}`}
                >
                  <span className="font-bold text-[#0a1628]">{l.label}</span>
                  <span className="text-sm text-[#8899aa] block mt-0.5">{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">使用ボード</p>
            <div className="grid grid-cols-3 gap-2">
              {BOARDS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setProfile({ ...profile, boardType: b.value })}
                  className={`p-4 rounded-xl text-center ${selectClass(profile.boardType === b.value)}`}
                >
                  <span className="text-sm font-semibold text-[#0a1628]">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-sky-900 text-white rounded-xl font-bold text-base mt-6 active:scale-[0.98] transition-transform"
          >
            次へ
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-lg font-bold text-[#0a1628] mb-6">Step 2 — 波サイズとスポット</h2>

          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">好みの波サイズ</p>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setProfile({ ...profile, preferredSize: s.value })}
                  className={`p-4 rounded-xl text-center ${selectClass(profile.preferredSize === s.value)}`}
                >
                  <span className="font-bold text-[#0a1628]">{s.label}</span>
                  <span className="text-xs text-[#8899aa] block mt-0.5">{s.height}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">よく行くスポット（複数可）</p>
            <div className="space-y-2">
              {SPOTS.filter(s => s.isActive).map(spot => (
                <button
                  key={spot.id}
                  onClick={() => {
                    const favs = profile.favoriteSpots.includes(spot.id)
                      ? profile.favoriteSpots.filter(id => id !== spot.id)
                      : [...profile.favoriteSpots, spot.id]
                    setProfile({ ...profile, favoriteSpots: favs })
                  }}
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 ${selectClass(profile.favoriteSpots.includes(spot.id))}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    profile.favoriteSpots.includes(spot.id)
                      ? 'border-sky-900 bg-sky-900'
                      : 'border-[#dde3ea]'
                  }`}>
                    {profile.favoriteSpots.includes(spot.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <span className="font-bold text-[#0a1628]">{spot.name}</span>
                    <span className="text-xs text-[#8899aa] block">{spot.access}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 bg-white border border-[#dde3ea] text-[#8899aa] rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
            >
              戻る
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-4 bg-sky-900 text-white rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
            >
              診断開始
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
