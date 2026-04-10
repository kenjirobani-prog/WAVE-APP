import type { Metadata } from 'next'
import TyphoonYearClient from './TyphoonYearClient'

interface Props {
  params: Promise<{ year: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params
  return {
    title: `${year}年 台風情報 | AI波予報`,
    description: `${year}年に発生した台風と湘南・千葉・茨城サーフエリアへのうねり影響をまとめています。`,
  }
}

export default async function TyphoonYearPage({ params }: Props) {
  const { year } = await params
  return <TyphoonYearClient year={year} />
}
