<template>
  <div class="app-layout">
    <aside class="app-sidebar">
      <div>
        <div class="sidebar-header">
          <a class="sidebar-brand" @click.prevent="currentTab = 'overview'">
            <div class="brand-logo"><i class="fa-solid fa-brain"></i></div>
            <div class="brand-text">
              <span class="brand-title">AgentMatrix</span>
              <span class="brand-edition">Enterprise v2.6</span>
            </div>
          </a>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-title">核心业务枢纽</div>
          <button class="sidebar-nav-item" :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">
            <i class="fa-solid fa-chart-pie"></i><span>概览分析 (主页)</span>
            <span class="nav-badge-pill">实时</span>
          </button>
          <button class="sidebar-nav-item" :class="{ active: currentTab === 'agents' }" @click="currentTab = 'agents'">
            <i class="fa-solid fa-robot"></i><span>Agents 智能体</span>
            <span class="nav-count-pill">{{ stats.totalAgents || 0 }}</span>
          </button>
          <button class="sidebar-nav-item" :class="{ active: currentTab === 'knowledge' }" @click="currentTab = 'knowledge'">
            <i class="fa-solid fa-book-bookmark"></i><span>企业知识库</span>
            <span class="nav-soon-pill">RAG</span>
          </button>
          <div class="nav-section-title" style="margin-top: 20px;">企业系统治理</div>
          <button class="sidebar-nav-item" @click="showToast('多模型智能网关调度模块为企业专享', 'info')">
            <i class="fa-solid fa-network-wired"></i><span>模型网关路由</span>
          </button>
          <button class="sidebar-nav-item" @click="showToast('安全审计与内容护栏模块运行正常', 'info')">
            <i class="fa-solid fa-shield-halved"></i><span>安全审计与护栏</span>
          </button>
        </nav>
      </div>
      <div class="sidebar-footer">
        <div class="sidebar-cluster-status">
          <span class="pulse-dot-green"></span>
          <span>集群状态: 99.99% 在线</span>
        </div>
        <div class="sidebar-user-box">
          <div class="user-meta-left">
            <img :src="user.avatar" class="user-avatar-sidebar" alt="Admin">
            <div class="user-text-info">
              <span class="user-name-text">{{ user.nickname || '管理员' }}</span>
              <span class="user-role-text">租户主账号</span>
            </div>
          </div>
          <button class="btn-sidebar-logout" title="退出登录" @click="logout">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </aside>

    <div class="app-main-wrapper">
      <header class="app-topbar">
        <div class="topbar-left">
          <h2 class="topbar-page-title">{{ pageTitle }}</h2>
        </div>
        <div class="topbar-right">
          <button class="btn-theme-toggle" title="切换主题" @click="toggleTheme">
            <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
          </button>
          <div class="topbar-user-menu">
            <img class="topbar-user-avatar" :src="user.avatar" alt="Avatar">
            <div class="topbar-user-info">
              <span class="topbar-user-name">{{ user.nickname || '管理员' }}</span>
              <span class="topbar-user-tag">租户主账号</span>
            </div>
            <button class="btn-topbar-logout" title="退出登录" @click="logout">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      <section v-show="currentTab === 'overview'" class="app-subview active">
        <div class="overview-hero-row">
          <div class="overview-heading">
            <h2>大模型 Token 消耗与调度分析</h2>
            <p>实时监控集群 Token 使用量、多模型吞吐率、调用频次趋势及运行成本分摊</p>
          </div>
          <div class="overview-date-filter">
            <button class="btn-time-range" :class="{ active: timeRange === 'today' }" @click="changeRange('today')">今日</button>
            <button class="btn-time-range" :class="{ active: timeRange === '7days' }" @click="changeRange('7days')">近7天</button>
            <button class="btn-time-range" :class="{ active: timeRange === '30days' }" @click="changeRange('30days')">近30天</button>
          </div>
        </div>
        <div class="token-stats-grid">
          <div class="token-stat-card token-card-blue">
            <div class="token-card-header"><span class="token-card-title">总 Token 消耗量</span><div class="token-card-icon icon-blue"><i class="fa-solid fa-ticket"></i></div></div>
            <div class="token-card-val">{{ formatToken(totalTokens) }}</div>
            <div class="token-card-footer">
              <span :class="Number(stats.tokenChangePercent || 0) >= 0 ? 'stat-trend-up' : 'stat-trend-down'">
                <i :class="Number(stats.tokenChangePercent || 0) >= 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"></i>
                {{ Number(stats.tokenChangePercent || 0) >= 0 ? '+' : '' }}{{ stats.tokenChangePercent || 0 }}%
              </span>
              <span>对比上一周期</span>
            </div>
          </div>
          <div class="token-stat-card token-card-purple">
            <div class="token-card-header"><span class="token-card-title">Prompt 输入 Tokens</span><div class="token-card-icon icon-purple"><i class="fa-solid fa-arrow-down-long"></i></div></div>
            <div class="token-card-val">{{ formatToken(stats.promptTokens) }}</div>
            <div class="token-card-footer"><span>占总体消耗 {{ promptShare }}%</span></div>
          </div>
          <div class="token-stat-card token-card-emerald">
            <div class="token-card-header"><span class="token-card-title">Completion 输出 Tokens</span><div class="token-card-icon icon-emerald"><i class="fa-solid fa-arrow-up-long"></i></div></div>
            <div class="token-card-val">{{ formatToken(stats.completionTokens) }}</div>
            <div class="token-card-footer"><span>占总体消耗 {{ completionShare }}%</span></div>
          </div>
          <div class="token-stat-card token-card-amber">
            <div class="token-card-header"><span class="token-card-title">预估推理成本 (USD)</span><div class="token-card-icon icon-amber"><i class="fa-solid fa-coins"></i></div></div>
            <div class="token-card-val">${{ Number(stats.estimatedCostUsd || 0).toFixed(2) }}</div>
            <div class="token-card-footer"><span style="color: var(--accent-emerald); font-weight: 600;"><i class="fa-solid fa-piggy-bank"></i> 节省 34.2%</span><span>(通过模型路由)</span></div>
          </div>
        </div>
        <div class="charts-grid-row">
          <div class="chart-card-box">
            <div class="chart-header"><div class="chart-title-group"><h3><i class="fa-solid fa-chart-line" style="color: var(--accent-blue);"></i> 每日 Token 消耗与请求频次趋势</h3><p>Prompt / Completion 消耗量走势</p></div></div>
            <div class="chart-canvas-wrapper"><canvas ref="trendCanvas"></canvas></div>
          </div>
          <div class="chart-card-box">
            <div class="chart-header"><div class="chart-title-group"><h3><i class="fa-solid fa-chart-pie" style="color: var(--accent-purple);"></i> 多模型 Token 消耗占比</h3><p>各模型调度配比</p></div></div>
            <div class="chart-canvas-wrapper" style="max-height: 260px;"><canvas ref="donutCanvas"></canvas></div>
          </div>
        </div>
        <div class="charts-grid-row-equal">
          <div class="chart-card-box">
            <div class="chart-header">
              <div class="chart-title-group"><h3><i class="fa-solid fa-ranking-star" style="color: #f59e0b;"></i> Top 智能体调用活跃度排行</h3><p>按调用频次排序</p></div>
              <button class="btn-filter-pill" @click="currentTab = 'agents'">查看全部 →</button>
            </div>
            <div class="ranking-list-card">
              <div v-if="!(stats.ranking || []).length" class="ranking-item-row"><div class="ranking-name">暂无调用数据</div></div>
              <div v-for="item in (stats.ranking || [])" :key="item.rank" class="ranking-item-row">
                <div class="ranking-meta-left">
                  <div class="ranking-badge-idx" :class="item.rank <= 3 ? 'top-' + item.rank : ''">{{ item.rank }}</div>
                  <div class="ranking-agent-avatar">{{ item.avatar }}</div>
                  <div>
                    <div class="ranking-name">{{ item.name }}</div>
                    <div class="ranking-model">{{ item.model }}</div>
                  </div>
                </div>
                <div class="ranking-stats-right">
                  <div class="ranking-calls-num">{{ Number(item.calls || 0).toLocaleString() }} 次</div>
                  <div class="ranking-tokens-num">{{ formatToken(item.tokens) }} Tokens</div>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-card-box">
            <div class="chart-header"><div class="chart-title-group"><h3><i class="fa-solid fa-stopwatch" style="color: var(--accent-emerald);"></i> 各分类智能体响应时延</h3><p>业务分类下的平均延迟</p></div></div>
            <div class="chart-canvas-wrapper"><canvas ref="latencyCanvas"></canvas></div>
          </div>
        </div>
      </section>

      <section v-show="currentTab === 'agents'" class="app-subview active">
        <div class="dashboard-header-bar">
          <div class="header-bar-left">
            <h2 class="header-bar-title">智能体资产总览</h2>
            <div class="cluster-live-status"><span class="cluster-dot"></span><span>调度集群就绪 · 负载正常</span></div>
          </div>
          <button class="btn-create-agent" @click="openCreate"><i class="fa-solid fa-plus"></i><span>注册新智能体</span></button>
        </div>
        <section class="stats-grid">
          <div class="stat-card"><div class="stat-info"><span class="stat-label">智能体资产总数</span><span class="stat-value">{{ stats.totalAgents || 0 }}</span></div><div class="stat-icon-wrapper icon-blue"><i class="fa-solid fa-layer-group"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">在线运行智能体</span><span class="stat-value">{{ stats.runningAgents || 0 }}</span></div><div class="stat-icon-wrapper icon-emerald"><i class="fa-solid fa-bolt-lightning"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">累计调度调用量</span><span class="stat-value">{{ Number(stats.totalCalls || 0).toLocaleString() }}</span></div><div class="stat-icon-wrapper icon-purple"><i class="fa-solid fa-comments"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">平均响应耗时</span><span class="stat-value">{{ stats.avgResponseTimeMs || 0 }}ms</span></div><div class="stat-icon-wrapper icon-amber"><i class="fa-solid fa-stopwatch"></i></div></div>
        </section>
        <section class="toolbar-section">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input v-model="keyword" class="search-input" placeholder="搜索智能体名称、Prompt、业务编码或标签..." @input="debounceSearch">
          </div>
          <div class="category-filter-group">
            <button v-for="cat in categories" :key="cat" class="btn-filter-pill" :class="{ active: category === cat }" @click="setCategory(cat)">{{ cat }}</button>
          </div>
          <div class="filter-actions">
            <div class="view-mode-group">
              <button class="btn-view-mode" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'"><i class="fa-solid fa-table-cells-large"></i></button>
              <button class="btn-view-mode" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'"><i class="fa-solid fa-list-ul"></i></button>
            </div>
            <select v-model="statusFilter" class="status-select" @change="loadAgents">
              <option value="">全部运行状态</option>
              <option value="RUNNING">运行中</option>
              <option value="IDLE">空闲中</option>
              <option value="DISABLED">已停用</option>
            </select>
            <button class="btn-refresh" @click="refresh"><i class="fa-solid fa-rotate"></i></button>
          </div>
        </section>
        <section>
          <div v-if="!agents.length" class="empty-state"><i class="fa-solid fa-robot"></i><h4>未找到符合条件的智能体</h4></div>
          <div v-else-if="viewMode === 'card'" class="agent-grid">
            <div v-for="a in agents" :key="a.id" class="agent-card">
              <div>
                <div class="agent-card-header">
                  <div class="agent-meta-left">
                    <div class="agent-avatar-badge">{{ a.avatar || '🤖' }}</div>
                    <div class="agent-title-box">
                      <h3>{{ a.name }}</h3>
                      <div class="agent-code-tag">{{ a.code || a.id }}</div>
                    </div>
                  </div>
                  <div class="badge-status" :class="statusClass(a.status)"><span class="status-dot"></span><span>{{ statusLabel(a.status) }}</span></div>
                </div>
                <div class="agent-desc">{{ a.description || '暂无描述信息' }}</div>
                <div class="agent-specs">
                  <span class="spec-badge spec-model"><i class="fa-solid fa-microchip"></i><span>{{ a.modelName || 'gpt-4o' }}</span></span>
                  <span class="spec-badge"><i class="fa-solid fa-temperature-half"></i><span>T:{{ a.temperature != null ? a.temperature : 0.7 }}</span></span>
                  <span class="spec-badge"><i class="fa-solid fa-tag"></i><span>{{ a.category || '通用' }}</span></span>
                </div>
                <div class="prompt-preview-box">{{ a.systemPrompt || '暂未设定 System Prompt' }}</div>
                <div class="agent-tags"><span v-for="t in (a.tags || [])" :key="t" class="tag-item">#{{ t }}</span></div>
              </div>
              <div class="agent-footer">
                <div class="agent-stats-metric">
                  <span><i class="fa-regular fa-comment-dots"></i> {{ Number(a.callCount || 0).toLocaleString() }}</span>
                  <span><i class="fa-regular fa-clock"></i> {{ a.avgResponseTimeMs || 300 }}ms</span>
                </div>
                <div class="agent-actions">
                  <button class="btn-card-action btn-chat-primary" @click="goDebug(a.id)"><i class="fa-solid fa-sliders"></i><span>调试</span></button>
                  <button class="btn-card-action btn-action-icon" @click="openEdit(a)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="btn-card-action btn-action-icon" @click="toggleStatus(a)"><i class="fa-solid fa-power-off"></i></button>
                  <button class="btn-card-action btn-action-icon btn-action-danger" @click="openDelete(a)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="table-view-card">
            <table class="agent-table">
              <thead><tr><th>智能体</th><th>业务分类</th><th>调度模型</th><th>系统提示词</th><th>调用统计</th><th>运行状态</th><th style="text-align:right;">操作管理</th></tr></thead>
              <tbody>
                <tr v-for="a in agents" :key="a.id">
                  <td><div class="table-agent-meta"><div class="table-agent-avatar">{{ a.avatar || '🤖' }}</div><div><div class="table-agent-title">{{ a.name }}</div><div class="table-agent-code">{{ a.code || a.id }}</div></div></div></td>
                  <td><span class="spec-badge"><i class="fa-solid fa-tag"></i> {{ a.category || '通用' }}</span></td>
                  <td>{{ a.modelName || 'gpt-4o' }}</td>
                  <td><div class="table-prompt-cell">{{ a.systemPrompt || '暂无设定' }}</div></td>
                  <td>{{ Number(a.callCount || 0).toLocaleString() }} 次</td>
                  <td><div class="badge-status" :class="statusClass(a.status)"><span class="status-dot"></span><span>{{ statusLabel(a.status) }}</span></div></td>
                  <td style="text-align:right;">
                    <div class="agent-actions" style="justify-content:flex-end;">
                      <button class="btn-card-action btn-chat-primary" @click="goDebug(a.id)"><i class="fa-solid fa-sliders"></i><span>调试</span></button>
                      <button class="btn-card-action btn-action-icon" @click="openEdit(a)"><i class="fa-regular fa-pen-to-square"></i></button>
                      <button class="btn-card-action btn-action-icon" @click="toggleStatus(a)"><i class="fa-solid fa-power-off"></i></button>
                      <button class="btn-card-action btn-action-icon btn-action-danger" @click="openDelete(a)"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="pagination-container">
          <div class="page-summary">共 {{ pageResult.total || 0 }} 个智能体 · 第 {{ pageResult.page || 1 }} / {{ Math.max(1, pageResult.totalPages || 1) }} 页</div>
          <div class="pagination-controls">
            <button class="btn-page" :disabled="page <= 1" @click="changePage(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button v-for="n in Math.max(1, pageResult.totalPages || 1)" :key="n" class="btn-page" :class="{ active: n === page }" @click="page = n; loadAgents()">{{ n }}</button>
            <button class="btn-page" :disabled="page >= (pageResult.totalPages || 1)" @click="changePage(1)"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </section>
      </section>

      <section v-show="currentTab === 'knowledge'" class="app-subview active">
        <div class="knowledge-hero-box">
          <div class="knowledge-icon-large"><i class="fa-solid fa-book-bookmark"></i></div>
          <h2 class="knowledge-hero-title">企业私有知识库与 RAG 检索增强引擎</h2>
          <p class="knowledge-hero-desc">支持企业非结构化文档深度切分向量化，无缝挂载至智能体工作流。</p>
          <button class="btn-create-agent" style="margin: 0 auto;" @click="showToast('知识库向量构建模块正在接入，敬请期待！', 'info')"><i class="fa-solid fa-plus"></i><span>创建专属知识库</span></button>
        </div>
      </section>
    </div>
  </div>

  <div class="modal-backdrop" :class="{ open: agentModalOpen }">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>{{ form.id ? '编辑智能体' : '注册新智能体' }}</h3>
        <button class="btn-modal-close" @click="agentModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form @submit.prevent="saveAgent">
        <div class="modal-body">
          <div v-if="!form.id" class="form-group">
            <label class="form-label">行业场景模版预设</label>
            <select class="form-control-styled" @change="applyTemplate($event.target.value)">
              <option value="">-- 选择预设专家智能体模版 --</option>
              <option v-for="(t, i) in templates" :key="i" :value="i">{{ t.avatar }} {{ t.name }}</option>
            </select>
          </div>
          <div class="form-row-2">
            <div class="form-group"><label class="form-label">智能体名称 *</label><input v-model="form.name" class="form-control-styled" required></div>
            <div class="form-group"><label class="form-label">唯一业务标识 Code *</label><input v-model="form.code" class="form-control-styled" required></div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">所属业务分类</label>
              <select v-model="form.category" class="form-control-styled">
                <option v-for="c in categories.slice(1)" :key="c" :value="c">{{ c }}</option>
                <option value="通用智能">通用智能</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">调度大模型</label>
              <select v-model="form.modelName" class="form-control-styled">
                <option value="gpt-4o">gpt-4o</option>
                <option value="deepseek-chat">deepseek-chat</option>
                <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="deepseek-coder">deepseek-coder</option>
                <option value="qwen-max">qwen-max</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">智能体业务头像</label>
            <div class="emoji-selector-list">
              <button v-for="e in emojis" :key="e" type="button" class="emoji-btn" :class="{ active: form.avatar === e }" @click="form.avatar = e">{{ e }}</button>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">采样温度</label>
              <div class="slider-wrapper">
                <input v-model.number="form.temperature" type="range" class="range-slider" min="0" max="2" step="0.1">
                <span class="slider-value-pill">{{ form.temperature }}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">初始运行状态</label>
              <select v-model="form.status" class="form-control-styled">
                <option value="RUNNING">运行中</option>
                <option value="IDLE">空闲中</option>
                <option value="DISABLED">已停用</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">系统提示词 *</label><textarea v-model="form.systemPrompt" class="form-control-styled" rows="4" required></textarea></div>
          <div class="form-group"><label class="form-label">业务功能描述</label><input v-model="form.description" class="form-control-styled"></div>
          <div class="form-group"><label class="form-label">业务标签 (逗号分隔)</label><input v-model="form.tagsText" class="form-control-styled"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="agentModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent" :disabled="saving">{{ saving ? '保存中...' : '保存并生效' }}</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-backdrop" :class="{ open: deleteModalOpen }">
    <div class="modal-dialog" style="max-width: 420px;">
      <div class="modal-header">
        <h3 style="color: var(--accent-rose);"><i class="fa-solid fa-triangle-exclamation"></i> 确认删除智能体</h3>
        <button class="btn-modal-close" @click="deleteModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding: 20px 24px;">
        <p style="font-size: 14px; color: var(--text-secondary);">确定要彻底删除智能体 <strong>{{ pendingDelete?.name }}</strong> 吗？</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="deleteModalOpen = false">取消</button>
        <button type="button" class="btn-danger-confirm" :disabled="saving" @click="confirmDelete">确认删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { showToast } = useToast()
