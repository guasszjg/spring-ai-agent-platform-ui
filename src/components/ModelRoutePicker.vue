<template>
  <div class="mrp" ref="rootRef">
    <button
      type="button"
      class="model-selector-pill mrp-trigger"
      :class="{ 'mrp-trigger-open': open, 'mrp-trigger-warn': route.primaryUnavailable }"
      :title="triggerTitle"
      @click="toggle"
    >
      <i class="fa-solid fa-microchip" style="color: var(--accent-purple);"></i>
      <span class="model-current-name">{{ triggerLabel }}</span>
      <span v-if="route.primaryUnavailable" class="mrp-trigger-flag mrp-flag-warn" title="所选通道当前不可用，对话会改用平台默认">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </span>
      <span v-else-if="dirty" class="mrp-trigger-flag mrp-flag-draft">草稿</span>
      <span v-else-if="route.followPlatform" class="mrp-trigger-flag mrp-flag-default">默认</span>
      <span class="model-type-badge">CHAT</span>
      <i class="fa-solid fa-chevron-down mrp-caret"></i>
    </button>

    <div v-if="open" class="mrp-panel" role="dialog" aria-label="选择模型通道">
      <div class="mrp-head">
        <div>
          <div class="mrp-title">模型通道</div>
          <div class="mrp-subtitle">修改只在当前窗口生效，点「发布上线」后保存到智能体</div>
        </div>
        <button type="button" class="mrp-icon-btn" :disabled="loading" title="刷新通道状态" @click="$emit('refresh')">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>

      <div class="mrp-summary">
        <div class="mrp-summary-row">
          <span class="mrp-summary-key">主通道</span>
          <span class="mrp-summary-val">{{ route.primary ? route.primary.name : '无可用通道' }}<template v-if="route.model"> · {{ route.model }}</template></span>
        </div>
        <div class="mrp-summary-row">
          <span class="mrp-summary-key">备用</span>
          <span class="mrp-summary-val" :class="{ 'mrp-muted': !route.fallback }">
            {{ route.fallback ? route.fallback.name + (route.fallbackModel ? ' · ' + route.fallbackModel : '') : '不切换，主通道失败即报错' }}
          </span>
        </div>
        <div v-if="route.primaryUnavailable || route.fallbackUnavailable" class="mrp-alert">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>
            <template v-if="route.primaryUnavailable">已选主通道{{ route.primaryUnavailable }}，对话将使用平台默认通道。</template>
            <template v-if="route.fallbackUnavailable">已选备用通道{{ route.fallbackUnavailable }}，将按平台降级设置。</template>
          </span>
        </div>
      </div>

      <div class="mrp-tabs" role="tablist">
        <button type="button" role="tab" class="mrp-tab" :class="{ active: tab === 'primary' }" @click="tab = 'primary'">
          主通道
          <span v-if="draft.primaryProviderId" class="mrp-tab-dot"></span>
        </button>
        <button type="button" role="tab" class="mrp-tab" :class="{ active: tab === 'fallback' }" @click="tab = 'fallback'">
          备用通道
          <span v-if="draft.fallbackProviderId" class="mrp-tab-dot"></span>
        </button>
      </div>

      <div class="mrp-list">
        <!-- 跟随平台默认 -->
        <div
          class="mrp-item"
          :class="{ selected: currentId === '' }"
          role="radio"
          :aria-checked="currentId === ''"
          tabindex="0"
          @click="choose('')"
          @keydown.enter.prevent="choose('')"
        >
          <span class="mrp-radio"></span>
          <div class="mrp-item-main">
            <div class="mrp-item-name">跟随平台默认</div>
            <div class="mrp-item-desc">
              <template v-if="tab === 'primary'">
                {{ platform ? '当前：' + platform.channelName + (platform.model ? ' · ' + platform.model : '') : '平台还没有可用的默认通道' }}
              </template>
              <template v-else>
                {{ platform && platform.fallbackChannelName ? '当前：' + platform.fallbackChannelName : '平台未开启自动降级，主通道失败时不切换' }}
              </template>
            </div>
          </div>
        </div>

        <div v-if="!selectableChannels.length && !loading" class="mrp-empty">
          没有可选的通道。通道需要在「模型网关 → 大语言模型」中启用，并且连通测试通过。
        </div>

        <div
          v-for="c in selectableChannels"
          :key="c.id"
          class="mrp-item"
          :class="{ selected: currentId === c.id, disabled: isTakenByPrimary(c) }"
          role="radio"
          :aria-checked="currentId === c.id"
          :aria-disabled="isTakenByPrimary(c)"
          tabindex="0"
          @click="choose(c.id)"
          @keydown.enter.prevent="choose(c.id)"
        >
          <span class="mrp-radio"></span>
          <div class="mrp-item-main">
            <div class="mrp-item-name">
              <span class="mrp-name-text">{{ c.name }}</span>
              <span v-if="platform && platform.channelId === c.id" class="mrp-chip mrp-chip-plain">平台默认</span>
              <span v-if="platform && platform.fallbackChannelId === c.id" class="mrp-chip mrp-chip-plain">平台备用</span>
            </div>
            <div class="mrp-item-chips">
              <span class="mrp-chip" :class="c.supportsTools ? 'mrp-chip-ok' : 'mrp-chip-off'" :title="c.supportsTools ? '会发送工具定义' : '不发送工具定义，智能体的工具、技能和模型自主检索不生效'">
                <i :class="c.supportsTools ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-ban'"></i>
                {{ c.supportsTools ? '工具调用' : '不支持工具' }}
              </span>
              <span v-if="c.contextWindow" class="mrp-chip mrp-chip-plain" title="上下文窗口：输入加输出的最大长度">上下文 {{ formatContextWindow(c.contextWindow) }}</span>
              <span class="mrp-chip mrp-chip-plain" :title="'模型网关最近一次连通测试：' + formatTime(c.lastProbeAt)">网关测试 {{ formatAgo(c.lastProbeAt) }}</span>
            </div>
            <div v-if="isTakenByPrimary(c)" class="mrp-item-desc">已作为主通道使用</div>

            <div v-if="tab === 'primary' && currentId === c.id" class="mrp-model-row" @click.stop>
              <label class="mrp-model-label" :for="'mrp-model-' + c.id">模型</label>
              <select :id="'mrp-model-' + c.id" class="mrp-model-select" :value="modelOn(c, draft.modelName)" @change="chooseModel($event.target.value)">
                <option v-for="m in c.models" :key="m" :value="m">{{ m }}{{ m === c.defaultModel ? '（默认）' : '' }}</option>
              </select>
            </div>
            <div v-if="tab === 'fallback' && currentId === c.id" class="mrp-item-desc">使用该通道的默认模型 {{ c.defaultModel }}</div>

            <div v-if="testOf(c)" class="mrp-test-result" :class="'mrp-test-' + testOf(c).state" @click.stop>
              <template v-if="testOf(c).state === 'testing'"><i class="fa-solid fa-circle-notch fa-spin"></i> 正在调用 {{ testOf(c).model }}…</template>
              <template v-else-if="testOf(c).state === 'ok'">
                <i class="fa-solid fa-circle-check"></i>
                {{ testOf(c).model }} 可以使用 · {{ testOf(c).latencyMs }} ms<span v-if="testOf(c).warn">（{{ testOf(c).warn }}）</span>
              </template>
              <template v-else>
                <i class="fa-solid fa-circle-xmark"></i>
                <span class="mrp-test-msg" :title="testOf(c).message">{{ testOf(c).model }} 不可用：{{ testOf(c).message }}</span>
              </template>
            </div>
          </div>
          <button
            type="button"
            class="mrp-test-btn"
            :disabled="testOf(c)?.state === 'testing'"
            :title="'用 ' + testModelFor(c) + ' 真实调用一次，看现在能不能用'"
            @click.stop="runTest(c)"
          >
            <i class="fa-solid fa-flask"></i>
            <span>测试</span>
          </button>
        </div>

        <details v-if="unavailableChannels.length" class="mrp-unavailable">
          <summary>不可选的通道（{{ unavailableChannels.length }}）</summary>
          <div v-for="c in unavailableChannels" :key="c.id" class="mrp-item mrp-item-off">
            <span class="mrp-radio"></span>
            <div class="mrp-item-main">
              <div class="mrp-item-name">{{ c.name }}</div>
              <div class="mrp-item-desc">{{ c.unavailableReason }}<template v-if="canManageGateway">，可到模型网关处理</template></div>
            </div>
          </div>
        </details>
      </div>

      <div class="mrp-foot">
        <span class="mrp-foot-state" :class="{ dirty }">
          <i :class="dirty ? 'fa-solid fa-pen' : 'fa-solid fa-check'"></i>
          {{ dirty ? '有未发布的修改' : '与已发布的设置一致' }}
        </span>
        <div class="mrp-foot-actions">
          <router-link v-if="canManageGateway" to="/dashboard?tab=gateway-llm" class="mrp-link">模型网关</router-link>
          <button v-if="dirty" type="button" class="mrp-link-btn" @click="$emit('reset')">还原</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { http } from '../api/http'
