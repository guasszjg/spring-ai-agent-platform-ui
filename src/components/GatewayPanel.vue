<template>
  <div class="gateway-page">
    <header class="gw-head">
      <div class="gw-head-icon">
        <component :is="meta.icon" :size="20" :stroke-width="1.75" />
      </div>
      <div class="gw-head-text">
        <div class="gw-crumb">模型网关<ChevronRight :size="12" :stroke-width="2" />{{ meta.title }}</div>
        <h2>{{ meta.title }}</h2>
        <p>{{ meta.desc }}</p>
      </div>
      <div v-if="status[section]" class="gw-head-status" :class="'is-' + status[section].state">
        <span class="gw-dot"></span>{{ status[section].text }}
      </div>
    </header>

    <!-- 四个子页面都常驻挂载：切换无需重新加载，侧边栏也能一直显示各自的状态 -->
    <GatewayLlmSection v-show="section === 'llm'" ref="llmRef" @status="report('llm', $event)" />
    <GatewayEmbeddingSection v-show="section === 'embedding'" ref="embeddingRef" @status="report('embedding', $event)" />
    <GatewayOcrSection v-show="section === 'ocr'" ref="ocrRef" @status="report('ocr', $event)" />
    <GatewayDifySection v-show="section === 'dify'" ref="difyRef" @status="report('dify', $event)" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import GatewayLlmSection from './gateway/GatewayLlmSection.vue'
import GatewayEmbeddingSection from './gateway/GatewayEmbeddingSection.vue'
import GatewayOcrSection from './gateway/GatewayOcrSection.vue'
import GatewayDifySection from './gateway/GatewayDifySection.vue'
import { GATEWAY_SECTIONS } from './gateway/sections'

const props = defineProps({
  section: { type: String, default: 'llm' }
})
const emit = defineEmits(['status'])

const meta = computed(() => GATEWAY_SECTIONS.find((s) => s.key === props.section) || GATEWAY_SECTIONS[0])

// 各子页面上报的状态，汇总后交给侧边栏显示状态点
const status = reactive({})
function report(key, value) {
  status[key] = value
  emit('status', { ...status })
}

const llmRef = ref(null)
const embeddingRef = ref(null)
const ocrRef = ref(null)
const difyRef = ref(null)
const refs = { llm: llmRef, embedding: embeddingRef, ocr: ocrRef, dify: difyRef }

function refreshSection(key) {
  return refs[key]?.value?.refresh?.()
}

function refreshAll() {
  return Promise.all(Object.keys(refs).map(refreshSection))
}

defineExpose({ refreshSection, refreshAll })
</script>

<style scoped>
.gateway-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.gw-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.gw-head-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: var(--brand-text);
  margin-top: 2px;
}

.gw-head-text {
  flex: 1;
  min-width: 0;
}

.gw-crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.gw-head h2 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.gw-head p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  margin: 0;
  max-width: 760px;
}

.gw-head-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  max-width: 340px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--surface-subtle);
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 6px;
}

.gw-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-muted);
}

.is-ok .gw-dot { background: var(--accent-emerald); }
.is-warn .gw-dot { background: var(--accent-amber); }
.is-warn { color: var(--accent-amber); border-color: color-mix(in srgb, var(--accent-amber) 35%, transparent); }

@media (max-width: 720px) {
  .gw-head { flex-wrap: wrap; }
  .gw-head-status { max-width: 100%; margin-top: 0; }
}
</style>
