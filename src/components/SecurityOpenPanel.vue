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

    <!-- Docs (API Reference & Access Guide) -->
    <section v-show="innerTab === 'docs'" class="sec-block">
      <!-- Quickstart Hero Card -->
      <div class="table-view-card sec-doc-hero">
        <div class="sec-doc-hero-head">
          <div>
            <div class="sec-doc-pill"><i class="fa-solid fa-code"></i> RESTFUL &amp; SSE OPEN API</div>
            <h3 class="sec-doc-title">开发接入文档与接口规范</h3>
            <p class="sec-doc-desc">支持第三方系统、移动端、嵌入式设备及自动化脚本通过标准 HTTP API 调用本平台智能体、知识库及会话能力。</p>
          </div>
          <div class="sec-doc-baseurl-box">
            <span class="sec-doc-baseurl-label">OPEN API BASE URL</span>
            <div class="sec-doc-baseurl-content">
              <code>{{ apiBaseUrl }}</code>
              <button type="button" class="btn-copy-doc" title="复制 Base URL" @click="copyText(apiBaseUrl, 'Base URL')">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Security & Client Headers Callout -->
        <div class="sec-doc-headers-grid">
          <div class="sec-doc-header-card">
            <div class="header-name">Authorization <span class="badge-req">必填</span></div>
            <div class="header-format"><code>Bearer sk-agt-xxxxxxxx</code></div>
            <div class="header-desc">在「开放凭证」标签页签发。由调用方在每个请求的 HTTP Header 中携带。</div>
          </div>
          <div class="sec-doc-header-card">
            <div class="header-name">X-Client-Type <span class="badge-opt" :class="{ 'badge-req': policy.clientPolicy !== 'OFF' }">{{ policy.clientPolicy === 'OFF' ? '可选' : '策略要求' }}</span></div>
            <div class="header-format"><code>SN | MAC | IMEI | APP_ID | CUSTOM_KEY</code></div>
            <div class="header-desc">上报调用终端类型。若护栏开启了终端策略，未登记或类型不符的调用将被阻断。</div>
          </div>
          <div class="sec-doc-header-card">
            <div class="header-name">X-Client-Id <span class="badge-opt" :class="{ 'badge-req': policy.clientPolicy !== 'OFF' }">{{ policy.clientPolicy === 'OFF' ? '可选' : '策略要求' }}</span></div>
            <div class="header-format"><code>DEV-SN-001 / APP-CRM-V2</code></div>
            <div class="header-desc">终端唯一标识号。在「接入终端」标签页完成登记审批后，系统自动赋予放行权限。</div>
          </div>
          <div class="sec-doc-header-card">
            <div class="header-name">X-End-User <span class="badge-opt">推荐</span></div>
            <div class="header-format"><code>user_id / employee_no</code></div>
            <div class="header-desc">终端末端用户标识。透传后可在审计日志、用量统计及安全护栏中实现用户级追踪。</div>
          </div>
        </div>
      </div>

      <!-- Interactive Code Playground -->
      <div class="table-view-card sec-code-card">
        <div class="sec-card-head">
          <div class="code-head-left">
            <i class="fa-solid fa-terminal" style="color: var(--accent-blue);"></i>
            <h3>快速调用示例代码</h3>
            <div class="doc-scenario-tabs">
              <button type="button" class="btn-scenario" :class="{ active: docScenario === 'chat' }" @click="docScenario = 'chat'">1. 智能体对话</button>
              <button type="button" class="btn-scenario" :class="{ active: docScenario === 'kb' }" @click="docScenario = 'kb'">2. 知识库上传与检索</button>
              <button type="button" class="btn-scenario" :class="{ active: docScenario === 'agents' }" @click="docScenario = 'agents'">3. 智能体资产与绑定</button>
            </div>
          </div>
          <div class="code-head-right">
            <div class="doc-lang-tabs">
              <button type="button" class="btn-lang" :class="{ active: docLang === 'curl' }" @click="docLang = 'curl'">cURL</button>
              <button type="button" class="btn-lang" :class="{ active: docLang === 'python' }" @click="docLang = 'python'">Python</button>
              <button type="button" class="btn-lang" :class="{ active: docLang === 'node' }" @click="docLang = 'node'">Node.js</button>
            </div>
            <button type="button" class="btn-copy-code" @click="copyText(activeCodeSnippet, '示例代码')">
              <i class="fa-regular fa-copy"></i>
              <span>复制代码</span>
            </button>
          </div>
        </div>
        <pre class="sec-code-pre"><code>{{ activeCodeSnippet }}</code></pre>
      </div>

      <!-- Complete Open API Directory -->
      <div class="table-view-card sec-api-directory">
        <div class="sec-card-head">
          <h3><i class="fa-solid fa-list-check" style="color: var(--accent-emerald);"></i> 开放接口清单 (API Catalog)</h3>
          <span class="sec-muted">共 6 大分类 17 个端点，全部支持凭证权限校验与多维用量计量</span>
        </div>

        <div class="sec-api-groups">
          <!-- 1. Chat -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-regular fa-comments" style="color: #60a5fa;"></i>
              <span>智能体对话 (Chat Messages)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/chat-messages</span>
                <span class="scope-tag">chat</span>
                <span class="endpoint-desc">发起智能体对话。支持 stream=true (SSE 流式输出) 与 stream=false (单次完整响应)，内置知识库召回增强与敏感词过滤</span>
              </div>
            </div>
          </div>

          <!-- 2. Agents -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-solid fa-robot" style="color: #c084fc;"></i>
              <span>智能体资产管理 (Agents)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/agents</span>
                <span class="scope-tag">agents:read</span>
                <span class="endpoint-desc">分页拉取当前凭证可访问的智能体清单</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/agents/{id}</span>
                <span class="scope-tag">agents:read</span>
                <span class="endpoint-desc">获取指定智能体开放信息（安全脱敏原始系统提示词与第三方模型凭据）</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/agents</span>
                <span class="scope-tag">agents:write</span>
                <span class="endpoint-desc">创建自定义智能体（名称、分类、温度、模型标识等）</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge put">PUT</span>
                <span class="endpoint-path">/agents/{id}</span>
                <span class="scope-tag">agents:write</span>
                <span class="endpoint-desc">更新智能体基础配置及运行参数</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge delete">DELETE</span>
                <span class="endpoint-path">/agents/{id}</span>
                <span class="scope-tag">agents:write</span>
                <span class="endpoint-desc">删除指定的智能体资产</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/agents/{id}/publish</span>
                <span class="scope-tag">agents:write</span>
                <span class="endpoint-desc">发布智能体使其进入 RUNNING 运行就绪状态</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/agents/{id}/pause</span>
                <span class="scope-tag">agents:write</span>
                <span class="endpoint-desc">暂停智能体使其进入 IDLE 闲置下线状态</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/agents/{id}/knowledge-bases</span>
                <span class="scope-tag">agents:read</span>
                <span class="endpoint-desc">获取该智能体已关联绑定的全部私有知识库清单</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge put">PUT</span>
                <span class="endpoint-path">/agents/{id}/knowledge-bases</span>
                <span class="scope-tag">agents:bind_kb</span>
                <span class="endpoint-desc">给智能体批量绑定关联知识库（替换绑定关系）</span>
              </div>
            </div>
          </div>

          <!-- 3. Knowledge Bases -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-solid fa-book-bookmark" style="color: #34d399;"></i>
              <span>企业知识库与 RAG (Knowledge Bases)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/knowledge-bases</span>
                <span class="scope-tag">kb:read</span>
                <span class="endpoint-desc">获取当前租户下的私有知识库列表</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/knowledge-bases</span>
                <span class="scope-tag">kb:write</span>
                <span class="endpoint-desc">创建新的知识库集合</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/knowledge-bases/{id}/documents</span>
                <span class="scope-tag">kb:write</span>
                <span class="endpoint-desc">上传文件切片并向量化 (multipart/form-data，支持 PDF/TXT/MD/DOCX)</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/knowledge-bases/{id}/retrieve</span>
                <span class="scope-tag">kb:read</span>
                <span class="endpoint-desc">执行语义向量检索测试，返回相似度 TopK 文本切片与分值</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/knowledge-bases/{id}/faqs</span>
                <span class="scope-tag">kb:write</span>
                <span class="endpoint-desc">直接录入精准问答对 FAQ</span>
              </div>
            </div>
          </div>

          <!-- 4. Conversations -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-solid fa-clock-rotate-left" style="color: #fbbf24;"></i>
              <span>会话与消息历史 (Conversations)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/conversations</span>
                <span class="scope-tag">conversations:read</span>
                <span class="endpoint-desc">分页拉取该开发者或凭证下的历史对话列表</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/conversations/{id}/messages</span>
                <span class="scope-tag">conversations:read</span>
                <span class="endpoint-desc">获取指定会话的历史上下文消息记录</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge delete">DELETE</span>
                <span class="endpoint-path">/conversations/{id}</span>
                <span class="scope-tag">conversations:read</span>
                <span class="endpoint-desc">删除历史会话及其关联的所有消息</span>
              </div>
            </div>
          </div>

          <!-- 5. Usage & Audit -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-solid fa-chart-pie" style="color: #22d3ee;"></i>
              <span>用量统计与审计事件 (Usage &amp; Audit)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/usage/summary</span>
                <span class="scope-tag">usage:read</span>
                <span class="endpoint-desc">查询指定时间段内的调用总量、Token 消耗、拦截数等事实汇总</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/usage/daily</span>
                <span class="scope-tag">usage:read</span>
                <span class="endpoint-desc">获取多维日级事实聚合记录（智能体、凭证、终端细分）</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/audit/events</span>
                <span class="scope-tag">usage:read</span>
                <span class="endpoint-desc">检索租户安全审计事件流（支持按结果过滤 SUCCESS/DENIED）</span>
              </div>
            </div>
          </div>

          <!-- 6. Account -->
          <div class="api-group-item">
            <div class="api-group-title">
              <i class="fa-solid fa-link" style="color: #f43f5e;"></i>
              <span>账号对接与外部通知 (Account)</span>
            </div>
            <div class="api-endpoints-list">
              <div class="endpoint-row">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/account</span>
                <span class="scope-tag">account:read</span>
                <span class="endpoint-desc">查看当前调用凭证归属的开发者账号详情及权限范围</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/account/bind-identity</span>
                <span class="scope-tag">account:write</span>
                <span class="endpoint-desc">入站绑定外部第三方系统用户标识</span>
              </div>
              <div class="endpoint-row">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/account/webhook</span>
                <span class="scope-tag">无鉴权限制</span>
                <span class="endpoint-desc">接收外部系统回调事件通知（支持 X-Signature 密钥验签）</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Guardrails & Error Dictionary -->
      <div class="table-view-card sec-error-dict">
        <div class="sec-card-head">
          <h3><i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i> 安全护栏与状态码速查字典</h3>
        </div>
        <div class="table-responsive">
          <table class="agent-table">
            <thead>
              <tr>
                <th style="width: 100px;">HTTP 状态</th>
                <th style="width: 190px;">错误码 (code)</th>
                <th>拦截触发场景</th>
                <th>排查与处理建议</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="sec-status st-denied">401</span></td>
                <td><code>unauthorized</code></td>
                <td>未携带 <code>Authorization</code> 头，或 API Key 不存在 / 已被吊销</td>
                <td>在「开放凭证」页面重新签发新 Key，并确认请求头为 <code>Bearer &lt;key&gt;</code> 格式</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>scope_missing</code></td>
                <td>当前使用的 API Key 未勾选该接口所需的权限范围（如 <code>chat</code>、<code>kb:read</code> 等）</td>
                <td>在凭证管理中签发包含对应 Scope 的新密钥</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>agent_not_allowed</code></td>
                <td>当前 Key 配置了智能体范围白名单，且未包含请求中所指定的 <code>agentId</code></td>
                <td>重新签发凭证并勾选该智能体，或让管理员分配该智能体访问权限</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>client_not_allowed</code></td>
                <td>开启了终端强制策略，但请求头中的 <code>X-Client-Id</code> 未在接入终端列表中登记或已被停用</td>
                <td>前往「接入终端」页面登记该设备的 SN/MAC/标识并由管理员审批通过</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>client_pending</code></td>
                <td>设备标识已自动上报录入，但当前状态为「待审批」</td>
                <td>请管理员在「接入终端」中点击“审批通过”后即可开始调用</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>kill_switch_active</code></td>
                <td>安全团队触发了全平台/租户紧急停用 (Kill Switch)</td>
                <td>该租户下全部 Open API 暂停服务；请联系管理员在「风险总览」关闭 Kill Switch</td>
              </tr>
              <tr>
                <td><span class="sec-status st-denied">403</span></td>
                <td><code>forbidden_hours</code></td>
                <td>请求时间不在护栏配置的允许调用时间段内 (如 09:00-18:00)</td>
                <td>调整调用时机，或在「护栏策略」中调整“允许调用时段”配置</td>
              </tr>
              <tr>
                <td><span class="sec-status st-error">422</span></td>
                <td><code>input_too_long</code></td>
                <td>输入的单次 prompt 字符长度超出了平台配置的最大长度限制</td>
                <td>压缩提示词或截断输入，或在「护栏策略」中提高“最大输入字符数”</td>
              </tr>
              <tr>
                <td><span class="sec-status st-error">422</span></td>
                <td><code>sensitive_content</code></td>
                <td>输入文本命中了敏感词黑名单或 PII 隐私信息，且策略配置为“直接阻断”</td>
                <td>过滤输入内容中的涉密或违规文本；可在「护栏策略」中调整敏感词库</td>
              </tr>
              <tr>
                <td><span class="sec-status st-error">429</span></td>
                <td><code>rate_limited</code></td>
                <td>超出每分钟最大请求频次限制 (RPM 限流)</td>
                <td>降低客户端并发调用频率，或引入重试退避机制 (Exponential Backoff)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Usage Metrics -->
    <section v-show="innerTab === 'usage'" class="sec-block">
      <!-- Toolbar / Time Range Selector -->
      <div class="users-toolbar">
        <div class="usage-title-row">
          <h3><i class="fa-solid fa-chart-line" style="color: var(--accent-blue);"></i> API 调用与 Token 消耗统计</h3>
          <span class="sec-muted">多维事实聚合记录与实时调用流水分析</span>
        </div>
        <div class="usage-toolbar-actions">
          <div class="overview-date-filter">
            <button type="button" class="btn-time-range" :class="{ active: usageRange === 'today' }" @click="changeUsageRange('today')">今日</button>
            <button type="button" class="btn-time-range" :class="{ active: usageRange === '7d' }" @click="changeUsageRange('7d')">近7天</button>
            <button type="button" class="btn-time-range" :class="{ active: usageRange === '30d' }" @click="changeUsageRange('30d')">近30天</button>
          </div>
          <button class="btn-users-refresh" title="刷新数据" :disabled="loadingUsage" @click="loadUsage">
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loadingUsage }"></i>
          </button>
        </div>
      </div>

      <!-- Metric Cards Grid -->
      <div class="users-metrics-grid" style="grid-template-columns: repeat(5, 1fr);">
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-total"><i class="fa-solid fa-bolt"></i></div>
          <div class="metric-info">
            <span class="metric-label">API 总调用量</span>
            <span class="metric-value">{{ usageSummary.calls || 0 }}</span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">
            <i class="fa-regular fa-comments"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">对话请求 / 消息</span>
            <span class="metric-value">{{ usageSummary.chatCalls || 0 }} <small style="font-size: 0.72rem; color: var(--text-muted);">/ {{ usageSummary.messages || 0 }}条</small></span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-admin"><i class="fa-solid fa-coins"></i></div>
          <div class="metric-info">
            <span class="metric-label">消耗 Tokens</span>
            <span class="metric-value">{{ ((usageSummary.promptTokens || 0) + (usageSummary.completionTokens || 0)).toLocaleString() }}</span>
            <span class="metric-sub-label">入: {{ (usageSummary.promptTokens || 0).toLocaleString() }} · 出: {{ (usageSummary.completionTokens || 0).toLocaleString() }}</span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box" style="background: rgba(244, 63, 94, 0.12); color: var(--accent-rose);">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">护栏拦截 / 异常</span>
            <span class="metric-value" style="color: var(--accent-rose);">{{ usageSummary.denied || 0 }} <small style="font-size: 0.72rem; color: var(--text-muted);">/ {{ usageSummary.errors || 0 }}错</small></span>
          </div>
        </div>
        <div class="user-metric-card">
          <div class="metric-icon-box metric-icon-dev"><i class="fa-solid fa-stopwatch"></i></div>
          <div class="metric-info">
            <span class="metric-label">平均响应耗时</span>
            <span class="metric-value">{{ avgLatencyText }}</span>
          </div>
        </div>
      </div>

      <!-- Sub-Tab Switcher: Daily Fact Table vs Realtime Call Logs -->
      <div class="sec-sub-tabs-row">
        <div class="sec-sub-tabs">
          <button type="button" class="btn-sub-tab" :class="{ active: usageSubTab === 'daily' }" @click="usageSubTab = 'daily'">
            <i class="fa-solid fa-table-cells"></i> 按日聚合事实表 ({{ usageDailyList.length }}条)
          </button>
          <button type="button" class="btn-sub-tab" :class="{ active: usageSubTab === 'logs' }" @click="usageSubTab = 'logs'">
            <i class="fa-solid fa-list-ul"></i> 实时调用流水 (最新{{ usageLogsResult.total }}条)
          </button>
        </div>
      </div>

      <!-- Daily Fact Table View -->
      <div v-show="usageSubTab === 'daily'" class="table-view-card users-table-card">
        <div v-if="loadingUsage && !usageDailyList.length" class="users-loading-state">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>加载用量统计数据...</span>
        </div>
        <div v-else-if="!usageDailyList.length" class="users-empty-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-chart-simple"></i></div>
          <h4>选定时间段内暂无调用数据</h4>
          <p>请按「接入文档」发起一次 API 对话或检索调用，系统将自动汇总事实记录</p>
        </div>
        <table v-else class="agent-table">
          <thead>
            <tr>
              <th>统计日期</th>
              <th>智能体 ID</th>
              <th>凭证 ID</th>
              <th>终端设备</th>
              <th>总调用量</th>
              <th>对话次数</th>
              <th>输入 Tokens</th>
              <th>输出 Tokens</th>
              <th>安全拦截</th>
              <th>异常数</th>
              <th>平均耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in usageDailyList" :key="item.id">
              <td style="font-weight: 600;">{{ item.statDate }}</td>
              <td><code>{{ item.agentId || '—' }}</code></td>
              <td><code>{{ item.apiKeyId ? item.apiKeyId.slice(0, 10) + '...' : '—' }}</code></td>
              <td><span v-if="item.clientCredentialId" class="sec-status st-success">{{ item.clientCredentialId }}</span><span v-else class="sec-muted">—</span></td>
              <td style="font-weight: 700; color: var(--accent-blue);">{{ item.calls }}</td>
              <td>{{ item.chatCalls }}</td>
              <td>{{ (item.promptTokens || 0).toLocaleString() }}</td>
              <td>{{ (item.completionTokens || 0).toLocaleString() }}</td>
              <td>
                <span v-if="item.denied > 0" class="sec-status st-denied">{{ item.denied }}</span>
                <span v-else class="sec-muted">0</span>
              </td>
              <td>
                <span v-if="item.errors > 0" class="sec-status st-error">{{ item.errors }}</span>
                <span v-else class="sec-muted">0</span>
              </td>
              <td>{{ item.calls ? Math.round(item.latencySumMs / item.calls) + ' ms' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Realtime Call Logs View -->
      <div v-show="usageSubTab === 'logs'" class="table-view-card users-table-card">
        <div v-if="!usageLogs.length" class="users-empty-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-clipboard-list"></i></div>
          <h4>暂无调用流水日志</h4>
          <p>每笔经过网关与鉴权链的请求明细均会实时保存于此处供排查分析</p>
        </div>
        <table v-else class="agent-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>端点 (Endpoint)</th>
              <th>HTTP 状态</th>
              <th>耗时</th>
              <th>Tokens</th>
              <th>模型</th>
              <th>终端 / 用户</th>
              <th>拦截原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in usageLogs" :key="log.id">
              <td>{{ formatTime(log.ts) }}</td>
              <td><code>{{ log.endpoint }}</code></td>
              <td>
                <span class="sec-status" :class="httpStatusClass(log.httpStatus)">
                  {{ log.httpStatus }}
                </span>
              </td>
              <td>{{ log.latencyMs }} ms</td>
              <td>{{ ((log.promptTokens || 0) + (log.completionTokens || 0)).toLocaleString() }}</td>
              <td><span class="sec-muted">{{ log.model || '—' }}</span></td>
              <td>
                <div v-if="log.clientCredentialId || log.endUser">
                  <div v-if="log.clientCredentialId" class="sec-name">{{ log.clientCredentialId }}</div>
                  <div v-if="log.endUser" class="sec-muted">用户: {{ log.endUser }}</div>
                </div>
                <span v-else class="sec-muted">—</span>
              </td>
              <td>
                <span v-if="log.denyReason" class="sec-error">{{ log.denyReason }}</span>
                <span v-else class="sec-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Logs Pager -->
        <section v-if="usageLogsResult.total" class="pagination-container">
          <div class="page-summary">共 {{ usageLogsResult.total }} 条 · 第 {{ usageLogsPage }} / {{ Math.max(1, usageLogsResult.totalPages || 1) }} 页</div>
          <div class="pagination-controls">
            <button class="btn-page" :disabled="usageLogsPage <= 1" @click="changeUsageLogsPage(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button v-for="n in pageNumbers(Math.max(1, usageLogsResult.totalPages || 1), usageLogsPage)" :key="'ul'+n" class="btn-page" :class="{ active: n === usageLogsPage }" @click="setUsageLogsPage(n)">{{ n }}</button>
            <button class="btn-page" :disabled="usageLogsPage >= (usageLogsResult.totalPages || 1)" @click="changeUsageLogsPage(1)"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </section>
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
  { id: 'docs', name: '接入文档', icon: 'fa-solid fa-book-open-reader' },
  { id: 'keys', name: '开放凭证', icon: 'fa-solid fa-key' },
  { id: 'clients', name: '接入终端', icon: 'fa-solid fa-mobile-screen' },
  { id: 'usage', name: '用量统计', icon: 'fa-solid fa-chart-simple' },
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
  { id: 'chat', name: '对话', desc: '调用智能体聊天，含多轮问答与 SSE 流式响应。' },
  { id: 'agents:read', name: '读智能体', desc: '查询授权智能体清单及脱敏配置。' },
  { id: 'agents:write', name: '写智能体', desc: '创建、修改、发布上线与暂停智能体。' },
  { id: 'kb:read', name: '读知识库', desc: '知识库列表、语义向量检索测试、文档明细。' },
  { id: 'kb:write', name: '写知识库', desc: '创建知识库、上传切片文档、录入精准 FAQ。' },
  { id: 'agents:bind_kb', name: '绑定知识库', desc: '为指定智能体关联或解绑私有知识库。' },
  { id: 'conversations:read', name: '读会话', desc: '拉取历史会话与上下文消息记录。' },
  { id: 'usage:read', name: '读用量', desc: '查询多维调用量、Token 消耗统计与审计事件。' },
  { id: 'clients:write', name: '管终端', desc: '通过 API 维护终端设备白名单与状态变更。' },
  { id: 'account:read', name: '读账号对接', desc: '查看调用凭证归属的开发者账号详情。' },
  { id: 'account:write', name: '写账号对接', desc: '入站登记与绑定外部第三方系统账号。' }
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
    await Promise.all([loadAudit(), loadUsage()])
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

// Base URL & Copy Utility
const apiBaseUrl = computed(() => {
  if (typeof window === 'undefined') return '/open/v1'
  return `${window.location.origin}/open/v1`
})

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    showToast(`已复制${label}到剪贴板`, 'success')
  } catch {
    showToast('复制失败，请手动选择复制', 'error')
  }
  document.body.removeChild(ta)
}

