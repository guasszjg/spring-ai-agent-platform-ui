<template>
  <div class="sec-page">
    <div class="users-header-row">
      <div class="users-title-group">
        <div class="users-title-badge-row">
          <h2>{{ headerTitle }}</h2>
          <span class="users-title-pill">OPEN &amp; GUARD</span>
        </div>
        <p class="users-subtitle">{{ headerSubtitle }}</p>
      </div>
      <div class="users-header-actions">
        <button class="btn-users-refresh" title="刷新" :disabled="loading" @click="loadAll">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <div class="sec-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="sec-tab"
        :class="{ active: innerTab === tab.id }"
        @click="innerTab = tab.id"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.name }}</span>
      </button>
    </div>

    <!-- Overview -->
    <section v-show="innerTab === 'overview'">
      <div class="users-metrics-grid">
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-total"><i class="fa-solid fa-bolt"></i></div>
          <div class="metric-info">
            <span class="metric-label">今日开放调用</span>
            <span class="metric-value">{{ overview.openCallsToday || 0 }}</span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box" style="background: rgba(244,63,94,.12); color: var(--accent-rose);">
            <i class="fa-solid fa-ban"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">今日拒绝</span>
            <span class="metric-value">{{ overview.deniedToday || 0 }}</span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-admin"><i class="fa-solid fa-key"></i></div>
          <div class="metric-info">
            <span class="metric-label">有效凭证</span>
            <span class="metric-value">{{ overview.activeKeys || 0 }}</span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-dev"><i class="fa-solid fa-mobile-screen"></i></div>
          <div class="metric-info">
            <span class="metric-label">活跃终端</span>
            <span class="metric-value">{{ overview.activeClients || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="sec-split">
        <div class="table-view-card">
          <div class="sec-card-head">
            <h3><i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i> 最近高风险事件</h3>
            <button class="btn-filter-pill" @click="innerTab = 'audit'">查看审计 →</button>
          </div>
          <div v-if="!(overview.recentHighRisk || []).length" class="sec-empty">暂无高风险事件</div>
          <div v-for="ev in (overview.recentHighRisk || []).slice(0, 8)" :key="ev.id" class="sec-event-row">
            <span class="sec-risk-dot high"></span>
            <div>
              <div class="sec-event-action">{{ ev.action }}</div>
              <div class="sec-event-meta">{{ ev.reasonCode || ev.result }} · {{ formatTime(ev.occurredAt) }}</div>
            </div>
          </div>
        </div>
        <div class="table-view-card sec-pad">
          <div class="sec-card-head" style="padding: 0;">
            <h3><i class="fa-solid fa-power-off" style="color: var(--accent-rose);"></i> 紧急停用</h3>
          </div>
          <p class="sec-help">开启后立即拒绝该范围下全部开放 API 调用，管理台不受影响。</p>
          <label class="sec-switch-row">
            <span>Kill Switch</span>
            <button type="button" class="sec-switch" :class="{ on: policy.killSwitch }" :disabled="isViewer" @click="toggleKillSwitch">
              <span class="sec-switch-knob"></span>
            </button>
          </label>
          <div class="sec-help" style="margin-top: 16px;">终端策略：{{ policyLabel(policy.clientPolicy) }}</div>
        </div>
      </div>
    </section>

    <!-- Keys -->
    <section v-show="innerTab === 'keys'" class="sec-block">
      <div class="users-toolbar">
        <div class="users-search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="keyQuery" class="users-search-input" placeholder="搜索名称、前缀或账号...">
        </div>
        <button v-if="!isViewer" class="btn-create-user" @click="openCreateKey">
          <i class="fa-solid fa-plus"></i><span>签发凭证</span>
        </button>
      </div>
      <div class="table-view-card users-table-card">
        <div v-if="loading && !keys.length" class="users-loading-state">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>加载开放凭证...</span>
        </div>
        <div v-else-if="!filteredKeys.length" class="users-empty-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-key"></i></div>
          <h4>{{ keys.length ? '没有匹配的开放凭证' : '还没有开放凭证' }}</h4>
          <p>{{ keys.length ? '可尝试更换名称、前缀或账号关键词' : '签发后第三方即可调用 /open/v1，明文仅显示一次' }}</p>
        </div>
        <table v-else class="agent-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>所属账号</th>
              <th>前缀</th>
              <th>权限</th>
              <th>智能体范围</th>
              <th>状态</th>
              <th>最近使用</th>
              <th style="text-align:right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in pagedKeys" :key="k.id">
              <td>
                <div class="sec-name">{{ k.name }}</div>
                <div class="sec-muted">{{ k.migrated ? '由智能体 Key 迁入' : '开发者凭证' }}</div>
              </td>
              <td>{{ accountLabel(k) }}</td>
              <td><code class="sec-code">{{ k.keyPrefix }}…</code></td>
              <td>
                <span v-for="s in (k.scopes || []).slice(0, 3)" :key="s" class="sec-chip">{{ scopeName(s) }}</span>
                <span v-if="(k.scopes || []).length > 3" class="sec-muted">+{{ k.scopes.length - 3 }}</span>
              </td>
              <td>{{ (k.agentScope || []).length ? k.agentScope.length + ' 个' : '全部可运行' }}</td>
              <td><span class="sec-status" :class="'st-' + (k.status || '').toLowerCase()">{{ statusLabel(k.status) }}</span></td>
              <td>{{ k.lastUsedAt ? formatTime(k.lastUsedAt) : '—' }}</td>
              <td style="text-align:right;">
                <div v-if="!isViewer" class="agent-actions sec-row-actions">
                  <button v-if="k.status === 'ACTIVE'" class="btn-card-action btn-action-icon" title="停用" @click="setKeyStatus(k, 'DISABLED')"><i class="fa-solid fa-pause"></i></button>
                  <button v-else-if="k.status === 'DISABLED'" class="btn-card-action btn-action-icon" title="启用" @click="setKeyStatus(k, 'ACTIVE')"><i class="fa-solid fa-play"></i></button>
                  <button v-if="k.status !== 'REVOKED'" class="btn-card-action btn-action-icon btn-action-danger" title="吊销" @click="setKeyStatus(k, 'REVOKED')"><i class="fa-solid fa-ban"></i></button>
                  <button class="btn-card-action btn-action-icon btn-action-danger" title="删除凭证" @click="askDelete('key', k)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <section v-if="filteredKeys.length" class="pagination-container">
        <div class="page-summary">共 {{ filteredKeys.length }} 个凭证 · 第 {{ keyPage }} / {{ keyTotalPages }} 页</div>
        <div class="pagination-controls">
          <button class="btn-page" :disabled="keyPage <= 1" @click="keyPage--"><i class="fa-solid fa-chevron-left"></i></button>
          <button v-for="n in pageNumbers(keyTotalPages, keyPage)" :key="'k'+n" class="btn-page" :class="{ active: n === keyPage }" @click="keyPage = n">{{ n }}</button>
          <button class="btn-page" :disabled="keyPage >= keyTotalPages" @click="keyPage++"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </section>
    </section>

    <!-- Clients -->
    <section v-show="innerTab === 'clients'" class="sec-block">
      <div class="users-toolbar">
        <div class="users-search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="clientQuery" class="users-search-input" placeholder="搜索标识、标签、类型或账号...">
        </div>
        <div class="users-filter-group">
          <select v-model="clientFilter" class="users-select-filter">
            <option value="">全部状态</option>
            <option value="ACTIVE">启用</option>
            <option value="PENDING">待审批</option>
            <option value="DISABLED">停用</option>
          </select>
          <button v-if="!isViewer" class="btn-create-user" @click="openCreateClient">
            <i class="fa-solid fa-plus"></i><span>登记终端</span>
          </button>
        </div>
      </div>
      <div class="table-view-card users-table-card">
          <div v-if="!filteredClients.length" class="users-empty-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-mobile-screen"></i></div>
          <h4>{{ clients.length ? '没有匹配的接入终端' : '尚未登记接入终端' }}</h4>
          <p>{{ clients.length ? '可尝试更换关键词或状态筛选' : '护栏策略可设为强制校验 SN / MAC，未知设备将按策略拦截或待审批' }}</p>
        </div>
        <table v-else class="agent-table">
          <thead>
            <tr>
              <th>标识</th>
              <th>所属账号</th>
              <th>类型</th>
              <th>标签</th>
              <th>状态</th>
              <th>最近活跃</th>
              <th style="text-align:right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in pagedClients" :key="c.id">
              <td><code class="sec-code">{{ c.clientId }}</code></td>
              <td>{{ accountLabel(c) }}</td>
              <td>{{ c.clientType }}</td>
              <td>{{ c.label || '—' }}</td>
              <td><span class="sec-status" :class="'st-' + (c.status || '').toLowerCase()">{{ statusLabel(c.status) }}</span></td>
              <td>{{ c.lastSeenAt ? formatTime(c.lastSeenAt) : '—' }}</td>
              <td style="text-align:right;">
                <div v-if="!isViewer" class="agent-actions sec-row-actions">
                  <button v-if="c.status === 'PENDING'" class="btn-card-action btn-chat-primary" title="批准启用" @click="setClientStatus(c, 'ACTIVE')">批准</button>
                  <button v-if="c.status === 'ACTIVE'" class="btn-card-action btn-action-icon" title="停用" @click="setClientStatus(c, 'DISABLED')"><i class="fa-solid fa-pause"></i></button>
                  <button v-else-if="c.status === 'DISABLED'" class="btn-card-action btn-action-icon" title="启用" @click="setClientStatus(c, 'ACTIVE')"><i class="fa-solid fa-play"></i></button>
                  <button v-if="c.status === 'PENDING'" class="btn-card-action btn-action-icon" title="拒绝并停用" @click="setClientStatus(c, 'DISABLED')"><i class="fa-solid fa-ban"></i></button>
                  <button class="btn-card-action btn-action-icon btn-action-danger" title="删除终端" @click="askDelete('client', c)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <section v-if="filteredClients.length" class="pagination-container">
        <div class="page-summary">共 {{ filteredClients.length }} 个终端 · 第 {{ clientPage }} / {{ clientTotalPages }} 页</div>
        <div class="pagination-controls">
          <button class="btn-page" :disabled="clientPage <= 1" @click="clientPage--"><i class="fa-solid fa-chevron-left"></i></button>
          <button v-for="n in pageNumbers(clientTotalPages, clientPage)" :key="'c'+n" class="btn-page" :class="{ active: n === clientPage }" @click="clientPage = n">{{ n }}</button>
          <button class="btn-page" :disabled="clientPage >= clientTotalPages" @click="clientPage++"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </section>
    </section>

    <!-- Policy -->
    <section v-show="innerTab === 'policy'">
      <div class="sec-policy-grid" :class="{ 'sec-readonly': isViewer }">
        <div class="table-view-card sec-pad">
          <h3 class="sec-block-title">终端管控</h3>
          <div class="role-selector-radios">
            <label v-for="opt in clientPolicyOptions" :key="opt.id" class="role-radio-card" :class="{ selected: policy.clientPolicy === opt.id }">
              <input v-model="policy.clientPolicy" type="radio" :value="opt.id" :disabled="isViewer">
              <div class="radio-card-content">
                <div class="radio-title-row"><span class="radio-title">{{ opt.name }}</span></div>
                <p class="radio-desc">{{ opt.desc }}</p>
              </div>
            </label>
          </div>
        </div>
        <div class="table-view-card sec-pad">
          <h3 class="sec-block-title">限流与长度</h3>
          <div class="form-item">
            <label class="form-label">默认 RPM</label>
            <input v-model.number="policy.defaultRpm" type="number" min="1" class="modal-input" :disabled="isViewer">
          </div>
          <div class="form-item">
            <label class="form-label">最大输入字符</label>
            <input v-model.number="policy.maxInputChars" type="number" min="256" class="modal-input" :disabled="isViewer">
          </div>
          <div class="form-item">
            <label class="form-label">允许时段（如 08:00-22:00，空则不限）</label>
            <input v-model="policy.allowedHours" class="modal-input" placeholder="留空表示全天" :disabled="isViewer">
          </div>
        </div>
        <div class="table-view-card sec-pad">
          <h3 class="sec-block-title">内容护栏</h3>
          <label class="custom-checkbox-row"><input v-model="policy.piiMask" type="checkbox" :disabled="isViewer"><span class="checkbox-text">PII 脱敏</span></label>
          <label class="custom-checkbox-row"><input v-model="policy.outputGuard" type="checkbox" :disabled="isViewer"><span class="checkbox-text">输出复检</span></label>
          <div class="form-item" style="margin-top:12px;">
            <label class="form-label">敏感词（逗号分隔）</label>
            <textarea v-model="sensitiveText" class="modal-input" rows="3" placeholder="例如：违禁词A, 违禁词B" :disabled="isViewer"></textarea>
          </div>
          <div class="form-item">
            <label class="form-label">命中动作</label>
            <select v-model="policy.sensitiveAction" class="form-control-styled" :disabled="isViewer">
              <option value="BLOCK">拦截</option>
              <option value="MASK">脱敏</option>
              <option value="LOG">仅记录</option>
            </select>
          </div>
        </div>
      </div>
      <div v-if="!isViewer" class="sec-save-bar">
        <button type="button" class="btn-create-agent" :disabled="savingPolicy" @click="savePolicy">
          <i :class="savingPolicy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'"></i>
          <span>{{ savingPolicy ? '保存中...' : '保存并立即生效' }}</span>
        </button>
      </div>
    </section>

    <!-- Audit -->
    <section v-show="innerTab === 'audit'" class="sec-block">
      <div class="table-view-card users-table-card">
        <div v-if="!auditEvents.length" class="users-empty-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-clipboard-list"></i></div>
          <h4>暂无审计记录</h4>
          <p>开放调用、凭证签发与策略变更会按发生时间出现在这里</p>
        </div>
        <table v-else class="agent-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>动作</th>
              <th>结果</th>
              <th>原因</th>
              <th>资源</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in auditEvents" :key="ev.id">
              <td>{{ formatTime(ev.occurredAt) }}</td>
              <td>{{ ev.action }}</td>
              <td><span class="sec-status" :class="'st-' + (ev.result || '').toLowerCase()">{{ statusLabel(ev.result) }}</span></td>
              <td>{{ ev.reasonCode || '—' }}</td>
              <td>{{ ev.resourceType }} {{ ev.resourceId || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <section v-if="auditPageResult.total" class="pagination-container">
        <div class="page-summary">共 {{ auditPageResult.total }} 条 · 第 {{ auditPage }} / {{ Math.max(1, auditPageResult.totalPages || 1) }} 页</div>
        <div class="pagination-controls">
          <button class="btn-page" :disabled="auditPage <= 1" @click="changeAuditPage(-1)"><i class="fa-solid fa-chevron-left"></i></button>
          <button v-for="n in pageNumbers(Math.max(1, auditPageResult.totalPages || 1), auditPage)" :key="'a'+n" class="btn-page" :class="{ active: n === auditPage }" @click="auditPage = n; loadAudit()">{{ n }}</button>
          <button class="btn-page" :disabled="auditPage >= (auditPageResult.totalPages || 1)" @click="changeAuditPage(1)"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </section>
    </section>

    <!-- Identity -->
    <section v-show="innerTab === 'identity'">
      <div class="sec-split">
        <div class="table-view-card" v-if="isSuperAdmin">
          <div class="sec-card-head">
            <h3>对接通道</h3>
            <button class="btn-create-user" @click="openProviderModal"><i class="fa-solid fa-plus"></i><span>新建</span></button>
          </div>
          <div v-if="!providers.length" class="users-empty-state">
            <div class="empty-icon-wrap"><i class="fa-solid fa-plug"></i></div>
            <h4>尚未配置第三方</h4>
            <p>创建开发者时可按通道出站开户或绑定</p>
          </div>
          <div v-for="p in providers" :key="p.id" class="sec-provider-row">
            <div>
              <div class="sec-name">{{ p.name }}</div>
              <div class="sec-muted">{{ p.code }} · {{ directionLabel(p.direction) }} · {{ p.enabled ? '启用' : '停用' }}</div>
            </div>
            <div class="agent-actions sec-row-actions">
              <button class="btn-card-action" @click="probeProvider(p)">探测</button>
              <button class="btn-card-action" @click="editProvider(p)">编辑</button>
              <button class="btn-card-action btn-action-icon btn-action-danger" title="删除通道" @click="askDelete('provider', p)"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </div>
        </div>
        <div class="table-view-card">
          <div class="sec-card-head">
            <h3>账号绑定</h3>
            <button v-if="!isViewer" class="btn-create-user" @click="openBindModal"><i class="fa-solid fa-link"></i><span>绑定</span></button>
          </div>
          <div v-if="!identities.length" class="users-empty-state">
            <div class="empty-icon-wrap"><i class="fa-solid fa-link"></i></div>
            <h4>还没有外部账号绑定</h4>
            <p>可手动登记，或在创建开发者时按通道自动开户</p>
          </div>
          <div v-for="item in identities" :key="item.id" class="sec-provider-row">
            <div>
              <div class="sec-name">{{ item.displayName || item.externalId }}</div>
              <div class="sec-muted">{{ item.providerCode }} · {{ item.bindSource }} · {{ statusLabel(item.status) }}</div>
              <div v-if="item.lastSyncError" class="sec-error">{{ item.lastSyncError }}</div>
            </div>
            <div class="agent-actions sec-row-actions">
              <button v-if="item.status !== 'ACTIVE'" class="btn-card-action" @click="syncIdentity(item)">同步</button>
              <button class="btn-card-action btn-action-danger" @click="askDelete('identity', item)">解绑</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Create Key Modal -->
  <div v-if="keyModalOpen" class="modal-backdrop open" @click.self="keyModalOpen = false">
    <div class="modal-dialog" style="max-width: 680px;">
      <form @submit.prevent="createKey">
        <div class="modal-header">
          <h3><i class="fa-solid fa-key"></i> 签发开放凭证</h3>
          <button type="button" class="btn-modal-close" @click="keyModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">名称</label>
            <input v-model="keyForm.name" class="modal-input" required placeholder="例如：生产-设备网关">
          </div>
          <div class="form-item">
            <label class="form-label">权限范围</label>
            <p class="sec-muted" style="margin: 0 0 8px;">决定第三方用这把 Key 能做什么。目前开放接口只校验「对话」；其余勾上等于预授权。</p>
            <div class="sec-scope-grid">
              <label v-for="s in scopeOptions" :key="s.id" class="sec-scope-card" :class="{ selected: keyForm.scopes.includes(s.id) }">
                <input type="checkbox" :value="s.id" v-model="keyForm.scopes">
                <div>
                  <div class="sec-scope-name">{{ s.name }} <code>{{ s.id }}</code></div>
                  <div class="sec-muted">{{ s.desc }}</div>
                </div>
              </label>
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">{{ isSuperAdmin ? '智能体范围（必选）' : '智能体范围' }}</label>
            <p class="sec-muted" style="margin: 0 0 8px;">
              {{ isSuperAdmin ? '必须指定第三方能调用的智能体。' : '不选则该开发者可运行的全部智能体都能用这把 Key。' }}
            </p>
            <div class="sec-agent-picker">
              <div class="sec-agent-toolbar">
                <div class="users-search-box" style="width: auto; flex: 1;">
                  <i class="fa-solid fa-magnifying-glass search-icon"></i>
                  <input v-model="agentPickerQuery" class="users-search-input" placeholder="搜索名称或标识...">
                </div>
                <button type="button" class="btn-secondary" @click="selectFilteredAgents">全选筛选</button>
                <button type="button" class="btn-secondary" @click="keyForm.agentScope = []">清空</button>
              </div>
              <div v-if="selectedAgents.length" class="sec-agent-chips">
                <button
                  v-for="a in visibleSelectedAgents"
                  :key="a.id"
                  type="button"
                  class="sec-chip sec-chip-action"
                  :title="'移除 ' + a.name"
                  @click="toggleAgent(a.id)"
                >
                  {{ a.name }} <i class="fa-solid fa-xmark"></i>
                </button>
                <span v-if="selectedAgents.length > 6" class="sec-muted">还有 {{ selectedAgents.length - 6 }} 个</span>
              </div>
              <div v-else class="sec-agent-empty-hint">{{ isSuperAdmin ? '尚未选择智能体' : '未选择，将覆盖该开发者可运行的全部智能体' }}</div>
              <div class="sec-agent-list">
                <label v-for="a in pagedPickerAgents" :key="a.id" class="sec-agent-row" :class="{ selected: keyForm.agentScope.includes(a.id) }">
                  <input type="checkbox" :value="a.id" v-model="keyForm.agentScope">
                  <span class="sec-name">{{ a.name }}</span>
                  <span class="sec-muted">{{ a.code || a.category || '' }}</span>
                </label>
                <div v-if="!filteredPickerAgents.length" class="sec-empty">没有匹配的智能体</div>
              </div>
              <div v-if="filteredPickerAgents.length" class="sec-agent-pager">
                <span>共 {{ filteredPickerAgents.length }} 个 · 第 {{ agentPickerPage }} / {{ agentPickerTotalPages }} 页</span>
                <div class="pagination-controls">
                  <button type="button" class="btn-page" :disabled="agentPickerPage <= 1" @click="agentPickerPage--"><i class="fa-solid fa-chevron-left"></i></button>
                  <button type="button" class="btn-page" :disabled="agentPickerPage >= agentPickerTotalPages" @click="agentPickerPage++"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="keyModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent" :disabled="savingKey">
            <i :class="savingKey ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-key'"></i>
            <span>{{ savingKey ? '签发中...' : '确认签发' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="plaintextModal.open" class="modal-backdrop open">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3><i class="fa-solid fa-lock"></i> 请立即保存密钥</h3>
      </div>
      <div class="modal-body">
        <p class="sec-help">明文只显示一次，关闭后无法再查看。</p>
        <code class="sec-plaintext">{{ plaintextModal.value }}</code>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="plaintextModal.open = false">我已保存</button>
        <button type="button" class="btn-create-agent" @click="copyPlaintext">
          <i class="fa-regular fa-copy"></i>
          <span>复制密钥</span>
        </button>
      </div>
    </div>
  </div>

  <div v-if="clientModalOpen" class="modal-backdrop open" @click.self="clientModalOpen = false">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>登记接入终端</h3>
        <button class="btn-modal-close" @click="clientModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form class="modal-body" @submit.prevent="saveClient">
        <div class="form-item">
          <label class="form-label">类型</label>
          <select v-model="clientForm.clientType" class="form-control-styled">
            <option>SN</option>
            <option>MAC</option>
            <option>IMEI</option>
            <option>APP_ID</option>
            <option>CUSTOM_KEY</option>
          </select>
        </div>
        <div class="form-item">
          <label class="form-label">标识</label>
          <input v-model="clientForm.clientId" class="modal-input" required>
        </div>
        <div class="form-item">
          <label class="form-label">标签</label>
          <input v-model="clientForm.label" class="modal-input" placeholder="深圳门店-3号广告机">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="clientModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent">
            <i class="fa-solid fa-check"></i>
            <span>保存</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="providerModalOpen" class="modal-backdrop open" @click.self="providerModalOpen = false">
    <div class="modal-dialog" style="max-width: 640px;">
      <div class="modal-header">
        <h3>对接通道</h3>
        <button class="btn-modal-close" @click="providerModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form class="modal-body" @submit.prevent="saveProvider">
        <div class="form-item"><label class="form-label">Code</label><input v-model="providerForm.code" class="modal-input" required placeholder="iot_platform"></div>
        <div class="form-item"><label class="form-label">名称</label><input v-model="providerForm.name" class="modal-input" required></div>
        <div class="form-item"><label class="form-label">方向</label>
          <select v-model="providerForm.direction" class="form-control-styled">
            <option value="OUTBOUND">出站（我们调对方）</option>
            <option value="INBOUND">入站</option>
            <option value="BIDIRECTIONAL">双向</option>
          </select>
        </div>
        <div class="form-item"><label class="form-label">Base URL</label><input v-model="providerForm.baseUrl" class="modal-input" placeholder="https://partner.example.com"></div>
        <div class="form-item"><label class="form-label">调用密钥（只写）</label><input v-model="providerForm.credential" class="modal-input" type="password" placeholder="留空表示不修改"></div>
        <div class="form-item"><label class="form-label">创建用户时</label>
          <select v-model="providerForm.onUserCreated" class="form-control-styled">
            <option value="OFF">不自动同步</option>
            <option value="CREATE_REMOTE">在对方开户</option>
            <option value="BIND_EXISTING">绑定已有账号</option>
          </select>
        </div>
        <div class="form-item"><label class="form-label">操作模板 JSON</label>
          <textarea v-model="providerForm.operations" class="modal-input" rows="6" spellcheck="false"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="providerModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent">
            <i class="fa-solid fa-check"></i>
            <span>保存</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="bindModalOpen" class="modal-backdrop open" @click.self="bindModalOpen = false">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>绑定外部账号</h3>
        <button class="btn-modal-close" @click="bindModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form class="modal-body" @submit.prevent="bindIdentity">
        <div class="form-item">
          <label class="form-label">通道</label>
          <select v-if="providers.length" v-model="bindForm.provider" class="form-control-styled" required>
            <option v-for="p in providers" :key="p.id" :value="p.code">{{ p.name }}（{{ p.code }}）</option>
          </select>
          <input v-else v-model="bindForm.provider" class="modal-input" required placeholder="iot_platform 或已配置的 code">
        </div>
        <div class="form-item">
          <label class="form-label">方式</label>
          <select v-model="bindForm.mode" class="form-control-styled">
            <option value="MANUAL">仅登记</option>
            <option value="BIND_EXISTING">调用对方绑定</option>
            <option value="CREATE_REMOTE">调用对方开户</option>
          </select>
        </div>
        <div class="form-item" v-if="bindForm.mode !== 'CREATE_REMOTE'">
          <label class="form-label">对方账号 ID</label>
          <input v-model="bindForm.externalId" class="modal-input">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="bindModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent">
            <i class="fa-solid fa-link"></i>
            <span>确定绑定</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="deleteModal.open" class="modal-backdrop open" @click.self="deleteModal.open = false">
    <div class="modal-dialog" style="max-width: 420px;">
      <div class="modal-header">
        <h3 style="color: var(--accent-rose);"><i class="fa-solid fa-triangle-exclamation"></i> {{ deleteModal.title }}</h3>
        <button class="btn-modal-close" @click="deleteModal.open = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p class="sec-help">{{ deleteModal.message }}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="deleteModal.open = false">取消</button>
        <button type="button" class="btn-danger-confirm" :disabled="deleteModal.saving" @click="confirmDelete">
          <i :class="deleteModal.saving ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-trash-can'"></i>
          <span>{{ deleteModal.saving ? '处理中...' : '确认删除' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { accountLabel } from '../composables/useAccountOptions'

const props = defineProps({
  user: { type: Object, default: () => ({}) },
  isSuperAdmin: { type: Boolean, default: false },
  initialTab: { type: String, default: 'overview' }
})

const { showToast } = useToast()
const innerTab = ref(props.initialTab || 'overview')
const isViewer = computed(() => (props.user?.role || '') === 'VIEWER')
const headerTitle = '开放与安全'
const headerSubtitle = '凭证、终端、护栏与审计 · 同一套开放调用边界，开发者只看自己的资产'
const loading = ref(false)

const tabs = [
  { id: 'overview', name: '风险总览', icon: 'fa-solid fa-gauge-high' },
  { id: 'keys', name: '开放凭证', icon: 'fa-solid fa-key' },
  { id: 'clients', name: '接入终端', icon: 'fa-solid fa-mobile-screen' },
  { id: 'policy', name: '护栏策略', icon: 'fa-solid fa-shield-halved' },
  { id: 'audit', name: '审计日志', icon: 'fa-solid fa-list' },
  { id: 'identity', name: '账号对接', icon: 'fa-solid fa-link' }
]

watch(() => props.initialTab, (v) => {
  if (v) innerTab.value = v
})

const overview = ref({})
const keys = ref([])
const keyQuery = ref('')
const keyPage = ref(1)
const clients = ref([])
const clientQuery = ref('')
const clientFilter = ref('')
const clientPage = ref(1)
const PAGE_SIZE = 10
const policy = reactive({
  clientPolicy: 'OFF',
  defaultRpm: 120,
  maxInputChars: 8000,
  allowedHours: '',
  piiMask: false,
  outputGuard: true,
  sensitiveAction: 'BLOCK',
  killSwitch: false,
  sensitiveWords: []
})
const sensitiveText = ref('')
const savingPolicy = ref(false)
const auditEvents = ref([])
const auditPage = ref(1)
const auditPageResult = ref({ total: 0, page: 1, totalPages: 1, size: 10 })
const providers = ref([])
const identities = ref([])
const agents = ref([])
const deleteModal = reactive({ open: false, type: '', item: null, title: '', message: '', saving: false })

const keyModalOpen = ref(false)
const savingKey = ref(false)
const keyForm = reactive({ name: '', scopes: ['chat'], agentScope: [] })
const agentPickerQuery = ref('')
const agentPickerPage = ref(1)
const PICKER_PAGE_SIZE = 8
const selectedAgents = computed(() => agents.value.filter(a => (keyForm.agentScope || []).includes(a.id)))
const visibleSelectedAgents = computed(() => selectedAgents.value.slice(0, 6))
const filteredPickerAgents = computed(() => {
  const q = agentPickerQuery.value.trim().toLowerCase()
  return agents.value.filter(a => !q || (a.name || '').toLowerCase().includes(q) || (a.code || '').toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q))
})
const agentPickerTotalPages = computed(() => Math.max(1, Math.ceil(filteredPickerAgents.value.length / PICKER_PAGE_SIZE)))
const pagedPickerAgents = computed(() => {
  const start = (agentPickerPage.value - 1) * PICKER_PAGE_SIZE
  return filteredPickerAgents.value.slice(start, start + PICKER_PAGE_SIZE)
})

watch(agentPickerQuery, () => { agentPickerPage.value = 1 })
watch(agentPickerTotalPages, (n) => { if (agentPickerPage.value > n) agentPickerPage.value = n })

function toggleAgent(id) {
  const list = keyForm.agentScope || []
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
}

function selectFilteredAgents() {
  const ids = new Set(keyForm.agentScope || [])
  filteredPickerAgents.value.forEach(a => ids.add(a.id))
  keyForm.agentScope = [...ids]
}
const scopeOptions = [
  { id: 'chat', name: '对话', desc: '调用智能体聊天，含多轮和流式。当前已生效。' },
  { id: 'agents:read', name: '读智能体', desc: '查询智能体列表和配置。后续开放。' },
  { id: 'agents:write', name: '写智能体', desc: '创建、修改、发布、停用智能体。后续开放。' },
  { id: 'kb:read', name: '读知识库', desc: '查询知识库、文档、FAQ、检索。后续开放。' },
  { id: 'kb:write', name: '写知识库', desc: '创建知识库、上传文档、维护 FAQ。后续开放。' },
  { id: 'agents:bind_kb', name: '绑定知识库', desc: '给智能体绑定或解绑知识库。后续开放。' },
  { id: 'conversations:read', name: '读会话', desc: '拉取历史会话和消息。后续开放。' },
  { id: 'usage:read', name: '读用量', desc: '查看调用次数和 token 统计。后续开放。' },
  { id: 'clients:write', name: '管终端', desc: '通过 API 维护设备白名单。后续开放。' },
  { id: 'account:read', name: '读账号对接', desc: '查看已绑定的第三方账号。后续开放。' },
  { id: 'account:write', name: '写账号对接', desc: '绑定或解绑第三方账号。后续开放。' }
]

function scopeName(id) {
  return scopeOptions.find(s => s.id === id)?.name || id
}

const plaintextModal = reactive({ open: false, value: '' })

const clientModalOpen = ref(false)
const clientForm = reactive({ clientType: 'SN', clientId: '', label: '' })

const providerModalOpen = ref(false)
const providerForm = reactive({
  id: '',
  code: '',
  name: '',
  direction: 'BIDIRECTIONAL',
  baseUrl: '',
  credential: '',
  onUserCreated: 'OFF',
  operations: '{\n  "create_account": { "method": "POST", "path": "/v1/accounts", "body": { "name": "{{user.nickname}}", "login": "{{user.username}}" } }\n}'
})

const bindModalOpen = ref(false)
const bindForm = reactive({ provider: '', mode: 'MANUAL', externalId: '' })

const clientPolicyOptions = [
  { id: 'OFF', name: '关闭', desc: '不校验终端头' },
  { id: 'LOG_ONLY', name: '只记录', desc: '未知终端放行并记审计' },
  { id: 'ENFORCE', name: '强制', desc: '未登记则拒绝' },
  { id: 'ENFORCE_AUTO_REGISTER', name: '强制并登记', desc: '未知终端进入待审批' }
]

const filteredKeys = computed(() => {
  const q = keyQuery.value.trim().toLowerCase()
  const ownerQ = q.startsWith('@') ? q.slice(1) : q
  return keys.value.filter(k => !q
    || (k.name || '').toLowerCase().includes(q)
    || (k.keyPrefix || '').toLowerCase().includes(q)
    || (k.ownerUsername || '').toLowerCase().includes(ownerQ))
})
const keyTotalPages = computed(() => Math.max(1, Math.ceil(filteredKeys.value.length / PAGE_SIZE)))
const pagedKeys = computed(() => {
  const start = (keyPage.value - 1) * PAGE_SIZE
  return filteredKeys.value.slice(start, start + PAGE_SIZE)
})
const filteredClients = computed(() => {
  const q = clientQuery.value.trim().toLowerCase()
  const ownerQ = q.startsWith('@') ? q.slice(1) : q
  return clients.value.filter(c => {
    if (clientFilter.value && c.status !== clientFilter.value) return false
    if (!q) return true
    return (c.clientId || '').toLowerCase().includes(q)
      || (c.label || '').toLowerCase().includes(q)
      || (c.clientType || '').toLowerCase().includes(q)
      || (c.ownerUsername || '').toLowerCase().includes(ownerQ)
  })
})
const clientTotalPages = computed(() => Math.max(1, Math.ceil(filteredClients.value.length / PAGE_SIZE)))
const pagedClients = computed(() => {
  const start = (clientPage.value - 1) * PAGE_SIZE
  return filteredClients.value.slice(start, start + PAGE_SIZE)
})

watch(keyQuery, () => { keyPage.value = 1 })
watch(clientQuery, () => { clientPage.value = 1 })
watch(clientFilter, () => { clientPage.value = 1 })
watch(keyTotalPages, (n) => { if (keyPage.value > n) keyPage.value = n })
watch(clientTotalPages, (n) => { if (clientPage.value > n) clientPage.value = n })

function pageNumbers(total, current) {
  const pages = []
  let start = Math.max(1, current - 3)
  const end = Math.min(total, start + 6)
  start = Math.max(1, end - 6)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

function policyLabel(v) {
  return clientPolicyOptions.find(o => o.id === v)?.name || v || '关闭'
}

function directionLabel(v) {
  return ({ OUTBOUND: '出站', INBOUND: '入站', BIDIRECTIONAL: '双向' })[v] || v
}

function statusLabel(s) {
  return ({
    ACTIVE: '启用',
    DISABLED: '停用',
    REVOKED: '已吊销',
    PENDING: '待审批',
    SUCCESS: '成功',
    DENIED: '拒绝',
    ERROR: '失败',
    PENDING_SYNC: '待同步',
    SYNC_FAILED: '同步失败'
  })[s] || s || '—'
}

function formatTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).replace('T', ' ').slice(0, 19)
  return d.toLocaleString()
}

async function loadAll() {
  loading.value = true
  try {
    const [ov, ks, cs, pol, idp, ids, ag] = await Promise.all([
      http.get('/api/security/overview'),
      http.get('/api/open-api-keys'),
      http.get('/api/security/clients'),
      http.get('/api/security/policy'),
      http.get('/api/security/identity-providers'),
      http.get('/api/security/identities'),
      http.get('/api/agents', { page: 1, size: 200 })
    ])
    if (ov.success) overview.value = ov.data || {}
    if (ks.success) keys.value = ks.data || []
    if (cs.success) clients.value = cs.data || []
    if (pol.success && pol.data) {
      Object.assign(policy, pol.data)
      sensitiveText.value = (pol.data.sensitiveWords || []).join(', ')
    }
    if (idp.success) providers.value = idp.data || []
    if (ids.success) identities.value = ids.data || []
    if (ag.success) agents.value = ag.data?.records || ag.data?.content || []
    await loadAudit()
  } finally {
    loading.value = false
  }
}

async function loadAudit() {
  const res = await http.get('/api/security/audit-events', { page: auditPage.value, size: 10 })
  if (res.success) {
    auditEvents.value = res.data?.records || res.data?.content || []
    auditPageResult.value = {
      total: res.data?.total || 0,
      page: res.data?.page || auditPage.value,
      totalPages: res.data?.totalPages || 1,
      size: res.data?.size || 10
    }
  }
}

function changeAuditPage(delta) {
  const next = auditPage.value + delta
  const max = Math.max(1, auditPageResult.value.totalPages || 1)
  if (next < 1 || next > max) return
  auditPage.value = next
  loadAudit()
}

async function toggleKillSwitch() {
  if (isViewer.value) return
  policy.killSwitch = !policy.killSwitch
  await savePolicy()
}

async function savePolicy() {
  savingPolicy.value = true
  policy.sensitiveWords = sensitiveText.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  try {
    const res = await http.put('/api/security/policy', { ...policy })
    if (res.success) {
      showToast('策略已推送到运行时', 'success')
      if (res.data) Object.assign(policy, res.data)
    } else showToast(res.message || '保存失败', 'error')
  } finally {
    savingPolicy.value = false
  }
}

function openCreateKey() {
  keyForm.name = ''
  keyForm.scopes = ['chat']
  keyForm.agentScope = []
  agentPickerQuery.value = ''
  agentPickerPage.value = 1
  keyModalOpen.value = true
  loadPickerAgents()
}

async function loadPickerAgents() {
  const res = await http.get('/api/agents', { page: 1, size: 200 })
  if (res.success) agents.value = res.data?.records || res.data?.content || agents.value
}

async function createKey() {
  if (props.isSuperAdmin && !(keyForm.agentScope || []).length) {
    showToast('超级管理员凭证必须限定智能体范围', 'warning')
    return
  }
  savingKey.value = true
  try {
    const res = await http.post('/api/open-api-keys', {
      name: keyForm.name,
      scopes: keyForm.scopes,
      agentScope: keyForm.agentScope
    })
    if (res.success) {
      keyModalOpen.value = false
      plaintextModal.value = res.data?.plaintext || ''
      plaintextModal.open = true
      await loadAll()
    } else showToast(res.message || '签发失败', 'error')
  } finally {
    savingKey.value = false
  }
}

async function setKeyStatus(key, status) {
  const res = await http.put(`/api/open-api-keys/${key.id}/status`, { status })
  if (res.success) {
    showToast('凭证状态已更新', 'success')
    await loadAll()
  } else showToast(res.message || '更新失败', 'error')
}

function copyPlaintext() {
  navigator.clipboard.writeText(plaintextModal.value)
  showToast('已复制', 'success')
}

function openCreateClient() {
  clientForm.clientType = 'SN'
  clientForm.clientId = ''
  clientForm.label = ''
  clientModalOpen.value = true
}

async function saveClient() {
  const res = await http.post('/api/security/clients', { ...clientForm })
  if (res.success) {
    clientModalOpen.value = false
    showToast('终端已登记', 'success')
    await loadAll()
  } else showToast(res.message || '保存失败', 'error')
}

async function setClientStatus(c, status) {
  const res = await http.put(`/api/security/clients/${c.id}/status`, { status })
  if (res.success) {
    const msg = status === 'ACTIVE' ? '终端已启用' : status === 'DISABLED' ? '终端已停用' : '状态已更新'
    showToast(msg, 'success')
    await loadAll()
  } else showToast(res.message || '更新失败', 'error')
}

async function removeClient(c) {
  const res = await http.del(`/api/security/clients/${c.id}`)
  if (res.success) {
    showToast('已删除', 'success')
    await loadAll()
  } else showToast(res.message || '删除失败', 'error')
}

function askDelete(type, item) {
  const copy = {
    key: {
      title: '确认删除凭证',
      message: `删除后密钥 ${item.keyPrefix || ''}… 立即失效，无法恢复。第三方调用将返回无效凭证。`
    },
    client: {
      title: '确认删除终端',
      message: `确定删除接入终端 ${item.clientId || ''} 吗？强制校验开启后，该设备将无法调用开放接口。`
    },
    provider: {
      title: '确认删除对接通道',
      message: `将同时解除该通道下的账号绑定。确定删除「${item.name || item.code}」吗？`
    },
    identity: {
      title: '确认解绑',
      message: `确定解除与 ${item.displayName || item.externalId || '外部账号'} 的绑定吗？`
    }
  }
  Object.assign(deleteModal, { open: true, type, item, saving: false, ...copy[type] })
}

async function confirmDelete() {
  const { type, item } = deleteModal
  if (!item) return
  deleteModal.saving = true
  try {
    if (type === 'key') {
      const res = await http.del(`/api/open-api-keys/${item.id}`)
      if (!res.success) {
        showToast(res.message || '删除失败', 'error')
        return
      }
      showToast('凭证已删除', 'success')
    } else if (type === 'client') {
      await removeClient(item)
      deleteModal.open = false
      return
    } else if (type === 'provider') {
      const res = await http.del(`/api/security/identity-providers/${item.id}`)
      if (!res.success) {
        showToast(res.message || '删除失败', 'error')
        return
      }
      showToast('对接通道已删除', 'success')
    } else if (type === 'identity') {
      await unbindIdentity(item)
      deleteModal.open = false
      return
    }
    deleteModal.open = false
    await loadAll()
  } finally {
    deleteModal.saving = false
  }
}

function openProviderModal() {
  providerForm.id = ''
  providerForm.code = ''
  providerForm.name = ''
  providerForm.credential = ''
  providerModalOpen.value = true
}

function editProvider(p) {
  providerForm.id = p.id
  providerForm.code = p.code
  providerForm.name = p.name
  providerForm.direction = p.direction
  providerForm.baseUrl = p.baseUrl || ''
  providerForm.onUserCreated = p.onUserCreated || 'OFF'
  providerForm.operations = p.operations || '{}'
  providerForm.credential = ''
  providerModalOpen.value = true
}

async function saveProvider() {
  const res = await http.post('/api/security/identity-providers', { ...providerForm })
  if (res.success) {
    providerModalOpen.value = false
    showToast('对接通道已保存', 'success')
    await loadAll()
  } else showToast(res.message || '保存失败', 'error')
}

async function probeProvider(p) {
  const res = await http.post(`/api/security/identity-providers/${p.id}/probe`)
  showToast(res.data?.message || res.message || '完成', res.data?.success ? 'success' : 'error')
}

function openBindModal() {
  bindForm.provider = providers.value[0]?.code || ''
  bindForm.mode = 'MANUAL'
  bindForm.externalId = ''
  bindModalOpen.value = true
}

async function bindIdentity() {
  const res = await http.post('/api/security/identities', { ...bindForm })
  if (res.success) {
    bindModalOpen.value = false
    showToast('绑定已提交', 'success')
    await loadAll()
  } else showToast(res.message || '绑定失败', 'error')
}

async function syncIdentity(item) {
  const res = await http.post(`/api/security/identities/${item.id}/sync`)
  if (res.success) {
    showToast('已同步', 'success')
    await loadAll()
  } else showToast(res.message || '同步失败', 'error')
}

async function unbindIdentity(item) {
  const res = await http.del(`/api/security/identities/${item.id}`)
  if (res.success) {
    showToast('已解绑', 'success')
    await loadAll()
  }
}

onMounted(loadAll)
</script>

<style scoped>
.sec-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.users-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.users-title-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.users-title-badge-row h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.users-title-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(59, 130, 246, 0.22));
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.35);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.users-subtitle {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 6px 0 0 0;
}

.users-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-create-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-hover));
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: all 0.2s ease;
}

.btn-create-user:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
}

