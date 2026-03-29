import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@notionhq/client';

// .env.local を手動読み込み（dotenv不要）
const envPath = resolve(import.meta.dirname ?? '.', '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const notionAny = notion as any;
const NOTION_DB_ID = process.env.SURFBOARD_DB_ID!;
const NOTION_DS_ID = process.env.SURFBOARD_DS_ID ?? NOTION_DB_ID;
const JPY_RATE = 150;

// v5: dataSources.query を使用（data_source_id が必要）
async function queryDatabase(args: Record<string, any>) {
  return notionAny.dataSources.query({ data_source_id: NOTION_DS_ID, ...args });
}

// =============================
// アプローチA対象ブランドのみ定義
// =============================
const BRANDS_A = [
  {
    brand: 'JS Industries',
    url: 'https://us.jsindustries.com/collections/all-surfboards/products.json',
    currency: 'USD',
    site_url: 'https://us.jsindustries.com',
  },
  {
    brand: 'Channel Islands',
    url: 'https://www.cisurfboards.com/collections/surfboards/products.json',
    currency: 'USD',
    site_url: 'https://www.cisurfboards.com',
  },
  {
    brand: 'Haydenshapes',
    url: 'https://haydenshapes.com/collections/surfboards/products.json',
    currency: 'USD',
    site_url: 'https://haydenshapes.com',
  },
  {
    brand: 'Firewire',
    url: 'https://www.firewiresurfboards.com/products.json',
    currency: 'USD',
    site_url: 'https://www.firewiresurfboards.com',
  },
  {
    brand: 'Catch Surf',
    url: 'https://www.catchsurf.com/products.json',
    currency: 'USD',
    site_url: 'https://www.catchsurf.com',
  },
  {
    brand: 'Almond Surfboards',
    url: 'https://almondsurfboards.com/collections/surfboards/products.json',
    currency: 'USD',
    site_url: 'https://almondsurfboards.com',
  },
  {
    brand: 'Ryan Burch',
    url: 'https://ryanburchsurfboards.com/products.json',
    currency: 'USD',
    site_url: 'https://ryanburchsurfboards.com',
  },
  {
    brand: 'DEADKOOKS',
    url: 'https://deadkooks.com/products.json',
    currency: 'JPY',
    site_url: 'https://deadkooks.com',
  },
  {
    brand: 'STACEY',
    url: 'https://www.stcy.co/collections/surfboards/products.json',
    currency: 'JPY',
    site_url: 'https://www.stcy.co',
  },
  {
    brand: 'PYZEL',
    url: 'https://pyzelsurfboards.com/collections/surfboards/products.json',
    currency: 'JPY',
    site_url: 'https://pyzelsurfboards.com',
  },
];

// =============================
// スペックパース
// =============================
interface ParsedSpecs {
  lengthInch: number | null;
  widthInch: number | null;
  thicknessInch: number | null;
  volumeL: number | null;
}

/** 分数表記を小数に変換: "19 1/2" → 19.5, "2 7/16" → 2.4375 */
function parseFraction(s: string): number | null {
  const trimmed = s.trim().replace(/[""″''′]/g, '');
  if (!trimmed) return null;

  // "19 1/2" or "2 7/16"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // "1/2"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // plain number
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

/** フィート+インチを総インチ（小数）に変換: "5'10" → 70, "6'2" → 74 */
function parseLengthToInches(s: string): number | null {
  // "5'10\"", "5'10", "5' 10\"", "5'10""
  const m = s.match(/(\d+)[''′]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    return parseInt(m[1]) * 12 + parseFloat(m[2]);
  }
  // "5'" (feet only)
  const feetOnly = s.match(/^(\d+)[''′]$/);
  if (feetOnly) {
    return parseInt(feetOnly[1]) * 12;
  }
  return null;
}

/** フィート+インチを "X'Y\"" 表示用文字列に: 70 → "5'10\"" */
function inchesToFeetStr(totalInch: number): string {
  const feet = Math.floor(totalInch / 12);
  const inches = Math.round((totalInch % 12) * 10) / 10;
  // 整数インチの場合は小数点なし
  const inchStr = inches === Math.floor(inches) ? String(Math.floor(inches)) : inches.toFixed(1);
  return `${feet}'${inchStr}"`;
}

function parseSpecs(title: string, variantTitle?: string): ParsedSpecs {
  const result: ParsedSpecs = { lengthInch: null, widthInch: null, thicknessInch: null, volumeL: null };

  // 複数のソースを試行（タイトル → バリアント名）
  const sources = [title, variantTitle ?? ''].filter(Boolean);

  for (const src of sources) {
    // ボリューム: "30.20L" or "- 30.2L" or "30L"
    if (result.volumeL === null) {
      const volMatch = src.match(/(\d+(?:\.\d+)?)\s*[Ll](?:\b|$)/);
      if (volMatch) result.volumeL = parseFloat(volMatch[1]);
    }

    // 長さ: 標準形式 "5'10\"", "5'11", "7'10\""
    if (result.lengthInch === null) {
      const lengthMatch = src.match(/(\d+)[''′]\s*(\d+(?:\.\d+)?)\s*[""″]?/);
      if (lengthMatch) {
        result.lengthInch = parseInt(lengthMatch[1]) * 12 + parseFloat(lengthMatch[2]);
      }
    }

    // 長さ: タイトル先頭形式 "5'8 Cuttlefish" (Ryan Burch等)
    if (result.lengthInch === null) {
      const prefixMatch = src.match(/^(\d+)[''′](\d+(?:\.\d+)?)\s/);
      if (prefixMatch) {
        result.lengthInch = parseInt(prefixMatch[1]) * 12 + parseFloat(prefixMatch[2]);
      }
    }

    // 幅と厚み: "x 19 1/2" x 2 7/16""
    if (result.widthInch === null) {
      const dimsPattern = /(?:\d+[''′]\s*\d+[""″]?\s*)[xX×]\s*([\d\s/]+)[""″]?\s*[xX×]\s*([\d\s/]+)[""″]?/;
      const dimsMatch = src.match(dimsPattern);
      if (dimsMatch) {
        result.widthInch = parseFraction(dimsMatch[1]);
        result.thicknessInch = parseFraction(dimsMatch[2]);
      }
    }
  }

  // 幅・厚みフォールバック（スペース区切りパターン）
  if (result.widthInch === null) {
    const allText = sources.join(' ');
    const altPattern = /\d+[''′]\s*\d+[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?/;
    const altMatch = allText.match(altPattern);
    if (altMatch) {
      result.widthInch = parseFraction(altMatch[1]);
      result.thicknessInch = parseFraction(altMatch[2]);
    }
  }

  return result;
}

// =============================
// モデル名抽出（handleベースのグルーピングキー）
// =============================
function extractModelKey(handle: string): string {
  // handleからサイズ表記を除去してモデルキーを作る
  // 例: "xero-gravity-5-11-x-19-1-2-x-2-7-16-30-20l" → "xero-gravity"
  // 例: "padillac-7-10-x-20-1-2-x-3-1-4-53-30l" → "padillac"
  return handle
    .replace(/-\d+-\d+(?:-x-.*)?$/, '')         // trailing size specs
    .replace(/-\d+l$/i, '')                       // trailing volume
    .replace(/-(?:futures?|fcsii?|fcs-ii)$/i, '') // trailing fin system
    .replace(/-+$/, '');
}

function extractModelName(title: string): string {
  return title
    // サイズ表記以降を除去
    .replace(/\s*\d+[''′]\d+[""″]?.*/, '')
    // "| 7'10" x ..." パターン
    .replace(/\s*\|\s*\d+.*/, '')
    // "- 5'6 ..." パターン
    .replace(/\s*-\s*\d+[''′].*/, '')
    // "/ 5'3" ..." パターン
    .replace(/\s*\/\s*\d+[''′].*/, '')
    // "5'6 - ..." (先頭がサイズ)
    .replace(/^\d+[''′]\d+[""″]?\s*[-–]\s*/, '')
    // "Futures" / "FCSII" suffix
    .replace(/\s*[-–]\s*(?:Futures?|FCSII?|FCS\s*II)\s*$/i, '')
    .replace(/\s*-\s*ID:.*/, '')
    .trim();
}

// =============================
// 価格をJPYに変換
// =============================
function toJPY(priceStr: string, currency: string): number {
  const price = parseFloat(priceStr);
  if (currency === 'JPY') return Math.round(price);
  return Math.round(price * JPY_RATE);
}

// =============================
// Shopifyから全商品を取得（ページネーション対応）
// =============================
async function fetchShopifyProducts(url: string): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?limit=250&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return all;
}

// =============================
// NotionDBからアプローチA対象レコードのページIDを全件取得
// =============================
async function fetchExistingPageIds(): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  while (true) {
    const res = await queryDatabase({
      filter: {
        property: 'データ取得方法',
        select: { equals: 'アプローチA（Shopify自動）' },
      },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results as any[]) {
      ids.push(page.id);
    }

    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  return ids;
}

// =============================
// サーフボードかどうか簡易判定
// =============================
const EXCLUDE_KEYWORDS = [
  'bag', 'wetsuit', 'tee', 't-shirt', 'shirt', 'hat', 'cap',
  'leash', 'traction pad', 'wax', 'fins', 'fin set', 'fin case',
  'rack', 'jacket', 'gift card', 'hoodie', 'boardshort', 'board sock',
  'sticker', 'keychain', 'changing mat', 'tie down', 'plug',
  'button pack', 'surf wax', 'swim fins',
];

function isExcludedAccessory(title: string): boolean {
  const lower = title.toLowerCase();
  return EXCLUDE_KEYWORDS.some(kw => lower.includes(kw));
}

function isSurfboard(product: any): boolean {
  const title = product.title ?? '';
  if (isExcludedAccessory(title)) return false;

  const type = product.product_type?.toLowerCase() ?? '';
  const tags = product.tags?.map((t: string) => t.toLowerCase()) ?? [];
  return (
    type.includes('surf') ||
    type.includes('mid') ||
    type.includes('long') ||
    type.includes('short') ||
    type.includes('gun') ||
    tags.some((t: string) => t.includes('surfboard'))
  );
}

// =============================
// グルーピングされたモデルの型
// =============================
interface GroupedModel {
  brand: string;
  modelName: string;
  modelKey: string;
  sku: string;
  priceJPY: number;
  priceUSD: number | null;
  siteUrl: string;
  // 代表値（最小サイズ）のスペック
  lengthInch: number | null;
  widthInch: number | null;
  thicknessInch: number | null;
  volumeL: number | null;
  // サイズ展開
  sizes: string[];
  // body_html（Claude APIで特徴コメント生成用）
  bodyHtml: string;
}

// =============================
// Claude APIで特徴コメントを生成（80文字以内）
// =============================
async function generateComment(brand: string, model: string, bodyHtml: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // HTMLタグ除去
  const text = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 100) return null;

  // 入力を1500文字に制限
  const input = text.slice(0, 1500);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `以下はサーフボード「${brand} ${model}」の商品説明です。日本語で80文字以内の特徴コメントを1つだけ生成してください。サーファー向けに簡潔に。コメントのみ出力。\n\n${input}`,
        }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const comment = data.content?.[0]?.text?.trim() ?? '';
    return comment.length > 0 && comment.length <= 120 ? comment : null;
  } catch {
    return null;
  }
}

