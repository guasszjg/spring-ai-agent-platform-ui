<template>
  <section class="debug-workspace logs-workspace">
    <div class="workspace-heading">
      <h2>日志</h2>
      <p>
        日志记录了应用的运行情况，包括用户的输入和 AI 的回复。
        <a class="workspace-more" href="javascript:void(0)">了解更多 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
      </p>
    </div>

    <div class="logs-toolbar">
      <label class="logs-filter">
        <i class="fa-regular fa-calendar"></i>
        <select v-model="range" @change="reload">
          <option value="today">今天</option>
          <option value="7days">过去 7 天</option>
          <option value="30days">过去一个月</option>
          <option value="all">全部</option>
        </select>
      </label>
      <label class="logs-filter">
        <select v-model="statusFilter">
          <option value="all">全部</option>
        </select>
      </label>
      <div class="logs-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="keyword" type="search" placeholder="搜索" @input="onSearch">
      </div>
      <div class="logs-sort">
        <select v-model="sort" @change="reload">
          <option value="createdAt">排序：创建时间</option>
          <option value="updatedAt">排序：更新时间</option>
        </select>
        <button class="logs-order-btn" type="button" :title="order === 'desc' ? '当前降序' : '当前升序'" @click="toggleOrder">
          <i class="fa-solid" :class="order === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-wide-short'"></i>
        </button>
      </div>
    </div>

    <div class="logs-table-card">
      <table class="logs-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>用户或账户</th>
            <th>消息数</th>
            <th>用户反馈</th>
            <th>管理员反馈</th>
            <th>更新时间</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!records.length">
            <td colspan="7" class="logs-empty">该时间范围内暂无会话日志</td>
          </tr>
          <tr v-for="item in records" :key="item.id" @click="openDetail(item)">
            <td>
              <div class="logs-title-cell">
                <i class="fa-regular fa-comment-dots"></i>
                <span>{{ item.title || '未命名会话' }}</span>
              </div>
            </td>
            <td class="logs-account">{{ item.account || 'N/A' }}</td>
            <td>{{ item.messageCount || 0 }}</td>
            <td class="logs-na">{{ feedbackLabel(item.userFeedback) }}</td>
            <td class="logs-na">{{ feedbackLabel(item.adminFeedback) }}</td>
            <td>{{ formatDateTime(item.updatedAt) }}</td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="records.length > 0" class="logs-pager">
      <div class="logs-pager-info">
        <span>共 {{ total }} 条会话记录</span>
        <select v-model.number="pageSize" class="logs-size-select" @change="onSizeChange">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
      </div>
      <div class="logs-pager-controls">
        <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">
          <i class="fa-solid fa-chevron-left"></i> 上一页
        </button>
        <span class="logs-page-indicator">第 {{ page }} / {{ totalPages }} 页</span>
        <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">
          下一页 <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <div v-if="detail" class="logs-drawer-mask" @click.self="closeDetail">
      <aside class="logs-drawer" :class="{ 'logs-drawer-wide': expandedTraceMsgIds.size > 0 }">
        <div class="logs-drawer-head">
          <div>
            <h3>{{ detail.conversation?.title || '会话详情' }}</h3>
            <p>{{ detail.conversation?.account }} · {{ detail.conversation?.messageCount || 0 }} 条消息</p>
          </div>
          <button type="button" class="ms-close" @click="closeDetail"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="logs-drawer-body">
          <div v-if="detail.conversation?.memorySummary" class="logs-memory-summary">
            <div class="logs-memory-head">
              <span><i class="fa-solid fa-compress"></i> 早期记忆摘要</span>
              <span v-if="detail.conversation?.summaryMsgCount" class="logs-memory-count">
                已压缩前 {{ detail.conversation.summaryMsgCount }} 条消息
              </span>
            </div>
            <div class="logs-memory-body">{{ detail.conversation.memorySummary }}</div>
          </div>
          <div v-for="msg in detail.messages || []" :key="msg.id" class="logs-msg" :class="'logs-msg-' + msg.role">
            <div class="logs-msg-role">{{ msg.role === 'user' ? '用户' : '智能体' }}</div>
            <div class="logs-msg-content">{{ msg.content }}</div>
            <div v-if="msg.role === 'assistant'" class="logs-msg-meta">
              <span v-if="msg.model">{{ msg.model }}</span>
              <span v-if="msg.latencyMs">{{ msg.latencyMs }}ms</span>
              <span v-if="msg.tokensUsed">{{ msg.tokensUsed }} Tokens</span>
              <button
                v-if="parseTrace(msg.traceJson)"
                type="button"
                class="logs-trace-toggle"
                :class="{ active: expandedTraceMsgIds.has(msg.id) }"
                @click="toggleTrace(msg.id)"
              >
                <i class="fa-solid fa-diagram-project"></i>
                <span>{{ expandedTraceMsgIds.has(msg.id) ? '收起调用链路' : `调用链路 (${parseTrace(msg.traceJson).steps?.length || 0} 步)` }}</span>
              </button>
            </div>
            <div v-if="msg.role === 'assistant' && expandedTraceMsgIds.has(msg.id) && parseTrace(msg.traceJson)" class="logs-trace-panel-wrap">
              <CallTracePanel :trace="parseTrace(msg.traceJson)" compact />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { http } from '../api/http'
