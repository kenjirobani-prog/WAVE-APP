import type { WaveAdapter, WaveCondition } from './types'

type AdapterKey = 'open-meteo' | 'stormglass' | 'surfline'

const adapterLoaders: Record<AdapterKey, () => Promise<{ default?: WaveAdapter } & Partial<Record<string, WaveAdapter>>>> = {
  'open-meteo': () => import('./adapters/openMeteo').then(m => ({ openMeteoAdapter: m.openMeteoAdapter })),
  'stormglass': () => { throw new Error('StormGlass adapter not yet implemented') },
  'surfline':   () => { throw new Error('Surfline adapter not yet implemented') },
}

async function getAdapter(): Promise<WaveAdapter> {
  const provider = (process.env.WAVE_API_PROVIDER ?? 'open-meteo') as AdapterKey
  const mod = await adapterLoaders[provider]()
  const adapter = Object.values(mod)[0]
  if (!adapter) throw new Error(`No adapter found for provider: ${provider}`)
  return adapter as WaveAdapter
}

export async function getConditions(spotId: string, date: Date): Promise<WaveCondition[]> {
  const adapter = await getAdapter()
  return adapter.getConditions(spotId, date)
}

export async function getForecast(spotId: string, days: number): Promise<WaveCondition[]> {
  const adapter = await getAdapter()
  return adapter.getForecast(spotId, days)
}

// 指定日の代表コンディション（正午のデータ）を返す
export async function getDailyCondition(spotId: string, date: Date): Promise<WaveCondition | null> {
  const conditions = await getConditions(spotId, date)
  // 正午（12時）のデータを代表値として使用
  const noon = conditions.find(c => new Date(c.timestamp).getHours() === 12)
  return noon ?? conditions[0] ?? null
}