// =============================
// メイン処理
// =============================
async function main() {
  console.log('🏄 サーフボードDB同期開始（アプローチA・モデル単位）...\n');

  // =============================
  // STEP 1: 既存のアプローチAレコードを全削除
  // =============================
  console.log('🗑 既存アプローチAレコードを削除中...');
  const existingIds = await fetchExistingPageIds();
  console.log(`  📋 削除対象: ${existingIds.length}件`);

  for (let i = 0; i < existingIds.length; i++) {
    await notionAny.pages.update({
      page_id: existingIds[i],
      archived: true,
    });
    if (i % 50 === 0 && i > 0) console.log(`  🗑 ${i}/${existingIds.length}件削除...`);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`  ✅ ${existingIds.length}件削除完了`);

  // =============================
  // STEP 2: 全ブランドからShopifyデータ取得 → モデル単位でグルーピング
  // =============================
  const allModels: GroupedModel[] = [];

  for (const b of BRANDS_A) {
    console.log(`\n🔍 ${b.brand} を取得中...`);

    let products: any[];
    try {
      products = await fetchShopifyProducts(b.url);
    } catch (e) {
      console.error(`  ❌ 取得失敗: ${e}`);
      continue;
    }

    const boards = products.filter(isSurfboard);
    console.log(`  📦 ${boards.length}商品検出`);

    // モデル名ベースでグルーピング（ブランド+モデル名をキーに）
    const modelMap = new Map<string, { products: any[]; specs: { title: string; lengthInch: number | null; price: string }[] }>();

    for (const product of boards) {
      const mName = extractModelName(product.title);
      if (!mName) continue;
      const key = mName.toLowerCase();
      if (!modelMap.has(key)) {
        modelMap.set(key, { products: [], specs: [] });
      }
      const group = modelMap.get(key)!;
      group.products.push(product);

      const variant = product.variants?.[0];
      const parsed = parseSpecs(product.title, variant?.title);
      group.specs.push({
        title: product.title,
        lengthInch: parsed.lengthInch,
        price: variant?.price ?? '0',
      });
    }

    console.log(`  📐 ${modelMap.size}モデルにグルーピング`);

    for (const [key, group] of modelMap.entries()) {
      // 代表商品: 最小サイズ（長さが取れないものは最初の商品）
      const withLength = group.specs.filter(s => s.lengthInch !== null);
      const sorted = withLength.length > 0
        ? [...withLength].sort((a, b) => a.lengthInch! - b.lengthInch!)
        : group.specs;

      const repProduct = group.products[0];
      const repTitle = sorted[0]?.title ?? repProduct.title;
      const repVariantTitle = repProduct.variants?.[0]?.title ?? '';
      const repSpecs = parseSpecs(repTitle, repVariantTitle);
      const repPrice = sorted[0]?.price ?? repProduct.variants?.[0]?.price ?? '0';

      const modelName = extractModelName(repProduct.title);
      if (!modelName) continue;

      // サイズ展開: 重複除去してソート
      const sizeSet = new Set<string>();
      for (const s of group.specs) {
        if (s.lengthInch) sizeSet.add(inchesToFeetStr(s.lengthInch));
      }
      const sizes = [...sizeSet].sort((a, b) => {
        const ai = parseLengthToInches(a) ?? 0;
        const bi = parseLengthToInches(b) ?? 0;
        return ai - bi;
      });

      allModels.push({
        brand: b.brand,
        modelName,
        modelKey: modelName.toLowerCase(),
        sku: `${b.brand}::${modelName}`,
        priceJPY: toJPY(repPrice, b.currency),
        priceUSD: b.currency === 'USD' ? parseFloat(repPrice) : null,
        siteUrl: b.site_url,
        lengthInch: repSpecs.lengthInch,
        widthInch: repSpecs.widthInch,
        thicknessInch: repSpecs.thicknessInch,
        volumeL: repSpecs.volumeL,
        sizes,
        bodyHtml: repProduct.body_html ?? '',
      });
    }
  }

  console.log(`\n📊 合計 ${allModels.length} モデル`);

  // =============================
  // STEP 3: Notionに登録
  // =============================
  console.log('\n📝 Notionに登録中（特徴コメント生成含む）...');
  let added = 0;
  let commented = 0;

  for (const model of allModels) {
    const sizeText = model.sizes.length > 0 ? model.sizes.join(', ') : '';

    // Claude APIで特徴コメントを生成
    let comment: string | null = null;
    if (model.bodyHtml && model.bodyHtml.replace(/<[^>]+>/g, ' ').trim().length >= 100) {
      comment = await generateComment(model.brand, model.modelName, model.bodyHtml);
      if (comment) commented++;
      await new Promise(r => setTimeout(r, 500));
    }

    await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        'ボード名':         { title: [{ text: { content: `${model.brand} ${model.modelName}` } }] },
        'ブランド':         { select: { name: model.brand } },
        'モデル名':         { rich_text: [{ text: { content: model.modelName } }] },
        'SKU':              { rich_text: [{ text: { content: model.sku } }] },
        '長さ(inch)':       { number: model.lengthInch ? Math.round(model.lengthInch * 100) / 100 : null },
        '幅(inch)':         { number: model.widthInch ? Math.round(model.widthInch * 10000) / 10000 : null },
        '厚み(inch)':       { number: model.thicknessInch ? Math.round(model.thicknessInch * 10000) / 10000 : null },
        'ボリューム(L)':    { number: model.volumeL },
        '価格JPY':          { number: model.priceJPY },
        '価格USD':          { number: model.priceUSD },
        '公式URL':          { url: model.siteUrl },
        'サイズ展開':       { rich_text: sizeText ? [{ text: { content: sizeText } }] : [] },
        '特徴・コメント':   { rich_text: comment ? [{ text: { content: comment } }] : [] },
        'データ取得方法':   { select: { name: 'アプローチA（Shopify自動）' } },
        '廃番':             { checkbox: false },
        'AI波予報連携':     { checkbox: false },
      } as any,
    });
    added++;
    if (added % 20 === 0) console.log(`  📝 ${added}/${allModels.length}件登録（コメント生成: ${commented}件）...`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n✅ 同期完了！');
  console.log(`  削除: ${existingIds.length}件`);
  console.log(`  新規登録: ${added}件（モデル単位）`);
  console.log(`  特徴コメント生成: ${commented}件`);

  // =============================
  // STEP 4: DBクリーニング
  // =============================
  await cleanDatabase();
}

