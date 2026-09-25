// 资源配色：6 种低饱和大地色，按字符串稳定映射（同一名称永远同一颜色）
// 陶土、赭黄、灰绿、雾蓝、灰紫、青灰
export const TONES = ['#c15f3c', '#b0823a', '#6f8f6a', '#5f7f9a', '#8d6a8f', '#4f8a8b']

export function toneOf(key) {
  const s = String(key || '')
  let h = 0
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return TONES[h % TONES.length]
}
