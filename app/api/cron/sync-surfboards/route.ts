import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export const maxDuration = 300

// =============================
// 認証
// =============================
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

// =============================
// Notion Client 初期化
// =============================
const notion = new Client({ auth: process.env.NOTION_API_KEY })
const notionAny = notion as any
const NOTION_DB_ID = process.env.SURFBOARD_DB_ID!
const NOTION_DS_ID = process.env.SURFBOARD_DS_ID ?? NOTION_DB_ID
const JPY_RATE = 150

async function queryDatabase(args: Record<string, any>) {
  return notionAny.dataSources.query({ data_source_id: NOTION_DS_ID, ...args })
}

// =============================
// アプローチA対象ブランド
// =============================
const BRANDS_A = [
  { brand: 'JS Industries', url: 'https://us.jsindustries.com/collections/all-surfboards/products.json', currency: 'USD', site_url: 'https://us.jsindustries.com' },
  { brand: 'Channel Islands', url: 'https://www.cisurfboards.com/collections/surfboards/products.json', currency: 'USD', site_url: 'https://www.cisurfboards.com' },
  { brand: 'Haydenshapes', url: 'https://haydenshapes.com/collections/surfboards/products.json', currency: 'USD', site_url: 'https://haydenshapes.com' },
  { brand: 'Firewire', url: 'https://www.firewiresurfboards.com/products.json', currency: 'USD', site_url: 'https://www.firewiresurfboards.com' },
  { brand: 'Catch Surf', url: 'https://www.catchsurf.com/products.json', currency: 'USD', site_url: 'https://www.catchsurf.com' },
  { brand: 'Almond Surfboards', url: 'https://almondsurfboards.com/collections/surfboards/products.json', currency: 'USD', site_url: 'https://almondsurfboards.com' },
  { brand: 'Ryan Burch', url: 'https://ryanburchsurfboards.com/products.json', currency: 'USD', site_url: 'https://ryanburchsurfboards.com' },
  { brand: 'DEADKOOKS', url: 'https://deadkooks.com/products.json', currency: 'JPY', site_url: 'https://deadkooks.com' },
  { brand: 'STACEY', url: 'https://www.stcy.co/collections/surfboards/products.json', currency: 'JPY', site_url: 'https://www.stcy.co' },
  { brand: 'PYZEL', url: 'https://pyzelsurfboards.com/collections/surfboards/products.json', currency: 'JPY', site_url: 'https://pyzelsurfboards.com' },
]

// =============================
// スペックパース
// =============================
interface ParsedSpecs {
  lengthInch: number | null
  widthInch: number | null
  thicknessInch: number | null
  volumeL: number | null
}

function parseFraction(s: string): number | null {
  const trimmed = s.trim().replace(/[""″''′]/g, '')
  if (!trimmed) return null
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2])
  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

function parseLengthToInches(s: string): number | null {
  const m = s.match(/(\d+)[''′]\s*(\d+(?:\.\d+)?)/)
  if (m) return parseInt(m[1]) * 12 + parseFloat(m[2])
  const feetOnly = s.match(/^(\d+)[''′]$/)
  if (feetOnly) return parseInt(feetOnly[1]) * 12
  return null
}

function inchesToFeetStr(totalInch: number): string {
  const feet = Math.floor(totalInch / 12)
  const inches = Math.round((totalInch % 12) * 10) / 10
  const inchStr = inches === Math.floor(inches) ? String(Math.floor(inches)) : inches.toFixed(1)
  return `${feet}'${inchStr}"`
}

function getExtraSources(brand: string, variant: any): string[] {
  if (!variant) return []
  const extras: string[] = []
  if (brand === 'Firewire') {
    const parts = (variant.title ?? '').split('/').map((s: string) => s.trim())
    if (parts.length >= 3) extras.push(parts[parts.length - 1])
  }
  if (brand === 'Haydenshapes' && variant.option2) extras.push(variant.option2)
  if (brand === 'STACEY' && variant.option1) extras.push(variant.option1)
  return extras
}

