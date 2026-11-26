<template>
  <div class="ctp-root" :class="{ compact }">
    <div v-if="!trace" class="ctp-empty">
      <i class="fa-solid fa-diagram-project"></i>
      <strong>暂无调用链路数据</strong>
      <span>发送一条测试消息后，这里会实时展示知识库检索、向量编码、重排、工具与大模型推理各阶段耗时。</span>
    </div>

    <template v-else>
      <!-- 顶部指标概览 -->
      <div class="ctp-summary-card">
        <div class="ctp-summary-top">
          <div class="ctp-status-group">
            <span class="ctp-status-badge" :class="'status-' + effectiveStatus">
              <i :class="statusIcon"></i>
              <span>{{ statusLabel }}</span>
            </span>
            <span v-if="trace.channel || trace.model" class="ctp-model-pill" :title="trace.routeNotice || ''">
              <i class="fa-solid fa-microchip"></i>
              <span>{{ trace.channel ? `${trace.channel} · ${trace.model || ''}` : trace.model }}</span>
            </span>
            <span v-if="trace.failoverFrom" class="ctp-warn-pill">
              <i class="fa-solid fa-shuffle"></i> 主备切换（原：{{ trace.failoverFrom }}）
            </span>
          </div>
          <button
            type="button"
            class="ctp-copy-btn"
            :class="{ copied }"
            title="复制完整链路 JSON，便于排查或提单"
            @click="copyTraceJson"
          >
            <i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
            <span>{{ copied ? '已复制' : '复制 JSON' }}</span>
          </button>
        </div>

        <div class="ctp-kpi-grid">
          <div class="ctp-kpi">
            <span class="ctp-kpi-label">总耗时</span>
            <strong class="ctp-kpi-value">{{ formatMs(totalDurationMs) }}</strong>
          </div>
          <div class="ctp-kpi">
            <span class="ctp-kpi-label">首字延迟 (TTFT)</span>
            <strong class="ctp-kpi-value">{{ trace.firstTokenMs != null ? formatMs(trace.firstTokenMs) : '-' }}</strong>
          </div>
          <div class="ctp-kpi">
            <span class="ctp-kpi-label">执行节点</span>
            <strong class="ctp-kpi-value">{{ orderedSteps.length }} 步</strong>
          </div>
          <div class="ctp-kpi">
            <span class="ctp-kpi-label">Token 消耗</span>
            <strong class="ctp-kpi-value">
              <template v-if="trace.totalTokens != null">
                {{ trace.totalTokens }}
                <small v-if="trace.promptTokens != null || trace.completionTokens != null" class="ctp-kpi-sub">
                  ({{ trace.promptTokens || 0 }}↑ / {{ trace.completionTokens || 0 }}↓<template v-if="trace.cachedPromptTokens"> · 缓存 {{ trace.cachedPromptTokens }}</template>)
                </small>
              </template>
              <template v-else>-</template>
            </strong>
          </div>
        </div>
      </div>

      <!-- 卡点 / 瓶颈 / 异常自动诊断条 -->
      <div v-if="diagnosticBanner" class="ctp-banner" :class="'banner-' + diagnosticBanner.type">
        <i :class="diagnosticBanner.icon"></i>
        <span>{{ diagnosticBanner.text }}</span>
      </div>

      <!-- 瀑布图时间轴 -->
      <div class="ctp-waterfall-card">
        <div class="ctp-wf-head">
          <span class="ctp-col-node">执行阶段与节点</span>
          <span class="ctp-col-bar">耗时分布（0ms — {{ formatMs(timelineScaleMs) }}）</span>
          <span class="ctp-col-dur">耗时</span>
        </div>

        <div v-if="!orderedSteps.length" class="ctp-wf-empty">
          <i class="fa-solid fa-circle-notch fa-spin"></i> 正在等待链路节点上报...
        </div>

        <div v-for="item in orderedSteps" :key="item.step.id" class="ctp-wf-group">
          <button
            type="button"
            class="ctp-wf-row"
            :class="{
              expanded: expandedIds.has(item.step.id),
              'is-running': item.step.status === 'running',
              'is-error': item.step.status === 'error',
              'is-bottleneck': bottleneckStepId === item.step.id && effectiveStatus === 'ok'
            }"
            @click="toggleExpand(item.step.id)"
          >
            <div class="ctp-col-node" :style="{ paddingLeft: (item.depth * 18) + 'px' }">
              <span v-if="item.depth > 0" class="ctp-tree-branch">└</span>
              <i class="ctp-step-state-icon" :class="stepStatusIcon(item.step.status)"></i>
              <span class="ctp-stage-tag" :class="'stage-' + stageColorKey(item.step.stage)">
                {{ stageLabel(item.step.stage) }}
              </span>
              <div class="ctp-node-text">
                <span class="ctp-node-name">{{ item.step.name }}</span>
                <span v-if="item.step.summary" class="ctp-node-summary" :title="item.step.summary">
                  {{ item.step.summary }}
                </span>
              </div>
            </div>

            <div class="ctp-col-bar">
              <div class="ctp-bar-track">
                <div
                  class="ctp-bar-fill"
                  :class="[
                    'bar-' + (item.step.status === 'error' ? 'error' : stageColorKey(item.step.stage)),
                    { 'bar-running': item.step.status === 'running' }
                  ]"
                  :style="barStyle(item.step)"
                ></div>
              </div>
            </div>

            <div class="ctp-col-dur">
              <span class="ctp-dur-val" :class="{ 'dur-running': item.step.status === 'running', 'dur-error': item.step.status === 'error' }">
                {{ formatMs(stepDurationMs(item.step)) }}
              </span>
              <i
                class="fa-solid ctp-chevron"
                :class="expandedIds.has(item.step.id) ? 'fa-chevron-up' : 'fa-chevron-down'"
              ></i>
            </div>
          </button>

          <!-- 展开的节点详情 -->
          <div v-if="expandedIds.has(item.step.id)" class="ctp-detail-box">
            <div class="ctp-detail-timing">
              <span>开始偏移：<strong>+{{ formatMs(item.step.startOffsetMs || 0) }}</strong></span>
              <span>节点耗时：<strong>{{ formatMs(stepDurationMs(item.step)) }}</strong></span>
              <span v-if="totalDurationMs > 0">
                占比：<strong>{{ Math.min(100, Math.round((stepDurationMs(item.step) / totalDurationMs) * 100)) }}%</strong>
              </span>
            </div>

            <div v-if="item.step.error" class="ctp-detail-error">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ item.step.error }}</span>
            </div>

            <div v-if="detailEntries(item.step).length" class="ctp-detail-kv">
              <div v-for="kv in detailEntries(item.step)" :key="kv.key" class="ctp-kv-row">
                <span class="ctp-kv-key">{{ kv.label }}</span>
                <span class="ctp-kv-val">{{ kv.value }}</span>
              </div>
            </div>

            <!-- 命中切片预览 -->
            <div v-if="Array.isArray(item.step.detail?.topChunks) && item.step.detail.topChunks.length" class="ctp-chunks-box">
              <div class="ctp-chunks-title">命中片段 Top {{ item.step.detail.topChunks.length }}</div>
              <div v-for="(chunk, idx) in item.step.detail.topChunks" :key="idx" class="ctp-chunk-item">
                <div class="ctp-chunk-head">
                  <span class="ctp-chunk-source">#{{ idx + 1 }} {{ chunk.source }}</span>
                  <span class="ctp-chunk-scores">
                    综合 {{ formatScore(chunk.score) }}
                    <template v-if="chunk.vectorScore != null"> · 向量 {{ formatScore(chunk.vectorScore) }}</template>
                    <template v-if="chunk.rerankScore != null"> · 重排 {{ formatScore(chunk.rerankScore) }}</template>
                  </span>
                </div>
                <p class="ctp-chunk-snippet">{{ chunk.snippet }}</p>
              </div>
            </div>

            <div v-if="!item.step.error && !detailEntries(item.step).length && !(item.step.detail?.topChunks?.length)" class="ctp-detail-empty">
              该节点无额外附加字段
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { copyToClipboard } from '../utils/clipboard'

