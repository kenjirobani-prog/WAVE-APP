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
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: '1500',
    keyword: 'サーフショップ',
    language: 'ja',
    key: apiKey,
  })

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
      { next: { revalidate: 86400 } } as RequestInit
    )
    if (!res.ok) throw new Error(`Places API error: ${res.status}`)
    const data = await res.json()

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

    return NextResponse.json({ shops })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 })
  }
}
