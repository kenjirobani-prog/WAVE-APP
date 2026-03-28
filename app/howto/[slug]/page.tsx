import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { howtoArticles } from '@/data/howto'
import ArticleClient from './ArticleClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = howtoArticles.find(a => a.slug === slug)
  if (!article) return {}
  return {
    title: `${article.title} | AI 波予報`,
    description: `${article.subtitle}。湘南のサーフィン情報とAI波予報の使い方を解説。`,
    openGraph: {
      title: `${article.title} | AI 波予報`,
      description: `${article.subtitle}。`,
      url: `https://jpwaveforecast.com/howto/${slug}`,
      siteName: 'AI 波予報',
      locale: 'ja_JP',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | AI 波予報`,
      description: `${article.subtitle}。`,
      images: ['https://jpwaveforecast.com/ogp.png'],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = howtoArticles.find(a => a.slug === slug)
  if (!article) notFound()
  return <ArticleClient article={article} />
}
