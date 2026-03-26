import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  // サーバーサイドでは GOOGLE_MAPS_API_KEY を優先、なければ NEXT_PUBLIC_ にフォールバック
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  console.log('[Shops] API key exists (GOOGLE_MAPS_API_KEY):', !!process.env.GOOGLE_MAPS_API_KEY)
  console.log('[Shops] API key exists (NEXT_PUBLIC_):', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  console.log('[Shops] API key prefix:', apiKey?.slice(0, 8))
  if (!apiKey) {
    console.error('[Shops] No Maps API key found (tried GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)')
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: '5000',
    keyword: 'surf',
    type: 'store',
    language: 'ja',
    key: apiKey,
  })

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  console.log('[Shops] Request URL (full):', url)

  try {
    // キャッシュなし（デバッグ用）
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.error('[Shops] HTTP error:', res.status, res.statusText)
      throw new Error(`Places API HTTP error: ${res.status}`)
    }
    const data = await res.json()
    console.log('[Shops] status:', data.status)
    console.log('[Shops] results count:', data.results?.length ?? 0)
    if (data.error_message) {
      console.error('[Shops] error_message:', data.error_message)
    }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Shops] Unexpected status:', data.status)
    }

    const shops = (data.results ?? []).slice(0, 5).map((p: {
      name: string
      vicinity: string
      rating?: number
      place_id: string
      geometry: { location: { lat: number; lng: number } }
    }) => ({
      name: p.name,
      vicinity: p.vicinity,
      rating: p.rating,
      place_id: p.place_id,
      geometry: p.geometry,
    }))

    return NextResponse.json({ shops, status: data.status })
  } catch (err) {
    console.error('[Shops] Fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 })
  }
}