.users-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.user-metric-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.user-metric-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.metric-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.metric-icon-total {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.metric-icon-admin {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.metric-icon-dev {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.25);
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.users-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.sec-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.users-search-box {
  display: flex;
  align-items: center;
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  font-size: 0.88rem;
  pointer-events: none;
}

.users-search-input {
  width: 100%;
  padding: 9px 36px 9px 38px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: all 0.2s ease;
}

.users-search-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.users-filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.users-select-filter {
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.86rem;
  outline: none;
  cursor: pointer;
}

.btn-users-refresh {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-users-refresh:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.users-table-card {
  padding: 0;
  overflow: hidden;
}

.users-loading-state,
.users-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  color: var(--text-muted);
  gap: 12px;
}

.users-loading-state i {
  font-size: 2rem;
  color: var(--accent-blue);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-muted);
}

.users-empty-state h4 {
  font-size: 1.05rem;
  color: var(--text-primary);
  margin: 0;
}

.users-empty-state p {
  font-size: 0.85rem;
  margin: 0;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.modal-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
}

.modal-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.custom-checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  margin-right: 16px;
}

.custom-checkbox-row input {
  cursor: pointer;
  accent-color: var(--accent-blue);
  width: 15px;
  height: 15px;
}

.role-selector-radios {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-radio-card:hover {
  border-color: var(--border-hover);
}

.role-radio-card.selected {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
}

.role-radio-card input {
  margin-top: 4px;
  cursor: pointer;
}

.radio-card-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.radio-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.radio-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.sec-pad {
  padding: 18px;
}

.sec-row-actions {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.sec-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.sec-tab {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  transition: background 0.15s ease, color 0.15s ease;
}

.sec-tab:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
}

.sec-tab.active {
  background: rgba(59, 130, 246, 0.16);
  color: var(--text-primary);
  font-weight: 600;
}

.sec-split {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

.sec-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px 0;
  margin-bottom: 4px;
}

.sec-card-head h3,
.sec-block-title {
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
}

.sec-block-title {
  padding: 4px 0 0;
}

.sec-empty,
.sec-empty-cell {
  color: var(--text-muted);
  font-size: 13px;
  padding: 24px 8px;
  text-align: center;
}

.sec-event-row,
.sec-provider-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
}

