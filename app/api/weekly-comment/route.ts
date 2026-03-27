import { NextResponse } from 'next/server'

function todayStr(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const { weeklyData, cachedComment } = await request.json()

    // クライアント側でキャッシュ済みならそのまま返す
    if (cachedComment) {
      return NextResponse.json({ comment: cachedComment, cached: true })
    }

    if (!weeklyData || !Array.isArray(weeklyData)) {
      return NextResponse.json({ error: 'weeklyData is required' }, { status: 400 })
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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: 'あなたは湘南のサーフィン予報AIです。7日分のデータを見て、今週のコンディションを2〜3文で要約してください。ベストな日を明示し、サーファー向けのカジュアルな日本語で書いてください。余計な前置きや説明は不要です。コメントのみ返してください。',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[weekly-comment] Claude API error:', res.status, errText)
      return NextResponse.json({ error: 'Claude API error' }, { status: 502 })
    }

    const result = await res.json()
    const comment = result.content?.[0]?.text ?? ''

    return NextResponse.json({
      comment,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[weekly-comment] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
