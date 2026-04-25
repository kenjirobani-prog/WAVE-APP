'use client'
import { useEffect, useState } from 'react'
import BackButton from '@/components/BackButton'
import TyphoonCard from '@/components/typhoon/TyphoonCard'
import TyphoonArchiveRow from '@/components/typhoon/TyphoonArchiveRow'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

interface Typhoon {
  id: string
  name: string
  number: number
  position: { lat: number; lon: number }
  pressure: number
  windSpeed: number
  isActive: boolean
  isWithin800km: boolean
  updatedAt?: string
  startedAt?: string
  intensity?: string
  size?: string
}

const STAGES: { en: string; jp: string; description: string; color: string }[] = [
  { en: 'DANGER', jp: '危険域', description: '日本沿岸に接近・上陸の恐れあり。海に入らないでください。', color: 'var(--alert-red)' },
  { en: 'CLOSE', jp: '接近', description: '600km圏内。波の急激な増大とクローズアウトに警戒。', color: 'var(--ink-900)' },
  { en: 'SWELL', jp: 'スウェル到達', description: '900km圏内。良いうねりが届くゾーン。', color: 'var(--ink-900)' },
  { en: 'WATCH', jp: '観察中', description: '1500km圏内。今後の進路に注意。', color: 'var(--ink-700)' },
]

