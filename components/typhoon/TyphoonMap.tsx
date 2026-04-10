'use client'

interface ForecastPoint {
  lat: number
  lon: number
  time: string
  pressure: number
  windSpeed: number
}

interface Props {
  current: { lat: number; lon: number }
  forecastPath: ForecastPoint[]
}

const SVG_WIDTH = 400
const SVG_HEIGHT = 320

// 範囲: lon 100-180, lat 0-50
const LON_MIN = 100
const LON_MAX = 180
const LAT_MIN = 0
const LAT_MAX = 50

const mapLonToX = (lon: number) => ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_WIDTH
const mapLatToY = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_HEIGHT

// 日本列島の簡略海岸線（北海道・本州・四国・九州）
// 実座標を SVG にマップするための関数
function latLonPath(points: [number, number][]): string {
  return points
    .map((p, i) => {
      const x = mapLonToX(p[1]).toFixed(1)
      const y = mapLatToY(p[0]).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ') + ' Z'
}

// 簡略化された日本海岸線（代表点のみ）
const HOKKAIDO: [number, number][] = [
  [45.5, 141.6], [45.3, 142.8], [44.3, 145.4], [43.0, 145.8], [41.8, 143.2], [42.0, 140.4], [43.2, 140.0], [44.5, 141.5], [45.5, 141.6],
]
const HONSHU: [number, number][] = [
  [41.2, 140.4], [41.5, 141.5], [40.5, 141.9], [39.0, 141.8], [37.5, 141.0], [35.6, 140.8], [34.7, 138.9], [34.6, 138.2], [34.5, 136.9], [33.9, 135.4], [34.3, 133.0], [34.4, 131.0], [34.8, 131.8], [35.5, 132.5], [36.5, 133.2], [37.4, 137.3], [38.0, 138.3], [39.5, 140.0], [41.2, 140.4],
]
const SHIKOKU: [number, number][] = [
  [34.3, 134.3], [33.8, 134.8], [33.1, 134.2], [32.7, 132.9], [33.4, 132.5], [34.0, 133.0], [34.3, 134.3],
]
const KYUSHU: [number, number][] = [
  [33.9, 131.0], [33.2, 131.9], [32.8, 131.9], [31.8, 131.5], [31.2, 130.6], [32.0, 130.2], [32.9, 129.7], [33.5, 130.2], [33.9, 131.0],
]

const COAST_PATHS = [HOKKAIDO, HONSHU, SHIKOKU, KYUSHU].map(latLonPath)

function formatHour(iso: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    return `${mm}/${dd} ${hh}時`
  } catch {
    return ''
  }
}

export default function TyphoonMap({ current, forecastPath }: Props) {
  const currentX = mapLonToX(current.lon)
  const currentY = mapLatToY(current.lat)

  // 進路矢印のパス
  const pathPoints = [
    { x: currentX, y: currentY },
    ...forecastPath.map(p => ({ x: mapLonToX(p.lon), y: mapLatToY(p.lat) })),
  ]
  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  // 緯度グリッド（10度ごと）
  const latGrid = [10, 20, 30, 40]
  // 経度グリッド（10度ごと）
  const lonGrid = [110, 120, 130, 140, 150, 160, 170]

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        style={{ display: 'block', background: '#e0f2fe', borderRadius: 8 }}
      >
        {/* 緯度経度グリッド */}
        {latGrid.map(lat => (
          <line
            key={`lat-${lat}`}
            x1={0}
            y1={mapLatToY(lat)}
            x2={SVG_WIDTH}
            y2={mapLatToY(lat)}
            stroke="#bae6fd"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ))}
        {lonGrid.map(lon => (
          <line
            key={`lon-${lon}`}
            x1={mapLonToX(lon)}
            y1={0}
            x2={mapLonToX(lon)}
            y2={SVG_HEIGHT}
            stroke="#bae6fd"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ))}

        {/* 日本列島海岸線 */}
        {COAST_PATHS.map((d, i) => (
          <path key={i} d={d} fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
        ))}

        {/* 進路矢印（破線） */}
        {forecastPath.length > 0 && (
          <>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
              >
                <polygon points="0 0, 10 5, 0 10" fill="#0284c7" />
              </marker>
            </defs>
            <path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="5 3"
              markerEnd="url(#arrowhead)"
            />
          </>
        )}

        {/* 予報円（ピンクの楕円、24h ごとに半径を拡大） */}
        {forecastPath.slice(0, 3).map((p, i) => {
          const cx = mapLonToX(p.lon)
          const cy = mapLatToY(p.lat)
          const r = 12 + i * 4 // +24h: 12, +48h: 16, +72h: 20
          return (
            <g key={`forecast-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="rgba(236, 72, 153, 0.15)"
                stroke="#ec4899"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <text
                x={cx}
                y={cy - r - 3}
                textAnchor="middle"
                fontSize="9"
                fill="#be185d"
                fontWeight="600"
              >
                +{(i + 1) * 24}h
              </text>
            </g>
          )
        })}

        {/* 現在地（赤丸） */}
        <circle cx={currentX} cy={currentY} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
        <circle cx={currentX} cy={currentY} r="10" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.5" />
      </svg>

      {/* 凡例 */}
      <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />現在地
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
          <span className="inline-block w-3 h-0.5" style={{ background: '#0284c7', borderTop: '1px dashed #0284c7' }} />進路
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(236,72,153,0.15)', border: '1px dashed #ec4899' }} />予報円
        </span>
      </div>
    </div>
  )
}