const props = defineProps({
  trace: { type: Object, default: null },
  live: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})

const nowMs = ref(Date.now())
const expandedIds = ref(new Set())
const copied = ref(false)
let ticker = null

function syncTicker() {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
  if (props.live) {
    nowMs.value = Date.now()
    ticker = setInterval(() => {
      nowMs.value = Date.now()
    }, 200)
  }
}

watch(() => props.live, syncTicker, { immediate: true })
watch(() => props.trace?.traceId, () => {
  expandedIds.value = new Set()
})

onMounted(syncTicker)
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const effectiveStatus = computed(() => {
  if (props.live) return 'running'
  return props.trace?.status || 'ok'
})

const statusLabel = computed(() => {
  if (effectiveStatus.value === 'running') return '执行中'
  if (effectiveStatus.value === 'error') return '调用异常'
  return '执行完成'
})

const statusIcon = computed(() => {
  if (effectiveStatus.value === 'running') return 'fa-solid fa-circle-notch fa-spin'
  if (effectiveStatus.value === 'error') return 'fa-solid fa-circle-xmark'
  return 'fa-solid fa-circle-check'
})

const orderedSteps = computed(() => {
  const raw = Array.isArray(props.trace?.steps) ? props.trace.steps : []
  if (!raw.length) return []
  const byId = new Map(raw.map(s => [s.id, s]))
  const depthOf = (step) => {
    let d = 0
    let cur = step
    const guard = new Set()
    while (cur?.parentId && byId.has(cur.parentId) && !guard.has(cur.parentId)) {
      guard.add(cur.parentId)
      d += 1
      cur = byId.get(cur.parentId)
    }
    return Math.min(d, 3)
  }
  return raw.map(step => ({ step, depth: depthOf(step) }))
})