function copyText(text, label = '内容') {
  if (!text) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`已复制${label}到剪贴板`, 'success')
    }).catch(() => {
      fallbackCopy(text, label)
    })
  } else {
    fallbackCopy(text, label)
  }
}

// Docs Playground State
const docLang = ref('curl')
const docScenario = ref('chat')

const docCodeSnippets = computed(() => {
  const base = apiBaseUrl.value
  return {
    chat: {
      curl: `curl -X POST "${base}/chat-messages" \\
  -H "Authorization: Bearer sk-agt-your-api-key" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Type: SN" \\
  -H "X-Client-Id: DEV-SN-001" \\
  -H "X-End-User: user_terminal_01" \\
  -d '{
    "agentId": "your-agent-id",
    "query": "你好，请介绍一下你自己以及你可以做什么？",
    "stream": false
  }'`,
      python: `import requests

url = "${base}/chat-messages"
headers = {
    "Authorization": "Bearer sk-agt-your-api-key",
    "Content-Type": "application/json",
    "X-Client-Type": "SN",
    "X-Client-Id": "DEV-SN-001",
    "X-End-User": "user_terminal_01"
}
payload = {
    "agentId": "your-agent-id",
    "query": "你好，请介绍一下你自己以及你可以做什么？",
    "stream": False
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      node: `// Node.js 18+ 或前端应用
const response = await fetch('${base}/chat-messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-agt-your-api-key',
    'Content-Type': 'application/json',
    'X-Client-Type': 'SN',
    'X-Client-Id': 'DEV-SN-001',
    'X-End-User': 'user_terminal_01'
  },
  body: JSON.stringify({
    agentId: 'your-agent-id',
    query: '你好，请介绍一下你自己以及你可以做什么？',
    stream: false
  })
});
const data = await response.json();
console.log(data);`
    },
    kb: {
      curl: `# 1. 语义知识库检索测试
curl -X POST "${base}/knowledge-bases/{kbId}/retrieve" \\
  -H "Authorization: Bearer sk-agt-your-api-key" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Type: SN" \\
  -H "X-Client-Id: DEV-SN-001" \\
  -d '{
    "query": "企业差旅标准与报销流程是什么？",
    "topK": 3
  }'

# 2. 上传文档切片 (multipart/form-data)
curl -X POST "${base}/knowledge-bases/{kbId}/documents" \\
  -H "Authorization: Bearer sk-agt-your-api-key" \\
  -H "X-Client-Type: SN" \\
  -H "X-Client-Id: DEV-SN-001" \\
  -F "file=@/path/to/manual.pdf"`,
      python: `import requests

# 1. 语义检索召回
retrieve_url = "${base}/knowledge-bases/{kbId}/retrieve"
headers = {
    "Authorization": "Bearer sk-agt-your-api-key",
    "Content-Type": "application/json",
    "X-Client-Type": "SN",
    "X-Client-Id": "DEV-SN-001"
}
res = requests.post(retrieve_url, json={"query": "报销标准", "topK": 3}, headers=headers)
print("召回切片:", res.json())

# 2. 上传文档切片
upload_url = "${base}/knowledge-bases/{kbId}/documents"
with open("manual.pdf", "rb") as f:
    files = {"file": ("manual.pdf", f, "application/pdf")}
    up_headers = {"Authorization": "Bearer sk-agt-your-api-key", "X-Client-Type": "SN", "X-Client-Id": "DEV-SN-001"}
    up_res = requests.post(upload_url, files=files, headers=up_headers)
    print("上传切片状态:", up_res.json())`,
      node: `// 1. 语义检索召回
const res = await fetch('${base}/knowledge-bases/{kbId}/retrieve', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-agt-your-api-key',
    'Content-Type': 'application/json',
    'X-Client-Type': 'SN',
    'X-Client-Id': 'DEV-SN-001'
  },
  body: JSON.stringify({ query: '报销标准', topK: 3 })
});
console.log(await res.json());

