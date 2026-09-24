<template>
  <span
    class="monogram"
    :class="['shape-' + shape]"
    :style="{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.42) + 'px' }"
    :title="name"
  >{{ initial }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: Number, default: 32 },
  // circle：用户；square：智能体、知识库等资源
  shape: { type: String, default: 'square' }
})

// 取第一个有意义的字符：中文取首字，英文取首字母大写
const initial = computed(() => {
  const s = String(props.name || '').trim().replace(/^[^\p{L}\p{N}]+/u, '')
  if (!s) return '?'
  return Array.from(s)[0].toUpperCase()
})
</script>

<style scoped>
.monogram {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--brand-soft-2, rgba(217, 119, 87, 0.13));
  color: var(--brand-text, #b5542f);
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.shape-square {
  border-radius: 8px;
}

.shape-circle {
  border-radius: 50%;
}
</style>
