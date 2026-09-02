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

    <div v-if="totalPages > 1" class="logs-pager">
      <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="detail" class="logs-drawer-mask" @click.self="detail = null">
      <aside class="logs-drawer">
        <div class="logs-drawer-head">
          <div>
            <h3>{{ detail.conversation?.title || '会话详情' }}</h3>
            <p>{{ detail.conversation?.account }} · {{ detail.conversation?.messageCount || 0 }} 条消息</p>
          </div>
          <button type="button" class="ms-close" @click="detail = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="logs-drawer-body">
          <div v-for="msg in detail.messages || []" :key="msg.id" class="logs-msg" :class="'logs-msg-' + msg.role">
            <div class="logs-msg-role">{{ msg.role === 'user' ? '用户' : '智能体' }}</div>
            <div class="logs-msg-content">{{ msg.content }}</div>
            <div v-if="msg.role === 'assistant'" class="logs-msg-meta">
              <span v-if="msg.model">{{ msg.model }}</span>
              <span v-if="msg.latencyMs">{{ msg.latencyMs }}ms</span>
              <span v-if="msg.tokensUsed">{{ msg.tokensUsed }} Tokens</span>
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

const props = defineProps({
  agentId: { type: String, required: true }
})

const range = ref('7days')
const statusFilter = ref('all')
const keyword = ref('')
const sort = ref('createdAt')
const order = ref('desc')
const page = ref(1)
const records = ref([])
const totalPages = ref(1)
const detail = ref(null)
let searchTimer = null

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
    size: 20
  })
  if (res.success && res.data) {
    records.value = res.data.records || []
    totalPages.value = res.data.totalPages || 1
  } else {
    records.value = []
    totalPages.value = 1
  }
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
  const res = await http.get(`/api/agents/${props.agentId}/logs/${item.id}`)
  if (res.success) {
    detail.value = res.data
  }
}

onMounted(reload)
</script>