export default function TyphoonYearClient({ year }: { year: string }) {
  const [typhoons, setTyphoons] = useState<Typhoon[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        await ensureAnonymousAuth()
        const db = getDb()
        const ref = collection(db, 'typhoons', year, 'list')
        const q = query(ref, orderBy('updatedAt', 'desc'))
        const snap = await getDocs(q)
        const results: Typhoon[] = []
        snap.forEach(doc => {
          const d = doc.data()
          results.push({
            id: doc.id,
            name: d.name ?? '',
            number: d.number ?? 0,
            position: d.position ?? { lat: 0, lon: 0 },
            pressure: d.pressure ?? 0,
            windSpeed: d.windSpeed ?? 0,
            isActive: d.isActive ?? false,
            isWithin800km: d.isWithin800km ?? false,
            updatedAt: d.updatedAt,
            startedAt: d.startedAt,
            intensity: d.intensity,
            size: d.size,
          })
        })
        setTyphoons(results)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setTyphoons([])
      }
    }
    load()
  }, [year])

  const activeTyphoons = typhoons?.filter(t => t.isActive && t.isWithin800km) ?? []
  const pastTyphoons = typhoons?.filter(t => !t.isActive || !t.isWithin800km) ?? []
  const isDanger = activeTyphoons.length > 0

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      <header
        className="px-5 pt-5 pb-5"
        style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
      >
        <div className="flex items-center gap-3 mb-3.5">
          <BackButton />
          <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
            メニューへ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-4xl leading-[0.95] tracking-[0.02em]">TYPHOON</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">台風情報</div>
        <div
          className="font-display text-[10px] tracking-[0.08em] mt-2"
          style={{ color: 'var(--ink-500)' }}
        >
          {year} SEASON
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4">
        {/* 現在の状況 (Status section, black bg) */}
        <section
          className="px-5 py-6"
          style={{
            background: 'var(--ink-900)',
            color: 'var(--paper-100)',
            borderBottom: '2px solid var(--ink-900)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="font-display text-[10px] tracking-[0.08em]"
                style={{ color: 'rgba(251,248,243,0.6)' }}
              >
                CURRENT STATUS
              </div>
              <div className="font-jp text-base font-black mt-1">現在の状況</div>
            </div>
            <div
              className="font-display text-xs font-bold tracking-[0.1em] px-3 py-1.5"
              style={{
                background: isDanger ? 'var(--alert-red)' : 'var(--paper-100)',
                color: isDanger ? 'var(--paper-100)' : 'var(--ink-900)',
              }}
            >
              {isDanger ? 'DANGER' : 'SAFE'}
            </div>
          </div>
          <div
            className="font-jp text-[12px] font-medium leading-[1.7]"
            style={{ color: 'rgba(251,248,243,0.85)' }}
          >
            {typhoons === null
              ? '読み込み中...'
              : error
                ? 'データを取得できませんでした。'
                : isDanger
                  ? '日本へのうねり影響が見込まれる台風があります。注意してください。'
                  : '現在、日本への影響が見込まれる台風はありません。'}
          </div>
        </section>

        {/* Active typhoons */}
        {activeTyphoons.length > 0 && (
          <section
            className="px-5 py-6"
            style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
          >
            <div className="mb-4">
              <div className="font-display text-xl leading-none">ACTIVE TYPHOON</div>
              <div
                className="font-jp text-[10px] font-medium mt-1"
                style={{ color: 'var(--ink-500)' }}
              >
                影響中の台風
              </div>
            </div>
            <div className="space-y-3">
              {activeTyphoons.map(t => (
                <TyphoonCard key={t.id} year={year} typhoon={t} />
              ))}
            </div>
          </section>
        )}

        {/* Warning section (red) */}
        {isDanger && (
          <section
            className="px-5 py-6"
            style={{
              background: 'var(--alert-red-bg)',
              borderLeft: '4px solid var(--alert-red)',
              borderBottom: '2px solid var(--ink-900)',
            }}
          >
            <div className="font-display text-xl leading-none" style={{ color: 'var(--alert-red)' }}>
              WARNING
            </div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              注意事項
            </div>
            <p
              className="font-jp text-[13px] font-medium leading-[1.85] mt-3"
              style={{ color: 'var(--ink-900)' }}
            >
              台風接近時は波が急激に変化し、クローズアウトや危険な海況になる可能性があります。海上保安庁・気象庁の最新情報を必ず確認し、無理な入水は避けてください。
            </p>
          </section>
        )}

        {/* Stage explanation */}
        <section
          className="px-5 py-6"
          style={{ background: 'var(--paper-100)', borderBottom: '2px solid var(--ink-900)' }}
        >
          <div className="mb-4">
            <div className="font-display text-xl leading-none">STAGES</div>
            <div
              className="font-jp text-[10px] font-medium mt-1"
              style={{ color: 'var(--ink-500)' }}
            >
              ステージの説明
            </div>
          </div>
          <div style={{ border: '1px solid var(--ink-900)' }}>
            {STAGES.map((stage, i) => (
              <div
                key={stage.en}
                className="flex items-start gap-4 px-4 py-3"
                style={{
                  background: i % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-300)',
                  borderBottom: i < STAGES.length - 1 ? '1px solid var(--ink-900)' : 'none',
                }}
              >
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div
                    className="font-display text-base font-bold tracking-[0.06em]"
                    style={{ color: stage.color }}
                  >
                    {stage.en}
                  </div>
                  <div
                    className="font-jp text-[11px] font-bold mt-0.5"
                    style={{ color: 'var(--ink-700)' }}
                  >
                    {stage.jp}
                  </div>
                </div>
                <div
                  className="flex-1 font-jp text-[12px] font-medium leading-[1.7]"
                  style={{ color: 'var(--ink-900)' }}
                >
                  {stage.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past typhoons archive */}
        {pastTyphoons.length > 0 && (
          <section
            className="px-5 py-6"
            style={{ background: 'var(--paper-300)', borderBottom: '4px solid var(--ink-900)' }}
          >
            <div className="mb-4">
              <div className="font-display text-xl leading-none">ARCHIVE</div>
              <div
                className="font-jp text-[10px] font-medium mt-1"
                style={{ color: 'var(--ink-500)' }}
              >
                {year}年の台風一覧
              </div>
            </div>
            <div className="space-y-2">
              {pastTyphoons.map(t => (
                <TyphoonArchiveRow key={t.id} year={year} typhoon={t} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
