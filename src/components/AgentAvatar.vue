<template>
  <!-- 智能体 / 模板头像：浅色底方块 + 智能体形象；颜色按名称（或 toneKey）稳定映射 -->
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
import { toneOf } from '../composables/tone'

const props = defineProps({
  name: { type: String, default: '' },
  // 可选：按其他维度着色（如模板按行业分类），默认按名称
  toneKey: { type: String, default: '' },
  size: { type: Number, default: 36 },
  animated: { type: Boolean, default: false }
})

const tone = computed(() => toneOf(props.toneKey || props.name))
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
