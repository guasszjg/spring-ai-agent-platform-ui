<template>
  <!--
    用户头像：扁平风格 SVG 人像（头部 + 颈部 + 肩部）。
    发型、发色、衣服颜色由 seed（建议传 username）稳定生成，同一用户处处一致。
  -->
  <svg
    class="user-avatar"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :aria-label="name || seed"
  >
    <title>{{ name || seed }}</title>
    <defs>
      <clipPath :id="clipId">
        <circle cx="32" cy="32" r="32" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <rect width="64" height="64" :style="{ fill: bg }" />
      <!-- 以底部中心为基准放大人物，让头像更饱满 -->
      <g transform="translate(32 64) scale(1.15) translate(-32 -64)">
      <!-- 长发垫在身体后面 -->
      <path v-if="look.hair === 'long'" :fill="look.hairColor" d="M19 31C18 18 24 12 32 12s14 6 13 19l1 17c-4 2-9 2-12 0l-2-18c-1-4-2-6-4-6s-3 2-4 6l-2 18c-3 2-8 2-12 0Z" />
      <!-- 肩部 / 衣服 -->
      <path :fill="shirt" d="M10 66c0-13 9-21 22-21s22 8 22 21Z" />
      <path fill="#ffffff" opacity="0.18" d="M26 45.5 32 52l6-6.5c-2-.4-4-.5-6-.5s-4 .1-6 .5Z" />
      <!-- 颈部 -->
      <rect :fill="look.skinShade" x="27.5" y="36" width="9" height="11" rx="4" />
      <!-- 头部 -->
      <circle :fill="look.skin" cx="32" cy="27" r="11.5" />
      <!-- 发型 -->
      <path v-if="look.hair === 'short'" :fill="look.hairColor" d="M20.4 26.5C20 18.5 25 14 32 14s12.2 4.3 11.7 12.3c-2.6-3.6-6.6-5.2-11.7-5.2s-9 1.6-11.6 5.4Z" />
      <path v-else-if="look.hair === 'side'" :fill="look.hairColor" d="M20.5 28C19.4 19 24.6 13.8 32.4 13.8c7.3 0 12 4.9 11.2 13.2-1.4-2.9-3.3-4.9-5.8-6.1-3.2 2.4-9.7 3.6-17.3 7.1Z" />
      <path v-else-if="look.hair === 'long'" :fill="look.hairColor" d="M20.6 27.5C20.2 19 25.4 14 32 14s11.8 5 11.4 13.5c-2.2-4.3-6.4-6.6-11.4-6.6s-9.2 2.3-11.4 6.6Z" />
      <g v-else-if="look.hair === 'bun'" :fill="look.hairColor">
        <circle cx="32" cy="11.5" r="5" />
        <path d="M20.6 26.8C20.3 19 25.4 14.5 32 14.5s11.7 4.5 11.4 12.3c-2.5-3.4-6.5-5-11.4-5s-8.9 1.6-11.4 5Z" />
      </g>
      </g>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { toneOf } from '../composables/tone'

const props = defineProps({
  seed: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: Number, default: 32 }
})

const HAIRS = ['short', 'side', 'long', 'bun']
const HAIR_COLORS = ['#2f2522', '#553829', '#7a5236']
const SKINS = [
  ['#f2d3bd', '#e4bca2'],
  ['#e9c3a4', '#d9aa88'],
  ['#d9a883', '#c8926b']
]

let uidSeed = 0
const clipId = `ua-clip-${++uidSeed}-${Math.random().toString(36).slice(2, 7)}`

function hash(str, salt) {
  let h = salt
  for (const ch of String(str || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}

const look = computed(() => {
  const key = props.seed || props.name
  const [skin, skinShade] = SKINS[hash(key, 7) % SKINS.length]
  return {
    hair: HAIRS[hash(key, 3) % HAIRS.length],
    hairColor: HAIR_COLORS[hash(key, 5) % HAIR_COLORS.length],
    skin,
    skinShade
  }
})

const shirt = computed(() => toneOf(props.seed || props.name))
const bg = computed(() => `color-mix(in srgb, ${shirt.value} 16%, #f7f3ec)`)
</script>

<style scoped>
.user-avatar {
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
}
</style>
