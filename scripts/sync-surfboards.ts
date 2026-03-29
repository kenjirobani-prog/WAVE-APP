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
// NotionDBからアプローチA対象レコードのみ取得
// SKU → { pageId, priceJPY } のMapで返す
// =============================
async function fetchExistingRecords(): Promise<Map<string, { pageId: string; priceJPY: number }>> {
  const map = new Map<string, { pageId: string; priceJPY: number }>();
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
      const sku      = page.properties['SKU']?.rich_text?.[0]?.text?.content ?? '';
      const priceJPY = page.properties['価格JPY']?.number ?? 0;
      if (sku) map.set(sku, { pageId: page.id, priceJPY });
    }

    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  return map;
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
// メイン処理
// =============================
async function main() {
  console.log('🏄 サーフボードDB同期開始（アプローチA対象のみ）...\n');

  // 既存レコードをSKUベースでMap化
  const existing = await fetchExistingRecords();
  console.log(`📋 既存レコード（アプローチA）: ${existing.size}件`);

  // 今回取得したSKUを記録（廃番検出用）
  const fetchedSKUs = new Set<string>();

  let added = 0, updated = 0, skipped = 0;

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
    console.log(`  📦 ${boards.length}モデル検出`);

    for (const product of boards) {
      const variant   = product.variants?.[0];
      const sku       = `${b.brand}::${product.handle}`;
      const priceJPY  = toJPY(variant?.price ?? '0', b.currency);
      const priceUSD  = b.currency === 'USD' ? parseFloat(variant?.price ?? '0') : null;

      // モデル名をタイトルから抽出（サイズ表記の手前まで）
      const modelName = product.title
        .replace(/\s*\d+['′]\d+["″].*/, '')
        .replace(/\s*-\s*ID:.*/, '')
        .trim();

      fetchedSKUs.add(sku);

      const rec = existing.get(sku);

      if (!rec) {
        // ===== 新規追加 =====
        await notion.pages.create({
          parent: { database_id: NOTION_DB_ID },
          properties: {
            'ボード名':         { title: [{ text: { content: `${b.brand} ${modelName}` } }] },
            'ブランド':         { select: { name: b.brand } },
            'モデル名':         { rich_text: [{ text: { content: modelName } }] },
            'SKU':              { rich_text: [{ text: { content: sku } }] },
            '価格JPY':          { number: priceJPY },
            '価格USD':          { number: priceUSD },
            '公式URL':          { url: b.site_url },
            'データ取得方法':   { select: { name: 'アプローチA（Shopify自動）' } },
            '廃番':             { checkbox: false },
            'AI波予報連携':     { checkbox: false },
          } as any,
        });
        added++;
        console.log(`  ✅ 新規: ${modelName}`);

      } else if (rec.priceJPY !== priceJPY) {
        // ===== 価格変更のみ更新 =====
        await notion.pages.update({
          page_id: rec.pageId,
          properties: {
            '価格JPY': { number: priceJPY },
            '価格USD': { number: priceUSD },
            '廃番':    { checkbox: false },
          } as any,
        });
        updated++;
        console.log(`  🔄 価格更新: ${modelName} ¥${rec.priceJPY} → ¥${priceJPY}`);

      } else {
        skipped++;
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  // =============================
  // 廃番検出: 前回はあったが今回ないSKU
  // 廃番=true にして、公式URLをクリア
  // ページ自体はDBに残す
  // =============================
  console.log('\n🗑 廃番チェック中...');
  let discontinued = 0;
  for (const [sku, rec] of existing.entries()) {
    if (!fetchedSKUs.has(sku)) {
      await notion.pages.update({
        page_id: rec.pageId,
        properties: {
          '廃番':    { checkbox: true },
          '公式URL': { url: null },
        } as any,
      });
      discontinued++;
      console.log(`  ⚠️  廃番（URL削除）: ${sku}`);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log('\n✅ 同期完了！');
  console.log(`  新規追加: ${added}件`);
  console.log(`  価格更新: ${updated}件`);
  console.log(`  変更なし: ${skipped}件`);
  console.log(`  廃番検出: ${discontinued}件`);
}

main().catch(console.error);
