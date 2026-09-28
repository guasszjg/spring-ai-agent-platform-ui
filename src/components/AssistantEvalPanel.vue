<template>
  <!-- 平台 AI 助手评测（仅超级管理员）：用固定的典型问题回归助手是否选对工具、参数是否正确、是否拒绝越权请求 -->
  <div class="ev-page">
    <div class="ev-header">
      <div>
        <h2>助手评测</h2>
        <p class="ev-sub">
          共 {{ caseCount }} 条用例，以超级管理员 / 开发者 / 只读观察员三种虚拟身份提问，按规则检查工具选择、参数、操作卡片与回答内容。
          评测只生成卡片不执行，结束后自动清理，不计入用量统计。
        </p>
      </div>
      <button type="button" class="btn-primary ev-run" :disabled="starting || hasRunning" @click="startRun">
        <i :class="hasRunning ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play'"></i>
        {{ hasRunning ? '评测进行中…' : '运行评测' }}
      </button>
    </div>
    <p class="ev-cost">每次运行会真实调用模型通道，约消耗 20～40 万 token（按 deepseek-flash 约 1 元），耗时 5～10 分钟。</p>

    <div class="ev-layout">
      <!-- 运行记录 -->
      <div class="table-view-card ev-runs">
        <div class="ev-card-title">运行记录</div>
        <div v-if="!runs.length" class="ev-empty">还没有评测记录，点击右上角「运行评测」开始</div>
        <button
          v-for="r in runs"
          :key="r.id"
          type="button"
          class="ev-run-item"
          :class="{ active: selected && selected.id === r.id }"
          @click="selectRun(r.id)"
        >
          <div class="ev-run-top">
            <span class="ev-rate" :class="rateClass(runRate(r))">{{ runRate(r) == null ? '—' : runRate(r) + '%' }}</span>
            <span class="ev-status" :class="r.status.toLowerCase()">{{ statusLabel(r.status) }}</span>
          </div>
          <div class="ev-run-meta">
            <span>{{ formatTime(r.startedAt) }}</span>
            <span v-if="r.status === 'RUNNING'">{{ r.completed }}/{{ r.total }}</span>
            <span v-else>{{ r.passed }} 通过 · {{ r.failed }} 失败<template v-if="r.errored"> · {{ r.errored }} 错误</template></span>
          </div>
          <div v-if="r.status === 'RUNNING'" class="ev-progress"><i :style="{ width: (r.completed / r.total * 100) + '%' }"></i></div>
        </button>
      </div>

      <!-- 运行详情 -->
      <div class="table-view-card ev-detail">
        <div v-if="!selected" class="ev-empty">选择左侧的一次运行查看详情</div>
        <template v-else>
          <div class="ev-stats">
            <div><span>通过率</span><strong :class="rateClass(summaryRate)">{{ summaryRate == null ? '—' : summaryRate + '%' }}</strong></div>
            <div><span>通过 / 失败</span><strong>{{ selected.passed }} / {{ selected.failed }}</strong></div>
            <div><span>跳过 / 错误</span><strong>{{ selected.skipped }} / {{ selected.errored }}</strong></div>
            <div><span>模型</span><strong class="ev-small">{{ selected.model || '—' }}</strong></div>
            <div><span>Token</span><strong class="ev-small">{{ formatNumber((selected.promptTokens || 0) + (selected.completionTokens || 0)) }}</strong></div>
            <div><span>耗时</span><strong class="ev-small">{{ formatDuration(selected.durationMs) }}</strong></div>
          </div>
          <p v-if="selected.error" class="ev-error">{{ selected.error }}</p>

          <div v-if="categories.length" class="ev-cats">
            <div v-for="c in categories" :key="c.name" class="ev-cat">
              <span class="ev-cat-name">{{ c.name }}</span>
              <div class="ev-bar"><i :style="{ width: c.rate + '%' }" :class="rateClass(c.rate)"></i></div>
              <span class="ev-cat-num">{{ c.passed }}/{{ c.scored }}</span>
            </div>
          </div>

          <div class="ev-filter">
            <button
              v-for="f in filters"
              :key="f.value"
              type="button"
              :class="{ on: filter === f.value }"
              @click="filter = f.value"
            >{{ f.label }} <span>{{ countBy(f.value) }}</span></button>
          </div>

          <div class="ev-cases">
            <div v-for="r in filteredResults" :key="r.id" class="ev-case" :class="r.status.toLowerCase()">
              <button type="button" class="ev-case-head" @click="toggle(r.id)">
                <span class="ev-dot" :class="r.status.toLowerCase()"></span>
                <span class="ev-case-id">{{ r.id }}</span>
                <span class="ev-case-q">{{ r.question }}</span>
                <span class="ev-case-role">{{ roleLabel(r.role) }}<template v-if="r.mode === 'CHAT'"> · 问答</template></span>
                <i class="fa-solid" :class="expanded[r.id] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </button>
              <ul v-if="r.failures && r.failures.length && r.status !== 'PASSED'" class="ev-failures">
                <li v-for="(f, i) in r.failures" :key="i">{{ f }}</li>
              </ul>
              <div v-if="expanded[r.id]" class="ev-case-body">
                <div v-if="r.setup && r.setup.length" class="ev-row"><span>前置问题</span><div>{{ r.setup.join(' → ') }}</div></div>
                <div class="ev-row">
                  <span>调用工具</span>
                  <div>
                    <div v-if="!r.calls || !r.calls.length" class="ev-muted">无</div>
                    <code v-for="(c, i) in r.calls || []" :key="i" :class="{ bad: !c.ok }">{{ c.name }} {{ c.arguments }}</code>
                  </div>
                </div>
                <div class="ev-row"><span>操作卡片</span><div>{{ r.cards && r.cards.length ? r.cards.join('、') : '无' }}</div></div>
                <div class="ev-row"><span>回答</span><div class="ev-answer">{{ r.answer || '（无）' }}</div></div>
                <div class="ev-row"><span>耗时 / Token</span><div>{{ formatDuration(r.latencyMs) }} · {{ formatNumber((r.promptTokens || 0) + (r.completionTokens || 0)) }}</div></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const { showToast } = useToast()

