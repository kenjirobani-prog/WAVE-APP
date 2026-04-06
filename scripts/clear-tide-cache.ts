/**
 * forecastCache（潮位データ含む）をクリアするスクリプト
 *
 * 使い方:
 *   CRON_SECRET=xxx npx ts-node scripts/clear-tide-cache.ts
 *   または
 *   curl -X POST "https://jpwaveforecast.com/api/admin/clear-tide-cache?secret=YOUR_CRON_SECRET"
 */

const BASE_URL = process.env.BASE_URL ?? 'https://jpwaveforecast.com'
const secret = process.env.CRON_SECRET

if (!secret) {
  console.error('Error: CRON_SECRET environment variable is required')
  process.exit(1)
}

async function main() {
  const url = `${BASE_URL}/api/admin/clear-tide-cache?secret=${secret}`
  console.log(`Calling ${BASE_URL}/api/admin/clear-tide-cache ...`)

  const res = await fetch(url, { method: 'POST' })
  const data = await res.json()

  if (!res.ok) {
    console.error('Error:', data)
    process.exit(1)
  }

  console.log(`Success: deleted ${data.deleted} documents from forecastCache`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