const currentTab = ref('overview')
const timeRange = ref('7days')
const stats = ref({})
const agents = ref([])
const pageResult = ref({})
const page = ref(1)
const keyword = ref('')
const category = ref('全部')
const statusFilter = ref('')
const viewMode = ref(localStorage.getItem('agentViewMode') || 'card')
const templates = ref([])
const agentModalOpen = ref(false)
const deleteModalOpen = ref(false)
const pendingDelete = ref(null)
const saving = ref(false)
const theme = ref(localStorage.getItem('theme') || 'dark')
const trendCanvas = ref(null)
const donutCanvas = ref(null)
const latencyCanvas = ref(null)
let trendChart = null
let donutChart = null
let latencyChart = null
let searchTimer = null

const categories = ['全部', '代码研发', '运维架构', '产品策划', '知识库客服', '数据分析', '内容创作']
const emojis = ['🤖', '🚀', '⚡', '🛡️', '✨', '🎨', '📋', '🌐', '💻', '🧠', '📊']
const form = reactive({
  id: '', name: '', code: '', category: '通用智能', modelName: 'gpt-4o',
  avatar: '🤖', temperature: 0.7, status: 'RUNNING', systemPrompt: '', description: '', tagsText: ''
})

const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})
const pageTitle = computed(() => {
  if (currentTab.value === 'overview') return '概览仪表盘 (Overview & Analytics)'
  if (currentTab.value === 'agents') return 'Agents 智能体资产管理'
  return '企业私有知识库 (RAG)'
})
const totalTokens = computed(() => Number(stats.value.promptTokens || 0) + Number(stats.value.completionTokens || 0))
const promptShare = computed(() => totalTokens.value ? Math.round(Number(stats.value.promptTokens || 0) * 1000 / totalTokens.value) / 10 : 0)
const completionShare = computed(() => totalTokens.value ? Math.round((100 - promptShare.value) * 10) / 10 : 0)

