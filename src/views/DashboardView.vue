<template>
  <div class="app-layout">
    <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-header-row">
          <a
            class="sidebar-brand"
            :title="sidebarCollapsed ? '点击展开侧边栏' : 'AgentMatrix Enterprise'"
            @click.prevent="sidebarCollapsed ? toggleSidebar() : (currentTab = 'overview')"
          >
            <AgentLogo :size="sidebarCollapsed ? 30 : 34" />
            <div v-show="!sidebarCollapsed" class="brand-text">
              <span class="brand-title">AgentMatrix</span>
              <span class="brand-edition">Enterprise v2.6</span>
            </div>
          </a>
          <button
            v-show="!sidebarCollapsed"
            type="button"
            class="btn-sidebar-header-toggle"
            title="收起侧边栏"
            @click.stop="toggleSidebar"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div
          v-for="(group, gIdx) in navGroups"
          :key="group.id"
          class="nav-group-wrapper"
        >
          <!-- Category Section Header (Expanded) -->
          <div v-show="!sidebarCollapsed" class="nav-section-header">
            <span class="nav-section-title">
              <i :class="group.icon"></i>
              <span>{{ group.title }}</span>
            </span>
          </div>
          <!-- Collapsed Divider -->
          <div v-show="sidebarCollapsed && gIdx > 0" class="nav-section-divider" :title="group.title"></div>

          <!-- Submenu Items -->
          <button
            v-for="item in group.items"
            :key="item.id"
            class="sidebar-nav-item"
            :class="{ active: currentTab === item.id }"
            :title="item.title || item.name"
            @click="handleNavClick(item)"
          >
            <span class="nav-item-icon-wrap">
              <i :class="item.icon"></i>
            </span>
            <span v-show="!sidebarCollapsed" class="nav-item-name">{{ item.name }}</span>
            <span
              v-if="!sidebarCollapsed && item.badge"
              class="nav-badge-pill"
              :class="'badge-' + (item.badgeType || 'default')"
            >
              {{ item.badge }}
            </span>
            <span
              v-else-if="!sidebarCollapsed && item.count !== undefined"
              class="nav-count-pill"
            >
              {{ item.count }}
            </span>
          </button>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user-card" :title="user.nickname || user.username || '平台用户'" @click="openProfileModal">
          <div class="user-meta-left">
            <div class="user-avatar-wrap">
              <img :src="userAvatar" class="user-avatar-sidebar" alt="Avatar">
              <span class="avatar-online-dot"></span>
            </div>
            <div v-show="!sidebarCollapsed" class="user-text-info">
              <span class="user-name-text">{{ user.nickname || user.username || '平台用户' }}</span>
              <span class="user-role-text" :class="'role-' + (user.role || '').toLowerCase()">
                <i v-if="isSuperAdmin" class="fa-solid fa-shield-halved"></i>
                <i v-else-if="user.role === 'DEVELOPER'" class="fa-solid fa-code"></i>
                <i v-else class="fa-solid fa-eye"></i>
                <span>{{ user.roleName || (isSuperAdmin ? '超级管理员' : (user.role === 'VIEWER' ? '只读观察员' : '开发者')) }}</span>
              </span>
            </div>
          </div>
          <button v-show="!sidebarCollapsed" class="btn-sidebar-logout" title="退出登录" @click.stop="logout">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
        <div class="sidebar-collapse-bar">
          <button
            type="button"
            class="sidebar-collapse-btn"
            :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
            @click="toggleSidebar"
          >
            <i :class="sidebarCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
            <span v-show="!sidebarCollapsed">收起侧边栏</span>
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
          <div class="topbar-user-menu" style="cursor: pointer;" title="点击打开个人中心与安全设置" @click="openProfileModal">
            <img class="topbar-user-avatar" :src="userAvatar" alt="Avatar">
            <div class="topbar-user-info">
              <span class="topbar-user-name">{{ user.nickname || user.username || '管理员' }}</span>
              <span class="topbar-user-tag" :class="'role-' + (user.role || '').toLowerCase()">{{ user.roleName || (isSuperAdmin ? '超级管理员' : (user.role === 'VIEWER' ? '只读观察员' : '开发者')) }}</span>
            </div>
            <button class="btn-topbar-logout" title="退出登录" @click.stop="logout">
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
            <div class="token-card-header"><span class="token-card-title">预估推理成本 (CNY)</span><div class="token-card-icon icon-amber"><i class="fa-solid fa-coins"></i></div></div>
            <div class="token-card-val">{{ formatCny(stats.estimatedCostCny) }}</div>
            <div class="token-card-footer"><span>按各模型官方挂牌价估算</span><span>DeepSeek 取高峰时段</span></div>
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
          <button v-if="user.role !== 'VIEWER'" class="btn-create-agent" @click="openCreate"><i class="fa-solid fa-plus"></i><span>注册新智能体</span></button>
        </div>
        <section class="stats-grid">
          <div class="stat-card"><div class="stat-info"><span class="stat-label">智能体资产总数</span><span class="stat-value">{{ agentAssetTotal }}</span></div><div class="stat-icon-wrapper icon-blue"><i class="fa-solid fa-layer-group"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">在线运行智能体</span><span class="stat-value">{{ runningAgentTotal }}</span></div><div class="stat-icon-wrapper icon-emerald"><i class="fa-solid fa-bolt-lightning"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">累计调度调用量</span><span class="stat-value">{{ Number(stats.totalCalls || 0).toLocaleString() }}</span></div><div class="stat-icon-wrapper icon-purple"><i class="fa-solid fa-comments"></i></div></div>
          <div class="stat-card"><div class="stat-info"><span class="stat-label">平均响应耗时</span><span class="stat-value">{{ stats.avgResponseTimeMs || 0 }}ms</span></div><div class="stat-icon-wrapper icon-amber"><i class="fa-solid fa-stopwatch"></i></div></div>
        </section>
        <section class="toolbar-section">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              v-model="keyword"
              class="search-input"
              type="search"
              autocomplete="off"
              placeholder="搜索名称、账号、Prompt、业务编码或标签..."
              @input="debounceSearch"
            >
          </div>
          <!-- Scope Filter: 全部 / 我的资产 / 系统预置 -->
          <div class="scope-filter-group">
            <button
              class="btn-scope-pill"
              :class="{ active: scopeFilter === 'all' }"
              title="查看全量可见智能体（系统公共 + 个人资产）"
              @click="setScope('all')"
            >
              <i class="fa-solid fa-cubes"></i>
              <span>全部智能体</span>
            </button>
            <button
              class="btn-scope-pill"
              :class="{ active: scopeFilter === 'mine' }"
              title="仅筛选由我创建或克隆的专属个人智能体"
              @click="setScope('mine')"
            >
              <i class="fa-solid fa-user-check"></i>
              <span>我的专属资产</span>
            </button>
            <button
              class="btn-scope-pill"
              :class="{ active: scopeFilter === 'system' }"
              title="仅筛选平台内置的标准系统公共智能体"
              @click="setScope('system')"
            >
              <i class="fa-solid fa-shield-halved"></i>
              <span>系统公共预置</span>
            </button>
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
            <button class="btn-refresh" title="强制刷新智能体列表" @click="resetAgentList(true)"><i class="fa-solid fa-rotate" :class="{ 'fa-spin': agentsLoading }"></i></button>
          </div>
        </section>
        <section>
          <div v-if="agentsLoading" class="empty-state">
            <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-blue); font-size: 32px;"></i>
            <h4>正在加载智能体资产列表...</h4>
            <p class="empty-sub-hint" style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">正在从服务端获取最新状态，请稍候</p>
          </div>
          <div v-else-if="!agents.length" class="empty-state">
            <i class="fa-solid fa-robot"></i>
            <h4>未找到符合条件的智能体</h4>
            <p v-if="keyword || category !== '全部' || scopeFilter !== 'all' || statusFilter" class="empty-sub-hint" style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              当前筛选条件未匹配到任何资产（{{ scopeFilter !== 'all' ? (scopeFilter === 'mine' ? '专属资产' : '系统公共') : '' }} {{ category !== '全部' ? category : '' }} {{ keyword ? `关键词: "${keyword}"` : '' }} {{ statusFilter ? statusLabel(statusFilter) : '' }}）
            </p>
            <p v-else class="empty-sub-hint" style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              当前暂无可见的智能体资产，您可以点击新建智能体快速创建
            </p>
            <div class="empty-actions" style="margin-top: 14px; display: flex; gap: 10px; justify-content: center;">
              <button
                v-if="keyword || category !== '全部' || scopeFilter !== 'all' || statusFilter"
                type="button"
                class="btn-secondary"
                style="padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer; color: var(--text-primary); font-size: 13px;"
                @click="resetAgentList(true)"
              >
                <i class="fa-solid fa-filter-circle-xmark"></i>
                <span style="margin-left: 6px;">清空筛选条件并查看全部</span>
              </button>
              <button type="button" class="btn-create-agent" @click="openCreate">
                <i class="fa-solid fa-plus"></i>
                <span style="margin-left: 6px;">新建智能体</span>
              </button>
            </div>
          </div>
          <div v-else-if="viewMode === 'card'" class="agent-grid">
            <div v-for="a in agents" :key="a.id" class="agent-card">
              <div class="agent-card-main">
                <!-- 顶部 Header: 头像 + 标题行 + 运行状态 -->
                <div class="agent-card-header">
                  <div class="agent-meta-left">
                    <div class="agent-avatar-badge">{{ a.avatar || '🤖' }}</div>
                    <div class="agent-title-box">
                      <div class="agent-title-row">
                        <h3 :title="a.name">{{ a.name }}</h3>
                        <span v-if="a.isSystem" class="agent-scope-pill scope-system" title="系统公共预置资产，全员共享"><i class="fa-solid fa-shield-halved"></i> 公共</span>
                        <span v-else class="agent-scope-pill scope-mine" title="专属个人智能体资产"><i class="fa-solid fa-user-check"></i> 专属</span>
                      </div>
                      <div class="agent-sub-meta">
                        <span class="agent-cat-badge"><i class="fa-solid fa-layer-group"></i> {{ a.category || '通用' }}</span>
                        <span class="agent-owner-inline" :title="'资产归属: ' + (a.isSystem ? '系统公共预置' : accountLabel(a))">
                          <i class="fa-regular fa-user"></i> {{ a.isSystem ? '系统公共' : accountLabel(a) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="badge-status" :class="statusClass(a.status)">
                    <span class="status-dot"></span>
                    <span>{{ statusLabel(a.status) }}</span>
                  </div>
                </div>

                <!-- 独立全宽专属标识栏 (ID + 业务编码)，横跨卡片全宽，white-space: nowrap，彻底杜绝折行撕裂 -->
                <div class="agent-card-id-strip">
                  <div class="agent-id-pill" title="点击一键复制真实智能体 ID (agent_id，开放接口必填)" @click.stop="copyText(a.id, '智能体 ID 已复制: ' + a.id)">
                    <i class="fa-solid fa-fingerprint id-icon"></i>
                    <span class="id-label">ID:</span>
                    <code class="id-code">{{ a.id }}</code>
                    <i class="fa-regular fa-copy copy-icon"></i>
                  </div>
                  <div v-if="a.code" class="agent-code-chip" :title="'业务编码: ' + a.code">
                    <i class="fa-solid fa-code"></i>
                    <span>{{ a.code }}</span>
                  </div>
                </div>

                <!-- 描述说明 -->
                <div class="agent-card-desc" :class="{ 'is-empty': !a.description }" :title="a.description || ''">
                  {{ a.description || '暂无智能体描述信息，点击编辑可添加职责与场景说明' }}
                </div>

                <!-- 核心技术规格 -->
                <div class="agent-card-specs">
                  <span class="spec-badge spec-model" :title="'调度模型: ' + routedModelLabel">
                    <i class="fa-solid fa-microchip"></i>
                    <span>{{ routedModelLabel }}</span>
                  </span>
                  <span class="spec-badge" :title="'采样温度: ' + (a.temperature != null ? a.temperature : 0.7)">
                    <i class="fa-solid fa-temperature-half"></i>
                    <span>T: {{ a.temperature != null ? a.temperature : 0.7 }}</span>
                  </span>
                  <span v-if="a.systemPrompt" class="spec-badge spec-prompt-flag" title="已配置专用 System Prompt">
                    <i class="fa-solid fa-terminal"></i>
                    <span>Prompt 设定</span>
                  </span>
                </div>

                <!-- System Prompt 预览微窗 -->
                <div class="agent-prompt-preview" :title="'System Prompt: ' + (a.systemPrompt || '暂未设定')">
                  <i class="fa-solid fa-terminal prompt-lead-icon"></i>
                  <span class="prompt-text">{{ a.systemPrompt || '暂未设定 System Prompt' }}</span>
                </div>

                <!-- 标签 -->
                <div v-if="a.tags && a.tags.length" class="agent-tags">
                  <span v-for="t in a.tags" :key="t" class="tag-item">#{{ t }}</span>
                </div>
              </div>

              <!-- 底部操作与指标栏 -->
              <div class="agent-footer">
                <div class="agent-stats-metric">
                  <span :title="'累计调用次数: ' + (a.callCount || 0)"><i class="fa-regular fa-comment-dots"></i> {{ Number(a.callCount || 0).toLocaleString() }} 次</span>
                  <span :title="'平均响应耗时: ' + (a.avgResponseTimeMs || 0) + 'ms'"><i class="fa-regular fa-clock"></i> {{ a.avgResponseTimeMs || 0 }}ms</span>
                </div>
                <div class="agent-actions">
                  <button class="btn-card-action btn-chat-primary" title="进入智能体独立会话调试界面" @click="goDebug(a.id)">
                    <i class="fa-solid fa-sliders"></i>
                    <span>调试</span>
                  </button>
                  <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon" title="编辑智能体配置" @click="openEdit(a)">
                    <i class="fa-regular fa-pen-to-square"></i>
                  </button>
                  <button v-else class="btn-card-action btn-action-icon disabled-locked" title="系统公共预置资产受保护，请先“复制专属”后再修改" @click="copyAgent(a)">
                    <i class="fa-solid fa-lock"></i>
                  </button>
                  <button class="btn-card-action btn-action-icon" :class="{ 'btn-clone-highlight': a.isSystem && !isSuperAdmin }" :title="a.isSystem ? '复制为我的专属智能体（拥有独立配置）' : '复制智能体'" :disabled="copying" @click="copyAgent(a)">
                    <i class="fa-regular fa-copy"></i>
                  </button>
                  <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon" :title="a.status === 'RUNNING' ? '停用智能体' : '启用智能体'" @click="toggleStatus(a)">
                    <i class="fa-solid fa-power-off"></i>
                  </button>
                  <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon btn-action-danger" title="删除智能体" @click="openDelete(a)">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="table-view-card">
            <div class="table-responsive-wrapper">
              <table class="agent-table">
                <thead>
                  <tr>
                    <th style="min-width: 280px;">智能体资产信息</th>
                    <th style="min-width: 110px;">所属账号</th>
                    <th style="min-width: 100px;">业务分类</th>
                    <th style="min-width: 120px;">调度模型</th>
                    <th style="width: 130px; min-width: 110px; max-width: 140px;">系统提示词</th>
                    <th style="min-width: 95px;">调用统计</th>
                    <th style="min-width: 95px;">运行状态</th>
                    <th style="min-width: 200px; text-align: right;">操作管理</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in agents" :key="a.id">
                    <td>
                      <div class="table-agent-meta">
                        <div class="table-agent-avatar">{{ a.avatar || '🤖' }}</div>
                        <div class="table-agent-info">
                          <div class="table-agent-title-row">
                            <span class="table-agent-title" :title="a.name">{{ a.name }}</span>
                            <span v-if="a.isSystem" class="agent-scope-pill scope-system-sm" title="系统公共预置资产，全员共享"><i class="fa-solid fa-shield-halved"></i> 公共</span>
                            <span v-else class="agent-scope-pill scope-mine-sm" title="专属智能体资产"><i class="fa-solid fa-user-check"></i> 专属</span>
                          </div>
                          <div class="table-agent-id-row">
                            <div class="table-id-pill" title="点击一键复制真实智能体 ID (agent_id)" @click.stop="copyText(a.id, '智能体 ID 已复制: ' + a.id)">
                              <i class="fa-solid fa-fingerprint id-lead-icon"></i>
                              <span class="id-tag-label">ID:</span>
                              <code class="id-val">{{ a.id }}</code>
                              <i class="fa-regular fa-copy copy-hint-icon"></i>
                            </div>
                            <div v-if="a.code" class="table-code-pill" :title="'业务编码: ' + a.code">
                              <i class="fa-solid fa-code"></i>
                              <span class="code-val">{{ a.code }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="table-owner-cell" :title="a.isSystem ? '系统公共预置' : accountLabel(a)">
                        <i class="fa-regular fa-user"></i>
                        <span>{{ a.isSystem ? '系统公共' : accountLabel(a) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="spec-badge"><i class="fa-solid fa-layer-group"></i> {{ a.category || '通用' }}</span>
                    </td>
                    <td>
                      <span class="spec-badge spec-model"><i class="fa-solid fa-microchip"></i> {{ routedModelLabel }}</span>
                    </td>
                    <td>
                      <div class="table-prompt-cell" :title="'System Prompt 完整内容 (鼠标悬停查看):\n' + (a.systemPrompt || '暂无设定')">
                        <i class="fa-solid fa-terminal prompt-cell-icon"></i>
                        <span class="prompt-cell-text">{{ a.systemPrompt || '未设定' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="table-call-count"><i class="fa-regular fa-message"></i> {{ Number(a.callCount || 0).toLocaleString() }} 次</span>
                    </td>
                    <td>
                      <div class="badge-status" :class="statusClass(a.status)">
                        <span class="status-dot"></span>
                        <span>{{ statusLabel(a.status) }}</span>
                      </div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
                        <button class="btn-card-action btn-chat-primary" title="进入智能体独立会话调试界面" @click="goDebug(a.id)">
                          <i class="fa-solid fa-sliders"></i>
                          <span>调试</span>
                        </button>
                        <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon" title="编辑智能体配置" @click="openEdit(a)">
                          <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button v-else class="btn-card-action btn-action-icon disabled-locked" title="系统公共资产受保护不可直接修改，请点击复制专属" @click="copyAgent(a)">
                          <i class="fa-solid fa-lock"></i>
                        </button>
                        <button class="btn-card-action btn-action-icon" :class="{ 'btn-clone-highlight': a.isSystem && !isSuperAdmin }" :title="a.isSystem ? '复制为我的专属智能体' : '复制智能体'" :disabled="copying" @click="copyAgent(a)">
                          <i class="fa-regular fa-copy"></i>
                        </button>
                        <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon" :title="a.status === 'RUNNING' ? '停用智能体' : '启用智能体'" @click="toggleStatus(a)">
                          <i class="fa-solid fa-power-off"></i>
                        </button>
                        <button v-if="canManageAgent(a)" class="btn-card-action btn-action-icon btn-action-danger" title="删除智能体" @click="openDelete(a)">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

      <section v-show="currentTab === 'templates'" class="app-subview active">
        <AgentTemplatesPanel
          ref="templatesPanelRef"
          :is-super-admin="isSuperAdmin"
          @use-template="onUseTemplateFromPanel"
          @templates-updated="loadTemplates"
        />
      </section>

      <section v-show="currentTab === 'knowledge'" class="app-subview active">
        <KnowledgeBasePanel
          ref="kbPanelRef"
          :active="currentTab === 'knowledge'"
          :user="user"
          :current-user="user"
          :is-super-admin="isSuperAdmin"
        />
      </section>

      <section v-show="currentTab === 'gateway'" class="app-subview active">
        <GatewayPanel ref="gatewayPanelRef" />
      </section>

      <section v-show="currentTab === 'users'" class="app-subview active">
        <UserManagementPanel ref="usersPanelRef" :currentUser="user" />
      </section>

      <section v-show="currentTab === 'roles'" class="app-subview active">
        <RolePermissionPanel ref="rolesPanelRef" />
      </section>

      <section v-show="currentTab === 'security'" class="app-subview active">
        <SecurityOpenPanel
          ref="securityPanelRef"
          :user="user"
          :is-super-admin="isSuperAdmin"
          :initial-tab="securityInnerTab"
        />
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
              <option v-for="t in templates" :key="t.id || t.name" :value="t.id || t.name">{{ t.avatar }} {{ t.name }} ({{ t.category }})</option>
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
              <div class="form-control-styled" style="display:flex;align-items:center;min-height:40px;">{{ routedModelLabel }}</div>
              <p class="section-hint" style="margin-top:6px;">由模型网关的默认通道决定，请到「AI 引擎与模型网关」中修改</p>
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
          <button type="submit" class="btn-create-agent" :disabled="saving">
            <i :class="saving ? 'fa-solid fa-spinner fa-spin' : (form.id ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-check')"></i>
            <span>{{ saving ? '保存中...' : (form.id ? '保存修改' : '保存并生效') }}</span>
          </button>
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

  <!-- Modal: Personal Profile & Security Settings -->
  <div v-if="profileModalOpen" class="modal-backdrop open" @click.self="profileModalOpen = false">
    <div class="modal-dialog" style="max-width: 520px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #60a5fa; font-size: 1.1rem;">
            <i class="fa-solid fa-user-gear"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem;">个人中心与账号安全</h3>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">管理个人昵称与安全登录密码</span>
          </div>
        </div>
        <button class="btn-modal-close" @click="profileModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 18px;">
        <!-- Account Info Summary -->
        <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img :src="userAvatar" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid var(--border-color);" alt="avatar">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">{{ user.nickname || user.username }}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">@{{ user.username }}</div>
            </div>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">
            <span>{{ user.roleName || (isSuperAdmin ? '超级管理员' : (user.role === 'VIEWER' ? '只读观察员' : '开发者')) }}</span>
          </div>
        </div>

        <!-- Edit Profile Section -->
        <form @submit.prevent="saveUserProfile">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px;">修改姓名 / 昵称</label>
            <div style="display: flex; gap: 10px;">
              <input v-model="profileForm.nickname" class="form-control-styled" placeholder="输入新的昵称" required style="flex: 1;">
              <button type="submit" class="btn-profile-primary" :disabled="savingProfile">
                <i v-if="savingProfile" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-check"></i>
                <span>{{ savingProfile ? '更新中...' : '保存昵称' }}</span>
              </button>
            </div>
          </div>
        </form>

        <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-lock" style="color: var(--accent-amber);"></i>
            <span>修改登录密码</span>
          </h4>
          <form style="display: flex; flex-direction: column; gap: 12px;" @submit.prevent="saveUserPassword">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">当前原密码</label>
              <input v-model="passwordForm.oldPassword" type="password" class="form-control-styled" placeholder="请输入当前旧密码" required>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">新密码 (至少6位)</label>
              <input v-model="passwordForm.newPassword" type="password" class="form-control-styled" placeholder="请输入高强度新密码" required minlength="6">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">确认新密码</label>
              <input v-model="passwordForm.confirmPassword" type="password" class="form-control-styled" placeholder="请再次确认新密码" required minlength="6">
            </div>
            <div v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" style="font-size: 0.8rem; color: #ef4444; display: flex; align-items: center; gap: 6px; padding: 2px 2px;">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>两次输入的新密码不一致</span>
            </div>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 6px;">
              <button type="button" class="btn-secondary" @click="profileModalOpen = false">取消</button>
              <button
                type="submit"
                class="btn-submit-password"
                :disabled="changingPassword || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6"
              >
                <i v-if="changingPassword" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-key"></i>
                <span>{{ changingPassword ? '正在提交...' : '确认修改密码' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Forced First-Time Password Change -->
  <div v-if="user.mustChangePassword" class="modal-backdrop open" style="z-index: 99999; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px);">
    <div class="modal-dialog" style="max-width: 480px;">
      <div class="modal-header" style="border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-amber); font-size: 1.1rem;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">安全提示：请设置新密码</h3>
            <span style="font-size: 0.8rem; color: var(--accent-amber);">初始临时密码登录后必须修改密码以激活账号</span>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleForcedPasswordChange">
        <div class="modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;">
          <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
            检测到账号 <strong>@{{ user.username }}</strong> 当前处于临时凭据状态。为保障企业资产与模型调用安全，在继续使用平台前请首先设置您的专属密码。
          </p>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">新密码 (至少6位) *</label>
            <input v-model="forcePasswordForm.newPassword" type="password" class="form-control-styled" required minlength="6" placeholder="请输入新密码">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">确认新密码 *</label>
            <input v-model="forcePasswordForm.confirmPassword" type="password" class="form-control-styled" required minlength="6" placeholder="请再次输入新密码">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="logout">退出登录</button>
          <button
            type="submit"
            class="btn-submit-password"
            :disabled="forcingPassword || !forcePasswordForm.newPassword || forcePasswordForm.newPassword.length < 6 || forcePasswordForm.newPassword !== forcePasswordForm.confirmPassword"
          >
            <i v-if="forcingPassword" class="fa-solid fa-circle-notch fa-spin"></i>
            <i v-else class="fa-solid fa-shield-halved"></i>
            <span>{{ forcingPassword ? '设置中...' : '设置密码并激活进入' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { accountLabel } from '../composables/useAccountOptions'
import GatewayPanel from '../components/GatewayPanel.vue'
import AgentTemplatesPanel from '../components/AgentTemplatesPanel.vue'
import KnowledgeBasePanel from '../components/KnowledgeBasePanel.vue'
import UserManagementPanel from '../components/UserManagementPanel.vue'
import RolePermissionPanel from '../components/RolePermissionPanel.vue'
import SecurityOpenPanel from '../components/SecurityOpenPanel.vue'
import AgentLogo from '../components/AgentLogo.vue'
import defaultAdminAvatar from '../assets/avatar-admin.jpg'
import defaultDevAvatar from '../assets/avatar-dev.jpg'

defineOptions({ name: 'DashboardView' })

const router = useRouter()
const route = useRoute()
const { showToast } = useToast()

const validTabs = ['overview', 'agents', 'templates', 'knowledge', 'gateway', 'users', 'roles', 'security', 'open-platform']

function parseInitialTab() {
  const raw = route.query.tab
  const t = Array.isArray(raw) ? raw[0] : raw
  if (t === 'open-platform') return 'security'
  if (t && validTabs.includes(t)) {
    return t
  }
  return 'overview'
}

const currentTab = ref(parseInitialTab())
const kbPanelRef = ref(null)
const templatesPanelRef = ref(null)
const gatewayPanelRef = ref(null)
const usersPanelRef = ref(null)
const rolesPanelRef = ref(null)
const securityPanelRef = ref(null)
const securityInnerTab = ref(route.query.tab === 'open-platform' ? 'keys' : (typeof route.query.sec === 'string' && route.query.sec ? route.query.sec : 'overview'))
const timeRange = ref('7days')
const stats = ref({})
const agents = ref([])
const agentsLoading = ref(false)
const pageResult = ref({})
const page = ref(1)
const keyword = ref('')
const category = ref('全部')
const scopeFilter = ref('all')
const statusFilter = ref('')

function resetAgentList(forceReload = true) {
  keyword.value = ''
  category.value = '全部'
  scopeFilter.value = 'all'
  statusFilter.value = ''
  page.value = 1
  if (forceReload) {
    loadGatewayRoute()
    loadAgents()
    loadStats()
  }
}
const viewMode = ref(localStorage.getItem('agentViewMode') || 'card')
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')

function copyText(text, msg = '智能体 ID 已复制') {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg, 'success')
  }).catch(() => {
    showToast('复制失败', 'error')
  })
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 320)
}

const templates = ref([])
const routedChannel = ref('')
const routedModel = ref('')
const routedModelLabel = computed(() => {
  if (routedChannel.value && routedModel.value) return `${routedChannel.value} · ${routedModel.value}`
  if (routedModel.value) return routedModel.value
  return '未配置网关'
})
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
  id: '', name: '', code: '', category: '通用智能', modelName: '',
  avatar: '🤖', temperature: 0.7, status: 'RUNNING', systemPrompt: '', description: '', tagsText: ''
})

const user = ref({})
function refreshUserFromStorage() {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    user.value = {}
  }
}
refreshUserFromStorage()

const isSuperAdmin = computed(() => {
  const r = user.value?.role
  return r === 'SUPER_ADMIN' || r === 'System Admin' || user.value?.username === 'admin'
})

const userAvatar = computed(() => {
  const name = user.value?.username
  const av = user.value?.avatar
  if (name === 'developer' || user.value?.role === 'DEVELOPER') {
    if (!av || av.includes('dicebear') || av.includes('bottts') || av.includes('avatar-dev')) {
      return defaultDevAvatar
    }
    return av
  }
  return defaultAdminAvatar
})

const pageTitle = computed(() => {
  if (currentTab.value === 'overview') return '概览仪表盘 (Overview & Analytics)'
  if (currentTab.value === 'agents') return 'Agents 智能体资产管理'
  if (currentTab.value === 'templates') return '行业场景模版中心 (Agent Templates)'
  if (currentTab.value === 'knowledge') return '企业私有知识库 (RAG)'
  if (currentTab.value === 'gateway') return 'AI 引擎与模型网关 (LLM / Embedding / Dify)'
  if (currentTab.value === 'users') return '企业租户用户管理 (User Management)'
  if (currentTab.value === 'roles') return '系统固定角色与权限矩阵 (Roles & Permissions)'
  if (currentTab.value === 'security') return '开放与安全 (Open API & Guardrails)'
  return 'AgentMatrix 企业控制台'
})

// Navigation taxonomy structure (4 Primary Enterprise Categories)
const navGroups = computed(() => {
  const groups = [
    {
      id: 'metrics',
      title: '运行监控',
      enTitle: 'METRICS',
      icon: 'fa-solid fa-chart-line',
      items: [
        {
          id: 'overview',
          name: '概览分析',
          title: '概览分析 (Token消耗与指标)',
          icon: 'fa-solid fa-chart-pie'
        }
      ]
    },
    {
      id: 'studio',
      title: '智能体工程',
      enTitle: 'AGENT STUDIO',
      icon: 'fa-solid fa-wand-magic-sparkles',
      items: [
        {
          id: 'agents',
          name: 'Agents 资产',
          title: 'Agents 智能体资产管理',
          icon: 'fa-solid fa-robot',
          count: stats.value.totalAgents || agents.value.length || 0
        },
        {
          id: 'templates',
          name: '场景模版中心',
          title: '场景模版中心 (预置行业智能体)',
          icon: 'fa-solid fa-layer-group'
        }
      ]
    },
    {
      id: 'knowledge',
      title: '知识与检索',
      enTitle: 'DATA & RAG',
      icon: 'fa-solid fa-database',
      items: [
        {
          id: 'knowledge',
          name: '企业私有知识库',
          title: '企业私有知识库 (RAG检索)',
          icon: 'fa-solid fa-book-bookmark'
        }
      ]
    }
  ]

  // Category 4: Enterprise Governance (Admin) or Platform Rules & Security (Developer / Viewer)
  const govItems = []

  if (isSuperAdmin.value) {
    govItems.push({
      id: 'gateway',
      name: 'AI 引擎与模型网关',
      title: 'AI 引擎与模型网关 (LLM / Embedding / Dify)',
      icon: 'fa-solid fa-server'
    })
    govItems.push({
      id: 'users',
      name: '平台用户管理',
      title: '企业租户用户管理 (RBAC)',
      icon: 'fa-solid fa-users-gear'
    })
  }

  govItems.push({
    id: 'roles',
    name: '角色与权限矩阵',
    title: '系统固定角色与权限对照矩阵',
    icon: 'fa-solid fa-shield-halved'
  })

  govItems.push({
    id: 'security',
    name: '开放与安全',
    title: '开放凭证、接入终端、护栏策略与审计',
    icon: 'fa-solid fa-fingerprint',
    badge: 'GATEWAY',
    badgeType: 'emerald'
  })

  groups.push({
    id: 'governance',
    title: isSuperAdmin.value ? '企业系统治理' : '平台规则与安全',
    enTitle: isSuperAdmin.value ? 'GOVERNANCE' : 'SECURITY',
    icon: isSuperAdmin.value ? 'fa-solid fa-sliders' : 'fa-solid fa-shield-cat',
    items: govItems
  })

  return groups
})

function triggerTabRefresh(tabId) {
  if (tabId === 'overview') {
    loadStats()
  } else if (tabId === 'agents') {
    resetAgentList(true)
  } else if (tabId === 'templates') {
    templatesPanelRef.value?.resetTemplates?.(true)
  } else if (tabId === 'knowledge') {
    kbPanelRef.value?.resetToList?.(true)
  } else if (tabId === 'gateway') {
    gatewayPanelRef.value?.refreshAll?.()
  } else if (tabId === 'users') {
    usersPanelRef.value?.resetUsers?.(true)
  } else if (tabId === 'roles') {
    rolesPanelRef.value?.loadRoles?.()
  } else if (tabId === 'security') {
    securityPanelRef.value?.resetAndReload?.(true)
  }
}

function handleNavClick(item) {
  if ((item.id === 'gateway' || item.id === 'users') && !isSuperAdmin.value) {
    showToast('无权限访问该功能，仅超级管理员可用', 'error')
    return
  }
  if (currentTab.value === item.id) {
    nextTick(() => {
      triggerTabRefresh(item.id)
    })
  } else {
    currentTab.value = item.id
  }
}

// Profile & Security Modal
const profileModalOpen = ref(false)
const profileForm = reactive({ nickname: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const savingProfile = ref(false)
const changingPassword = ref(false)

const forcePasswordForm = reactive({ newPassword: '', confirmPassword: '' })
const forcingPassword = ref(false)

function openProfileModal() {
  profileForm.nickname = user.value?.nickname || user.value?.username || ''
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  profileModalOpen.value = true
}

async function saveUserProfile() {
  if (!profileForm.nickname.trim()) {
    showToast('用户昵称不能为空', 'error')
    return
  }
  savingProfile.value = true
  try {
    const res = await http.put('/api/auth/profile', { nickname: profileForm.nickname.trim() })
    if (res.success && res.data) {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      showToast('昵称已成功更新', 'success')
      profileModalOpen.value = false
    } else {
      showToast(res.message || '更新失败', 'error')
    }
  } catch (e) {
    showToast('网络异常: ' + e.message, 'error')
  } finally {
    savingProfile.value = false
  }
}

async function saveUserPassword() {
  if (passwordForm.newPassword.length < 6) {
    showToast('新密码长度不能少于 6 位', 'error')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast('两次输入的新密码不一致', 'error')
    return
  }
  changingPassword.value = true
  try {
    const res = await http.put('/api/auth/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    if (res.success && res.data) {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      showToast('密码修改成功，安全凭据已更新', 'success')
      profileModalOpen.value = false
    } else {
      showToast(res.message || '密码修改失败', 'error')
    }
  } catch (e) {
    showToast('网络异常: ' + e.message, 'error')
  } finally {
    changingPassword.value = false
  }
}

async function handleForcedPasswordChange() {
  if (forcePasswordForm.newPassword.length < 6) {
    showToast('新密码长度不能少于 6 位', 'error')
    return
  }
  if (forcePasswordForm.newPassword !== forcePasswordForm.confirmPassword) {
    showToast('两次输入的新密码不一致', 'error')
    return
  }
  forcingPassword.value = true
  try {
    const res = await http.put('/api/auth/password', {
      newPassword: forcePasswordForm.newPassword
    })
    if (res.success && res.data) {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      showToast('密码设置成功，账号已激活！欢迎使用平台', 'success')
    } else {
      showToast(res.message || '密码设置失败', 'error')
    }
  } catch (e) {
    showToast('网络异常: ' + e.message, 'error')
  } finally {
    forcingPassword.value = false
  }
}
const agentAssetTotal = computed(() => Number(stats.value.totalAgents || pageResult.value.total || agents.value.length || 0))
const runningAgentTotal = computed(() => Number(stats.value.runningAgents || 0))
const totalTokens = computed(() => Number(stats.value.promptTokens || 0) + Number(stats.value.completionTokens || 0))
const promptShare = computed(() => totalTokens.value ? Math.round(Number(stats.value.promptTokens || 0) * 1000 / totalTokens.value) / 10 : 0)
const completionShare = computed(() => totalTokens.value ? Math.round((100 - promptShare.value) * 10) / 10 : 0)

function formatToken(value) {
  const n = Number(value || 0)
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
function formatCny(value) {
  const n = Number(value || 0)
  if (n === 0) return '¥0.00'
  if (n < 0.01) return '¥' + n.toFixed(4)
  return '¥' + n.toFixed(2)
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
  try {
    await http.del('/api/auth/session')
  } catch (err) {
    console.warn('Logout request error:', err)
  }
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('csrf_token')
  showToast('已安全退出登录', 'info', 1000)
  setTimeout(() => {
    window.location.href = '/login'
  }, 100)
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

function setScope(sc) {
  scopeFilter.value = sc
  page.value = 1
  loadAgents()
}

function isMyAgent(agent) {
  if (!agent) return false
  if (agent.isSystem) return false
  const currentUserId = user.value?.id
  const currentUsername = user.value?.username
  if (agent.ownerId && currentUserId) return agent.ownerId === currentUserId
  if (agent.ownerUsername && currentUsername) return agent.ownerUsername === currentUsername
  return false
}

function canManageAgent(agent) {
  if (!agent) return false
  if (isSuperAdmin.value) return true
  if (user.value?.role === 'VIEWER') return false
  if (agent.isSystem) return false
  return isMyAgent(agent)
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

watch(() => route.query.tab, (newTab) => {
  const tabValue = Array.isArray(newTab) ? newTab[0] : newTab
  if (!tabValue) return
  const target = tabValue === 'open-platform' ? 'security' : tabValue
  if (validTabs.includes(target) && target !== currentTab.value) {
    currentTab.value = target
  }
})

watch(currentTab, (tab) => {
  if ((tab === 'gateway' || tab === 'users') && !isSuperAdmin.value) {
    showToast('无权限访问该模块，已自动返回概览', 'error')
    currentTab.value = 'overview'
    return
  }
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } }).catch(() => {})
  }
  nextTick(() => {
    triggerTabRefresh(tab)
  })
})

async function loadStats() {
  const res = await http.get('/api/dashboard/stats', { range: timeRange.value })
  if (res.success) {
    stats.value = res.data || {}
    await nextTick()
    renderCharts()
  }
}

let agentReqSeq = 0
async function loadAgents() {
  const seq = ++agentReqSeq
  agentsLoading.value = true
  try {
    const res = await http.get('/api/agents', {
      keyword: keyword.value ? keyword.value.trim() : undefined,
      category: category.value !== '全部' ? category.value : undefined,
      status: statusFilter.value || undefined,
      scope: scopeFilter.value || 'all',
      page: page.value || 1,
      size: 6
    })
    if (seq !== agentReqSeq) return

    const data = res && res.data
    const list = Array.isArray(data)
      ? data
      : (data?.records || data?.content || data?.items || [])
    const ok = res && (res.success === true || list.length > 0 || data?.total != null)

    if (ok && data) {
      agents.value = list
      pageResult.value = Array.isArray(data)
        ? { total: list.length, page: 1, totalPages: 1, records: list }
        : data

      if (pageResult.value.totalPages && page.value > pageResult.value.totalPages) {
        page.value = pageResult.value.totalPages
        loadAgents()
        return
      }
    } else {
      console.warn('获取智能体列表未返回成功状态:', res?.message)
      if (!agents.value.length) {
        agents.value = []
        pageResult.value = {}
      }
    }
  } catch (err) {
    if (seq !== agentReqSeq) return
    console.error('loadAgents error:', err)
    if (!agents.value.length) {
      agents.value = []
      pageResult.value = {}
    }
  } finally {
    if (seq === agentReqSeq) {
      agentsLoading.value = false
    }
  }
}

async function loadTemplates() {
  const res = await http.get('/api/agent-templates')
  if (res.success) templates.value = res.data || []
}

async function loadGatewayRoute() {
  const res = await http.get('/api/model-gateway/active-route')
  if (!res.success || !res.data) return
  routedChannel.value = res.data.channel || ''
  routedModel.value = res.data.model || ''
}

function refresh() {
  loadStats()
  loadAgents()
  loadGatewayRoute()
}

function emptyForm() {
  Object.assign(form, { id: '', name: '', code: '', category: '通用智能', modelName: routedModel.value || '', avatar: '🤖', temperature: 0.7, status: 'RUNNING', systemPrompt: '', description: '', tagsText: '' })
}

function openCreate() {
  emptyForm()
  agentModalOpen.value = true
}

function openEdit(agent) {
  Object.assign(form, {
    id: agent.id, name: agent.name, code: agent.code, category: agent.category || '通用智能',
    modelName: routedModel.value || agent.modelName || '', avatar: agent.avatar || '🤖',
    temperature: agent.temperature != null ? agent.temperature : 0.7,
    status: agent.status || 'RUNNING', systemPrompt: agent.systemPrompt || '',
    description: agent.description || '', tagsText: (agent.tags || []).join(', ')
  })
  agentModalOpen.value = true
}

function onUseTemplateFromPanel(t) {
  if (!t) return
  emptyForm()
  form.name = t.name || ''
  form.code = 'agent_' + (t.name || 'bot').toLowerCase().replace(/[^a-z0-9]/gi, '_')
  form.category = t.category || '通用智能'
  form.modelName = routedModel.value || ''
  form.systemPrompt = t.systemPrompt || ''
  form.description = t.description || ''
  form.temperature = t.temperature != null ? t.temperature : 0.7
  form.avatar = t.avatar || '🤖'
  form.tagsText = Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || '')
  agentModalOpen.value = true
}

function applyTemplate(val) {
  if (!val) return
  const t = templates.value.find(item => item.id === val || item.name === val) || templates.value[Number(val)]
  if (!t) return
  form.name = t.name || ''
  form.code = 'agent_' + (t.name || 'bot').toLowerCase().replace(/[^a-z0-9]/gi, '_')
  form.category = t.category || '通用智能'
  form.modelName = routedModel.value || ''
  form.systemPrompt = t.systemPrompt || ''
  form.description = t.description || ''
  form.temperature = t.temperature != null ? t.temperature : 0.7
  form.avatar = t.avatar || '🤖'
  form.tagsText = Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || '')
}

async function saveAgent() {
  saving.value = true
  const payload = {
    name: form.name.trim(), code: form.code.trim(), avatar: form.avatar, category: form.category,
    modelName: routedModel.value || form.modelName, temperature: form.temperature, status: form.status,
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

const copying = ref(false)

async function copyAgent(agent) {
  if (!agent?.id || copying.value) return
  copying.value = true
  try {
    const res = await http.post(`/api/agents/${agent.id}/copy`)
    if (res.success) {
      showToast(`已成功复制智能体「${res.data?.name || agent.name}」，已存入您的个人专属资产`, 'success')
      refresh()
    } else {
      showToast(res.message || '复制智能体失败', 'error')
    }
  } catch (err) {
    showToast('复制失败: ' + (err.message || '网络错误'), 'error')
  } finally {
    copying.value = false
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

function enterDashboard() {
  if (currentTab.value === 'agents') {
    loadStats()
    loadGatewayRoute()
    loadAgents()
    return
  }
  nextTick(() => {
    triggerTabRefresh(currentTab.value)
  })
}

onMounted(() => {
  http.get('/api/auth/me').then(res => {
    if (res.success && res.data) {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      if ((currentTab.value === 'gateway' || currentTab.value === 'users') && !isSuperAdmin.value) {
        currentTab.value = 'overview'
      }
    }
  }).catch(() => {})

  enterDashboard()
})

const skipNextActivate = ref(true)
onActivated(() => {
  if (skipNextActivate.value) {
    skipNextActivate.value = false
    return
  }
  if (currentTab.value === 'agents') {
    loadStats()
    loadAgents()
  }
})
</script>