import { describeRoute, formatContextWindow, modelOn, sameRouteChoice } from '../utils/chatRoute'

const props = defineProps({
  options: { type: Object, default: () => ({ channels: [], platform: null }) },
  draft: { type: Object, required: true },
  published: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  canManageGateway: { type: Boolean, default: false }
})
const emit = defineEmits(['update:draft', 'refresh', 'reset'])

const open = ref(false)
const tab = ref('primary')
const rootRef = ref(null)
// 测试结果按「通道 + 模型」记：{ state: testing | ok | fail, model, latencyMs, message, warn }
const tests = reactive({})

const platform = computed(() => props.options?.platform || null)
const channels = computed(() => props.options?.channels || [])
const selectableChannels = computed(() => channels.value.filter(c => c.selectable))
const unavailableChannels = computed(() => channels.value.filter(c => !c.selectable))
const route = computed(() => describeRoute(props.options, props.draft))
const dirty = computed(() => !sameRouteChoice(props.draft, props.published))
const currentId = computed(() => (tab.value === 'primary' ? props.draft.primaryProviderId : props.draft.fallbackProviderId) || '')

const triggerLabel = computed(() => {
  const r = route.value
  if (!r.primary) return '未配置模型通道'
  return r.model ? `${r.primary.name} · ${r.model}` : r.primary.name
})
const triggerTitle = computed(() => {
  const r = route.value
  const lines = [`主通道：${r.primary ? r.primary.name : '无'}${r.model ? ' · ' + r.model : ''}${r.followPlatform ? '（跟随平台默认）' : ''}`]
  lines.push(`备用通道：${r.fallback ? r.fallback.name : '无'}${r.fallbackFollow ? '（跟随平台）' : ''}`)
  if (dirty.value) lines.push('有未发布的修改，只在当前窗口生效')
  lines.push('点击选择通道')
  return lines.join('\n')
})

