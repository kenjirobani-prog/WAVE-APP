import { NextResponse } from 'next/server'

export const maxDuration = 30

interface NotionRichText {
  plain_text: string
}

interface NotionProperty {
  type: string
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  number?: number | null
  select?: { name: string } | null
  url?: string | null
  checkbox?: boolean
}

function getText(prop: NotionProperty | undefined): string {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') ?? ''
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') ?? ''
  return ''
}

function getNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== 'number') return null
  return prop.number ?? null
}

function getSelect(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== 'select') return ''
  return prop.select?.name ?? ''
}

function getUrl(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== 'url') return null
  return prop.url ?? null
}

function getCheckbox(prop: NotionProperty | undefined): boolean {
  if (!prop || prop.type !== 'checkbox') return false
  return prop.checkbox ?? false
}

export interface SurfboardItem {
  id: string
  name: string
  brand: string
  model: string
  genre: string
  lengthInch: number | null
  volumeL: number | null
  priceJPY: number | null
  priceUSD: number | null
  officialUrl: string | null
  level: string
  waveSize: string
  description: string
  sizeVariants: string
  fin: string
  sku: string
  dataSource: string
  discontinued: boolean
}

// メモリキャッシュ（24時間有効）
let memoryCache: { items: SurfboardItem[]; updatedAt: number } | null = null
const CACHE_TTL = 24 * 60 * 60 * 1000

async function fetchFromNotion(): Promise<SurfboardItem[]> {
  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) throw new Error('NOTION_API_KEY is not set')

  const dbId = process.env.SURFBOARD_DB_ID
  if (!dbId) throw new Error('SURFBOARD_DB_ID is not set')

  const items: SurfboardItem[] = []
  let cursor: string | undefined = undefined

  do {
    const body: Record<string, unknown> = {
      filter: {
        property: '廃番',
        checkbox: { equals: false },
      },
      page_size: 100,
    }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Notion API error: ${res.status} ${errText}`)
    }

    const data = await res.json()

    for (const page of data.results) {
      const props = page.properties as Record<string, NotionProperty>
      items.push({
        id: (page.id as string).replace(/-/g, ''),
        name: getText(props['ボード名']),
        brand: getSelect(props['ブランド']),
        model: getText(props['モデル名']),
        genre: getSelect(props['ジャンル']),
        lengthInch: getNumber(props['長さ(inch)']),
        volumeL: getNumber(props['ボリューム(L)']),
        priceJPY: getNumber(props['価格JPY']),
        priceUSD: getNumber(props['価格USD']),
        officialUrl: getUrl(props['公式URL']),
        level: getSelect(props['おすすめレベル']),
        waveSize: getSelect(props['おすすめ波サイズ']),
        description: getText(props['特徴・コメント']),
        sizeVariants: getText(props['サイズ展開']),
        fin: '',
        sku: getText(props['SKU']),
        dataSource: getSelect(props['データ取得方法']),
        discontinued: getCheckbox(props['廃番']),
      })
    }

    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return items
}

export async function GET() {
  try {
    // メモリキャッシュ確認
    if (memoryCache && (Date.now() - memoryCache.updatedAt) < CACHE_TTL) {
      return NextResponse.json({ items: memoryCache.items, fromCache: true })
    }

    // Notion APIから直接取得
    const items = await fetchFromNotion()

    // メモリキャッシュに保存
    memoryCache = { items, updatedAt: Date.now() }

    return NextResponse.json({ items, fromCache: false })
  } catch (err) {
    console.error('[Surfboards] Error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