// 2. 上传文档切片 (FormData)
const form = new FormData();
form.append('file', blobFile, 'manual.pdf');
const upRes = await fetch('${base}/knowledge-bases/{kbId}/documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-agt-your-api-key',
    'X-Client-Type': 'SN',
    'X-Client-Id': 'DEV-SN-001'
  },
  body: form
});
console.log(await upRes.json());`
    },
    agents: {
      curl: `# 1. 分页拉取已授权的智能体列表
curl -X GET "${base}/agents?page=1&size=20" \\
  -H "Authorization: Bearer sk-agt-your-api-key" \\
  -H "X-Client-Type: SN" \\
  -H "X-Client-Id: DEV-SN-001"

# 2. 为智能体批量绑定私有知识库
curl -X PUT "${base}/agents/{agentId}/knowledge-bases" \\
  -H "Authorization: Bearer sk-agt-your-api-key" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Type: SN" \\
  -H "X-Client-Id: DEV-SN-001" \\
  -d '{
    "knowledgeBaseIds": ["kb_enterprise_rules", "kb_tech_faq"]
  }'`,
      python: `import requests

headers = {
    "Authorization": "Bearer sk-agt-your-api-key",
    "Content-Type": "application/json",
    "X-Client-Type": "SN",
    "X-Client-Id": "DEV-SN-001"
}

# 1. 查询智能体列表
agents = requests.get("${base}/agents?page=1&size=20", headers=headers).json()
print("已授权智能体:", agents)

# 2. 绑定知识库
bind_url = "${base}/agents/{agentId}/knowledge-bases"
bind_res = requests.put(bind_url, json={"knowledgeBaseIds": ["kb_123"]}, headers=headers)
print("绑定知识库结果:", bind_res.json())`,
      node: `const headers = {
  'Authorization': 'Bearer sk-agt-your-api-key',
  'Content-Type': 'application/json',
  'X-Client-Type': 'SN',
  'X-Client-Id': 'DEV-SN-001'
};

// 1. 获取授权智能体列表
const list = await fetch('${base}/agents?page=1&size=20', { headers }).then(r => r.json());
console.log('已授权智能体:', list);

// 2. 绑定知识库
const bind = await fetch('${base}/agents/{agentId}/knowledge-bases', {
  method: 'PUT',
  headers,
  body: JSON.stringify({ knowledgeBaseIds: ['kb_123'] })
}).then(r => r.json());
console.log('绑定结果:', bind);`
    }
  }
})