import CallTracePanel from './CallTracePanel.vue'

const props = defineProps({
  agentId: { type: String, required: true }
})

const range = ref('7days')
const statusFilter = ref('all')
const keyword = ref('')
const sort = ref('createdAt')
const order = ref('desc')
const LOGS_PAGE_SIZE_KEY = 'agent_logs_page_size'

function getInitialPageSize() {
  const saved = localStorage.getItem(LOGS_PAGE_SIZE_KEY)
  const num = Number(saved)
  if ([10, 20, 50].includes(num)) {
    return num
  }
  return 20
}

const page = ref(1)
const pageSize = ref(getInitialPageSize())
const total = ref(0)
const records = ref([])
const totalPages = ref(1)
const detail = ref(null)
const expandedTraceMsgIds = ref(new Set())
const traceCache = new Map()
let searchTimer = null

function parseTrace(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (traceCache.has(raw)) return traceCache.get(raw)
  try {
    const parsed = JSON.parse(raw)
    traceCache.set(raw, parsed)
    return parsed
  } catch {
    traceCache.set(raw, null)
    return null
  }
}

function toggleTrace(msgId) {
  const next = new Set(expandedTraceMsgIds.value)
  if (next.has(msgId)) next.delete(msgId)
  else next.add(msgId)
  expandedTraceMsgIds.value = next
}

function closeDetail() {
  detail.value = null
  expandedTraceMsgIds.value = new Set()
}

function feedbackLabel(value) {
  return value ? value : 'N/A'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function reload() {
  const res = await http.get(`/api/agents/${props.agentId}/logs`, {
    range: range.value,
    keyword: keyword.value,
    sort: sort.value,
    order: order.value,
    page: page.value,
    size: pageSize.value
  })
  if (res.success && res.data) {
    records.value = res.data.records || []
    total.value = res.data.total || 0
    totalPages.value = res.data.totalPages || 1
    return true
  } else {
    records.value = []
    total.value = 0
    totalPages.value = 1
    return false
  }
}

function onSizeChange() {
  localStorage.setItem(LOGS_PAGE_SIZE_KEY, String(pageSize.value))
  page.value = 1
  reload()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    reload()
  }, 280)
}

function toggleOrder() {
  order.value = order.value === 'desc' ? 'asc' : 'desc'
  reload()
}

function changePage(next) {
  page.value = next
  reload()
}

async function openDetail(item) {
  expandedTraceMsgIds.value = new Set()
  const res = await http.get(`/api/agents/${props.agentId}/logs/${item.id}`)
  if (res.success) {
    detail.value = res.data
    return true
  }
  return false
}

async function applyAssistantUiEffect(effect) {
  if (detail.value) return false
  const ref = effect.resourceRef
  const traceId = effect.formData?.traceMessageId
  if (ref) {
    if (!(await openDetail({ id: encodeURIComponent(ref) }))) return false
    if (traceId) {
      const message = detail.value?.messages?.find(msg => String(msg.id) === traceId)
      if (!message || !parseTrace(message.traceJson)) return false
      toggleTrace(message.id)
    }
    return true
  }
  clearTimeout(searchTimer)
  keyword.value = typeof effect.formData?.keyword === 'string' ? effect.formData.keyword : ''
  page.value = 1
  return reload()
}

defineExpose({ applyAssistantUiEffect })

onMounted(reload)
</script>

<style scoped>
.logs-drawer-wide {
  width: min(760px, 92vw) !important;
  max-width: 92vw !important;
  transition: width 0.2s ease;
}

.logs-trace-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.16s ease;
}

.logs-trace-toggle:hover,
.logs-trace-toggle.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.4);
}

.logs-trace-panel-wrap {
  margin-top: 10px;
}

.logs-memory-summary {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.06);
}

.logs-memory-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue, #3b82f6);
}

.logs-memory-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

.logs-memory-body {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