function parseSpecs(title: string, variantTitle?: string, extraSources?: string[]): ParsedSpecs {
  const result: ParsedSpecs = { lengthInch: null, widthInch: null, thicknessInch: null, volumeL: null }
  const sources = [title, variantTitle ?? '', ...(extraSources ?? [])].filter(Boolean)

  for (const src of sources) {
    if (result.volumeL === null) {
      const volMatch = src.match(/(\d+(?:\.\d+)?)\s*[Ll](?:\b|$)/)
      if (volMatch) result.volumeL = parseFloat(volMatch[1])
    }
    if (result.lengthInch === null) {
      const lengthMatch = src.match(/(\d+)[''′]\s*(\d+(?:\.\d+)?)\s*[""″]?/)
      if (lengthMatch) result.lengthInch = parseInt(lengthMatch[1]) * 12 + parseFloat(lengthMatch[2])
    }
    if (result.lengthInch === null) {
      const prefixMatch = src.match(/^(\d+)[''′](\d+(?:\.\d+)?)\s/)
      if (prefixMatch) result.lengthInch = parseInt(prefixMatch[1]) * 12 + parseFloat(prefixMatch[2])
    }
    if (result.widthInch === null) {
      const dimsMatch = src.match(/(?:\d+[''′]\s*\d+[""″]?\s*)[xX×]\s*([\d\s/]+)[""″]?\s*[xX×]\s*([\d\s/]+)[""″]?/)
      if (dimsMatch) { result.widthInch = parseFraction(dimsMatch[1]); result.thicknessInch = parseFraction(dimsMatch[2]) }
    }
  }

  if (result.widthInch === null) {
    const allText = sources.join(' ')
    const staceyMatch = allText.match(/[-–]\s*([\d]+(?:\s+\d+\/\d+)?)\s*[xX×]\s*([\d]+(?:\s+\d+\/\d+)?)\s*[-–]/)
    if (staceyMatch) { result.widthInch = parseFraction(staceyMatch[1]); result.thicknessInch = parseFraction(staceyMatch[2]) }
  }

  if (result.widthInch === null) {
    const allText = sources.join(' ')
    const altMatch = allText.match(/\d+[''′]\s*\d+[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?/)
    if (altMatch) { result.widthInch = parseFraction(altMatch[1]); result.thicknessInch = parseFraction(altMatch[2]) }
  }

  return result
}

// =============================
// モデル名抽出
// =============================
function extractModelName(title: string, product?: any): string {
  if (product?.tags) {
    const tags: string[] = Array.isArray(product.tags) ? product.tags : (product.tags ?? '').split(', ')
    const modelTag = tags.find((t: string) => t.startsWith('Board Model:'))
    if (modelTag) return modelTag.replace('Board Model:', '').trim()
  }
  return title
    .replace(/\s*\d+[''′]\d+[""″]?.*/, '')
    .replace(/\s*\|\s*\d+.*/, '')
    .replace(/\s*-\s*\d+[''′].*/, '')
    .replace(/\s*\/\s*\d+[''′].*/, '')
    .replace(/^\d+[''′]\d+[""″]?\s*[-–]\s*/, '')
    .replace(/\s*[-–]\s*(?:Futures?|FCSII?|FCS\s*II)\s*$/i, '')
    .replace(/\s*-\s*ID:.*/, '')
    .trim()
}

function parseCISpecsFromHtml(bodyHtml: string): { widthInch: number | null; thicknessInch: number | null } {
  const text = bodyHtml.replace(/<[^>]+>/g, ' ').trim()
  const m = text.match(/\d+[''′]\d+[""″]?\s*[xX×]\s*([\d\s/]+)[""″]?\s*[xX×]\s*([\d\s/]+)[""″]?/)
  if (m) return { widthInch: parseFraction(m[1]), thicknessInch: parseFraction(m[2]) }
  return { widthInch: null, thicknessInch: null }
}

function parseCIVolume(tags: string[]): number | null {
  const volTag = tags.find((t: string) => /^\d+(\.\d+)?L$/i.test(t.trim()))
  if (volTag) return parseFloat(volTag.replace(/[Ll]$/, ''))
  return null
}

function toJPY(priceStr: string, currency: string): number {
  const price = parseFloat(priceStr)
  if (currency === 'JPY') return Math.round(price)
  return Math.round(price * JPY_RATE)
}

// =============================
// Shopify取得
// =============================
async function fetchShopifyProducts(url: string): Promise<any[]> {
  const all: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${url}?limit=250&page=${page}`)
    if (!res.ok) break
    const data = await res.json()
    if (!data.products?.length) break
    all.push(...data.products)
    if (data.products.length < 250) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  return all
}

// =============================
// Notion既存レコード取得
// =============================
async function fetchExistingPageIds(): Promise<string[]> {
  const ids: string[] = []
  let cursor: string | undefined
  while (true) {
    const res = await queryDatabase({
      filter: { property: 'データ取得方法', select: { equals: 'アプローチA（Shopify自動）' } },
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of res.results as any[]) ids.push(page.id)
    if (!res.has_more) break
    cursor = res.next_cursor ?? undefined
  }
  return ids
}

// =============================
// サーフボード判定
// =============================
const EXCLUDE_KEYWORDS = [
  'bag', 'wetsuit', 'tee', 't-shirt', 'shirt', 'hat', 'cap',
  'leash', 'traction pad', 'wax', 'fins', 'fin set', 'fin case',
  'rack', 'jacket', 'gift card', 'hoodie', 'boardshort', 'board sock',
  'sticker', 'keychain', 'changing mat', 'tie down', 'plug',
  'button pack', 'surf wax', 'swim fins',
]

function isSurfboard(product: any): boolean {
  const title = (product.title ?? '').toLowerCase()
  if (EXCLUDE_KEYWORDS.some(kw => title.includes(kw))) return false
  const type = product.product_type?.toLowerCase() ?? ''
  const tags = product.tags?.map((t: string) => t.toLowerCase()) ?? []
  return type.includes('surf') || type.includes('mid') || type.includes('long') || type.includes('short') || type.includes('gun') || tags.some((t: string) => t.includes('surfboard'))
}

// =============================
// Claude APIでコメント生成
// =============================
async function generateComment(brand: string, model: string, bodyHtml: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const text = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length < 100) return null
  const input = text.slice(0, 1500)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: `以下はサーフボード「${brand} ${model}」の商品説明です。日本語で80文字以内の特徴コメントを1つだけ生成してください。サーファー向けに簡潔に。コメントのみ出力。\n\n${input}` }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const comment = data.content?.[0]?.text?.trim() ?? ''
    return comment.length > 0 && comment.length <= 120 ? comment : null
  } catch { return null }
}

// =============================
// グルーピング型
// =============================
interface GroupedModel {
  brand: string
  modelName: string
  sku: string
  priceJPY: number
  priceUSD: number | null
  siteUrl: string
  lengthInch: number | null
  widthInch: number | null
  thicknessInch: number | null
  volumeL: number | null
  sizes: string[]
  bodyHtml: string
}

// =============================
// メイン同期処理
// =============================
async function syncSurfboards(): Promise<{ deleted: number; added: number; commented: number; cleaned: number }> {
  // STEP 1: 既存レコード全削除
  const existingIds = await fetchExistingPageIds()
  for (let i = 0; i < existingIds.length; i++) {
    await notionAny.pages.update({ page_id: existingIds[i], archived: true })
    await new Promise(r => setTimeout(r, 100))
  }

  // STEP 2: Shopify取得 → グルーピング
  const allModels: GroupedModel[] = []

  for (const b of BRANDS_A) {
    let products: any[]
    try { products = await fetchShopifyProducts(b.url) } catch { continue }

    const boards = products.filter(isSurfboard)
    const modelMap = new Map<string, { products: any[]; specs: { title: string; lengthInch: number | null; price: string }[] }>()

    for (const product of boards) {
      const mName = extractModelName(product.title, product)
      if (!mName) continue
      const key = mName.toLowerCase()
      if (!modelMap.has(key)) modelMap.set(key, { products: [], specs: [] })
      const group = modelMap.get(key)!
      group.products.push(product)

      const variant = product.variants?.[0]
      const extras = getExtraSources(b.brand, variant)
      const parsed = parseSpecs(product.title, variant?.title, extras)

      if (b.brand === 'Channel Islands') {
        const tags: string[] = Array.isArray(product.tags) ? product.tags : (product.tags ?? '').split(', ')
        if (parsed.volumeL === null) parsed.volumeL = parseCIVolume(tags)
        if (parsed.widthInch === null) {
          const htmlSpecs = parseCISpecsFromHtml(product.body_html ?? '')
          parsed.widthInch = htmlSpecs.widthInch
          parsed.thicknessInch = htmlSpecs.thicknessInch
        }
      }

      group.specs.push({ title: product.title, lengthInch: parsed.lengthInch, price: variant?.price ?? '0' })
    }

    for (const [, group] of modelMap.entries()) {
      const withLength = group.specs.filter(s => s.lengthInch !== null)
      const sorted = withLength.length > 0 ? [...withLength].sort((a, b) => a.lengthInch! - b.lengthInch!) : group.specs
      const repProduct = group.products[0]
      const repTitle = sorted[0]?.title ?? repProduct.title
      const repVariant = repProduct.variants?.[0]
      const repExtras = getExtraSources(b.brand, repVariant)
      const repSpecs = parseSpecs(repTitle, repVariant?.title ?? '', repExtras)
      const repPrice = sorted[0]?.price ?? repProduct.variants?.[0]?.price ?? '0'

      if (b.brand === 'Channel Islands') {
        const tags: string[] = Array.isArray(repProduct.tags) ? repProduct.tags : (repProduct.tags ?? '').split(', ')
        if (repSpecs.volumeL === null) repSpecs.volumeL = parseCIVolume(tags)
        if (repSpecs.widthInch === null) {
          const htmlSpecs = parseCISpecsFromHtml(repProduct.body_html ?? '')
          repSpecs.widthInch = htmlSpecs.widthInch
          repSpecs.thicknessInch = htmlSpecs.thicknessInch
        }
      }

      const modelName = extractModelName(repProduct.title, repProduct)
      if (!modelName) continue

      const sizeSet = new Set<string>()
      for (const s of group.specs) { if (s.lengthInch) sizeSet.add(inchesToFeetStr(s.lengthInch)) }
      const sizes = [...sizeSet].sort((a, b) => (parseLengthToInches(a) ?? 0) - (parseLengthToInches(b) ?? 0))

      allModels.push({
        brand: b.brand, modelName, sku: `${b.brand}::${modelName}`,
        priceJPY: toJPY(repPrice, b.currency),
        priceUSD: b.currency === 'USD' ? parseFloat(repPrice) : null,
        siteUrl: b.site_url,
        lengthInch: repSpecs.lengthInch, widthInch: repSpecs.widthInch,
        thicknessInch: repSpecs.thicknessInch, volumeL: repSpecs.volumeL,
        sizes, bodyHtml: repProduct.body_html ?? '',
      })
    }
  }

  // STEP 3: Notion登録 + コメント生成
  let added = 0, commented = 0
  for (const model of allModels) {
    const sizeText = model.sizes.length > 0 ? model.sizes.join(', ') : ''
    let comment: string | null = null
    if (model.bodyHtml && model.bodyHtml.replace(/<[^>]+>/g, ' ').trim().length >= 100) {
      comment = await generateComment(model.brand, model.modelName, model.bodyHtml)
      if (comment) commented++
      await new Promise(r => setTimeout(r, 500))
    }

    await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        'ボード名': { title: [{ text: { content: `${model.brand} ${model.modelName}` } }] },
        'ブランド': { select: { name: model.brand } },
        'モデル名': { rich_text: [{ text: { content: model.modelName } }] },
        'SKU': { rich_text: [{ text: { content: model.sku } }] },
        '長さ(inch)': { number: model.lengthInch ? Math.round(model.lengthInch * 100) / 100 : null },
        '幅(inch)': { number: model.widthInch ? Math.round(model.widthInch * 10000) / 10000 : null },
        '厚み(inch)': { number: model.thicknessInch ? Math.round(model.thicknessInch * 10000) / 10000 : null },
        'ボリューム(L)': { number: model.volumeL },
        '価格JPY': { number: model.priceJPY },
        '価格USD': { number: model.priceUSD },
        '公式URL': { url: model.siteUrl },
        'サイズ展開': { rich_text: sizeText ? [{ text: { content: sizeText } }] : [] },
        '特徴・コメント': { rich_text: comment ? [{ text: { content: comment } }] : [] },
        'データ取得方法': { select: { name: 'アプローチA（Shopify自動）' } },
        '廃番': { checkbox: false },
        'AI波予報連携': { checkbox: false },
      } as any,
    })
    added++
    await new Promise(r => setTimeout(r, 300))
  }

  // STEP 4: クリーニング
  const allRecords: any[] = []
  let cursor: string | undefined
  while (true) {
    const res = await queryDatabase({
      filter: { property: 'データ取得方法', select: { equals: 'アプローチA（Shopify自動）' } },
      start_cursor: cursor, page_size: 100,
    })
    allRecords.push(...res.results)
    if (!res.has_more) break
    cursor = res.next_cursor ?? undefined
  }

  let cleaned = 0
  for (const page of allRecords) {
    const priceJPY = page.properties['価格JPY']?.number ?? null
    if (priceJPY !== null && priceJPY > 0 && priceJPY <= 15000) {
      await notionAny.pages.update({ page_id: page.id, archived: true })
      cleaned++
      await new Promise(r => setTimeout(r, 100))
    }
  }

  for (const page of allRecords) {
    const priceJPY = page.properties['価格JPY']?.number ?? null
    if (priceJPY !== null && priceJPY > 0 && priceJPY <= 15000) continue
    const brand = page.properties['ブランド']?.select?.name ?? ''
    const lengthInch = page.properties['長さ(inch)']?.number ?? null
    let genre: string | null = null
    if (brand === 'Catch Surf') genre = 'ソフトボード'
    else if (brand === 'Almond Surfboards') genre = 'ミッドレングス'
    else if (!lengthInch || lengthInch === 0) continue
    else if (lengthInch >= 96) genre = 'ロングボード'
    else if (lengthInch >= 78) genre = 'ミッドレングス'
    else genre = 'ショートボード'
    await notionAny.pages.update({ page_id: page.id, properties: { 'ジャンル': { select: { name: genre } } } })
    await new Promise(r => setTimeout(r, 300))
  }

  return { deleted: existingIds.length, added, commented, cleaned }
}

// =============================
// APIルート
// =============================
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncSurfboards()
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[sync-surfboards] Error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
