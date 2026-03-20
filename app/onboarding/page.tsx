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

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })

  function handleSkip() {
    saveUserProfile({ ...DEFAULT_PROFILE, onboardingDone: true })
    router.push('/')
  }

  function handleNext() {
    setStep(2)
  }

  function handleComplete() {
    saveUserProfile({ ...profile, onboardingDone: true })
    router.push('/')
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">湘南波予報</h1>
          <p className="text-sm text-slate-500">あなたに最適な波を診断します</p>
        </div>
        <button onClick={handleSkip} className="text-sm text-slate-400 underline">
          あとで設定する
        </button>
      </div>

      {/* ステップインジケーター */}
      <div className="flex gap-2 mb-8">
        {[1, 2].map(s => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Step1
          profile={profile}
          onChange={setProfile}
          onNext={handleNext}
        />
      )}
      {step === 2 && (
        <Step2
          profile={profile}
          onChange={setProfile}
          onComplete={handleComplete}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}

function Step1({
  profile,
  onChange,
  onNext,
}: {
  profile: UserProfile
  onChange: (p: UserProfile) => void
  onNext: () => void
}) {
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl font-bold text-slate-700 mb-6">
        Step 1 — レベルとボード
      </h2>

      {/* レベル */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-600 mb-3">サーフィンレベル</p>
        <div className="space-y-2">
          {LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => onChange({ ...profile, level: l.value })}
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
      </div>

      {/* ボード */}
      <div className="mb-auto">
        <p className="text-sm font-medium text-slate-600 mb-3">使用ボード</p>
        <div className="grid grid-cols-3 gap-2">
          {BOARDS.map(b => (
            <button
              key={b.value}
              onClick={() => onChange({ ...profile, boardType: b.value })}
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
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold text-lg mt-6 active:scale-[0.98] transition-transform"
      >
        次へ
      </button>
    </div>
  )
}

function Step2({
  profile,
  onChange,
  onComplete,
  onBack,
}: {
  profile: UserProfile
  onChange: (p: UserProfile) => void
  onComplete: () => void
  onBack: () => void
}) {
  function toggleSpot(spotId: string) {
    const favs = profile.favoriteSpots.includes(spotId)
      ? profile.favoriteSpots.filter(id => id !== spotId)
      : [...profile.favoriteSpots, spotId]
    onChange({ ...profile, favoriteSpots: favs })
  }

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl font-bold text-slate-700 mb-6">
        Step 2 — 波サイズとスポット
      </h2>

      {/* 波サイズ */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-600 mb-3">好みの波サイズ</p>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => onChange({ ...profile, preferredSize: s.value })}
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
      </div>

      {/* スポット */}
      <div className="mb-auto">
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
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
        >
          戻る
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
        >
          診断開始
        </button>
      </div>
    </div>
  )
}
