'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import BackButton from '@/components/BackButton'
import ArrowButton from '@/components/ui/ArrowButton'
import type { SurfboardItem } from '@/app/api/surfboards/route'

const GENRE_EN: Record<string, string> = {
  'ショートボード': 'SHORT BOARD',
  'ミッドレングス': 'MID LENGTH',
  'ロングボード': 'LONG BOARD',
  'ソフトボード': 'SOFT BOARD',
  'ロング・ソフト': 'LONG / SOFT',
}

function lengthToFeet(inch: number | null): string {
  if (!inch) return '—'
  const feet = Math.floor(inch / 12)
  const rem = Math.round(inch % 12)
  return rem > 0 ? `${feet}'${rem}"` : `${feet}'0"`
}

function SpecGrid({ item }: { item: SurfboardItem }) {
  const specs: { label: string; en: string; value: string }[] = [
    { label: '長さ', en: 'LENGTH', value: lengthToFeet(item.lengthInch) },
    { label: 'ボリューム', en: 'VOLUME', value: item.volumeL ? `${item.volumeL}L` : '—' },
    { label: 'フィン', en: 'FIN', value: item.fin || '—' },
    { label: 'ジャンル', en: 'GENRE', value: item.genre || '—' },
  ]
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {specs.map(s => (
        <div
          key={s.label}
          style={{
            background: 'var(--paper-100)',
            border: '1px solid var(--ink-900)',
            padding: '12px 14px',
          }}
        >
          <div
            className="font-display text-[9px] tracking-[0.08em]"
            style={{ color: 'var(--ink-500)' }}
          >
            {s.en}
          </div>
          <div
            className="font-jp text-[10px] font-medium mt-0.5"
            style={{ color: 'var(--ink-500)' }}
          >
            {s.label}
          </div>
          <div
            className="font-jp text-base font-black mt-1.5"
            style={{ color: 'var(--ink-900)' }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function MinimalHeader({ title }: { title: string }) {
  return (
    <header
      className="px-5 pt-5 pb-5"
      style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
    >
      <div className="flex items-center gap-3 mb-3.5">
        <BackButton />
        <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
          サーフボード一覧へ戻る
        </div>
      </div>
      <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
        <div className="font-display text-3xl leading-[0.95] tracking-[0.02em]">SURFBOARDS</div>
      </div>
      <div className="font-jp text-sm font-bold mt-2">{title}</div>
    </header>
  )
}

function SkeletonBlock({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        background: 'var(--paper-300)',
        height,
        border: '1px solid var(--ink-900)',
      }}
    />
  )
}

export default function SurfboardDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<SurfboardItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/surfboards')
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        const found = (data.items as SurfboardItem[])?.find(i => i.id === id)
        setItem(found ?? null)
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
        <MinimalHeader title="読み込み中..." />
        <main className="flex-1 px-5 py-5 space-y-3">
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
        </main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
        <MinimalHeader title="ボードが見つかりません" />
        <main className="flex-1 flex items-center justify-center">
          <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>
            ボードが見つかりませんでした
          </p>
        </main>
      </div>
    )
  }

  const brandEn = (item.brand || '').toUpperCase()
  const genreEn = GENRE_EN[item.genre] ?? item.genre.toUpperCase()

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--paper-300)' }}>
      {/* Header */}
      <header
        className="px-5 pt-5 pb-5"
        style={{ background: 'var(--paper-100)', borderBottom: '4px solid var(--ink-900)' }}
      >
        <div className="flex items-center gap-3 mb-3.5">
          <BackButton />
          <div className="font-jp text-[11px] font-bold" style={{ color: 'var(--ink-500)' }}>
            サーフボード一覧へ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-3xl leading-[0.95] tracking-[0.02em]">
            {brandEn || 'SURFBOARD'}
          </div>
        </div>
        <div className="font-jp text-base font-bold mt-2 leading-tight" style={{ color: 'var(--ink-900)' }}>
          {item.model || item.name}
        </div>
        <div
          className="flex items-center gap-2 mt-3 pt-2.5 flex-wrap"
          style={{ borderTop: '1px solid var(--ink-900)' }}
        >
          <span
            className="font-display text-[10px] tracking-[0.08em] px-2 py-0.5"
            style={{ background: 'var(--ink-900)', color: 'var(--paper-100)' }}
          >
            {genreEn}
          </span>
          {item.lengthInch && (
            <span
              className="font-jp text-[10px] font-bold px-2 py-0.5"
              style={{
                background: 'transparent',
                color: 'var(--ink-900)',
                border: '1px solid var(--ink-900)',
              }}
            >
              {lengthToFeet(item.lengthInch)}
            </span>
          )}
          {item.volumeL && (
            <span
              className="font-jp text-[10px] font-bold px-2 py-0.5"
              style={{
                background: 'transparent',
                color: 'var(--ink-900)',
                border: '1px solid var(--ink-900)',
              }}
            >
              {item.volumeL}L
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-4" style={{ background: 'var(--paper-100)' }}>
        <div className="px-5 py-5 space-y-3">
          {/* Spec details */}
          <section
            style={{
              background: 'var(--paper-100)',
              border: '1px solid var(--ink-900)',
              padding: '18px 16px',
            }}
          >
            <div
              className="flex items-center justify-between pb-2 mb-3"
              style={{ borderBottom: '1px solid var(--ink-900)' }}
            >
              <div className="font-display text-[12px] tracking-[0.1em]">
                SPECIFICATIONS
              </div>
              <div
                className="font-jp text-[10px] font-bold"
                style={{ color: 'var(--ink-500)' }}
              >
                スペック詳細
              </div>
            </div>
            <SpecGrid item={item} />
          </section>

          {/* For these surfers */}
          <section
            style={{
              background: 'var(--paper-300)',
              border: '1px solid var(--ink-900)',
              padding: '18px 16px',
            }}
          >
            <div
              className="flex items-center justify-between pb-2 mb-3"
              style={{ borderBottom: '1px solid var(--ink-900)' }}
            >
              <div className="font-display text-[12px] tracking-[0.1em]">
                FOR SURFERS
              </div>
              <div
                className="font-jp text-[10px] font-bold"
                style={{ color: 'var(--ink-500)' }}
              >
                こんなサーファーに
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {item.level && (
                <span
                  className="font-jp text-xs font-bold px-3 py-1.5"
                  style={{
                    background: 'var(--ink-900)',
                    color: 'var(--paper-100)',
                  }}
                >
                  {item.level}
                </span>
              )}
              {item.waveSize && (
                <span
                  className="font-jp text-xs font-bold px-3 py-1.5"
                  style={{
                    background: 'var(--paper-100)',
                    color: 'var(--ink-900)',
                    border: '1px solid var(--ink-900)',
                  }}
                >
                  {item.waveSize}
                </span>
              )}
              <span
                className="font-jp text-xs font-bold px-3 py-1.5"
                style={{
                  background: 'var(--paper-100)',
                  color: 'var(--ink-900)',
                  border: '1px solid var(--ink-900)',
                }}
              >
                {item.genre}
              </span>
            </div>
          </section>

          {/* Description */}
          {item.description && (
            <section
              style={{
                background: 'var(--paper-100)',
                border: '1px solid var(--ink-900)',
                padding: '18px 16px',
              }}
            >
              <div
                className="flex items-center justify-between pb-2 mb-3"
                style={{ borderBottom: '1px solid var(--ink-900)' }}
              >
                <div className="font-display text-[12px] tracking-[0.1em]">
                  DESCRIPTION
                </div>
                <div
                  className="font-jp text-[10px] font-bold"
                  style={{ color: 'var(--ink-500)' }}
                >
                  特徴・コメント
                </div>
              </div>
              <p
                className="font-jp text-[13px] font-medium leading-[1.85]"
                style={{ color: 'var(--ink-700)' }}
              >
                {item.description}
              </p>
            </section>
          )}

          {/* Price + official link */}
          <section
            style={{
              background: 'var(--paper-100)',
              border: '1px solid var(--ink-900)',
              padding: '18px 16px',
            }}
          >
            <div
              className="flex items-center justify-between pb-2 mb-3"
              style={{ borderBottom: '1px solid var(--ink-900)' }}
            >
              <div className="font-display text-[12px] tracking-[0.1em]">
                PRICE
              </div>
              <div
                className="font-jp text-[10px] font-bold"
                style={{ color: 'var(--ink-500)' }}
              >
                価格・公式サイト
              </div>
            </div>
            <div className="mb-4">
              {item.priceUSD ? (
                <>
                  <div
                    className="font-display tracking-[0.02em]"
                    style={{ fontSize: 36, lineHeight: 0.95, color: 'var(--ink-900)' }}
                  >
                    ${item.priceUSD.toLocaleString()}
                  </div>
                  <div
                    className="font-jp text-xs font-medium mt-2"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    約 ¥{Math.round(item.priceUSD * 150).toLocaleString()}（150円換算）
                  </div>
                </>
              ) : item.priceJPY ? (
                <div
                  className="font-display tracking-[0.02em]"
                  style={{ fontSize: 36, lineHeight: 0.95, color: 'var(--ink-900)' }}
                >
                  ¥{item.priceJPY.toLocaleString()}
                </div>
              ) : (
                <p className="font-jp text-sm" style={{ color: 'var(--ink-500)' }}>
                  価格情報なし
                </p>
              )}
            </div>
            {item.officialUrl ? (
              <a
                href={item.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                style={{
                  background: 'var(--ink-900)',
                  color: 'var(--paper-100)',
                  padding: '14px 18px',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div
                      className="font-display text-[10px] tracking-[0.08em]"
                      style={{ color: 'rgba(251,248,243,0.6)' }}
                    >
                      OFFICIAL SITE
                    </div>
                    <div className="font-jp text-sm font-black mt-1">公式サイトで見る</div>
                  </div>
                  <ArrowButton variant="light" size={28} />
                </div>
              </a>
            ) : (
              <span
                className="inline-block font-jp text-xs font-bold px-3 py-1.5"
                style={{
                  background: 'var(--paper-300)',
                  color: 'var(--ink-500)',
                  border: '1px solid var(--ink-300)',
                }}
              >
                販売終了
              </span>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
