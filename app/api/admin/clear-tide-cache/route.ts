import { NextResponse } from 'next/server'
import { getDb, ensureAnonymousAuth } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureAnonymousAuth()
    const db = getDb()

    // forecastCache コレクション内の全ドキュメントを削除
    // （潮位データは forecastCache 内の各条件オブジェクトに含まれる）
    const snapshot = await getDocs(collection(db, 'forecastCache'))
    let deleted = 0
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'forecastCache', docSnap.id))
      deleted++
    }

    return NextResponse.json({ success: true, deleted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[clear-tide-cache] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
