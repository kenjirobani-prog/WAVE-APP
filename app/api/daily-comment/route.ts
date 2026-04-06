import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { COMMENT_SCHEDULES, padHour, type CommentTarget } from '@/lib/commentSchedules'
import { getLatestUpdateHour } from '@/lib/updateSchedule'
import { SPOTS } from '@/data/spots'
import { classifyWind, windTypeLabel } from '@/lib/wave/scoring'

export const maxDuration = 30

function toJstDateStr(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

// 今日のコメント更新スロット（JST）
const COMMENT_HOURS_JST = [4, 6, 10, 14]

function getLatestCommentHour(): number {
  const jstHour = (new Date().getUTCHours() + 9) % 24
  const past = COMMENT_HOURS_JST.filter(h => h <= jstHour)
  return past.length === 0 ? 14 : past[past.length - 1]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('target') as CommentTarget | null
  const hour = searchParams.get('hour')
  const spotName = searchParams.get('spotName') ?? '各スポット'
  const areaLabel = searchParams.get('areaLabel') ?? '湘南'

  if (!target || !['today', 'tomorrow'].includes(target)) {
    return NextResponse.json({ error: 'target must be "today" or "tomorrow"' }, { status: 400 })
  }
  if (!hour || !/^\d{2}$/.test(hour)) {
    return NextResponse.json({ error: 'hour must be 2-digit (e.g. "09")' }, { status: 400 })
  }

  const hourNum = parseInt(hour, 10)
  if (!(COMMENT_SCHEDULES[target] as readonly number[]).includes(hourNum)) {
    return NextResponse.json({ error: `hour ${hour} is not in schedule for ${target}` }, { status: 400 })
  }

  const dateStr = toJstDateStr()
  const cacheKey = target === 'today'
    ? `dailyComment_today_${areaLabel}_${dateStr}_${getLatestCommentHour()}`
    : `dailyComment_${areaLabel}_${target}_${hour}`

  try {
    // Firestoreキャッシュ確認
    await ensureAnonymousAuth()
    const db = getDb()
    const cacheRef = doc(db, 'dailyComment', `${dateStr}_${cacheKey}`)

    try {
      const cached = await getDoc(cacheRef)
      if (cached.exists()) {
        const data = cached.data()
        console.log(`[daily-comment] Cache HIT: ${dateStr}_${cacheKey}`)
        return NextResponse.json({
          comment: data.comment,
          generatedAt: data.generatedAt,
          target,
          hour,
          cached: true,
        })
      }
    } catch (cacheErr) {
      console.error('[daily-comment] Cache read error:', cacheErr)
    }

    // Claude APIで生成
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[daily-comment] ANTHROPIC_API_KEY missing')
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // forecastCacheから今日/明日のデータを取得してプロンプトに含める
    const forecastDate = target === 'today' ? dateStr : (() => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
      return jst.toISOString().split('T')[0]
    })()

    // エリアに応じたスポットIDリストを使用
    const AREA_SPOTS: Record<string, string[]> = {
      '湘南': ['kugenuma', 'tsujido', 'aquarium', 'chigasaki', 'oiso', 'shichiri', 'yuigahama'],
      '千葉北': ['byobu', 'iioka', 'katakai', 'ichinomiya', 'taito', 'onjuku'],
      '千葉南': ['kamogawa', 'chikura', 'heisaura'],
      '茨城': ['oarai', 'hokota', 'kashima', 'hasaki'],
    }
    const spotIds = AREA_SPOTS[areaLabel] ?? AREA_SPOTS['湘南']

    // 時間帯からデータを抽出するヘルパー
    function findByHour(conditions: any[], targetHour: number) {
      return conditions.find((c: { timestamp: string }) => {
        const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
        return h === targetHour
      })
    }

    let forecastSummary = ''

    if (target === 'tomorrow') {
      // 明日: 朝(6時)・昼(12時)・夕方(16時)の3時間帯を取得
      const TIME_SLOTS = [
        { label: '朝6時', hour: 6 },
        { label: '昼12時', hour: 12 },
        { label: '夕方16時', hour: 16 },
      ]
      for (const slot of TIME_SLOTS) {
        forecastSummary += `\n【${slot.label}】\n`
        for (const spotId of spotIds) {
          try {
            const fRef = doc(db, 'forecastCache', `${spotId}_${forecastDate}`)
            const fSnap = await getDoc(fRef)
            if (fSnap.exists()) {
              const conditions = fSnap.data().conditions ?? []
              const c = findByHour(conditions, slot.hour)
              if (c) {
                const spot = SPOTS.find(s => s.id === spotId)
                const wClass = classifyWind(c.windDir, c.windSpeed, spot)
                forecastSummary += `${spotId}: 波高${c.waveHeight}m, 周期${c.wavePeriod}秒, 風速${c.windSpeed}m/s, 風の種類:${windTypeLabel(wClass)}, 潮位${c.tideHeight}cm\n`
              }
            }
          } catch {}
        }
      }
    } else {
      // 今日: 現在時刻以降のデータ（従来通り）
      for (const spotId of spotIds) {
        try {
          const fRef = doc(db, 'forecastCache', `${spotId}_${forecastDate}`)
          const fSnap = await getDoc(fRef)
          if (fSnap.exists()) {
            const conditions = fSnap.data().conditions ?? []
            const hours = conditions.filter((c: { timestamp: string }) => {
              const h = new Date(c.timestamp).getUTCHours() + 9
              return h >= hourNum
            })
            if (hours.length > 0) {
              const rep = findByHour(hours, 12) ?? hours[Math.floor(hours.length / 2)]
              const spot = SPOTS.find(s => s.id === spotId)
              const wClass = classifyWind(rep.windDir, rep.windSpeed, spot)
              forecastSummary += `${spotId}: 波高${rep.waveHeight}m, 周期${rep.wavePeriod}秒, 風速${rep.windSpeed}m/s, 風の種類:${windTypeLabel(wClass)}, 潮位${rep.tideHeight}cm\n`
            }
          }
        } catch {}
      }
    }

    if (!forecastSummary) {
      forecastSummary = '予報データが取得できませんでした。一般的なコメントを生成してください。'
    }

    // ダンパー傾向の検出: うねりが海岸線にほぼ直角 + 短周期
    let dumperWarning = ''
    for (const spotId of spotIds) {
      const spot = SPOTS.find(s => s.id === spotId)
      if (!spot || spot.coastlineAngle == null) continue
      try {
        const fRef = doc(db, 'forecastCache', `${spotId}_${forecastDate}`)
        const fSnap = await getDoc(fRef)
        if (!fSnap.exists()) continue
        const conditions = fSnap.data().conditions ?? []
        const rep = conditions.find((c: { timestamp: string }) => {
          const h = (new Date(c.timestamp).getUTCHours() + 9) % 24
          return h === 12
        }) ?? conditions[0]
        if (!rep) continue
        const rawDiff = Math.abs(rep.swellDir - spot.coastlineAngle)
        const angleDiff = rawDiff > 180 ? 360 - rawDiff : rawDiff
        if (angleDiff >= 70 && angleDiff <= 110 && rep.wavePeriod <= 8) {
          dumperWarning = `\n【ダンパー傾向の注意】${spot.name}付近ではうねりが海岸線に対してほぼ直角に入っており、周期も${Math.round(rep.wavePeriod)}秒と短めのため、波が厚くダンパーになりやすい傾向があります。`
          break
        }
      } catch {}
    }

    const targetLabel = target === 'today' ? '今日' : '明日'
    const timeContext = target === 'today'
      ? `現在時刻: ${hourNum}時。${hourNum}時以降の今日のサーフィン状況`
      : `明日一日のサーフィン状況`

    const tomorrowInstruction = target === 'tomorrow'
      ? '明日の予報コメントは必ず朝（6時頃）・昼（12時頃）・夕方（16時頃）の3つの時間帯それぞれについて言及してください。例：「朝は〜、昼は〜、夕方は〜」という形式で。'
      : ''

    const systemPrompt = `あなたは${areaLabel}のサーフィン予報AIです。このサービスのユーザーは初心者サーファーが多いです。${timeContext}を4〜6文で丁寧に解説してください。${tomorrowInstruction}

以下の構成で書いてください:
1. 全体的なコンディション概要（1〜2文）— 波のサイズは「モモ〜腰」「腰〜胸」「肩〜頭」などの日本式サイズ表記を使い、初心者にとって大きいか小さいかの補足も添えてください。
2. ベストな時間帯とその理由（1〜2文）— ベストな時間帯やスポットがあれば明示してください。
3. 初心者へのアドバイスまたは注意点（1〜2文）— 安全への配慮として「無理は禁物です」「コンディションが悪い時は見学に徹しましょう」などの表現を自然に含めてください。

ルール:
- 風の種類は各スポットの地形・海岸線方向を考慮して計算済みの値を渡しています。自分で風向きから再解釈せず、渡された「風の種類」をそのまま使ってください。例えば「南西の風」でもスポットによってオンショアになったりオフショアになったりします。
- 風の専門用語を使う場合は必ず簡単な説明を添えてください。例：「オフショア（陸から海に向かう風で波の面がキレイに整います）」「オンショア（海から陸に向かう風で波が崩れやすくなります）」
- 波高が2.5mを超える時間帯はクローズアウトと判断し、「海に入るのは絶対にやめましょう」と強く警告してください。
- 「ライフジャケット」という表現は使わないでください。
- 口調は丁寧でフレンドリーな「〜です」「〜ましょう」調で、友人の先輩サーファーが教えてくれるようなトーンにしてください。
- 余計な前置きや見出し記号は不要です。コメント本文のみ返してください。
- コメントは読みやすくするため、内容のまとまりごとに改行を入れてください。全体概要のあと、ベスト時間帯のあと、初心者アドバイスのあとにそれぞれ改行を入れ、1つの段落が長くなりすぎないよう2文ごとを目安に改行してください。
- データに「ダンパー傾向の注意」が含まれている場合は、コメントの最後に「なお、うねりが海岸線に対してほぼ直角に入っており、周期も短めのため、波が厚くダンパーになりやすい傾向があります。波に乗りづらいと感じたら無理せず様子を見ましょう。」という趣旨の注記を自然な文章で追加してください。`

    const userPrompt = `${targetLabel}（${forecastDate}）${hourNum}時時点の${areaLabel}・${spotName}のデータ:\n${forecastSummary}${dumperWarning}`

    console.log(`[daily-comment] Generating for ${target} ${hour}h...`)

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      console.error('[daily-comment] Claude API fetch error:', msg)
      return NextResponse.json({ error: `Claude API fetch failed: ${msg}` }, { status: 502 })
    } finally {
      clearTimeout(fetchTimeout)
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('[daily-comment] Claude API error:', res.status, errText)
      return NextResponse.json({ error: `Claude API error: ${res.status}`, detail: errText }, { status: 502 })
    }

    const result = await res.json()
    const comment = result.content?.[0]?.text ?? ''
    const generatedAt = new Date().toISOString()
    console.log(`[daily-comment] Generated: ${comment.substring(0, 80)}...`)

    // Firestoreにキャッシュ保存
    try {
      await setDoc(cacheRef, { comment, generatedAt, date: dateStr, target, hour })
    } catch (writeErr) {
      console.error('[daily-comment] Cache write error:', writeErr)
    }

    return NextResponse.json({ comment, generatedAt, target, hour, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-comment] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