const activeCodeSnippet = computed(() => {
  const sc = docCodeSnippets.value[docScenario.value] || docCodeSnippets.value.chat
  return sc[docLang.value] || sc.curl
})

// Usage Metrics State
const usageRange = ref('30d')
const usageSubTab = ref('daily')
const usageSummary = ref({})
const usageDailyList = ref([])
const usageLogs = ref([])
const usageLogsPage = ref(1)
const usageLogsResult = ref({ total: 0, page: 1, totalPages: 1, size: 10 })
const loadingUsage = ref(false)

const avgLatencyText = computed(() => {
  const calls = usageSummary.value.calls || 0
  const sum = usageSummary.value.latencySumMs || 0
  if (!calls) return '0 ms'
  return `${Math.round(sum / calls)} ms`
})

function httpStatusClass(status) {
  if (status >= 200 && status < 300) return 'st-success'
  if (status === 403 || status === 422 || status === 429) return 'st-denied'
  return 'st-error'
}

function changeUsageRange(r) {
  usageRange.value = r
  loadUsage()
}

function changeUsageLogsPage(delta) {
  const next = usageLogsPage.value + delta
  const max = Math.max(1, usageLogsResult.value.totalPages || 1)
  if (next < 1 || next > max) return
  usageLogsPage.value = next
  loadUsageLogs()
}