.sec-provider-row {
  justify-content: space-between;
}

.sec-risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-rose);
  flex-shrink: 0;
}

.sec-event-action {
  font-size: 13px;
  font-weight: 600;
}

.sec-event-meta,
.sec-muted {
  font-size: 12px;
  color: var(--text-muted);
}

.sec-name {
  font-weight: 600;
}

.sec-help {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.sec-error {
  color: var(--accent-rose);
  font-size: 12px;
  margin-top: 4px;
}

.sec-code {
  font-size: 12px;
  background: var(--bg-input);
  padding: 2px 8px;
  border-radius: 6px;
}

.sec-chip {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  margin: 0 4px 4px 0;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
}

.sec-status {
  font-size: 12px;
  font-weight: 600;
}

.st-active,
.st-success {
  color: var(--accent-emerald);
}

.st-disabled,
.st-pending,
.st-pending_sync {
  color: var(--accent-amber);
}

.st-revoked,
.st-denied,
.st-error,
.st-sync_failed {
  color: var(--accent-rose);
}

.sec-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.sec-switch {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 0;
  background: #334155;
  position: relative;
  cursor: pointer;
}

.sec-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sec-switch.on {
  background: var(--accent-rose);
}

.sec-switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: left .2s;
}

.sec-switch.on .sec-switch-knob {
  left: 23px;
}