const runs = ref([])
const selected = ref(null)
const caseCount = ref(0)
const starting = ref(false)
const filter = ref('problem')
const expanded = ref({})
let pollTimer = null

const filters = [
  { value: 'problem', label: '未通过' },
  { value: 'all', label: '全部' },
  { value: 'PASSED', label: '通过' },
  { value: 'SKIPPED', label: '跳过' }
]

const hasRunning = computed(() => runs.value.some(r => r.status === 'RUNNING'))
const results = computed(() => (selected.value && Array.isArray(selected.value.results)) ? selected.value.results : [])
const summaryRate = computed(() => selected.value && selected.value.summary ? selected.value.summary.passRate : runRate(selected.value))

const categories = computed(() => {
  const by = selected.value && selected.value.summary && selected.value.summary.byCategory
  if (!by) return []
  return Object.entries(by).map(([name, c]) => {
    const scored = (c.passed || 0) + (c.failed || 0)
    return { name, passed: c.passed || 0, scored, rate: scored ? Math.round(c.passed * 1000 / scored) / 10 : 0 }
  })
})

const filteredResults = computed(() => results.value.filter(r => {
  if (filter.value === 'all') return true
  if (filter.value === 'problem') return r.status === 'FAILED' || r.status === 'ERROR'
  return r.status === filter.value
}))

function countBy(value) {
  if (value === 'all') return results.value.length
  if (value === 'problem') return results.value.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length
  return results.value.filter(r => r.status === value).length
}

function runRate(r) {
  if (!r) return null
  const scored = (r.passed || 0) + (r.failed || 0)
  return scored ? Math.round(r.passed * 1000 / scored) / 10 : null
}

function rateClass(rate) {
  if (rate == null) return ''
  return rate >= 90 ? 'good' : rate >= 70 ? 'warn' : 'bad'
}

function statusLabel(s) {
  return { RUNNING: '运行中', COMPLETED: '已完成', FAILED: '已中断' }[s] || s
}

function roleLabel(role) {
  return { SUPER_ADMIN: '超管', DEVELOPER: '开发者', VIEWER: '观察员' }[role] || role
}