function formatToken(value) {
  const n = Number(value || 0)
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
function statusLabel(s) { return s === 'IDLE' ? '空闲中' : s === 'DISABLED' ? '已停用' : '运行中' }
function statusClass(s) { return s === 'IDLE' ? 'badge-warning' : s === 'DISABLED' ? 'badge-danger' : 'badge-success' }

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
  renderCharts()
}

async function logout() {
  await http.del('/api/auth/session')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  showToast('已安全登出控制台', 'info')
  router.push('/login')
}

function changeRange(range) {
  timeRange.value = range
  loadStats()
}

function setCategory(cat) {
  category.value = cat
  page.value = 1
  loadAgents()
}

function debounceSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadAgents() }, 300)
}

function changePage(delta) {
  page.value = Math.max(1, page.value + delta)
  loadAgents()
}

function goDebug(id) {
  router.push(`/debug/${id}`)
}

watch(viewMode, (mode) => localStorage.setItem('agentViewMode', mode))
watch(currentTab, (tab) => { if (tab === 'overview') nextTick(renderCharts) })

async function loadStats() {
  const res = await http.get('/api/dashboard/stats', { range: timeRange.value })
  if (res.success) {
    stats.value = res.data || {}
    await nextTick()
    renderCharts()
  }
}

async function loadAgents() {
  const res = await http.get('/api/agents', {
    keyword: keyword.value, category: category.value, status: statusFilter.value, page: page.value, size: 6
  })
  if (res.success && res.data) {
    agents.value = res.data.records || []
    pageResult.value = res.data
  }
}