.sec-policy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.sec-readonly {
  opacity: 0.78;
  pointer-events: none;
}

.sec-save-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.sec-scope-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sec-scope-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.sec-scope-card.selected {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
}

.sec-scope-card input {
  margin-top: 3px;
  accent-color: var(--accent-blue);
}

.sec-scope-name {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sec-scope-name code {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

.sec-agent-picker {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  overflow: hidden;
}

.sec-agent-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}

.sec-agent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px 0;
}

.sec-chip-action {
  cursor: pointer;
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sec-chip-action:hover {
  background: rgba(244, 63, 94, 0.15);
  color: var(--accent-rose);
}

.sec-agent-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  padding: 10px 12px 0;
}

.sec-agent-list {
  padding: 8px;
}

.sec-agent-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}

.sec-agent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.sec-agent-row:hover,
.sec-agent-row.selected {
  background: rgba(59, 130, 246, 0.08);
}

.sec-agent-row .sec-name {
  flex: 1;
}

.sec-agent-row input {
  accent-color: var(--accent-blue);
}

.sec-plaintext {
  display: block;
  word-break: break-all;
  padding: 14px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  font-size: 14px;
}

.btn-danger-confirm {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

@media (max-width: 1100px) {
  .sec-split,
  .sec-policy-grid,
  .users-metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
