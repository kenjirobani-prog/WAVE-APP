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

function parseSpecs(title: string): ParsedSpecs {
  const result: ParsedSpecs = { lengthInch: null, widthInch: null, thicknessInch: null, volumeL: null };

  // ボリューム: "30.20L" or "- 30.2L" or "30L"
  const volMatch = title.match(/(\d+(?:\.\d+)?)\s*[Ll]/);
  if (volMatch) result.volumeL = parseFloat(volMatch[1]);

  // 長さ: "5'10\"", "5'11", "7'10\""
  const lengthMatch = title.match(/(\d+)[''′]\s*(\d+(?:\.\d+)?)\s*[""″]?/);
  if (lengthMatch) {
    result.lengthInch = parseInt(lengthMatch[1]) * 12 + parseFloat(lengthMatch[2]);
  }

  // 幅と厚み: "x 19 1/2" x 2 7/16"" or "19 3/8\" 2 5/16\""
  // パターン: 長さの後に x/× で区切られた2つの寸法
  const dimsPattern = /(?:\d+[''′]\s*\d+[""″]?\s*)[xX×]\s*([\d\s/]+)[""″]?\s*[xX×]\s*([\d\s/]+)[""″]?/;
  const dimsMatch = title.match(dimsPattern);
  if (dimsMatch) {
    result.widthInch = parseFraction(dimsMatch[1]);
    result.thicknessInch = parseFraction(dimsMatch[2]);
  } else {
    // "19 3/8" 2 5/16"" (スペース区切り、長さの後)
    const altPattern = /\d+[''′]\s*\d+[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?\s+([\d]+(?:\s+\d+\/\d+)?)[""″]?/;
    const altMatch = title.match(altPattern);
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
function isSurfboard(product: any): boolean {
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
      const parsed = parseSpecs(product.title);
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
      const repSpecs = parseSpecs(repTitle);
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
}

main().catch(console.error);
