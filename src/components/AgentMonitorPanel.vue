<template>
  <section class="debug-workspace monitor-workspace">
    <div class="overview-hero-row">
      <div class="overview-heading">
        <h2>监测</h2>
        <p>当前智能体的 Token 用量、会话数与全部消息数</p>
      </div>
      <div class="overview-date-filter">
        <button class="btn-time-range" :class="{ active: range === 'today' }" @click="changeRange('today')">今天</button>
        <button class="btn-time-range" :class="{ active: range === '7days' }" @click="changeRange('7days')">过去 7 天</button>
        <button class="btn-time-range" :class="{ active: range === '30days' }" @click="changeRange('30days')">过去一个月</button>
        <button class="btn-time-range" :class="{ active: range === 'all' }" @click="changeRange('all')">全部</button>
      </div>
    </div>

    <div class="token-stats-grid monitor-stats-grid">
      <div class="token-stat-card token-card-blue">
        <div class="token-card-header">
          <span class="token-card-title">总 Token 用量</span>
          <div class="token-card-icon icon-blue"><i class="fa-solid fa-ticket"></i></div>
        </div>
        <div class="token-card-val">{{ formatToken(stats.totalTokens) }}</div>
        <div class="token-card-footer">
          <span :class="Number(stats.tokenChangePercent || 0) >= 0 ? 'stat-trend-up' : 'stat-trend-down'">
            <i :class="Number(stats.tokenChangePercent || 0) >= 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"></i>
            {{ Number(stats.tokenChangePercent || 0) >= 0 ? '+' : '' }}{{ stats.tokenChangePercent || 0 }}%
          </span>
          <span>{{ range === 'all' ? '累计消耗' : '对比上一周期' }}</span>
        </div>
      </div>
      <div class="token-stat-card token-card-purple">
        <div class="token-card-header">
          <span class="token-card-title">总会话数</span>
          <div class="token-card-icon icon-purple"><i class="fa-solid fa-comments"></i></div>
        </div>
        <div class="token-card-val">{{ Number(stats.sessionCount || 0).toLocaleString() }}</div>
        <div class="token-card-footer"><span>独立调试 / 对话会话</span></div>
      </div>
      <div class="token-stat-card token-card-emerald">
        <div class="token-card-header">
          <span class="token-card-title">全部消息数</span>
          <div class="token-card-icon icon-emerald"><i class="fa-solid fa-message"></i></div>
        </div>
        <div class="token-card-val">{{ Number(stats.messageCount || 0).toLocaleString() }}</div>
        <div class="token-card-footer"><span>含用户输入与模型回复</span></div>
      </div>
      <div class="token-stat-card token-card-amber">
        <div class="token-card-header">
          <span class="token-card-title">平均响应耗时</span>
          <div class="token-card-icon icon-amber"><i class="fa-solid fa-stopwatch"></i></div>
        </div>
        <div class="token-card-val">{{ stats.avgResponseTimeMs || 0 }}<span class="token-unit">ms</span></div>
        <div class="token-card-footer"><span>调用 {{ Number(stats.callCount || 0).toLocaleString() }} 次</span></div>
      </div>
    </div>

    <div class="monitor-split">
      <div class="chart-card-box">
        <div class="chart-header">
          <div class="chart-title-group">
            <h3><i class="fa-solid fa-chart-line" style="color: var(--accent-blue);"></i> Token 消耗趋势</h3>
            <p>Prompt / Completion 按日走势</p>
          </div>
        </div>
        <div class="chart-canvas-wrapper"><canvas ref="trendCanvas"></canvas></div>
      </div>
      <div class="monitor-side-stack">
        <div class="token-stat-card">
          <div class="token-card-header"><span class="token-card-title">Prompt 输入</span></div>
          <div class="token-card-val">{{ formatToken(stats.promptTokens) }}</div>
          <div class="monitor-bar"><span :style="{ width: promptShare + '%' }"></span></div>
          <div class="token-card-footer"><span>占总用量 {{ promptShare }}%</span></div>
        </div>
        <div class="token-stat-card">
          <div class="token-card-header"><span class="token-card-title">Completion 输出</span></div>
          <div class="token-card-val">{{ formatToken(stats.completionTokens) }}</div>
          <div class="monitor-bar monitor-bar-green"><span :style="{ width: completionShare + '%' }"></span></div>
          <div class="token-card-footer"><span>占总用量 {{ completionShare }}%</span></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Chart from 'chart.js/auto'
import { http } from '../api/http'

const props = defineProps({
  agentId: { type: String, required: true }
})

const range = ref('7days')
const stats = ref({})
const trendCanvas = ref(null)
let trendChart = null

const promptShare = computed(() => {
  const total = Number(stats.value.totalTokens || 0)
  if (!total) return 0
  return Math.round((Number(stats.value.promptTokens || 0) * 1000) / total) / 10
})
const completionShare = computed(() => {
  const total = Number(stats.value.totalTokens || 0)
  if (!total) return 0
  return Math.round((Number(stats.value.completionTokens || 0) * 1000) / total) / 10
})

function formatToken(value) {
  const n = Number(value || 0)
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function chartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return { text: isDark ? '#94a3b8' : '#64748b', grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
}

function renderChart() {
  if (!trendCanvas.value) return
  const colors = chartTheme()
  const trend = stats.value.tokenTrend || []
  const prompt = trend.map((p) => p.promptTokens || 0)
  const completion = trend.map((p) => p.completionTokens || 0)
  const max = Math.max(0, ...prompt, ...completion)
  const divisor = max >= 1000000 ? 1000000 : (max >= 1000 ? 1000 : 1)
  const unit = divisor === 1000000 ? 'M' : (divisor === 1000 ? 'K' : '')
  if (trendChart) trendChart.destroy()
  trendChart = new Chart(trendCanvas.value, {
    type: 'line',
    data: {
      labels: trend.map((p) => p.label),
      datasets: [
        { label: `Prompt${unit ? ' (' + unit + ')' : ''}`, data: prompt.map((v) => Number((v / divisor).toFixed(2))), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', tension: 0.35, fill: true },
        { label: `Completion${unit ? ' (' + unit + ')' : ''}`, data: completion.map((v) => Number((v / divisor).toFixed(2))), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.35, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: colors.text, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  })
}

async function load() {
  const res = await http.get(`/api/agents/${props.agentId}/monitor`, { range: range.value })
  stats.value = res.success ? (res.data || {}) : {}
  await nextTick()
  renderChart()
}

function changeRange(next) {
  range.value = next
  load()
}

onMounted(load)
onUnmounted(() => {
  if (trendChart) trendChart.destroy()
})
</script>
