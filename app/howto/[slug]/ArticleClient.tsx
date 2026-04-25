'use client'
import BackButton from '@/components/BackButton'
import type { HowToArticle } from '@/data/howto'

// ──────────────────────────────────────────
// Markdown parser (no external library) — preserved as-is from prior version
// ──────────────────────────────────────────

type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }

function parseBlocks(raw: string): Block[] {
  const lines = raw.trim().split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (!trimmed) { i++; continue }

    const h3 = trimmed.match(/^### (.+)/)
    if (h3) { blocks.push({ kind: 'h3', text: h3[1] }); i++; continue }

    const h2 = trimmed.match(/^## (.+)/)
    if (h2) { blocks.push({ kind: 'h2', text: h2[1] }); i++; continue }

    const h1 = trimmed.match(/^# (.+)/)
    if (h1) { blocks.push({ kind: 'h1', text: h1[1] }); i++; continue }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      const allRows = tableLines.map(l =>
        l.split('|').slice(1, -1).map(c => c.trim())
      )
      const headers = allRows[0] ?? []
      const rows = allRows.slice(1).filter(
        row => !row.every(cell => /^[-: ]+$/.test(cell))
      )
      blocks.push({ kind: 'table', headers, rows })
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t || t.startsWith('#') || t.startsWith('|') || t.startsWith('- ')) break
      paraLines.push(t)
      i++
    }
    if (paraLines.length) {
      blocks.push({ kind: 'p', text: paraLines.join(' ') })
    }
  }

  return blocks
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ fontWeight: 800, color: 'var(--ink-900)' }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function MarkdownBody({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div
      className="font-jp"
      style={{ color: 'var(--ink-700)', fontSize: 14, lineHeight: 1.85 }}
    >
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case 'h1':
            return (
              <p
                key={idx}
                className="font-jp"
                style={{
                  fontSize: 12,
                  color: 'var(--ink-300)',
                  marginTop: 0,
                  marginBottom: 24,
                  fontStyle: 'italic',
                }}
              >
                {block.text}
              </p>
            )

          case 'h2':
            return (
              <h2
                key={idx}
                className="font-display"
                style={{
                  fontSize: 22,
                  letterSpacing: '0.02em',
                  color: 'var(--ink-900)',
                  marginTop: 40,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: '2px solid var(--ink-900)',
                  lineHeight: 1.05,
                }}
              >
                {block.text}
              </h2>
            )

          case 'h3':
            return (
              <h3
                key={idx}
                className="font-jp"
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--ink-900)',
                  marginTop: 28,
                  marginBottom: 10,
                  lineHeight: 1.45,
                }}
              >
                {block.text}
              </h3>
            )

          case 'p':
            return (
              <p
                key={idx}
                className="font-jp"
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                  fontWeight: 500,
                  color: 'var(--ink-700)',
                  lineHeight: 1.85,
                }}
              >
                <Inline text={block.text} />
              </p>
            )

          case 'ul':
            return (
              <ul
                key={idx}
                className="font-jp"
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                  paddingLeft: 0,
                  listStyle: 'none',
                }}
              >
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      marginBottom: 8,
                      paddingLeft: 18,
                      position: 'relative',
                      color: 'var(--ink-700)',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        color: 'var(--ink-900)',
                        fontWeight: 800,
                      }}
                    >
                      —
                    </span>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )

          case 'table':
            return (
              <div
                key={idx}
                style={{
                  overflowX: 'auto',
                  marginBottom: 24,
                  border: '1px solid var(--ink-900)',
                }}
              >
                <table
                  className="font-jp"
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
                >
                  <thead>
                    <tr style={{ background: 'var(--paper-300)' }}>
                      {block.headers.map((h, j) => (
                        <th
                          key={j}
                          className="font-display"
                          style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontWeight: 400,
                            fontSize: 12,
                            letterSpacing: '0.06em',
                            color: 'var(--ink-900)',
                            borderBottom: '1px solid var(--ink-900)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr
                        key={j}
                        style={{
                          borderBottom: j < block.rows.length - 1 ? '0.5px solid var(--rule-thin)' : 'none',
                          background: j % 2 === 0 ? 'var(--paper-100)' : 'var(--paper-200)',
                        }}
                      >
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            style={{
                              padding: '10px 12px',
                              verticalAlign: 'top',
                              color: 'var(--ink-700)',
                              fontWeight: 500,
                            }}
                          >
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}

// ──────────────────────────────────────────
// Main component
// ──────────────────────────────────────────

export default function ArticleClient({ article }: { article: HowToArticle }) {
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
            記事一覧へ戻る
          </div>
        </div>
        <div className="inline-block" style={{ border: '2px solid var(--ink-900)', padding: '6px 12px' }}>
          <div className="font-display text-3xl leading-[0.95] tracking-[0.02em]">HOW TO SURF</div>
        </div>
        <div className="font-jp text-sm font-bold mt-2">サーフィンの始め方</div>
        <div
          className="flex items-center gap-3 mt-3 pt-2.5"
          style={{ borderTop: '1px solid var(--ink-900)' }}
        >
          <span
            className="font-display text-[10px] tracking-[0.08em] px-2 py-0.5"
            style={{ background: 'var(--ink-900)', color: 'var(--paper-100)' }}
          >
            {article.category}
          </span>
          <span
            className="font-jp text-[10px] font-bold"
            style={{ color: 'var(--ink-500)' }}
          >
            {article.readingTime} · {article.publishedAt.replace(/-/g, '/')}
          </span>
        </div>
        <h1
          className="font-jp font-black mt-4 leading-tight"
          style={{ fontSize: 22, color: 'var(--ink-900)' }}
        >
          {article.title}
        </h1>
        <p
          className="font-jp text-[13px] font-medium mt-2 leading-[1.7]"
          style={{ color: 'var(--ink-500)' }}
        >
          {article.subtitle}
        </p>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-auto pb-4" style={{ background: 'var(--paper-100)' }}>
        <article
          style={{
            background: 'var(--paper-100)',
            padding: '28px 20px',
            borderBottom: '4px solid var(--ink-900)',
          }}
        >
          <MarkdownBody content={article.content} />
        </article>
      </main>
    </div>
  )
}
