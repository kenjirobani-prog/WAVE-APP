import type { Metadata } from 'next'
import TyphoonDetailClient from './TyphoonDetailClient'

interface Props {
  params: Promise<{ year: string; typhoonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, typhoonId } = await params
  // typhoonIdは T{年下2桁}{番号} 形式（例: T2604 → 4号）
  const match = typhoonId.match(/T\d{2}(\d{2})/)
  const number = match ? parseInt(match[1], 10) : null
  const title = number
    ? `台風${number}号 進路情報 | AI波予報`
    : `台風情報 | AI波予報`
  const description = number
    ? `台風${number}号の進路予報と湘南・千葉・茨城サーフエリアへのうねり影響をAIが解説します。`
    : `台風の進路予報と湘南・千葉・茨城サーフエリアへのうねり影響をAIが解説します。`
  return {
    title,
    description,
    alternates: { canonical: `https://jpwaveforecast.com/typhoon/${year}/${typhoonId}` },
  }
}

export default async function TyphoonDetailPage({ params }: Props) {
  const { year, typhoonId } = await params
  return <TyphoonDetailClient year={year} typhoonId={typhoonId} />
}
