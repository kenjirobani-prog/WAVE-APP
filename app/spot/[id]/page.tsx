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
    description: `${spot.name}（${spot.nameEn}）の今日の波予報。波高・風・うねり・潮位をリアルタイムで確認。${spot.description ?? ''}`,
    openGraph: {
      title: `${spot.name}の波予報 | AI 波予報`,
      description: `${spot.name}の今日の波予報。あなたのレベルに合ったコンディション診断。`,
      url: `https://jpwaveforecast.com/spot/${spot.id}`,
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
