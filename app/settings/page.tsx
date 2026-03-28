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

  const selectClass = (active: boolean) =>
    `border-2 transition-colors ${active ? 'border-[#0284c7] bg-sky-50' : 'border-[#eef1f4] bg-white'}`

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>設定変更</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Settings</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-32 px-4 pt-4 space-y-6">
        {/* レベル */}
        <section>
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
        </section>

        {/* ボード */}
        <section>
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
        </section>

        {/* 波サイズ */}
        <section>
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
        </section>

        {/* スポット */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8899aa] mb-3">よく行くスポット（複数可）</p>
          <div className="space-y-2">
            {SPOTS.filter(s => s.isActive).map(spot => (
              <button
                key={spot.id}
                onClick={() => toggleSpot(spot.id)}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-3 ${selectClass(profile.favoriteSpots.includes(spot.id))}`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  profile.favoriteSpots.includes(spot.id)
                    ? 'border-[#0284c7] bg-[#0284c7]'
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
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-white border-t border-[#eef1f4]">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-[#0284c7] text-white rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
        >
          保存する
        </button>
      </div>
    </div>
  )
}