// =============================
// DBクリーニング処理
// =============================
async function cleanDatabase() {
  console.log('\n🧹 DBクリーニング開始...\n');

  // 全アプローチAレコードを取得
  const allRecords: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const res = await queryDatabase({
      filter: {
        property: 'データ取得方法',
        select: { equals: 'アプローチA（Shopify自動）' },
      },
      start_cursor: cursor,
      page_size: 100,
    });
    allRecords.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  console.log(`📋 対象レコード: ${allRecords.length}件`);

  // --- クリーニング①: 価格JPY ≤ 15,000円を削除（アクセサリー除去）---
  console.log('\n🗑 クリーニング①: 低価格アクセサリーを削除...');
  let deleted = 0;
  for (const page of allRecords) {
    const priceJPY = page.properties['価格JPY']?.number ?? null;
    if (priceJPY !== null && priceJPY > 0 && priceJPY <= 15000) {
      await notionAny.pages.update({ page_id: page.id, archived: true });
      deleted++;
      await new Promise(r => setTimeout(r, 100));
    }
  }
  console.log(`  ✅ ${deleted}件削除`);

  // --- クリーニング②: ジャンル自動分類（長さベース）---
  console.log('\n📐 クリーニング②: ジャンル自動分類...');
  let classified = 0;
  let skippedGenre = 0;
  for (const page of allRecords) {
    // 削除済みはスキップ
    const priceJPY = page.properties['価格JPY']?.number ?? null;
    if (priceJPY !== null && priceJPY > 0 && priceJPY <= 15000) continue;

    const brand = page.properties['ブランド']?.select?.name ?? '';
    const lengthInch = page.properties['長さ(inch)']?.number ?? null;

    let genre: string | null = null;

    // ブランドベース例外
    if (brand === 'Catch Surf') {
      genre = 'ソフトボード';
    } else if (brand === 'Almond Surfboards') {
      genre = 'ミッドレングス';
    } else if (!lengthInch || lengthInch === 0) {
      skippedGenre++;
      continue;
    } else if (lengthInch >= 96) {
      genre = 'ロングボード';
    } else if (lengthInch >= 78) {
      genre = 'ミッドレングス';
    } else {
      genre = 'ショートボード';
    }

    await notionAny.pages.update({
      page_id: page.id,
      properties: {
        'ジャンル': { select: { name: genre } },
      },
    });
    classified++;
    if (classified % 50 === 0) console.log(`  📐 ${classified}件分類...`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`  ✅ ${classified}件分類完了（スキップ: ${skippedGenre}件）`);

  console.log('\n🧹 クリーニング完了！');
  console.log(`  アクセサリー削除: ${deleted}件`);
  console.log(`  ジャンル分類: ${classified}件`);
}

main().catch(console.error);
