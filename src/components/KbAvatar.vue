<template>
  <!-- 知识库头像：浅色底方块 + 书本线性图标；Dify 外挂用"书本 + 链接"区分 -->
  <span
    class="kb-avatar"
    :style="{ width: size + 'px', height: size + 'px', '--kb-tone': tone }"
    :title="name"
  >
    <BookText :size="Math.round(size * 0.5)" :stroke-width="1.75" />
    <span v-if="external" class="kb-avatar-badge" title="Dify 外挂知识库">
      <Link2 :size="Math.max(9, Math.round(size * 0.26))" :stroke-width="2.2" />
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { BookText, Link2 } from 'lucide-vue-next'
import { toneOf } from '../composables/tone'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: Number, default: 36 },
  // 是否为外挂引擎（Dify）知识库
  external: { type: Boolean, default: false }
})

const tone = computed(() => toneOf(props.name))
</script>

<style scoped>
.kb-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  color: var(--kb-tone);
  background: color-mix(in srgb, var(--kb-tone) 13%, transparent);
}

.kb-avatar-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 999px;
  color: #ffffff;
  background: var(--kb-tone);
  box-shadow: 0 0 0 2px var(--bg-card, #ffffff);
}
</style>
