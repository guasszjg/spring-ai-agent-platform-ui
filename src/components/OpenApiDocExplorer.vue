<template>
  <div class="api-explorer">
    <!-- Top Global Environment & Auth Bar -->
    <div class="explorer-env-bar">
      <div class="env-left">
        <div class="env-badge-row">
          <span class="api-env-pill"><i class="fa-solid fa-server"></i> RESTful &amp; SSE OPEN API</span>
          <span class="api-version-pill">v1.0-STABLE</span>
        </div>
        <div class="env-base-url-wrap">
          <span class="env-label">服务根地址 (Base URL):</span>
          <code class="env-code">{{ apiBaseUrl }}</code>
          <button type="button" class="btn-icon-tiny" title="复制服务地址" @click="copyText(apiBaseUrl, 'Base URL')">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </div>

      <div class="env-right">
        <!-- Key Selector / Quick Switcher -->
        <div class="env-control-group">
          <label class="control-label"><i class="fa-solid fa-key"></i> 调试凭证 (Key):</label>
          <div class="key-input-wrapper">
            <select
              v-if="keys.length"
              v-model="selectedKeyMode"
              class="env-select"
              title="切换使用已有凭证或自定义输入"
            >
              <option value="custom">手动输入密钥明文</option>
              <option v-for="k in keys" :key="k.id" :value="k.id">
                {{ k.keyPrefix }}... ({{ k.name }})
              </option>
            </select>
            <input
              v-model="customKeySecret"
              type="password"
              class="env-input key-secret-input"
              :placeholder="selectedKeyMode === 'custom' ? 'sk-agt-xxxxxxxx' : '已选择凭证，可输入完整明文测试'"
              title="请输入您签发时保存的完整 API Key 明文 (sk-agt-...)"
            >
          </div>
        </div>

        <!-- Terminal Device Selector -->
        <div class="env-control-group">
          <label class="control-label"><i class="fa-solid fa-mobile-screen"></i> 接入终端:</label>
          <div class="device-input-wrapper">
            <select v-model="activeClientType" class="env-select type-select">
              <option value="SN">SN</option>
              <option value="MAC">MAC</option>
              <option value="IMEI">IMEI</option>
              <option value="APP_ID">APP_ID</option>
              <option value="CUSTOM_KEY">CUSTOM_KEY</option>
            </select>
            <input
              v-model="activeClientId"
              class="env-input client-id-input"
              placeholder="DEV-SN-001"
              title="终端唯一标识编号"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Main Explorer Layout: Left Nav + Right Main Workspace -->
    <div class="explorer-body">
      <!-- Left Sidebar: API Catalog Navigation -->
      <aside class="explorer-sidebar">
        <div class="sidebar-search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model="searchQuery"
            class="sidebar-search-input"
            placeholder="搜索接口、端点或分类..."
          >
          <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="sidebar-groups">
          <div
            v-for="group in filteredGroups"
            :key="group.id"
            class="nav-group-section"
          >
            <div class="nav-group-title" @click="toggleGroup(group.id)">
              <div class="group-title-text">
                <i :class="group.icon" :style="{ color: group.iconColor }"></i>
                <span>{{ group.name }}</span>
                <span class="group-count">{{ group.endpoints.length }}</span>
              </div>
              <i
                class="fa-solid fa-chevron-down group-toggle-arrow"
                :class="{ 'rotate-180': !collapsedGroups[group.id] }"
              ></i>
            </div>

            <div v-show="!collapsedGroups[group.id]" class="nav-endpoints-list">
              <button
                v-for="ep in group.endpoints"
                :key="ep.id"
                type="button"
                class="nav-endpoint-item"
                :class="{ active: currentEndpointId === ep.id }"
                @click="selectEndpoint(ep.id)"
              >
                <span class="method-badge-small" :class="ep.method.toLowerCase()">
                  {{ ep.method }}
                </span>
                <span class="nav-endpoint-path">{{ ep.path }}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right Main Workspace -->
      <main v-if="currentEndpoint" class="explorer-main">
        <!-- Endpoint Header Card -->
        <div class="endpoint-header-card">
          <div class="header-main-row">
            <div class="header-left">
              <span class="method-badge-large" :class="currentEndpoint.method.toLowerCase()">
                {{ currentEndpoint.method }}
              </span>
              <h2 class="endpoint-full-path">{{ currentEndpoint.path }}</h2>
              <button
                type="button"
                class="btn-copy-url"
                title="复制完整接口地址"
                @click="copyText(`${apiBaseUrl}${currentEndpoint.path}`, '完整接口 URL')"
              >
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>

            <div class="header-right">
              <span class="scope-badge" title="调用本接口所需的凭证权限 Scope">
                <i class="fa-solid fa-shield-halved"></i>
                <span>{{ currentEndpoint.scope }}</span>
              </span>
            </div>
          </div>

          <h3 class="endpoint-summary-title">{{ currentEndpoint.name }}</h3>
          <p class="endpoint-description">{{ currentEndpoint.description }}</p>

          <!-- Top Navigation Tabs for Active Endpoint -->
          <div class="endpoint-view-tabs">
            <button
              type="button"
              class="view-tab"
              :class="{ active: activeModeTab === 'spec' }"
              @click="activeModeTab = 'spec'"
            >
              <i class="fa-solid fa-book-open"></i>
              <span>接口文档规范</span>
            </button>
            <button
              type="button"
              class="view-tab"
              :class="{ active: activeModeTab === 'debug' }"
              @click="activeModeTab = 'debug'"
            >
              <i class="fa-solid fa-bolt"></i>
              <span>在线调试 (Try It Out)</span>
              <span class="pill-ready">就绪</span>
            </button>
            <button
              type="button"
              class="view-tab"
              :class="{ active: activeModeTab === 'code' }"
              @click="activeModeTab = 'code'"
            >
              <i class="fa-solid fa-code"></i>
              <span>代码示例</span>
            </button>
          </div>
        </div>

        <!-- ================= MODE 1: SPECIFICATION & DOCUMENTATION ================= -->
        <div v-show="activeModeTab === 'spec'" class="spec-content-view">
          <!-- Request Headers Spec -->
          <div class="spec-section-card">
            <div class="spec-section-head">
              <h4><i class="fa-solid fa-heading" style="color: var(--accent-blue);"></i> 请求头规范 (Request Headers)</h4>
            </div>
            <div class="table-responsive">
              <table class="spec-table">
                <thead>
                  <tr>
                    <th>Header 名</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>默认 / 示例值</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>Authorization</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-req">必填</span></td>
                    <td><code>Bearer sk-agt-xxxxxxxx</code></td>
                    <td>在「开放凭证」页面签发，必须以 <code>Bearer </code> 开头</td>
                  </tr>
                  <tr>
                    <td><code>Content-Type</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-req">必填</span></td>
                    <td><code>{{ currentEndpoint.isMultipart ? 'multipart/form-data' : 'application/json' }}</code></td>
                    <td>请求体数据格式编码</td>
                  </tr>
                  <tr>
                    <td><code>X-Client-Type</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-opt" :class="{ 'badge-req': policy.clientPolicy !== 'OFF' }">{{ policy.clientPolicy !== 'OFF' ? '策略强制' : '可选' }}</span></td>
                    <td><code>SN | MAC | IMEI | APP_ID | CUSTOM_KEY</code></td>
                    <td>终端设备类别，需与接入终端白名单一致</td>
                  </tr>
                  <tr>
                    <td><code>X-Client-Id</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-opt" :class="{ 'badge-req': policy.clientPolicy !== 'OFF' }">{{ policy.clientPolicy !== 'OFF' ? '策略强制' : '可选' }}</span></td>
                    <td><code>DEV-SN-001</code></td>
                    <td>终端设备唯一标识或应用 ID，用于设备准入控制与审批</td>
                  </tr>
                  <tr>
                    <td><code>X-End-User</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-opt">推荐</span></td>
                    <td><code>user_terminal_01</code></td>
                    <td>终端透传的最终用户标识，用于用户级多维用量分析与审计追溯</td>
                  </tr>
                  <tr v-if="currentEndpoint.method !== 'GET'">
                    <td><code>Idempotency-Key</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="badge-opt">推荐防抖</span></td>
                    <td><code>idemp_8a39b2f1c0</code></td>
                    <td>写操作（POST/PUT/DELETE）幂等防抖键 (24h 有效)。携带相同 Key 重复调用将直接返回缓存结果，防止弱网下重复创建或扣费。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Path / Query Parameters Spec -->
          <div v-if="(currentEndpoint.pathParams || []).length || (currentEndpoint.queryParams || []).length" class="spec-section-card">
            <div class="spec-section-head">
              <h4><i class="fa-solid fa-sliders" style="color: var(--accent-amber);"></i> 路径与查询参数 (Path &amp; Query Parameters)</h4>
            </div>
            <div class="table-responsive">
              <table class="spec-table">
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>位置</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>默认值</th>
                    <th>描述说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in currentEndpoint.pathParams || []" :key="'pp-'+p.name">
                    <td><code>{{ p.name }}</code></td>
                    <td><span class="loc-pill path">Path</span></td>
                    <td><span class="type-pill">{{ p.type }}</span></td>
                    <td><span class="badge-req">必填</span></td>
                    <td>—</td>
                    <td>{{ p.description }}</td>
                  </tr>
                  <tr v-for="q in currentEndpoint.queryParams || []" :key="'qp-'+q.name">
                    <td><code>{{ q.name }}</code></td>
                    <td><span class="loc-pill query">Query</span></td>
                    <td><span class="type-pill">{{ q.type }}</span></td>
                    <td><span :class="q.required ? 'badge-req' : 'badge-opt'">{{ q.required ? '必填' : '可选' }}</span></td>
                    <td><code>{{ q.default || '—' }}</code></td>
                    <td>{{ q.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Request Body Spec -->
          <div v-if="(currentEndpoint.bodyFields || []).length" class="spec-section-card">
            <div class="spec-section-head">
              <h4><i class="fa-solid fa-file-code" style="color: var(--accent-emerald);"></i> 请求体参数详解 (Request Body Schema)</h4>
            </div>
            <div class="table-responsive">
              <table class="spec-table">
                <thead>
                  <tr>
                    <th>字段名</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>默认值</th>
                    <th>字段描述</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="b in currentEndpoint.bodyFields || []" :key="'bf-'+b.name">
                    <td><code>{{ b.name }}</code></td>
                    <td><span class="type-pill">{{ b.type }}</span></td>
                    <td><span :class="b.required ? 'badge-req' : 'badge-opt'">{{ b.required ? '必填' : '可选' }}</span></td>
                    <td><code>{{ b.default || '—' }}</code></td>
                    <td>{{ b.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Example Request JSON -->
            <div v-if="currentEndpoint.exampleBody" class="spec-example-box">
              <div class="example-head">
                <span class="example-label"><i class="fa-regular fa-paper-plane"></i> 请求体 JSON 示例</span>
                <button type="button" class="btn-copy-tiny" @click="copyText(currentEndpoint.exampleBody, '请求体示例')">
                  <i class="fa-regular fa-copy"></i> 复制
                </button>
              </div>
              <pre class="code-pre-block"><code>{{ currentEndpoint.exampleBody }}</code></pre>
            </div>
          </div>

          <!-- Response Schema & Examples -->
          <div class="spec-section-card">
            <div class="spec-section-head">
              <h4><i class="fa-solid fa-arrow-down-up-across-line" style="color: #a855f7;"></i> 响应结构规范 (Response Schema)</h4>
            </div>
            <div class="table-responsive">
              <table class="spec-table">
                <thead>
                  <tr>
                    <th>字段路径</th>
                    <th>类型</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>code</code></td>
                    <td><span class="type-pill">integer</span></td>
                    <td>业务状态码，成功统一为 <code>200</code>，异常对应 HTTP 状态码</td>
                  </tr>
                  <tr>
                    <td><code>message</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td>提示信息，如 <code>"success"</code> 或具体错误描述</td>
                  </tr>
                  <tr>
                    <td><code>data</code></td>
                    <td><span class="type-pill">object | array</span></td>
                    <td>业务响应载荷对象，详见下方成功示例</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Example Response JSON -->
            <div class="spec-example-box">
              <div class="example-head">
                <span class="example-label"><i class="fa-regular fa-circle-check" style="color: var(--accent-emerald);"></i> 200 OK 成功响应示例</span>
                <button type="button" class="btn-copy-tiny" @click="copyText(currentEndpoint.exampleResponse, '响应示例')">
                  <i class="fa-regular fa-copy"></i> 复制
                </button>
              </div>
              <pre class="code-pre-block response"><code>{{ currentEndpoint.exampleResponse }}</code></pre>
            </div>
          </div>

          <!-- Error Dictionary for this endpoint -->
          <div class="spec-section-card">
            <div class="spec-section-head">
              <h4><i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-rose);"></i> 常见错误码与排查建议</h4>
            </div>
            <div class="table-responsive">
              <table class="spec-table">
                <thead>
                  <tr>
                    <th style="width: 90px;">状态码</th>
                    <th style="width: 170px;">错误标识 (code)</th>
                    <th>原因</th>
                    <th>排查与处理</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="status-badge-err">401</span></td>
                    <td><code>unauthorized</code></td>
                    <td>未携带 Bearer Token 或 Key 已被吊销</td>
                    <td>在「开放凭证」中签发有效密钥并带在 <code>Authorization</code> 头中</td>
                  </tr>
                  <tr>
                    <td><span class="status-badge-err">403</span></td>
                    <td><code>scope_missing</code></td>
                    <td>Key 缺少该接口所需的 <code>{{ currentEndpoint.scope }}</code> 权限</td>
                    <td>重新签发凭证并勾选对应 Scope 范围</td>
                  </tr>
                  <tr v-if="currentEndpoint.path.includes('chat') || currentEndpoint.path.includes('agents')">
                    <td><span class="status-badge-err">403</span></td>
                    <td><code>agent_not_allowed</code></td>
                    <td>凭证配置了智能体限定白名单，且不包含目标智能体</td>
                    <td>更新凭证的智能体权限范围，或使用超级管理员凭证</td>
                  </tr>
                  <tr>
                    <td><span class="status-badge-err">403</span></td>
                    <td><code>client_not_allowed</code></td>
                    <td>护栏开启了终端策略，但上报设备标识未登记审批</td>
                    <td>前往「接入终端」登记此设备并审批通过</td>
                  </tr>
                  <tr v-if="currentEndpoint.path.includes('chat')">
                    <td><span class="status-badge-err">422</span></td>
                    <td><code>sensitive_content</code></td>
                    <td>输入内容命中了护栏敏感词且配置为阻断</td>
                    <td>调整输入语句，或在「护栏策略」调整敏感词黑名单</td>
                  </tr>
                  <tr>
                    <td><span class="status-badge-err">429</span></td>
                    <td><code>rate_limited</code></td>
                    <td>超过每分钟最大请求频次限制 (RPM)</td>
                    <td>降低调用并发或引入退避重试机制</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ================= MODE 2: INTERACTIVE DEBUGGER / PLAYGROUND ================= -->
        <div v-show="activeModeTab === 'debug'" class="debug-content-view">
          <div class="debug-workspace-grid">
            <!-- Left: Request Configuration -->
            <div class="debug-pane request-pane">
              <div class="pane-header">
                <span class="pane-title"><i class="fa-solid fa-paper-plane"></i> 请求配置 (Request Setup)</span>
                <span class="pane-tip">修改下方参数后点击“发送请求”实时调试接口</span>
              </div>

              <!-- Live Headers Preview -->
              <div class="debug-card">
                <div class="debug-card-title">
                  <span>1. 请求头 (Headers)</span>
                  <span class="sub-tip">由顶部环境条自动同步</span>
                </div>
                <div class="headers-summary-rows">
                  <div class="header-kv">
                    <span class="k">Authorization:</span>
                    <span class="v"><code>Bearer {{ effectiveKeyDisplay }}</code></span>
                  </div>
                  <div class="header-kv">
                    <span class="k">Content-Type:</span>
                    <span class="v"><code>{{ currentEndpoint.isMultipart ? 'multipart/form-data' : 'application/json' }}</code></span>
                  </div>
                  <div class="header-kv">
                    <span class="k">X-Client-Type:</span>
                    <span class="v"><code>{{ activeClientType }}</code></span>
                  </div>
                  <div class="header-kv">
                    <span class="k">X-Client-Id:</span>
                    <span class="v"><code>{{ activeClientId }}</code></span>
                  </div>
                  <div class="header-kv">
                    <span class="k">X-End-User:</span>
                    <input v-model="activeEndUser" class="inline-header-input" placeholder="user_terminal_01">
                  </div>
                  <div v-if="currentEndpoint.method !== 'GET'" class="header-kv">
                    <span class="k">Idempotency-Key:</span>
                    <input v-model="activeIdempotencyKey" class="inline-header-input" placeholder="可选防抖键，如 idemp_001">
                  </div>
                </div>
              </div>

              <!-- Path Parameters Input -->
              <div v-if="(currentEndpoint.pathParams || []).length" class="debug-card">
                <div class="debug-card-title">
                  <span>2. 路径参数 (Path Parameters)</span>
                </div>
                <div class="params-inputs-grid">
                  <div v-for="p in currentEndpoint.pathParams" :key="'inp-path-'+p.name" class="param-form-item">
                    <div class="param-label-row">
                      <label class="param-name">{{ p.name }} <span class="badge-req">必填</span></label>
                      <span class="param-desc">{{ p.description }}</span>
                    </div>
                    <div class="param-input-wrap">
                      <!-- If it's an agentId, allow picking from loaded agents -->
                      <select
                        v-if="p.name === 'id' && (currentEndpoint.path.includes('/agents/') || currentEndpoint.path.includes('/agents')) && agents.length"
                        v-model="debugPathParams[p.name]"
                        class="form-control-styled"
                      >
                        <option v-for="a in agents" :key="a.id" :value="a.id">
                          {{ a.name }} ({{ a.id }})
                        </option>
                      </select>
                      <input
                        v-else
                        v-model="debugPathParams[p.name]"
                        class="modal-input"
                        :placeholder="'请输入 ' + p.name"
                        required
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- Query Parameters Input -->
              <div v-if="(currentEndpoint.queryParams || []).length" class="debug-card">
                <div class="debug-card-title">
                  <span>3. 查询参数 (Query Parameters)</span>
                </div>
                <div class="params-inputs-grid">
                  <div v-for="q in currentEndpoint.queryParams" :key="'inp-query-'+q.name" class="param-form-item">
                    <div class="param-label-row">
                      <label class="param-name">{{ q.name }} <span v-if="q.required" class="badge-req">必填</span></label>
                      <span class="param-desc">{{ q.description }}</span>
                    </div>
                    <input
                      v-model="debugQueryParams[q.name]"
                      class="modal-input"
                      :placeholder="q.default ? '默认: ' + q.default : '留空则不传'"
                    >
                  </div>
                </div>
              </div>

              <!-- Request Body Input -->
              <div v-if="currentEndpoint.method !== 'GET' && currentEndpoint.method !== 'DELETE'" class="debug-card">
                <div class="debug-card-title">
                  <span>4. 请求体 (Request Body)</span>
                  <div class="body-actions">
                    <button type="button" class="btn-text-action" @click="formatJsonBody">
                      <i class="fa-solid fa-wand-magic-sparkles"></i> 格式化
                    </button>
                    <button type="button" class="btn-text-action" @click="resetBodyToDefault">
                      <i class="fa-solid fa-rotate-left"></i> 重置示例
                    </button>
                  </div>
                </div>

                <!-- Multipart File Upload -->
                <div v-if="currentEndpoint.isMultipart" class="multipart-upload-box">
                  <div class="upload-file-row">
                    <label class="form-label">选择切片文档:</label>
                    <input type="file" class="file-picker-input" @change="onFileSelected">
                  </div>
                  <div class="upload-options-grid">
                    <div>
                      <label class="form-label">chunkSize (切片大小):</label>
                      <input v-model.number="debugMultipartOptions.chunkSize" type="number" class="modal-input">
                    </div>
                    <div>
                      <label class="form-label">overlapSize (重叠字数):</label>
                      <input v-model.number="debugMultipartOptions.overlapSize" type="number" class="modal-input">
                    </div>
                  </div>
                </div>

                <!-- JSON Editor Textarea -->
                <div v-else class="json-editor-wrap">
                  <textarea
                    v-model="debugBodyJson"
                    class="json-editor-textarea"
                    rows="10"
                    spellcheck="false"
                    placeholder="{ ... }"
                    @keydown.ctrl.enter.prevent="executeRequest"
                  ></textarea>
                </div>
              </div>

              <!-- Action Bar -->
              <div class="debug-action-bar">
                <button
                  type="button"
                  class="btn-send-request"
                  :disabled="isExecuting"
                  @click="executeRequest"
                >
                  <i :class="isExecuting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
                  <span>{{ isExecuting ? '请求中...' : '发送请求 (Ctrl+Enter)' }}</span>
                </button>
                <span v-if="!hasKeyInput" class="key-warning-hint">
                  <i class="fa-solid fa-circle-exclamation"></i> 请在顶部输入或选择 API Key 后发送
                </span>
              </div>
            </div>

            <!-- Right: Live Response Inspector -->
            <div class="debug-pane response-pane">
              <div class="pane-header">
                <span class="pane-title"><i class="fa-solid fa-receipt"></i> 响应结果 (Response)</span>
                <div v-if="responseResult" class="response-meta-tags">
                  <span class="res-badge status" :class="statusBadgeClass(responseResult.status)">
                    {{ responseResult.status }} {{ responseResult.statusText }}
                  </span>
                  <span class="res-badge latency">
                    <i class="fa-solid fa-stopwatch"></i> {{ responseResult.latencyMs }} ms
                  </span>
                  <span class="res-badge size">
                    {{ responseResult.sizeBytes }} B
                  </span>
                </div>
              </div>

              <!-- Response Body Container -->
              <div class="response-body-wrapper">
                <div v-if="isExecuting" class="response-loading-state">
                  <i class="fa-solid fa-circle-notch fa-spin"></i>
                  <span>正在向 {{ currentEndpoint.path }} 发送调试请求...</span>
                </div>

                <div v-else-if="!responseResult" class="response-empty-state">
                  <div class="empty-icon"><i class="fa-solid fa-terminal"></i></div>
                  <h4>准备就绪，等待发送请求</h4>
                  <p>配置左侧参数后点击「发送请求」，接口真实响应结果与耗时将立即呈现于此</p>
                </div>

                <div v-else class="response-display-area">
                  <div class="response-toolbar">
                    <div class="resp-tabs">
                      <button
                        type="button"
                        class="resp-tab"
                        :class="{ active: activeResponseTab === 'body' }"
                        @click="activeResponseTab = 'body'"
                      >
                        Body
                      </button>
                      <button
                        type="button"
                        class="resp-tab"
                        :class="{ active: activeResponseTab === 'headers' }"
                        @click="activeResponseTab = 'headers'"
                      >
                        Headers ({{ Object.keys(responseResult.headers || {}).length }})
                      </button>
                    </div>

                    <button
                      type="button"
                      class="btn-copy-tiny"
                      @click="copyText(activeResponseTab === 'body' ? responseResult.rawBody : JSON.stringify(responseResult.headers, null, 2), '响应内容')"
                    >
                      <i class="fa-regular fa-copy"></i> 复制
                    </button>
                  </div>

                  <!-- Response JSON Body -->
                  <div v-show="activeResponseTab === 'body'" class="response-code-container">
                    <pre class="response-pre"><code>{{ responseResult.formattedBody }}</code></pre>
                  </div>

                  <!-- Response Headers Table -->
                  <div v-show="activeResponseTab === 'headers'" class="response-headers-container">
                    <table class="headers-table">
                      <thead>
                        <tr>
                          <th>Header</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(v, k) in responseResult.headers" :key="'hdr-'+k">
                          <td><code>{{ k }}</code></td>
                          <td><code>{{ v }}</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= MODE 3: CODE GENERATOR ================= -->
        <div v-show="activeModeTab === 'code'" class="code-content-view">
          <div class="code-generator-card">
            <div class="code-generator-head">
              <div class="lang-switch-tabs">
                <button
                  type="button"
                  class="btn-code-lang"
                  :class="{ active: activeCodeLang === 'curl' }"
                  @click="activeCodeLang = 'curl'"
                >
                  cURL
                </button>
                <button
                  type="button"
                  class="btn-code-lang"
                  :class="{ active: activeCodeLang === 'python' }"
                  @click="activeCodeLang = 'python'"
                >
                  Python (requests)
                </button>
                <button
                  type="button"
                  class="btn-code-lang"
                  :class="{ active: activeCodeLang === 'node' }"
                  @click="activeCodeLang = 'node'"
                >
                  JavaScript (fetch)
                </button>
                <button
                  type="button"
                  class="btn-code-lang"
                  :class="{ active: activeCodeLang === 'java' }"
                  @click="activeCodeLang = 'java'"
                >
                  Java (HttpClient)
                </button>
              </div>

              <button
                type="button"
                class="btn-copy-code-main"
                @click="copyText(generatedCodeSnippet, '示例代码')"
              >
                <i class="fa-regular fa-copy"></i>
                <span>复制代码</span>
              </button>
            </div>

            <pre class="code-pre-generated"><code>{{ generatedCodeSnippet }}</code></pre>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { OPEN_API_GROUPS, ALL_ENDPOINTS } from './openApiCatalog'

const props = defineProps({
  keys: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
  agents: { type: Array, default: () => [] },
  policy: { type: Object, default: () => ({}) }
})

const { showToast } = useToast()

// Global Environment State
const apiBaseUrl = computed(() => {
  if (typeof window === 'undefined') return '/open/v1'
  return `${window.location.origin}/open/v1`
})

const selectedKeyMode = ref(props.keys.length ? props.keys[0].id : 'custom')
const customKeySecret = ref(sessionStorage.getItem('open_api_debug_key') || '')

const activeClientType = ref('SN')
const activeClientId = ref(props.clients.length ? props.clients[0].clientId : 'DEV-SN-001')
const activeEndUser = ref('user_terminal_01')
const activeIdempotencyKey = ref('')

watch(customKeySecret, (v) => {
  if (v) sessionStorage.setItem('open_api_debug_key', v)
})

watch(() => props.keys, (n) => {
  if (n && n.length && selectedKeyMode.value === 'custom' && !customKeySecret.value) {
    selectedKeyMode.value = n[0].id
  }
}, { immediate: true })

watch(() => props.clients, (n) => {
  if (n && n.length && (!activeClientId.value || activeClientId.value === 'DEV-SN-001')) {
    activeClientId.value = n[0].clientId
    activeClientType.value = n[0].clientType || 'SN'
  }
}, { immediate: true })

const effectiveKeySecret = computed(() => {
  if (customKeySecret.value.trim()) return customKeySecret.value.trim()
  if (selectedKeyMode.value !== 'custom') {
    const k = props.keys.find(item => item.id === selectedKeyMode.value)
    if (k) return `sk-agt-test-${k.keyPrefix}`
  }
  return 'sk-agt-your-api-key'
})

const effectiveKeyDisplay = computed(() => {
  const secret = effectiveKeySecret.value
  if (secret.length > 18) {
    return secret.slice(0, 10) + '...' + secret.slice(-4)
  }
  return secret
})

const hasKeyInput = computed(() => {
  return Boolean(customKeySecret.value.trim() || selectedKeyMode.value !== 'custom')
})

// Navigation & Search State
const searchQuery = ref('')
const collapsedGroups = reactive({})
const currentEndpointId = ref('chat-messages')
const activeModeTab = ref('spec') // 'spec' | 'debug' | 'code'
const activeCodeLang = ref('curl') // 'curl' | 'python' | 'node' | 'java'

function toggleGroup(groupId) {
  collapsedGroups[groupId] = !collapsedGroups[groupId]
}

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return OPEN_API_GROUPS
  return OPEN_API_GROUPS.map(g => {
    const matched = g.endpoints.filter(ep => {
      return ep.path.toLowerCase().includes(q)
        || ep.name.toLowerCase().includes(q)
        || ep.method.toLowerCase().includes(q)
        || ep.description.toLowerCase().includes(q)
        || g.name.toLowerCase().includes(q)
    })
    return { ...g, endpoints: matched }
  }).filter(g => g.endpoints.length > 0)
})

const currentEndpoint = computed(() => {
  return ALL_ENDPOINTS.find(e => e.id === currentEndpointId.value) || ALL_ENDPOINTS[0]
})

function selectEndpoint(id) {
  currentEndpointId.value = id
  initDebuggerForEndpoint()
}

// Debugger State
const debugPathParams = reactive({})
const debugQueryParams = reactive({})
const debugBodyJson = ref('')
const debugMultipartFile = ref(null)
const debugMultipartOptions = reactive({ chunkSize: 500, overlapSize: 50 })
const isExecuting = ref(false)
const responseResult = ref(null)
const activeResponseTab = ref('body') // 'body' | 'headers'

function initDebuggerForEndpoint() {
  const ep = currentEndpoint.value
  if (!ep) return

  // Clear path params & seed defaults
  Object.keys(debugPathParams).forEach(k => delete debugPathParams[k])
  if (ep.pathParams) {
    ep.pathParams.forEach(p => {
      if (p.name === 'id' && (ep.path.includes('/agents/') || ep.path.includes('/agents')) && props.agents.length) {
        debugPathParams[p.name] = props.agents[0].id
      } else {
        debugPathParams[p.name] = p.default || (p.name === 'id' ? 'kb_sample_01' : '')
      }
    })
  }

  // Clear query params & seed defaults
  Object.keys(debugQueryParams).forEach(k => delete debugQueryParams[k])
  if (ep.queryParams) {
    ep.queryParams.forEach(q => {
      debugQueryParams[q.name] = q.default || ''
    })
  }

  // Set default body JSON
  resetBodyToDefault()
  responseResult.value = null
}

function resetBodyToDefault() {
  const ep = currentEndpoint.value
  if (!ep) return
  if (ep.exampleBody) {
    let bodyObj
    try {
      bodyObj = JSON.parse(ep.exampleBody)
      if (ep.id === 'chat-messages' && props.agents.length) {
        bodyObj.agentId = props.agents[0].id
      }
      debugBodyJson.value = JSON.stringify(bodyObj, null, 2)
    } catch {
      debugBodyJson.value = ep.exampleBody
    }
  } else {
    debugBodyJson.value = ''
  }
}

function formatJsonBody() {
  if (!debugBodyJson.value.trim()) return
  try {
    const parsed = JSON.parse(debugBodyJson.value)
    debugBodyJson.value = JSON.stringify(parsed, null, 2)
    showToast('JSON 已格式化', 'success')
  } catch (err) {
    showToast('JSON 格式有误: ' + err.message, 'error')
  }
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (file) {
    debugMultipartFile.value = file
    showToast(`已选择文档: ${file.name} (${Math.round(file.size / 1024)} KB)`, 'info')
  }
}

// Execute Request Live
async function executeRequest() {
  const ep = currentEndpoint.value
  if (!ep) return

  isExecuting.value = true
  responseResult.value = null

  // 1. Build resolved URL
  let resolvedPath = ep.path
  if (ep.pathParams) {
    ep.pathParams.forEach(p => {
      const val = debugPathParams[p.name] || 'sample'
      resolvedPath = resolvedPath.replace(`{${p.name}}`, encodeURIComponent(val))
    })
  }

  let finalUrl = `${apiBaseUrl.value}${resolvedPath}`
  const queryParts = []
  if (ep.queryParams) {
    ep.queryParams.forEach(q => {
      const val = debugQueryParams[q.name]
      if (val !== undefined && val !== '') {
        queryParts.push(`${encodeURIComponent(q.name)}=${encodeURIComponent(val)}`)
      }
    })
  }
  if (queryParts.length) {
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryParts.join('&')
  }

  // 2. Build Headers
  const headers = {
    'Authorization': `Bearer ${effectiveKeySecret.value}`
  }
  if (activeClientType.value) {
    headers['X-Client-Type'] = activeClientType.value
  }
  if (activeClientId.value) {
    headers['X-Client-Id'] = activeClientId.value
  }
  if (activeEndUser.value) {
    headers['X-End-User'] = activeEndUser.value
  }
  if (ep.method !== 'GET' && activeIdempotencyKey.value.trim()) {
    headers['Idempotency-Key'] = activeIdempotencyKey.value.trim()
  }

  // 3. Build Body
  let bodyData = null
  if (ep.isMultipart) {
    const formData = new FormData()
    if (debugMultipartFile.value) {
      formData.append('file', debugMultipartFile.value)
    } else {
      // Mock dummy file if not chosen
      const blob = new Blob(['Sample enterprise knowledge text content.'], { type: 'text/plain' })
      formData.append('file', blob, 'sample_manual.txt')
    }
    formData.append('chunkSize', String(debugMultipartOptions.chunkSize || 500))
    formData.append('overlapSize', String(debugMultipartOptions.overlapSize || 50))
    bodyData = formData
  } else if (ep.method !== 'GET' && ep.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
    if (debugBodyJson.value.trim()) {
      try {
        JSON.parse(debugBodyJson.value)
        bodyData = debugBodyJson.value
      } catch (err) {
        showToast('请求体 JSON 格式不合法: ' + err.message, 'error')
        isExecuting.value = false
        return
      }
    }
  }

  // 4. Send request
  const t0 = performance.now()
  try {
    const res = await fetch(finalUrl, {
      method: ep.method,
      headers,
      body: bodyData
    })
    const latencyMs = Math.round(performance.now() - t0)

    const respHeaders = {}
    res.headers.forEach((val, key) => {
      respHeaders[key] = val
    })

    const rawText = await res.text()
    let formattedBody = rawText
    try {
      const parsed = JSON.parse(rawText)
      formattedBody = JSON.stringify(parsed, null, 2)
    } catch {
      // Keep as raw text (e.g. SSE stream or plain string)
    }

    responseResult.value = {
      status: res.status,
      statusText: res.statusText,
      latencyMs,
      sizeBytes: new Blob([rawText]).size,
      rawBody: rawText,
      formattedBody,
      headers: respHeaders
    }

    if (res.ok) {
      showToast(`请求成功: ${res.status} ${res.statusText}`, 'success')
    } else {
      showToast(`服务端返回状态: ${res.status}`, 'warning')
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - t0)
    responseResult.value = {
      status: 0,
      statusText: 'Network Error',
      latencyMs,
      sizeBytes: 0,
      rawBody: err.message,
      formattedBody: `{\n  "error": "${err.message}",\n  "hint": "网络连接失败或跨域被拦截，请确认服务已启动且 Base URL 访问正常"\n}`,
      headers: {}
    }
    showToast('网络请求异常: ' + err.message, 'error')
  } finally {
    isExecuting.value = false
  }
}

function statusBadgeClass(status) {
  if (status >= 200 && status < 300) return 'status-ok'
  if (status === 401 || status === 403) return 'status-auth'
  if (status === 422 || status === 429) return 'status-warn'
  return 'status-err'
}

// Dynamic Code Snippet Generation
const generatedCodeSnippet = computed(() => {
  const ep = currentEndpoint.value
  if (!ep) return ''

  let resolvedPath = ep.path
  if (ep.pathParams) {
    ep.pathParams.forEach(p => {
      const val = debugPathParams[p.name] || 'sample_id'
      resolvedPath = resolvedPath.replace(`{${p.name}}`, val)
    })
  }

  const queryParts = []
  if (ep.queryParams) {
    ep.queryParams.forEach(q => {
      const val = debugQueryParams[q.name]
      if (val !== undefined && val !== '') {
        queryParts.push(`${q.name}=${encodeURIComponent(val)}`)
      }
    })
  }
  let fullUrl = `${apiBaseUrl.value}${resolvedPath}`
  if (queryParts.length) {
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&')
  }

  const token = effectiveKeySecret.value
  const clientType = activeClientType.value
  const clientId = activeClientId.value
  const endUser = activeEndUser.value
  const body = debugBodyJson.value.trim() || '{}'

  if (activeCodeLang.value === 'curl') {
    if (ep.isMultipart) {
      return `curl -X ${ep.method} "${fullUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "X-Client-Type: ${clientType}" \\
  -H "X-Client-Id: ${clientId}" \\
  -H "X-End-User: ${endUser}" \\
  -F "file=@/path/to/manual.pdf" \\
  -F "chunkSize=500" \\
  -F "overlapSize=50"`
    }
    if (ep.method === 'GET' || ep.method === 'DELETE') {
      return `curl -X ${ep.method} "${fullUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "X-Client-Type: ${clientType}" \\
  -H "X-Client-Id: ${clientId}" \\
  -H "X-End-User: ${endUser}"`
    }
    return `curl -X ${ep.method} "${fullUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Type: ${clientType}" \\
  -H "X-Client-Id: ${clientId}" \\
  -H "X-End-User: ${endUser}" \\
  -d '${body.replace(/\n/g, '\n  ')}'`
  }

  if (activeCodeLang.value === 'python') {
    if (ep.isMultipart) {
      return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}",
    "X-Client-Type": "${clientType}",
    "X-Client-Id": "${clientId}",
    "X-End-User": "${endUser}"
}
files = {"file": open("manual.pdf", "rb")}
data = {"chunkSize": 500, "overlapSize": 50}

response = requests.${ep.method.toLowerCase()}(url, headers=headers, files=files, data=data)
print(response.status_code, response.json())`
    }
    if (ep.method === 'GET' || ep.method === 'DELETE') {
      return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}",
    "X-Client-Type": "${clientType}",
    "X-Client-Id": "${clientId}",
    "X-End-User": "${endUser}"
}

response = requests.${ep.method.toLowerCase()}(url, headers=headers)
print(response.status_code, response.json())`
    }
    return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json",
    "X-Client-Type": "${clientType}",
    "X-Client-Id": "${clientId}",
    "X-End-User": "${endUser}"
}
payload = ${body}

response = requests.${ep.method.toLowerCase()}(url, json=payload, headers=headers)
print(response.status_code, response.json())`
  }

  if (activeCodeLang.value === 'node') {
    if (ep.isMultipart) {
      return `const form = new FormData();
form.append('file', blobFile, 'manual.pdf');
form.append('chunkSize', '500');
form.append('overlapSize', '50');

const res = await fetch('${fullUrl}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer ${token}',
    'X-Client-Type': '${clientType}',
    'X-Client-Id': '${clientId}',
    'X-End-User': '${endUser}'
  },
  body: form
});
console.log(await res.json());`
    }
    if (ep.method === 'GET' || ep.method === 'DELETE') {
      return `const res = await fetch('${fullUrl}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer ${token}',
    'X-Client-Type': '${clientType}',
    'X-Client-Id': '${clientId}',
    'X-End-User': '${endUser}'
  }
});
const data = await res.json();
console.log(data);`
    }
    return `const res = await fetch('${fullUrl}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer ${token}',
    'Content-Type': 'application/json',
    'X-Client-Type': '${clientType}',
    'X-Client-Id': '${clientId}',
    'X-End-User': '${endUser}'
  },
  body: JSON.stringify(${body.replace(/\n/g, '\n  ')})
});
const data = await res.json();
console.log(data);`
  }

  // Java
  const isBodyAllowed = ep.method !== 'GET' && ep.method !== 'DELETE'
  const javaMethodCall = ep.method === 'GET'
    ? '.GET()'
    : (ep.method === 'DELETE'
      ? '.DELETE()'
      : `.${ep.method}(HttpRequest.BodyPublishers.ofString(${JSON.stringify(body || '{}')}))`)

  return `HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${fullUrl}"))
    .header("Authorization", "Bearer ${token}")
    .header("Content-Type", "application/json")
    .header("X-Client-Type", "${clientType}")
    .header("X-Client-Id", "${clientId}")
    .header("X-End-User", "${endUser}")
    ${javaMethodCall}
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`
})

// Copy Utility
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
    showToast('复制失败，请手动选中文本复制', 'error')
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

// Initialize on mount
initDebuggerForEndpoint()
</script>

<style scoped>
.api-explorer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

/* Global Environment Bar */
.explorer-env-bar {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  box-shadow: var(--shadow-card);
}

.env-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-env-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.api-version-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.env-base-url-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.env-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.env-code {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--accent-blue);
  background: var(--bg-input);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.btn-icon-tiny {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-tiny:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.env-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.env-control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.key-input-wrapper,
.device-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.env-select {
  padding: 6px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
}

.key-secret-input {
  width: 170px;
}

.type-select {
  width: 80px;
}

.client-id-input {
  width: 130px;
}

.env-input {
  padding: 6px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  font-family: inherit;
}

.env-input:focus,
.env-select:focus {
  border-color: var(--accent-blue);
}

/* Explorer Body Grid (Sidebar + Main) */
.explorer-body {
  display: grid;
  grid-template-columns: 310px 1fr;
  gap: 18px;
  align-items: start;
}

/* Left Sidebar */
.explorer-sidebar {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 180px);
  position: sticky;
  top: 16px;
  overflow-y: auto;
  box-shadow: var(--shadow-card);
}

.sidebar-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-muted);
}

.sidebar-search-input {
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  font-size: 0.82rem;
  flex: 1;
}

.btn-clear-search {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.sidebar-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-group-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}

.nav-group-title:hover {
  background: rgba(255, 255, 255, 0.03);
}

.group-title-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-input);
  padding: 1px 6px;
  border-radius: 10px;
}

.group-toggle-arrow {
  font-size: 0.7rem;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.group-toggle-arrow.rotate-180 {
  transform: rotate(-180deg);
}

.nav-endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 10px;
}

.nav-endpoint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.nav-endpoint-item:hover {
  background: rgba(59, 130, 246, 0.06);
}

.nav-endpoint-item.active {
  background: rgba(59, 130, 246, 0.15);
  border-left: 2px solid var(--accent-blue);
}

.method-badge-small {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  min-width: 42px;
  text-align: center;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.method-badge-small.get {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
}

.method-badge-small.post {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.method-badge-small.put {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.method-badge-small.delete {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.nav-endpoint-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-endpoint-item.active .nav-endpoint-path {
  color: var(--text-primary);
  font-weight: 600;
}

/* Right Main Workspace */
.explorer-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.endpoint-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.method-badge-large {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 6px;
  letter-spacing: 0.04em;
}

.method-badge-large.get {
  background: rgba(2, 132, 199, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.method-badge-large.post {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.method-badge-large.put {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.method-badge-large.delete {
  background: rgba(244, 63, 94, 0.18);
  color: #fb7185;
  border: 1px solid rgba(251, 113, 133, 0.3);
}

.endpoint-full-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-copy-url {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-url:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.scope-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: rgba(139, 92, 246, 0.12);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.endpoint-summary-title {
  margin: 2px 0 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.endpoint-description {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.endpoint-view-tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.view-tab {
  border: none;
  background: var(--bg-input);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.view-tab:hover {
  color: var(--text-primary);
}

.view-tab.active {
  background: var(--accent-blue);
  color: #fff;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
}

.pill-ready {
  font-size: 0.65rem;
  background: rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
  padding: 1px 6px;
  border-radius: 10px;
}

/* ================= SPEC TAB STYLES ================= */
.spec-content-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.spec-section-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spec-section-head h4 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.spec-table th {
  text-align: left;
  padding: 10px 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-input);
  border-bottom: 1px solid var(--border-color);
}

.spec-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  vertical-align: middle;
}

.spec-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.8rem;
  background: var(--bg-input);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent-blue);
}

.type-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(139, 92, 246, 0.12);
  color: #c084fc;
}

.loc-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.loc-pill.path {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
}

.loc-pill.query {
  background: rgba(6, 182, 212, 0.12);
  color: #22d3ee;
}

.badge-req {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(244, 63, 94, 0.15);
  color: var(--accent-rose);
}

.badge-opt {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
}

.status-badge-err {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(244, 63, 94, 0.15);
  color: var(--accent-rose);
}

.spec-example-box {
  margin-top: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.example-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
}

.example-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-copy-tiny {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 0.72rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.btn-copy-tiny:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.code-pre-block {
  margin: 0;
  padding: 16px;
  background: #090d16;
  color: #93c5fd;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  overflow-x: auto;
}

.code-pre-block.response {
  color: #86efac;
}

/* ================= DEBUGGER PLAYGROUND STYLES ================= */
.debug-content-view {
  display: flex;
  flex-direction: column;
}

.debug-workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.debug-pane {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.pane-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pane-tip {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.debug-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.sub-tip {
  font-size: 0.72rem;
  font-weight: normal;
  color: var(--text-muted);
}

.body-actions {
  display: flex;
  gap: 8px;
}

.btn-text-action {
  border: none;
  background: transparent;
  color: var(--accent-blue);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-text-action:hover {
  background: rgba(59, 130, 246, 0.1);
}

.headers-summary-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.78rem;
}

.header-kv {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-kv .k {
  color: var(--text-muted);
  width: 110px;
  flex-shrink: 0;
}

.header-kv .v code {
  color: var(--accent-blue);
}

.inline-header-input {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 8px;
  color: var(--text-primary);
  font-size: 0.78rem;
  outline: none;
  width: 140px;
}

.params-inputs-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.param-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.json-editor-wrap {
  width: 100%;
}

.json-editor-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #090d16;
  color: #93c5fd;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.5;
  outline: none;
  resize: vertical;
}

.json-editor-textarea:focus {
  border-color: var(--accent-blue);
}

.multipart-upload-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-file-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-picker-input {
  font-size: 0.8rem;
  color: var(--text-primary);
}

.upload-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.debug-action-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
}

.btn-send-request {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-hover));
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: all 0.2s ease;
}

.btn-send-request:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.45);
}

.btn-send-request:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.key-warning-hint {
  font-size: 0.76rem;
  color: var(--accent-amber);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Response Inspector */
.response-meta-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.res-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}

.res-badge.status.status-ok {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
}

.res-badge.status.status-auth {
  background: rgba(244, 63, 94, 0.18);
  color: #fb7185;
}

.res-badge.status.status-warn {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.res-badge.status.status-err {
  background: rgba(244, 63, 94, 0.25);
  color: #f43f5e;
}

.res-badge.latency {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
}

.res-badge.size {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.response-body-wrapper {
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.response-loading-state,
.response-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
  min-height: 320px;
}

.response-empty-state .empty-icon {
  font-size: 2.2rem;
  opacity: 0.3;
}

.response-empty-state h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.response-empty-state p {
  margin: 0;
  font-size: 0.8rem;
  max-width: 320px;
}

.response-display-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resp-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 6px;
}

.resp-tab {
  border: none;
  background: transparent;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.resp-tab.active {
  background: var(--bg-card);
  color: var(--accent-blue);
  font-weight: 700;
}

.response-code-container {
  background: #090d16;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px;
  max-height: 480px;
  overflow-y: auto;
}

.response-pre {
  margin: 0;
  color: #86efac;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}

.response-headers-container {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  max-height: 480px;
  overflow-y: auto;
}

.headers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.headers-table th {
  text-align: left;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-muted);
}

.headers-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

/* ================= CODE GENERATOR STYLES ================= */
.code-content-view {
  display: flex;
  flex-direction: column;
}

.code-generator-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.code-generator-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.lang-switch-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 8px;
}

.btn-code-lang {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-code-lang.active {
  background: var(--accent-blue);
  color: #fff;
  font-weight: 700;
}

.btn-copy-code-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-code-main:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.code-pre-generated {
  margin: 0;
  padding: 18px;
  background: #090d16;
  color: #d1d5db;
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Responsive */
@media (max-width: 1200px) {
  .explorer-body {
    grid-template-columns: 1fr;
  }
  .explorer-sidebar {
    position: static;
    max-height: 380px;
  }
  .debug-workspace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
