import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('[Shops] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set')
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: '3000',
    keyword: 'surf shop',
    language: 'ja',
    key: apiKey,
  })

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  console.log('[Shops] Request URL:', url.replace(apiKey, 'API_KEY_REDACTED'))

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit)
    if (!res.ok) {
      console.error('[Shops] HTTP error:', res.status, res.statusText)
      throw new Error(`Places API HTTP error: ${res.status}`)
    }
    const data = await res.json()
    console.log('[Shops] status:', data.status)
    console.log('[Shops] results count:', data.results?.length ?? 0)
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Shops] API error status:', data.status, data.error_message ?? '')
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