function isTakenByPrimary(c) {
  return tab.value === 'fallback' && route.value.primary && route.value.primary.id === c.id
}

function choose(id) {
  const next = { ...props.draft }
  if (tab.value === 'primary') {
    next.primaryProviderId = id
    const c = channels.value.find(x => x.id === id)
    next.modelName = c ? modelOn(c, props.draft.modelName) : (props.published.modelName || '')
    // 主通道换成了原来的备用通道：备用改回跟随平台，避免主备相同
    if (id && next.fallbackProviderId === id) next.fallbackProviderId = ''
  } else {
    const c = channels.value.find(x => x.id === id)
    if (c && isTakenByPrimary(c)) return
    next.fallbackProviderId = id
  }
  emit('update:draft', next)
}

function chooseModel(model) {
  emit('update:draft', { ...props.draft, modelName: model })
}

function testModelFor(c) {
  return tab.value === 'primary' && currentId.value === c.id ? modelOn(c, props.draft.modelName) : c.defaultModel
}

function testKey(c, model) {
  return `${c.id}|${model}`
}

function testOf(c) {
  return tests[testKey(c, testModelFor(c))] || null
}

async function runTest(c) {
  const model = testModelFor(c)
  const key = testKey(c, model)
  tests[key] = { state: 'testing', model }
  const res = await http.post(`/api/model-gateway/chat-route-options/${encodeURIComponent(c.id)}/test`, { model })
  if (res.success && res.data) {
    const d = res.data
    tests[key] = d.success
      ? { state: 'ok', model: d.model || model, latencyMs: d.latencyMs, warn: d.reply ? '' : '没有返回正文' }
      : { state: 'fail', model: d.model || model, message: d.message || '调用失败' }
  } else {
    tests[key] = { state: 'fail', model, message: res.message || '测试失败' }
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    tab.value = 'primary'
    emit('refresh')
  }
}