async function loadTemplates() {
  const res = await http.get('/api/agent-templates')
  if (res.success) templates.value = res.data || []
}

function refresh() {
  loadStats()
  loadAgents()
}

function emptyForm() {
  Object.assign(form, { id: '', name: '', code: '', category: '通用智能', modelName: 'gpt-4o', avatar: '🤖', temperature: 0.7, status: 'RUNNING', systemPrompt: '', description: '', tagsText: '' })
}

function openCreate() {
  emptyForm()
  agentModalOpen.value = true
}

function openEdit(agent) {
  Object.assign(form, {
    id: agent.id, name: agent.name, code: agent.code, category: agent.category || '通用智能',
    modelName: agent.modelName || 'gpt-4o', avatar: agent.avatar || '🤖',
    temperature: agent.temperature != null ? agent.temperature : 0.7,
    status: agent.status || 'RUNNING', systemPrompt: agent.systemPrompt || '',
    description: agent.description || '', tagsText: (agent.tags || []).join(', ')
  })
  agentModalOpen.value = true
}

function applyTemplate(index) {
  const t = templates.value[Number(index)]
  if (!t) return
  form.name = t.name || ''
  form.code = 'agent_' + (t.name || 'bot').toLowerCase().replace(/[^a-z0-9]/gi, '_')
  form.category = t.category || '通用智能'
  form.modelName = t.modelName || 'gpt-4o'
  form.systemPrompt = t.systemPrompt || ''
  form.description = t.description || ''
  form.temperature = t.temperature != null ? t.temperature : 0.7
  form.avatar = t.avatar || '🤖'
  form.tagsText = (t.tags || []).join(', ')
}