function setUsageLogsPage(p) {
  usageLogsPage.value = p
  loadUsageLogs()
}

async function loadUsage() {
  loadingUsage.value = true
  try {
    let from = ''
    let to = ''
    const now = new Date()
    const fmt = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    to = fmt(now)
    if (usageRange.value === 'today') {
      from = to
    } else if (usageRange.value === '7d') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      from = fmt(d)
    } else {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      from = fmt(d)
    }

    const [sumRes, dailyRes] = await Promise.all([
      http.get('/api/security/usage/summary', { from, to }),
      http.get('/api/security/usage/daily', { from, to })
    ])
    if (sumRes.success) usageSummary.value = sumRes.data || {}
    if (dailyRes.success) usageDailyList.value = dailyRes.data || []
    await loadUsageLogs()
  } finally {
    loadingUsage.value = false
  }
}

async function loadUsageLogs() {
  const res = await http.get('/api/security/usage/logs', { page: usageLogsPage.value, size: 10 })
  if (res.success) {
    usageLogs.value = res.data?.records || res.data?.content || []
    usageLogsResult.value = {
      total: res.data?.total || 0,
      page: res.data?.page || usageLogsPage.value,
      totalPages: res.data?.totalPages || 1,
      size: res.data?.size || 10
    }
  }
}

