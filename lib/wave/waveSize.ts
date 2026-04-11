// 波高（m）を日本語の身体表現に変換

export function getWaveSizeLabel(waveHeightM: number): string {
  if (waveHeightM < 0.3) return 'ひざ以下'
  if (waveHeightM < 0.5) return 'ひざ'
  if (waveHeightM < 0.7) return 'ひざ〜腰'
  if (waveHeightM < 0.9) return '腰'
  if (waveHeightM < 1.1) return '腰〜腹'
  if (waveHeightM < 1.3) return '腹'
  if (waveHeightM < 1.5) return '腹〜胸'
  if (waveHeightM < 1.8) return '胸'
  if (waveHeightM < 2.1) return '胸〜肩'
  if (waveHeightM < 2.5) return '肩〜頭'
  if (waveHeightM < 3.0) return '頭'
  if (waveHeightM < 3.5) return '頭オーバー'
  return 'ダブルオーバー'
}