async function saveAgent() {
  saving.value = true
  const payload = {
    name: form.name.trim(), code: form.code.trim(), avatar: form.avatar, category: form.category,
    modelName: form.modelName, temperature: form.temperature, status: form.status,
    systemPrompt: form.systemPrompt.trim(), description: form.description.trim(),
    tags: form.tagsText ? form.tagsText.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : []
  }
  const res = form.id ? await http.put(`/api/agents/${form.id}`, payload) : await http.post('/api/agents', payload)
  saving.value = false
  if (res.success) {
    showToast(res.message || '保存成功', 'success')
    agentModalOpen.value = false
    refresh()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function toggleStatus(agent) {
  const next = agent.status === 'RUNNING' ? 'DISABLED' : 'RUNNING'
  const res = await http.patch(`/api/agents/${agent.id}/status`, { status: next })
  if (res.success) {
    showToast(`智能体已切换为 [${next === 'RUNNING' ? '运行中' : '已停用'}]`, 'success', 2000)
    refresh()
  } else {
    showToast(res.message || '状态切换失败', 'error')
  }
}

function openDelete(agent) {
  pendingDelete.value = agent
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  saving.value = true
  const res = await http.del(`/api/agents/${pendingDelete.value.id}`)
  saving.value = false
  if (res.success) {
    showToast('智能体已成功删除', 'success')
    deleteModalOpen.value = false
    refresh()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

function chartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return { text: isDark ? '#94a3b8' : '#64748b', grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
}

function renderCharts() {
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
        { label: `Prompt Tokens${unit ? ' (' + unit + ')' : ''}`, data: prompt.map((v) => Number((v / divisor).toFixed(2))), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', tension: 0.35, fill: true },
        { label: `Completion Tokens${unit ? ' (' + unit + ')' : ''}`, data: completion.map((v) => Number((v / divisor).toFixed(2))), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.35, fill: true }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: colors.text, font: { size: 11 } } } }, scales: { x: { ticks: { color: colors.text }, grid: { color: colors.grid } }, y: { ticks: { color: colors.text }, grid: { color: colors.grid } } } }
  })

  const modelMap = stats.value.modelDistribution || {}
  const labels = Object.keys(modelMap)
  const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b']
  if (donutChart) donutChart.destroy()
  donutChart = new Chart(donutCanvas.value, {
    type: 'doughnut',
    data: { labels: labels.length ? labels : ['暂无数据'], datasets: [{ data: labels.length ? labels.map((k) => modelMap[k]) : [1], backgroundColor: labels.length ? labels.map((_, i) => palette[i % palette.length]) : ['#64748b'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: colors.text, font: { size: 11 } } } } }
  })

  const latency = stats.value.latencyByCategory || []
  if (latencyChart) latencyChart.destroy()
  latencyChart = new Chart(latencyCanvas.value, {
    type: 'bar',
    data: { labels: latency.map((r) => r.category), datasets: [{ label: '平均响应耗时 (ms)', data: latency.map((r) => r.avgLatencyMs || 0), backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: colors.text, font: { size: 11 } } } }, scales: { x: { ticks: { color: colors.text }, grid: { display: false } }, y: { ticks: { color: colors.text }, grid: { color: colors.grid } } } }
  })
}

onMounted(() => {
  loadStats()
  loadAgents()
  loadTemplates()
})
</script>
