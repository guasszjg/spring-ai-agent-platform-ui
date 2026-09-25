<template>
  <!-- 智能体头像：浅色底方块 + 智能体形象；颜色按名称稳定映射，便于在列表中区分 -->
  <span
    class="agent-avatar"
    :style="{ width: size + 'px', height: size + 'px', '--av-tone': tone }"
    :title="name"
  >
    <AgentMascot :size="Math.round(size * 0.74)" :tone="tone" :animated="animated" />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import AgentMascot from './AgentMascot.vue'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: Number, default: 36 },
  animated: { type: Boolean, default: false }
})

// 低饱和大地色系：陶土、赭黄、灰绿、雾蓝、灰紫、赤陶
const TONES = ['#c15f3c', '#b0823a', '#6f8f6a', '#5f7f9a', '#8d6a8f', '#a0694f']

const tone = computed(() => {
  const s = String(props.name || '')
  let h = 0
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return TONES[h % TONES.length]
})
</script>

<style scoped>
.agent-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--av-tone) 13%, transparent);
}
</style>
