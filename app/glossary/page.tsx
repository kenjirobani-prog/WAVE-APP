import type { Metadata } from 'next'
import GlossaryClient from './GlossaryClient'

export const metadata: Metadata = {
  title: 'サーフィン用語集 | AI 波予報',
  description: 'オフショア・ダンパー・うねりなどサーフィンでよく使う用語をわかりやすく解説。初心者向けサーフィン用語辞典。',
}

export default function GlossaryPage() {
  return <GlossaryClient />
}