watch(innerTab, (tab) => {
  if (tab === 'usage') loadUsage()
})

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

/* ================= Docs & Quickstart Styles ================= */
.sec-doc-hero {
  padding: 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.04)), var(--bg-card);
}

.sec-doc-hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.sec-doc-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.25);
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.sec-doc-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.sec-doc-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 680px;
  line-height: 1.5;
}

.sec-doc-baseurl-box {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 320px;
}

.sec-doc-baseurl-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

.sec-doc-baseurl-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sec-doc-baseurl-content code {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-blue);
  word-break: break-all;
}

.btn-copy-doc {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-doc:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
}

.sec-doc-headers-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-color);
}

.sec-doc-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-format code {
  font-size: 0.78rem;
  color: var(--accent-blue);
  background: var(--bg-input);
  padding: 2px 6px;
  border-radius: 4px;
}

.header-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.badge-req {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(244, 63, 94, 0.15);
  color: var(--accent-rose);
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.badge-opt {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

/* Code Playground */
.sec-code-card {
  padding: 18px;
}

.code-head-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.code-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-scenario-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 8px;
}

.btn-scenario {
  border: none;
  background: transparent;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-scenario.active {
  background: var(--accent-blue);
  color: #fff;
  font-weight: 600;
}

.doc-lang-tabs {
  display: flex;
  gap: 3px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 8px;
}

.btn-lang {
  border: none;
  background: transparent;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-lang.active {
  background: var(--bg-card);
  color: var(--accent-blue);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.btn-copy-code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-code:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.sec-code-pre {
  background: #090d16;
  color: #d1d5db;
  padding: 18px;
  border-radius: 10px;
  margin: 14px 0 0 0;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.84rem;
  line-height: 1.6;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* API Directory */
.sec-api-directory {
  padding: 20px;
}

.sec-api-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.api-group-item {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.api-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 0.88rem;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.api-endpoints-list {
  display: flex;
  flex-direction: column;
}

.endpoint-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s ease;
}

.endpoint-row:last-child {
  border-bottom: none;
}

.endpoint-row:hover {
  background: rgba(59, 130, 246, 0.04);
}

.method-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  width: 58px;
  text-align: center;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.method-badge.get {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.method-badge.post {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.method-badge.put {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.method-badge.delete {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(251, 113, 133, 0.3);
}

.endpoint-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
  min-width: 260px;
  flex-shrink: 0;
}

.scope-tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(139, 92, 246, 0.12);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.25);
  white-space: nowrap;
  flex-shrink: 0;
}

.endpoint-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  flex: 1;
}

.sec-error-dict {
  padding: 20px;
}

.table-responsive {
  overflow-x: auto;
}

/* ================= Usage Styles ================= */
.usage-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-title-row h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.usage-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-sub-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.sec-sub-tabs-row {
  margin: 4px 0 0 0;
}

.sec-sub-tabs {
  display: inline-flex;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 4px;
  border-radius: 10px;
}

.btn-sub-tab {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-sub-tab.active {
  background: var(--accent-blue);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

@media (max-width: 1100px) {
  .sec-split,
  .sec-policy-grid,
  .users-metrics-grid {
    grid-template-columns: 1fr;
  }
  .sec-doc-headers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 680px) {
  .sec-doc-headers-grid {
    grid-template-columns: 1fr;
  }
}
</style>