function stepDurationMs(step) {
  if (!step) return 0
  if (step.durationMs != null) return Math.max(0, Number(step.durationMs) || 0)
  if (step.status === 'running' && props.trace?.startedAt) {
    const startAbs = Number(props.trace.startedAt) + (Number(step.startOffsetMs) || 0)
    return Math.max(0, nowMs.value - startAbs)
  }
  return 0
}

const totalDurationMs = computed(() => {
  if (!props.trace) return 0
  if (props.live && props.trace.startedAt) {
    return Math.max(1, nowMs.value - Number(props.trace.startedAt))
  }
  if (props.trace.totalDurationMs != null && props.trace.totalDurationMs > 0) {
    return Number(props.trace.totalDurationMs)
  }
  let maxEnd = 0
  for (const { step } of orderedSteps.value) {
    const end = (Number(step.startOffsetMs) || 0) + stepDurationMs(step)
    if (end > maxEnd) maxEnd = end
  }
  return maxEnd
})

const timelineScaleMs = computed(() => Math.max(10, totalDurationMs.value))

// 找叶子节点里最慢的一步（避免父节点「知识库检索」永远掩盖子节点「向量模型编码」）
const bottleneckStep = computed(() => {
  const list = orderedSteps.value
  if (!list.length) return null
  const parentIds = new Set(list.map(x => x.step.parentId).filter(Boolean))
  const candidates = list.filter(x => !parentIds.has(x.step.id))
  const pool = candidates.length ? candidates : list
  let best = null
  let bestDur = -1
  for (const { step } of pool) {
    const dur = stepDurationMs(step)
    if (dur > bestDur) {
      bestDur = dur
      best = step
    }
  }
  return best
})

const bottleneckStepId = computed(() => bottleneckStep.value?.id || '')

