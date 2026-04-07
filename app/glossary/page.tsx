import type { Metadata } from 'next'
import GlossaryClient from './GlossaryClient'

export const metadata: Metadata = {
  title: 'サーフィン用語集 | AI波予報',
  description: 'グランドスウェル・オフショア・クローズアウトなどサーフィン用語を50語以上解説。',
}

export default function GlossaryPage() {
  return <GlossaryClient />
}
