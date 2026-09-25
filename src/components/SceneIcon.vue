<template>
  <!-- 场景模板图标：按行业分类显示对应场景图形，底色按分类区分 -->
  <span
    class="scene-icon"
    :style="{ width: size + 'px', height: size + 'px', '--sc-tone': tone }"
    :title="category"
  >
    <component :is="icon" :size="Math.round(size * 0.5)" :stroke-width="1.75" />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { CodeXml, PenLine, ChartColumn, Headset, Landmark, Scale, GraduationCap, Sparkles } from 'lucide-vue-next'
import { toneOf } from '../composables/tone'

const props = defineProps({
  category: { type: String, default: '' },
  size: { type: Number, default: 36 }
})

// 行业 → 场景图形
const SCENE_ICONS = {
  代码研发: CodeXml,
  内容创作: PenLine,
  数据分析: ChartColumn,
  客户服务: Headset,
  金融风控: Landmark,
  行政法务: Scale,
  教育培训: GraduationCap,
  通用智能: Sparkles
}

const icon = computed(() => SCENE_ICONS[props.category] || Sparkles)
const tone = computed(() => toneOf(props.category))
</script>

<style scoped>
.scene-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  color: var(--sc-tone);
  background: color-mix(in srgb, var(--sc-tone) 13%, transparent);
}
</style>
