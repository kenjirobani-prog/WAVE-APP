'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { HowToArticle } from '@/data/howto'

// ──────────────────────────────────────────
// Markdown parser (no external library)
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

    // Headings
    const h3 = trimmed.match(/^### (.+)/)
    if (h3) { blocks.push({ kind: 'h3', text: h3[1] }); i++; continue }

    const h2 = trimmed.match(/^## (.+)/)
    if (h2) { blocks.push({ kind: 'h2', text: h2[1] }); i++; continue }

    const h1 = trimmed.match(/^# (.+)/)
    if (h1) { blocks.push({ kind: 'h1', text: h1[1] }); i++; continue }

    // Table (starts with |)
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

    // Unordered list (starts with - )
    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    // Paragraph — collect until blank line / heading / table / list
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

// Inline renderer: **bold**
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ fontWeight: 700, color: '#0a1628' }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function MarkdownBody({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div style={{ color: '#374151', fontSize: 15, lineHeight: 1.8 }}>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case 'h1':
            // h1 is redundant with the article header — render as decorative subtitle
            return (
              <p key={idx} style={{ fontSize: 13, color: '#94a3b8', marginTop: 0, marginBottom: 20, fontStyle: 'italic' }}>
                {block.text}
              </p>
            )

          case 'h2':
            return (
              <h2 key={idx} style={{
                fontSize: 18, fontWeight: 700, color: '#0284c7',
                marginTop: 36, marginBottom: 12,
                paddingBottom: 8, borderBottom: '2px solid #e0f2fe',
              }}>
                {block.text}
              </h2>
            )

          case 'h3':
            return (
              <h3 key={idx} style={{
                fontSize: 15, fontWeight: 700, color: '#0a1628',
                marginTop: 24, marginBottom: 8,
              }}>
                {block.text}
              </h3>
            )

          case 'p':
            return (
              <p key={idx} style={{ marginTop: 0, marginBottom: 16 }}>
                <Inline text={block.text} />
              </p>
            )

          case 'ul':
            return (
              <ul key={idx} style={{ marginTop: 0, marginBottom: 16, paddingLeft: 20 }}>
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: 6 }}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )

          case 'table':
            return (
              <div key={idx} style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 10, border: '0.5px solid #eef1f4' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f9ff' }}>
                      {block.headers.map((h, j) => (
                        <th key={j} style={{
                          padding: '8px 12px', textAlign: 'left',
                          fontWeight: 700, color: '#0284c7',
                          borderBottom: '0.5px solid #bae6fd',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} style={{ borderBottom: j < block.rows.length - 1 ? '0.5px solid #eef1f4' : 'none' }}>
                        {row.map((cell, k) => (
                          <td key={k} style={{
                            padding: '8px 12px', verticalAlign: 'top',
                            color: '#374151',
                          }}>
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
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-[#f0f9ff]">
      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Link href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px', lineHeight: 1 }}>AI 波予報</span></Link>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>How to Surfing</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff',
            background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '2px 8px',
          }}>
            {article.category}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{article.readingTime}</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 6 }}>
          {article.title}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 8 }}>
          {article.subtitle}
        </p>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          {article.publishedAt.replace(/-/g, '/')}
        </span>
      </header>

      {/* 本文 */}
      <main className="flex-1 overflow-auto pb-4">
        <div className="bg-white px-5 py-6">
          <MarkdownBody content={article.content} />
        </div>
      </main>

    </div>
  )
}
