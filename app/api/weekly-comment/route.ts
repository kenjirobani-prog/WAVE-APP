import { NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const maxDuration = 30

function todayStr(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const { weeklyData, cachedComment, spotName, areaLabel } = await request.json()

    // クライアント側でキャッシュ済みならそのまま返す
    if (cachedComment) {
      return NextResponse.json({ comment: cachedComment, cached: true })
    }

    if (!weeklyData || !Array.isArray(weeklyData)) {
      return NextResponse.json({ error: 'weeklyData is required' }, { status: 400 })
    }

    // Firestoreキャッシュ確認（日付＋エリアでキー）
    const dateStr = todayStr()
    const area = areaLabel ?? '湘南'
    const cacheDocId = `${area}_${dateStr}`
    try {
      await ensureAnonymousAuth()
      const db = getDb()
      const cacheRef = doc(db, 'weeklyComment', cacheDocId)
      const cached = await getDoc(cacheRef)
      if (cached.exists()) {
        const data = cached.data()
        console.log(`[weekly-comment] Cache HIT: ${cacheDocId}`)
        return NextResponse.json({ comment: data.comment, generatedAt: data.generatedAt, cached: true })
      }
    } catch (cacheErr) {
      console.error('[weekly-comment] Cache read error:', cacheErr)
    }

    // Claude API呼び出し
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[weekly-comment] ANTHROPIC_API_KEY is missing from environment variables')
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }
    console.log('[weekly-comment] API key found, calling Claude API...')

    const prompt = weeklyData.map((d: {
      date: string
      avgScore: number
      waveHeight?: number
      windType?: string
      swellDirection?: string
      period?: number
      waveQualityLabel?: string
    }) =>
      `${d.date}: スコア${d.avgScore}, 波高${d.waveHeight ?? '?'}m, 風${d.windType ?? '?'}, うねり${d.swellDirection ?? '?'}, 周期${d.period ?? '?'}秒, 波質${d.waveQualityLabel ?? '?'}`
    ).join('\n')

    console.log('[weekly-comment] Prompt:', prompt.substring(0, 200))

    const controller = new AbortController()
    const fetchTimeout = setTimeout(() => controller.abort(), 25000)

    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: `あなたは${areaLabel ?? '湘南'}のサーフィン予報AIです。${spotName ?? '各スポット'}の7日分のデータを見て、今週のコンディションを2〜3文で要約してください。ベストな日を明示し、サーファー向けのカジュアルな日本語で書いてください。波高が2.5mを超える時間帯・日はクローズアウトと判断し、「海に行くのは絶対にやめましょう」という表現を使ってください。余計な前置きや説明は不要です。コメントのみ返してください。`,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      console.error('[weekly-comment] Claude API fetch error:', msg)
      return NextResponse.json({ error: `Claude API fetch failed: ${msg}` }, { status: 502 })
    } finally {
      clearTimeout(fetchTimeout)
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('[weekly-comment] Claude API error:', res.status, errText)
      return NextResponse.json({ error: `Claude API error: ${res.status}`, detail: errText }, { status: 502 })
    }

    const result = await res.json()
    const comment = result.content?.[0]?.text ?? ''
    const generatedAt = new Date().toISOString()
    console.log('[weekly-comment] Generated comment:', comment.substring(0, 100))

    // Firestoreにキャッシュ保存
    try {
      await ensureAnonymousAuth()
      const db = getDb()
      const cacheRef = doc(db, 'weeklyComment', cacheDocId)
      await setDoc(cacheRef, { comment, generatedAt, areaLabel: area, date: dateStr })
    } catch (writeErr) {
      console.error('[weekly-comment] Cache write error:', writeErr)
    }

    return NextResponse.json({ comment, generatedAt })
  } catch (err) {
    console.error('[weekly-comment] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
