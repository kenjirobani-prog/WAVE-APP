import { NextResponse } from 'next/server'

const KAIHO_URL = 'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php?s=0062'

function jstDate(date: Date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return {
    yyyy: jst.getUTCFullYear(),
    mm: String(jst.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(jst.getUTCDate()).padStart(2, '0'),
    hour: jst.getUTCHours(),
  }
}

function parseObservations(html: string, yyyy: number, mm: string, dd: string): { result: (number | undefined)[]; matchCount: number; samples: string[] } {
  const hourlyValues: number[][] = Array.from({ length: 24 }, () => [])
  const pattern = new RegExp(
    `${yyyy}\\s+${mm}\\s+${dd}\\s+(\\d{2})\\s+\\d{2}\\s+(\\d+)`,
    'g'
  )
  let match
  let matchCount = 0
  const samples: string[] = []
  while ((match = pattern.exec(html)) !== null) {
    const hour = parseInt(match[1])
    const value = parseInt(match[2])
    if (matchCount < 5) samples.push(`hour=${match[1]} value=${match[2]}`)
    matchCount++
    if (value !== 9999 && hour >= 0 && hour < 24) {
      hourlyValues[hour].push(value)
    }
  }
  const result = hourlyValues.map(vals =>
    vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : undefined
  )
  return { result, matchCount, samples }
}

function parsePredictionTable(html: string, mm: string, dd: string) {
  const dateStr = mm + dd
  const dateCell = `<td[^>]*>\\s*${dateStr}\\s*<\\/td>`
  const numCell = `(?:<td[^>]*>\\s*(\\d+)\\s*<\\/td>\\s*){1,25}`
  const rowPattern = new RegExp(`${dateCell}\\s*(${numCell})`, 's')

  const rowMatch = rowPattern.exec(html)
  if (!rowMatch) return { result: new Array(24).fill(undefined), found: false, rawValues: [] }

  const values: number[] = []
  const tdPattern = /<td[^>]*>\s*(\d+)\s*<\/td>/g
  let tdMatch
  while ((tdMatch = tdPattern.exec(rowMatch[1])) !== null) {
    values.push(parseInt(tdMatch[1]))
  }
  const result = values.slice(0, 24).map(v => (isNaN(v) ? undefined : v))
  return { result, found: true, rawValues: values }
}

export async function GET() {
  const now = new Date()
  const { yyyy, mm, dd, hour: currentJstHour } = jstDate(now)

  let html = ''
  let fetchError = ''
  try {
    const res = await fetch(KAIHO_URL, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      cache: 'no-store',
    })
    html = await res.text()
  } catch (e) {
    fetchError = String(e)
  }

  const obs = parseObservations(html, yyyy, mm, dd)
  const pred = parsePredictionTable(html, mm, dd)

  const tideHourly = Array.from({ length: 24 }, (_, h) => {
    if (obs.result[h] !== undefined) return obs.result[h]!
    if (pred.result[h] !== undefined) return pred.result[h]!
    return Math.round(115 + 70 * Math.sin((h / 12) * Math.PI))
  })

  return NextResponse.json({
    debug: {
      jstDateUsed: `${yyyy}-${mm}-${dd}`,
      currentJstHour,
      currentTideValue: tideHourly[currentJstHour],
      fetchError: fetchError || null,
      htmlLength: html.length,
      htmlSnippet: html.slice(0, 1000),
    },
    observations: {
      matchCount: obs.matchCount,
      samples: obs.samples,
      hourlyValues: obs.result.map((v, h) => ({ hour: h, value: v })).filter(x => x.value !== undefined),
    },
    predictions: {
      found: pred.found,
      rawValuesCount: pred.rawValues.length,
      rawValues: pred.rawValues.slice(0, 28),
      hourlyValues: pred.result.map((v, h) => ({ hour: h, value: v })).filter(x => x.value !== undefined),
    },
    finalTideArray: tideHourly.map((v, h) => ({ hour: h, value: v })),
  })
}
