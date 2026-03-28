import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SPOTS } from '@/data/spots'
import SpotDetailContent, { SpotDetailSkeleton } from './SpotDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const spot = SPOTS.find(s => s.id === id)
  if (!spot) return {}
  return {
    title: `${spot.name}の波予報 | AI 波予報`,
    description: `AIが${spot.name}の波をリアルタイム分析。波高・風・うねり・潮位を総合スコア化。今日サーフィンに行くべきか即判断。湘南のAI波予報アプリ。`,
    openGraph: {
      title: `${spot.name}の波予報 | AI 波予報`,
      description: `AIが${spot.name}の波をリアルタイム分析。`,
      url: `https://jpwaveforecast.com/spot/${spot.id}`,
      siteName: 'AI 波予報',
      locale: 'ja_JP',
      type: 'website',
    },
  }
}

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense fallback={<SpotDetailSkeleton />}>
      <SpotDetailContent id={id} />
    </Suspense>
  )
}