const diagnosticBanner = computed(() => {
  if (!props.trace) return null
  const list = orderedSteps.value
  if (effectiveStatus.value === 'running') {
    const running = [...list].reverse().find(x => x.step.status === 'running')?.step
    if (running) {
      return {
        type: 'running',
        icon: 'fa-solid fa-circle-notch fa-spin',
        text: `正在执行「${running.name}」${running.summary ? `（${running.summary}）` : ''}，已耗时 ${formatMs(stepDurationMs(running))}`
      }
    }
    return {
      type: 'running',
      icon: 'fa-solid fa-circle-notch fa-spin',
      text: `请求执行中，总计已等待 ${formatMs(totalDurationMs.value)}`
    }
  }
  if (effectiveStatus.value === 'error') {
    const failed = [...list].reverse().find(x => x.step.status === 'error')?.step
    const reason = failed?.error || props.trace.error || '未知错误'
    return {
      type: 'error',
      icon: 'fa-solid fa-triangle-exclamation',
      text: failed
        ? `中断在「${failed.name}」（耗时 ${formatMs(stepDurationMs(failed))}）：${reason}`
        : `调用异常：${reason}`
    }
  }
  if (bottleneckStep.value && totalDurationMs.value > 0) {
    const dur = stepDurationMs(bottleneckStep.value)
    const pct = Math.min(100, Math.round((dur / totalDurationMs.value) * 100))
    return {
      type: 'info',
      icon: 'fa-solid fa-gauge-high',
      text: `主要耗时节点：${bottleneckStep.value.name}（${formatMs(dur)}，占总耗时 ${pct}%）`
    }
  }
  return null
})

function barStyle(step) {
  const scale = timelineScaleMs.value
  const left = Math.min(98, Math.max(0, ((Number(step.startOffsetMs) || 0) / scale) * 100))
  const rawWidth = (stepDurationMs(step) / scale) * 100
  const width = Math.min(100 - left, Math.max(1.5, rawWidth))
  return {
    left: `${left.toFixed(2)}%`,
    width: `${width.toFixed(2)}%`
  }
}

