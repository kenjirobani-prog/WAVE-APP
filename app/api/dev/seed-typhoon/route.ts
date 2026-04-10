import { NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

export const maxDuration = 30

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    await ensureAnonymousAuth()
    const db = getDb()

    const year = String(new Date().getFullYear())
    const typhoonId = 'typhoon-test-4'
    const now = Date.now()

    const data = {
      name: '台風4号',
      number: 4,
      position: { lat: 8.3, lon: 149.9 },
      pressure: 990,
      windSpeed: 23,
      maxWindGust: 35,
      forecastPath: [
        { lat: 9.0,  lon: 146.0, time: new Date(now + 86400000).toISOString(),  pressure: 985, windSpeed: 25 },
        { lat: 10.5, lon: 142.0, time: new Date(now + 172800000).toISOString(), pressure: 980, windSpeed: 28 },
        { lat: 13.0, lon: 138.0, time: new Date(now + 259200000).toISOString(), pressure: 975, windSpeed: 30 },
      ],
      isActive: true,
      isWithin800km: true,
      updatedAt: new Date().toISOString(),
    }

    await setDoc(doc(db, 'typhoons', year, 'list', typhoonId), data)

    return NextResponse.json({
      success: true,
      path: `typhoons/${year}/list/${typhoonId}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[seed-typhoon] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET も許可（ブラウザから直接叩けるように）
export async function GET() {
  return POST()
}
