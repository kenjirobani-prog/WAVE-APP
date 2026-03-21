'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface TidePoint {
  hour: number
  tideHeight: number
}

interface Props {
  tideData: TidePoint[]
  currentHour: number
}

const movementLabel = (tideData: TidePoint[], currentHour: number): string => {
  const sorted = [...tideData].sort((a, b) => a.hour - b.hour)
  const current = sorted.find(p => p.hour === currentHour)
  const prev = sorted.find(p => p.hour === currentHour - 1)
  if (!current) return ''
  if (!prev) return current.tideHeight > 115 ? '↑ 上げ潮' : '↓ 引き潮'
  return current.tideHeight > prev.tideHeight ? '↑ 上げ潮' : '↓ 引き潮'
}

export default function TideChart({ tideData, currentHour }: Props) {
  if (tideData.length === 0) return null

  const sorted = [...tideData].sort((a, b) => a.hour - b.hour)

  // 現在時刻の潮位（JSTのcurrentHourで取得）
  const currentPoint = sorted.find(p => p.hour === currentHour)
  const currentTideHeight = currentPoint?.tideHeight ?? sorted[0].tideHeight

  const movement = movementLabel(tideData, currentHour)

  // X軸ラベル: 0〜23時
  const labels = sorted.map(p => `${p.hour}時`)
  const values = sorted.map(p => p.tideHeight)

  // 現在時刻のインデックス
  const currentIndex = sorted.findIndex(p => p.hour === currentHour)

  // 各ポイントの半径: 現在時刻のみ表示
  const pointRadius = sorted.map((_, i) => (i === currentIndex ? 5 : 0))
  const pointHoverRadius = sorted.map((_, i) => (i === currentIndex ? 7 : 3))
  const pointBackgroundColor = sorted.map((_, i) =>
    i === currentIndex ? '#0c4a6e' : '#0ea5e9',
  )

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: '#0ea5e9',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(14,165,233,0.15)',
        pointRadius,
        pointHoverRadius,
        pointBackgroundColor,
        pointBorderColor: pointBackgroundColor,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 4,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const hour = sorted[items[0].dataIndex]?.hour
            return hour !== undefined ? `${hour}時` : ''
          },
          label: (item) => `${item.raw}cm`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#8899aa',
          font: { size: 10 },
          maxRotation: 0,
          // 0・6・12・18・23時のみ表示
          callback: (_val, index) => {
            const hour = sorted[index]?.hour
            return [0, 6, 12, 18, 23].includes(hour) ? `${hour}時` : ''
          },
        },
      },
      y: {
        display: false,
        grid: { display: false },
      },
    },
    animation: false,
  }

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '0.5px solid #eef1f4',
        borderRadius: 12,
        padding: '0.75rem 1rem',
      }}
    >
      <p
        style={{
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 14,
          color: '#0a1628',
          marginBottom: 8,
        }}
      >
        現在 {currentTideHeight}cm {movement}
      </p>
      <Line data={data} options={options} />
    </div>
  )
}
