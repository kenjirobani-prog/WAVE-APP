import Link from 'next/link'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer
      className="px-5 py-7"
      style={{
        background: 'var(--paper-100)',
        color: 'var(--ink-900)',
        borderTop: '4px solid var(--ink-900)',
      }}
    >
      {/* メニュー2カラム */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-7">
        <div>
          <div
            className="font-display text-[11px] tracking-[0.1em] mb-2.5"
            style={{ color: 'var(--ink-500)' }}
          >
            FORECAST
          </div>
          <div className="font-jp text-xs font-bold leading-[2]">
            <div><Link href="/" style={{ color: 'var(--ink-900)' }}>湘南</Link></div>
            <div><Link href="/chiba-north" style={{ color: 'var(--ink-900)' }}>千葉北</Link></div>
            <div><Link href="/chiba-south" style={{ color: 'var(--ink-900)' }}>千葉南</Link></div>
            <div><Link href="/ibaraki" style={{ color: 'var(--ink-900)' }}>茨城</Link></div>
          </div>
        </div>
        <div>
          <div
            className="font-display text-[11px] tracking-[0.1em] mb-2.5"
            style={{ color: 'var(--ink-500)' }}
          >
            EXPLORE
          </div>
          <div className="font-jp text-xs font-bold leading-[2]">
            <div><Link href="/about" style={{ color: 'var(--ink-900)' }}>About Us</Link></div>
            <div><Link href={`/typhoon/${CURRENT_YEAR}`} style={{ color: 'var(--ink-900)' }}>台風情報</Link></div>
            <div><Link href="/howto" style={{ color: 'var(--ink-900)' }}>サーフィンの始め方</Link></div>
            <div><Link href="/glossary" style={{ color: 'var(--ink-900)' }}>用語集</Link></div>
            <div><Link href="/surfboards" style={{ color: 'var(--ink-900)' }}>サーフボード図鑑</Link></div>
            <div><Link href="/faq" style={{ color: 'var(--ink-900)' }}>FAQ</Link></div>
          </div>
        </div>
      </div>

      {/* 1px罫線 */}
      <div style={{ borderTop: '1px solid var(--ink-900)', paddingTop: 16, marginBottom: 16 }} />

      {/* DATA SOURCE / FOLLOW */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div
            className="font-display text-[10px] tracking-[0.1em] mb-1"
            style={{ color: 'var(--ink-500)' }}
          >
            DATA SOURCE
          </div>
          <div className="font-jp text-[11px] font-medium">StormGlass / 気象庁</div>
        </div>
        <div>
          <div
            className="font-display text-[10px] tracking-[0.1em] mb-1 text-right"
            style={{ color: 'var(--ink-500)' }}
          >
            FOLLOW
          </div>
          <a
            href="https://x.com/ichinisantaro"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-right font-jp text-[11px] font-bold"
            style={{ color: 'var(--ink-900)' }}
          >
            @ichinisantaro
          </a>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div style={{ borderTop: '1px solid var(--ink-900)', paddingTop: 16, marginBottom: 5 }} />
      <div className="mb-5">
        <div
          className="font-display text-[10px] tracking-[0.1em] mb-2"
          style={{ color: 'var(--ink-500)' }}
        >
          DISCLAIMER
        </div>
        <p
          className="font-jp text-[10px] leading-[1.7] font-medium"
          style={{ color: 'var(--ink-500)', margin: 0 }}
        >
          本サービスの波予報はAIおよび気象数値モデルによる自動生成です。実際のコンディションと異なる場合があります。海に入る際は現地の状況を必ずご自身でご確認ください。
        </p>
      </div>

      {/* 4px太罫線 */}
      <div style={{ borderTop: '4px solid var(--ink-900)', paddingTop: 16 }} />

      {/* コピーライト */}
      <div className="flex justify-between items-end">
        <div>
          <div
            className="font-display text-[11px] leading-none mb-1"
            style={{ color: 'var(--ink-900)' }}
          >
            JPWAVEFORECAST.COM
          </div>
          <div
            className="font-jp text-[9px] font-medium"
            style={{ color: 'var(--ink-500)' }}
          >
            © {CURRENT_YEAR} ALL RIGHTS RESERVED
          </div>
        </div>
        <div
          className="font-jp text-[9px] font-medium text-right"
          style={{ color: 'var(--ink-500)' }}
        >
          v1.4.0 · {CURRENT_YEAR}.04
        </div>
      </div>
    </footer>
  )
}