function toggle(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

function formatTime(v) {
  if (!v) return ''
  const d = new Date(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(ms) {
  if (ms == null) return '—'
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString()
}

async function loadRuns() {
  const res = await http.get('/api/assistant/evals/runs')
  if (res && res.success) runs.value = res.data || []
}

async function selectRun(id) {
  const res = await http.get(`/api/assistant/evals/runs/${encodeURIComponent(id)}`)
  if (res && res.success) {
    selected.value = res.data
    expanded.value = {}
  }
}

async function startRun() {
  starting.value = true
  const res = await http.post('/api/assistant/evals/runs', {})
  starting.value = false
  if (!res || !res.success) {
    showToast((res && res.message) || '发起评测失败', 'error')
    return
  }
  showToast('评测已开始，完成后可在这里查看结果', 'success')
  await loadRuns()
  await selectRun(res.data.id)
  schedulePoll()
}

// 有运行中的评测时每 5 秒刷新一次记录与当前详情
function schedulePoll() {
  clearTimeout(pollTimer)
  if (!hasRunning.value) return
  pollTimer = setTimeout(async () => {
    await loadRuns()
    if (selected.value) await selectRun(selected.value.id)
    schedulePoll()
  }, 5000)
}

async function refresh() {
  const cases = await http.get('/api/assistant/evals/cases')
  if (cases && cases.success) caseCount.value = (cases.data || []).length
  await loadRuns()
  if (runs.value.length && (!selected.value || !runs.value.some(r => r.id === selected.value.id))) {
    await selectRun(runs.value[0].id)
  }
  schedulePoll()
}

onBeforeUnmount(() => clearTimeout(pollTimer))

defineExpose({ refresh })
</script>

<style scoped>
.ev-page { display: flex; flex-direction: column; gap: 12px; }
.ev-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.ev-header h2 { margin: 0 0 4px; font-size: 20px; }
.ev-sub { margin: 0; color: var(--text-secondary); font-size: 13px; max-width: 760px; line-height: 1.6; }
.ev-run { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.ev-cost { margin: 0; font-size: 12px; color: var(--text-muted); }

.ev-layout { display: grid; grid-template-columns: 260px 1fr; gap: 14px; align-items: start; }
.ev-card-title { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.ev-empty { padding: 28px 8px; text-align: center; color: var(--text-muted); font-size: 13px; }

.ev-runs { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.ev-run-item { text-align: left; border: 1px solid var(--border-color); background: transparent; border-radius: 10px; padding: 9px 10px; cursor: pointer; color: var(--text-primary); }
.ev-run-item:hover { background: var(--surface-subtle); }
.ev-run-item.active { border-color: var(--brand-line, var(--border-hover)); background: var(--brand-soft, var(--surface-active)); }
.ev-run-top { display: flex; justify-content: space-between; align-items: center; }
.ev-rate { font-size: 17px; font-weight: 700; }
.ev-run-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ev-status { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-secondary); }
.ev-status.running { color: var(--brand, #d97757); }
.ev-status.failed { color: var(--danger, #c0392b); }
.ev-progress { height: 3px; border-radius: 3px; background: var(--surface-subtle); margin-top: 6px; overflow: hidden; }
.ev-progress i { display: block; height: 100%; background: var(--brand, #d97757); transition: width 0.3s; }

.good { color: var(--success, #3f8f5a); }
.warn { color: var(--warning, #b7791f); }
.bad { color: var(--danger, #c0392b); }

.ev-detail { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ev-stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.ev-stats > div { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 10px; background: var(--surface-subtle); min-width: 0; }
.ev-stats span { font-size: 11.5px; color: var(--text-muted); }
.ev-stats strong { font-size: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-stats strong.ev-small { font-size: 13.5px; font-weight: 600; }
.ev-error { margin: 0; color: var(--danger, #c0392b); font-size: 13px; }

.ev-cats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; }
.ev-cat { display: grid; grid-template-columns: 80px 1fr 42px; align-items: center; gap: 8px; font-size: 12.5px; }
.ev-cat-name { color: var(--text-secondary); }
.ev-bar { height: 6px; border-radius: 6px; background: var(--surface-subtle); overflow: hidden; }
.ev-bar i { display: block; height: 100%; border-radius: 6px; background: currentColor; }
.ev-cat-num { text-align: right; color: var(--text-muted); }

.ev-filter { display: flex; gap: 6px; }
.ev-filter button { border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 999px; padding: 3px 11px; font-size: 12.5px; cursor: pointer; }
.ev-filter button.on { border-color: var(--brand-line, var(--border-hover)); color: var(--brand-text, var(--text-primary)); background: var(--brand-soft, var(--surface-active)); }
.ev-filter span { margin-left: 3px; color: var(--text-muted); }

.ev-cases { display: flex; flex-direction: column; gap: 6px; }
.ev-case { border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
.ev-case.failed, .ev-case.error { border-color: rgba(192, 57, 43, 0.35); }
.ev-case-head { width: 100%; display: grid; grid-template-columns: 10px 58px 1fr auto 14px; align-items: center; gap: 10px; padding: 8px 12px; border: none; background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; font-size: 13px; }
.ev-case-head:hover { background: var(--surface-subtle); }
.ev-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
.ev-dot.passed { background: var(--success, #3f8f5a); }
.ev-dot.failed, .ev-dot.error { background: var(--danger, #c0392b); }
.ev-case-id { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--text-muted); }
.ev-case-q { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-case-role { font-size: 11.5px; color: var(--text-muted); white-space: nowrap; }
.ev-failures { margin: 0; padding: 0 12px 8px 40px; font-size: 12.5px; color: var(--danger, #c0392b); }
.ev-case-body { border-top: 1px solid var(--border-color); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; background: var(--surface-subtle); }
.ev-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
.ev-row > span { color: var(--text-muted); }
.ev-row code { display: block; margin-bottom: 3px; padding: 3px 6px; border-radius: 5px; background: var(--bg-card); font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; word-break: break-all; }
.ev-row code.bad { color: var(--danger, #c0392b); }
.ev-answer { white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow-y: auto; line-height: 1.55; }
.ev-muted { color: var(--text-muted); }

@media (max-width: 1100px) {
  .ev-layout { grid-template-columns: 1fr; }
  .ev-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ev-cats { grid-template-columns: 1fr; }
}
</style>