function onDocMouseDown(e) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}
function onKey(e) {
  if (open.value && e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKey)
})

function formatTime(value) {
  if (!value) return '没有记录'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}
function formatAgo(value) {
  if (!value) return '无记录'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '无记录'
  const min = Math.floor((Date.now() - d.getTime()) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}
</script>

<style scoped>
.mrp {
  position: relative;
}
.mrp-trigger {
  cursor: pointer;
  font: inherit;
}
.mrp-trigger-open {
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
}
.mrp-trigger-warn {
  border-color: var(--accent-amber);
}
.mrp-caret {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.15s ease;
}
.mrp-trigger-open .mrp-caret {
  transform: rotate(180deg);
}
.mrp-trigger-flag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  line-height: 16px;
}
.mrp-flag-draft {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-amber);
}
.mrp-flag-default {
  background: var(--bg-card-hover);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}
.mrp-flag-warn {
  color: var(--accent-amber);
}

.mrp-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  width: 440px;
  max-width: calc(100vw - 32px);
  max-height: min(640px, calc(100vh - 90px));
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.mrp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
}
.mrp-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.mrp-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.mrp-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.mrp-icon-btn:hover:not(:disabled) {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.mrp-summary {
  margin: 0 16px 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mrp-summary-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
  min-width: 0;
}
.mrp-summary-key {
  width: 42px;
  flex-shrink: 0;
  color: var(--text-muted);
}
.mrp-summary-val {
  color: var(--text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mrp-muted {
  color: var(--text-muted);
  font-weight: 400;
}
.mrp-alert {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--accent-amber);
}
.mrp-alert i {
  margin-top: 3px;
}

.mrp-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}
.mrp-tab {
  position: relative;
  padding: 8px 12px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.mrp-tab.active {
  color: var(--text-primary);
  font-weight: 600;
  border-bottom-color: var(--accent-purple);
}
.mrp-tab-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 4px;
  border-radius: 50%;
  background: var(--accent-purple);
  vertical-align: middle;
}

.mrp-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.mrp-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  outline: none;
}
.mrp-item:hover {
  background: var(--bg-card-hover);
}
.mrp-item:focus-visible {
  border-color: var(--accent-purple);
}
.mrp-item.selected {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.35);
}
.mrp-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mrp-radio {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--border-hover);
  box-sizing: border-box;
}
.mrp-item.selected .mrp-radio {
  border-color: var(--accent-purple);
  box-shadow: inset 0 0 0 3px var(--bg-panel);
  background: var(--accent-purple);
}
.mrp-item-main {
  flex: 1;
  min-width: 0;
}
.mrp-item-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.mrp-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mrp-item-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.mrp-item-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.mrp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.mrp-chip-ok {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
}
.mrp-chip-off {
  background: rgba(244, 63, 94, 0.1);
  color: var(--accent-rose);
}
.mrp-chip-plain {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.mrp-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  cursor: default;
}
.mrp-model-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.mrp-model-select {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font: inherit;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.mrp-test-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  font: inherit;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}
.mrp-test-btn:hover:not(:disabled) {
  color: var(--accent-purple);
  border-color: var(--accent-purple);
}
.mrp-test-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}
.mrp-test-result {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 6px;
  cursor: default;
}
.mrp-test-result i {
  margin-top: 3px;
}
.mrp-test-testing {
  background: var(--bg-input);
  color: var(--text-secondary);
}
.mrp-test-ok {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-emerald);
}
.mrp-test-fail {
  background: rgba(244, 63, 94, 0.08);
  color: var(--accent-rose);
}
.mrp-test-msg {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.mrp-empty {
  margin: 4px 10px 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
.mrp-unavailable {
  margin-top: 4px;
}
.mrp-unavailable summary {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}
.mrp-item-off {
  cursor: default;
  opacity: 0.6;
}
.mrp-item-off:hover {
  background: transparent;
}

.mrp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
}
.mrp-foot-state {
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mrp-foot-state.dirty {
  color: var(--accent-amber);
}
.mrp-foot-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mrp-link,
.mrp-link-btn {
  font: inherit;
  font-size: 12px;
  color: var(--accent-blue);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}
.mrp-link:hover,
.mrp-link-btn:hover {
  text-decoration: underline;
}
</style>
