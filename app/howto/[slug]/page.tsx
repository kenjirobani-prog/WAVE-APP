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
    description: article.subtitle,
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = howtoArticles.find(a => a.slug === slug)
  if (!article) notFound()
  return <ArticleClient article={article} />
}
