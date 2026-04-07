import type { Metadata } from 'next'
import SurfboardsPage from './SurfboardsClient'

export const metadata: Metadata = {
  title: 'サーフボード図鑑 | AI波予報',
  description: 'ショートボード・ミッドレングス・ロングボードなどサーフボードの種類と選び方を解説。',
}

export default function Page() {
  return <SurfboardsPage />
}