function toggleExpand(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function formatMs(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n < 0) return '-'
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`
  return `${Math.round(n)}ms`
}

function formatScore(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : '-'
}

function stepStatusIcon(status) {
  if (status === 'running') return 'fa-solid fa-circle-notch fa-spin state-running'
  if (status === 'error') return 'fa-solid fa-circle-xmark state-error'
  return 'fa-solid fa-circle-check state-ok'
}

const STAGE_META = {
  PREPARE: { label: '准备', color: 'slate' },
  KB_RETRIEVE: { label: '知识库', color: 'cyan' },
  KB_CACHE: { label: '缓存', color: 'emerald' },
  KB_REWRITE: { label: '改写', color: 'cyan' },
  EMBEDDING: { label: '向量', color: 'purple' },
  KB_SEARCH: { label: '召回', color: 'cyan' },
  RERANK: { label: '重排', color: 'amber' },
  TOOL: { label: '工具', color: 'emerald' },
  ROUTE: { label: '路由', color: 'amber' },
  LLM: { label: '模型', color: 'blue' }
}

function stageLabel(stage) {
  return STAGE_META[stage]?.label || stage || '步骤'
}

function stageColorKey(stage) {
  return STAGE_META[stage]?.color || 'slate'
}

const DETAIL_LABELS = {
  model: '使用模型',
  dimension: '向量维度',
  query: '检索词',
  originalQuery: '原始问题',
  effectiveQuery: '改写后检索词',
  rewritten: '是否改写',
  searchMethod: '检索方式',
  engine: '检索引擎',
  topK: 'Top K',
  threshold: '相似度阈值',
  vectorHits: '向量召回数',
  keywordHits: '关键词召回数',
  candidates: '融合候选数',
  inputCandidates: '重排输入条数',
  outputCandidates: '重排输出条数',
  hitCount: '最终命中条数',
  topScore: '最高分',
  similarity: '缓存相似度',
  knowledgeBases: '检索知识库',
  knowledgeBaseCount: '绑定知识库数',
  knowledgeMode: '检索模式',
  contextBudgetTokens: '上下文预算',
  memoryTurnsConfig: '记忆轮数上限',
  historyMessages: '携带历史消息',
  toolCount: '可用工具数',
  skillCount: '绑定技能数',
  draftRoute: '使用草稿路由',
  round: '推理轮次',
  streaming: '流式模式',
  messageCount: '请求消息条数',
  ttftMs: '本轮首字延迟',
  promptTokens: '输入 Token',
  cachedPromptTokens: '缓存命中 Token',
  completionTokens: '输出 Token',
  toolCallCount: '触发工具数',
  toolName: '工具名称',
  arguments: '调用入参',
  resultLength: '返回长度',
  resultPreview: '返回摘要',
  faqImages: '命中 FAQ 图片',
  faqVideos: '命中 FAQ 视频',
  fromChannel: '原主通道',
  toChannel: '切换备用通道',
  reason: '切换原因',
  provider: '引擎类型',
  knowledgeBase: '知识库名称',
  tokens: '重排 Token',
  errors: '异常信息'
}

function detailEntries(step) {
  const detail = step?.detail
  if (!detail || typeof detail !== 'object') return []
  const rows = []
  for (const [key, val] of Object.entries(detail)) {
    if (key === 'topChunks' || val === undefined || val === null || val === '') continue
    let display = val
    if (key === 'ttftMs') display = formatMs(val)
    else if (typeof val === 'boolean') display = val ? '是' : '否'
    else if (Array.isArray(val)) display = val.join('、')
    else if (typeof val === 'object') display = JSON.stringify(val)
    rows.push({
      key,
      label: DETAIL_LABELS[key] || key,
      value: String(display)
    })
  }
  return rows
}

async function copyTraceJson() {
  if (!props.trace) return
  const ok = await copyToClipboard(JSON.stringify(props.trace, null, 2))
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  }
}
</script>

<style scoped>
.ctp-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: var(--text-primary);
}

.ctp-root.compact {
  gap: 8px;
  font-size: 12px;
}

.ctp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;
  color: var(--text-muted);
}

.ctp-empty i {
  font-size: 28px;
  opacity: 0.45;
  color: var(--accent-blue);
}

.ctp-empty strong {
  font-size: 14px;
  color: var(--text-secondary);
}

.ctp-empty span {
  max-width: 340px;
  font-size: 12.5px;
  line-height: 1.6;
}

.ctp-summary-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ctp-summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.ctp-status-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ctp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}

.ctp-status-badge.status-ok {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.28);
}

.ctp-status-badge.status-running {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.ctp-status-badge.status-error {
  background: rgba(244, 63, 94, 0.12);
  color: #f43f5e;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.ctp-model-pill,
.ctp-warn-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.ctp-warn-pill {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
  color: #d97706;
}

.ctp-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.ctp-copy-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.ctp-copy-btn.copied {
  border-color: #10b981;
  color: #10b981;
}

.ctp-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.ctp-root.compact .ctp-kpi-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ctp-kpi {
  padding: 7px 9px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ctp-kpi-label {
  font-size: 11px;
  color: var(--text-muted);
}

.ctp-kpi-value {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctp-kpi-sub {
  font-size: 10.5px;
  font-weight: 400;
  color: var(--text-muted);
}

.ctp-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid transparent;
}

.ctp-banner.banner-running {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.25);
  color: var(--accent-blue);
}

.ctp-banner.banner-error {
  background: rgba(244, 63, 94, 0.1);
  border-color: rgba(244, 63, 94, 0.28);
  color: #f43f5e;
}

.ctp-banner.banner-info {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.24);
  color: var(--text-primary);
}

.ctp-banner.banner-info i {
  color: #f59e0b;
}

.ctp-waterfall-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
  overflow: hidden;
}

.ctp-wf-head {
  display: grid;
  grid-template-columns: minmax(170px, 1.4fr) minmax(110px, 1fr) 74px;
  gap: 10px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-input);
  border-bottom: 1px solid var(--border-color);
}

.ctp-wf-empty {
  padding: 20px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-muted);
}

.ctp-wf-group {
  border-bottom: 1px solid var(--border-color);
}

.ctp-wf-group:last-child {
  border-bottom: none;
}

.ctp-wf-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(170px, 1.4fr) minmax(110px, 1fr) 74px;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ctp-wf-row:hover {
  background: var(--bg-input);
}

.ctp-wf-row.expanded {
  background: rgba(59, 130, 246, 0.05);
}

.ctp-wf-row.is-error {
  background: rgba(244, 63, 94, 0.05);
}

.ctp-wf-row.is-bottleneck .ctp-dur-val {
  color: #d97706;
  font-weight: 700;
}

.ctp-col-node {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ctp-tree-branch {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 12px;
  flex-shrink: 0;
}

.ctp-step-state-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.ctp-step-state-icon.state-ok { color: #10b981; }
.ctp-step-state-icon.state-running { color: var(--accent-blue); }
.ctp-step-state-icon.state-error { color: #f43f5e; }

.ctp-stage-tag {
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.stage-slate { background: rgba(100, 116, 139, 0.14); color: #64748b; }
.stage-cyan { background: rgba(6, 182, 212, 0.14); color: #0891b2; }
.stage-purple { background: rgba(139, 92, 246, 0.14); color: #7c3aed; }
.stage-amber { background: rgba(245, 158, 11, 0.14); color: #d97706; }
.stage-emerald { background: rgba(16, 185, 129, 0.14); color: #059669; }
.stage-blue { background: rgba(59, 130, 246, 0.14); color: #2563eb; }

.ctp-node-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.ctp-node-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctp-node-summary {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctp-col-bar {
  display: flex;
  align-items: center;
}

.ctp-bar-track {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.ctp-bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  min-width: 5px;
  transition: width 0.2s linear;
}

.bar-slate { background: #94a3b8; }
.bar-cyan { background: #06b6d4; }
.bar-purple { background: #8b5cf6; }
.bar-amber { background: #f59e0b; }
.bar-emerald { background: #10b981; }
.bar-blue { background: #3b82f6; }
.bar-error { background: #f43f5e; }

.bar-running {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.28) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.28) 50%,
    rgba(255, 255, 255, 0.28) 75%,
    transparent 75%,
    transparent
  );
  background-size: 16px 16px;
  animation: ctp-stripes 0.8s linear infinite;
}

@keyframes ctp-stripes {
  from { background-position: 0 0; }
  to { background-position: 16px 0; }
}

.ctp-col-dur {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.ctp-dur-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ctp-dur-val.dur-running { color: var(--accent-blue); }
.ctp-dur-val.dur-error { color: #f43f5e; }

.ctp-chevron {
  font-size: 10px;
  color: var(--text-muted);
}

.ctp-detail-box {
  padding: 10px 14px 12px;
  background: var(--bg-input);
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ctp-detail-timing {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.ctp-detail-timing strong {
  color: var(--text-primary);
}

.ctp-detail-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  background: rgba(244, 63, 94, 0.1);
  color: #f43f5e;
  font-size: 12px;
  word-break: break-word;
}

.ctp-detail-kv {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.ctp-kv-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  min-width: 0;
}

.ctp-kv-key {
  font-size: 10.5px;
  color: var(--text-muted);
}

.ctp-kv-val {
  font-size: 12px;
  color: var(--text-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

.ctp-chunks-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ctp-chunks-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ctp-chunk-item {
  padding: 7px 9px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.ctp-chunk-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
  margin-bottom: 4px;
}

.ctp-chunk-source {
  font-weight: 600;
  color: var(--text-primary);
}

.ctp-chunk-scores {
  color: var(--accent-blue);
  font-variant-numeric: tabular-nums;
}

.ctp-chunk-snippet {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.ctp-detail-empty {
  font-size: 11.5px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .ctp-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ctp-wf-head,
  .ctp-wf-row {
    grid-template-columns: minmax(140px, 1.3fr) minmax(70px, 0.8fr) 64px;
  }
  .ctp-detail-kv {
    grid-template-columns: 1fr;
  }
}
</style>
