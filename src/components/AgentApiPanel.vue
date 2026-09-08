<template>
  <section class="debug-workspace api-workspace">
    <!-- Top Heading -->
    <div class="workspace-heading">
      <div class="heading-badge-row">
        <h2>访问 API</h2>
        <span class="api-version-tag">RESTful & SSE v1</span>
      </div>
      <p>
        通过开放标准协议与流式推送通道，将当前智能体接入您的前端应用、企业微信/飞书机器人或自动化后端。
        <a class="workspace-more" href="javascript:void(0)" @click="activeDetailTab = 'docs'">
          查看规范指南 <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </p>
    </div>

    <!-- Top Summary Cards (3 Cards: Base URL, Agent Status, API Key) -->
    <div class="api-summary-grid">
      <!-- Card 1: Base URL -->
      <div class="api-stat-card card-url">
        <div class="card-top-row">
          <div class="card-icon icon-blue">
            <i class="fa-solid fa-server"></i>
          </div>
          <span class="card-badge badge-blue">网关就绪</span>
        </div>
        <div class="card-title">API 服务根地址 (Base URL)</div>
        <div class="card-val-row">
          <code class="code-url">{{ apiBaseUrl }}</code>
          <button
            type="button"
            class="btn-icon-action"
            title="复制服务地址"
            @click="copyText(apiBaseUrl, 'API 服务地址已复制到剪贴板')"
          >
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
        <div class="card-footer-tip">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i>
          <span>支持 CORS 跨域请求与 Bearer 令牌鉴权</span>
        </div>
      </div>

      <!-- Card 2: Agent Status -->
      <div class="api-stat-card card-status">
        <div class="card-top-row">
          <div class="card-icon icon-emerald">
            <i class="fa-solid fa-robot"></i>
          </div>
          <span class="status-indicator" :class="statusClass">
            <span class="status-dot"></span>
            {{ statusLabel }}
          </span>
        </div>
        <div class="card-title">智能体状态 & 路由</div>
        <div class="card-val-row">
          <span class="agent-model-name" :title="`当前网关调度模型: ${effectiveRouteLabel}`">
            {{ effectiveRouteLabel }}
          </span>
          <router-link
            to="/dashboard?tab=gateway"
            class="btn-icon-action"
            title="点击前往网关修改模型路由"
          >
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </router-link>
        </div>
        <div class="card-footer-tip">
          <i class="fa-solid fa-fingerprint" style="color: var(--accent-blue);"></i>
          <span>Agent ID: <code>{{ agent?.id }}</code></span>
        </div>
      </div>

      <!-- Card 3: API Key -->
      <div class="api-stat-card card-key">
        <div class="card-top-row">
          <div class="card-icon icon-purple">
            <i class="fa-solid fa-key"></i>
          </div>
          <button
            type="button"
            class="btn-regen-key"
            title="重新生成新的 API Key"
            @click="openRegenModal"
          >
            <i class="fa-solid fa-arrows-rotate"></i>
            <span>重新生成</span>
          </button>
        </div>
        <div class="card-title">智能体专属 API 密钥 (Secret Key)</div>
        <div class="card-val-row">
          <code class="code-key">{{ showKey ? (agent?.apiKey || '未分配 Key') : maskedKey }}</code>
          <button
            type="button"
            class="btn-icon-action"
            :title="showKey ? '隐藏密钥' : '显示完整密钥'"
            @click="showKey = !showKey"
          >
            <i :class="showKey ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
          </button>
          <button
            type="button"
            class="btn-icon-action"
            title="复制密钥"
            @click="copyText(agent?.apiKey || '', 'API Key 已复制到剪贴板')"
          >
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
        <div class="card-footer-tip tip-warn">
          <i class="fa-solid fa-shield-halved"></i>
          <span>请妥善保管，切勿暴露在公开前端客户端</span>
        </div>
      </div>
    </div>

    <!-- Main Content Layout: Sidebar + Detail Pane -->
    <div class="api-main-layout">
      <!-- Left Sidebar: Endpoints Catalog -->
      <aside class="api-sidebar-panel">
        <div class="sidebar-group-title">
          <i class="fa-solid fa-layer-group"></i>
          <span>可用接口列表</span>
        </div>

        <div class="endpoint-nav-list">
          <button
            type="button"
            class="endpoint-nav-item active"
          >
            <span class="method-tag method-post">POST</span>
            <div class="endpoint-nav-info">
              <span class="endpoint-path">/chat-messages</span>
              <span class="endpoint-name">发送对话消息</span>
            </div>
            <span class="nav-state-dot active" title="已就绪"></span>
          </button>
        </div>

        <div class="sidebar-group-title future-group">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>拓展接口规划 (即将推出)</span>
        </div>

        <div class="endpoint-nav-list future-list">
          <div class="endpoint-nav-item disabled">
            <span class="method-tag method-post tag-disabled">POST</span>
            <div class="endpoint-nav-info">
              <span class="endpoint-path">/chat-messages/:id/stop</span>
              <span class="endpoint-name">停止流式输出</span>
            </div>
            <span class="plan-tag">规划中</span>
          </div>

          <div class="endpoint-nav-item disabled">
            <span class="method-tag method-get tag-disabled">GET</span>
            <div class="endpoint-nav-info">
              <span class="endpoint-path">/conversations</span>
              <span class="endpoint-name">获取会话历史列表</span>
            </div>
            <span class="plan-tag">规划中</span>
          </div>

          <div class="endpoint-nav-item disabled">
            <span class="method-tag method-get tag-disabled">GET</span>
            <div class="endpoint-nav-info">
              <span class="endpoint-path">/messages</span>
              <span class="endpoint-name">获取会话具体消息</span>
            </div>
            <span class="plan-tag">规划中</span>
          </div>

          <div class="endpoint-nav-item disabled">
            <span class="method-tag method-post tag-disabled">POST</span>
            <div class="endpoint-nav-info">
              <span class="endpoint-path">/audio-to-text</span>
              <span class="endpoint-name">语音转文字 (ASR)</span>
            </div>
            <span class="plan-tag">规划中</span>
          </div>
        </div>
      </aside>

      <!-- Right Detail Pane -->
      <section class="api-detail-panel">
        <!-- Sub Tabs: Document vs Online Playground -->
        <div class="detail-subtabs-row">
          <div class="detail-subtabs">
            <button
              type="button"
              class="subtab-btn"
              :class="{ active: activeDetailTab === 'docs' }"
              @click="activeDetailTab = 'docs'"
            >
              <i class="fa-solid fa-book-bookmark"></i>
              <span>接口调用文档 (API Reference)</span>
            </button>
            <button
              type="button"
              class="subtab-btn"
              :class="{ active: activeDetailTab === 'playground' }"
              @click="activeDetailTab = 'playground'"
            >
              <i class="fa-solid fa-flask-vial"></i>
              <span>在线调试台 (Playground)</span>
            </button>
          </div>

          <div class="endpoint-meta-badge">
            <span class="method-tag method-post">POST</span>
            <code class="meta-endpoint-uri">/api/v1/chat-messages</code>
          </div>
        </div>

        <!-- TAB 1: API DOCUMENTATION -->
        <div v-show="activeDetailTab === 'docs'" class="api-doc-view">
          <!-- Overview Banner -->
          <div class="doc-section-card">
            <div class="doc-sec-header">
              <div class="doc-sec-title">
                <i class="fa-solid fa-info-circle" style="color: var(--accent-blue);"></i>
                <span>接口定义与认证方式</span>
              </div>
            </div>
            <div class="doc-endpoint-banner">
              <span class="method-badge-lg">POST</span>
              <code class="full-url-code">{{ apiBaseUrl }}/chat-messages</code>
              <button
                type="button"
                class="btn-copy-sm"
                @click="copyText(`${apiBaseUrl}/chat-messages`, '接口完整 URL 已复制')"
              >
                <i class="fa-regular fa-copy"></i> 复制
              </button>
            </div>
            <p class="doc-desc-text">
              向当前智能体发送一条对话消息。支持两种响应模式：
              <b>流式模式 (streaming)</b> 采用标准 Server-Sent Events (SSE) 逐字推送回答；
              <b>阻塞模式 (blocking)</b> 等待模型整体生成完毕后一次性返回 JSON 报文。
            </p>

            <div class="headers-spec-grid">
              <div class="header-spec-item">
                <span class="header-name">Authorization</span>
                <span class="header-type">Header (必填)</span>
                <code class="header-val">Bearer {{ agent?.apiKey ? (showKey ? agent.apiKey : 'sk-agent-••••••••') : '<YOUR_API_KEY>' }}</code>
              </div>
              <div class="header-spec-item">
                <span class="header-name">Content-Type</span>
                <span class="header-type">Header (必填)</span>
                <code class="header-val">application/json</code>
              </div>
            </div>
          </div>

          <!-- Request Parameters Table -->
          <div class="doc-section-card">
            <div class="doc-sec-header">
              <div class="doc-sec-title">
                <i class="fa-solid fa-sliders" style="color: var(--accent-purple);"></i>
                <span>请求体参数说明 (JSON Body)</span>
              </div>
            </div>

            <div class="api-table-wrapper">
              <table class="api-spec-table">
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>默认值</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code class="param-name">message</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="req-tag required">必填</span></td>
                    <td>-</td>
                    <td>用户输入的问题、指令或对话内容文本。</td>
                  </tr>
                  <tr>
                    <td><code class="param-name">response_mode</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="req-tag optional">可选</span></td>
                    <td><code>streaming</code></td>
                    <td>
                      响应返回模式。
                      可选值：<br>
                      • <code>streaming</code>: 流式返回 (SSE / text/event-stream)<br>
                      • <code>blocking</code>: 阻塞返回 (application/json)
                    </td>
                  </tr>
                  <tr>
                    <td><code class="param-name">conversation_id</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="req-tag optional">可选</span></td>
                    <td>-</td>
                    <td>
                      会话 ID。需要多轮连续对话时，传入上一次回复返回的 <code>conversation_id</code>；若开启全新对话留空即可。
                    </td>
                  </tr>
                  <tr>
                    <td><code class="param-name">user</code></td>
                    <td><span class="type-pill">string</span></td>
                    <td><span class="req-tag optional">可选</span></td>
                    <td><code>API-Caller</code></td>
                    <td>终端用户唯一标识（如用户 ID、用户名或系统工号），便于在日志和监测模块追溯与审计。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Code Samples Section -->
          <div class="doc-section-card">
            <div class="doc-sec-header">
              <div class="doc-sec-title">
                <i class="fa-solid fa-code" style="color: var(--accent-cyan);"></i>
                <span>调用代码示例 (Code Samples)</span>
              </div>
              <div class="code-tab-pills">
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: codeLang === 'curl-stream' }"
                  @click="codeLang = 'curl-stream'"
                >
                  cURL (流式)
                </button>
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: codeLang === 'curl-block' }"
                  @click="codeLang = 'curl-block'"
                >
                  cURL (非流式)
                </button>
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: codeLang === 'python' }"
                  @click="codeLang = 'python'"
                >
                  Python
                </button>
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: codeLang === 'javascript' }"
                  @click="codeLang = 'javascript'"
                >
                  JavaScript (Fetch)
                </button>
              </div>
            </div>

            <div class="code-display-box">
              <div class="code-box-header">
                <span class="code-lang-tag">{{ codeLangLabel }}</span>
                <button
                  type="button"
                  class="btn-copy-code"
                  @click="copyText(activeCodeSnippet, '代码示例已复制')"
                >
                  <i class="fa-regular fa-copy"></i> 复制完整代码
                </button>
              </div>
              <pre class="code-content"><code>{{ activeCodeSnippet }}</code></pre>
            </div>
          </div>

          <!-- Response Samples Section -->
          <div class="doc-section-card">
            <div class="doc-sec-header">
              <div class="doc-sec-title">
                <i class="fa-solid fa-reply-all" style="color: var(--accent-emerald);"></i>
                <span>响应结果示例 (Response Examples)</span>
              </div>
              <div class="code-tab-pills">
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: respSampleMode === 'stream' }"
                  @click="respSampleMode = 'stream'"
                >
                  流式 SSE (text/event-stream)
                </button>
                <button
                  type="button"
                  class="code-tab-pill"
                  :class="{ active: respSampleMode === 'block' }"
                  @click="respSampleMode = 'block'"
                >
                  阻塞 JSON (application/json)
                </button>
              </div>
            </div>

            <div class="code-display-box">
              <div class="code-box-header">
                <span class="code-lang-tag">{{ respSampleMode === 'stream' ? 'SSE Events Stream' : 'JSON Object' }}</span>
                <button
                  type="button"
                  class="btn-copy-code"
                  @click="copyText(activeRespSnippet, '响应示例已复制')"
                >
                  <i class="fa-regular fa-copy"></i> 复制响应示例
                </button>
              </div>
              <pre class="code-content response-pre"><code>{{ activeRespSnippet }}</code></pre>
            </div>
          </div>

          <!-- Error Codes Section -->
          <div class="doc-section-card">
            <div class="doc-sec-header">
              <div class="doc-sec-title">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i>
                <span>HTTP 状态码与常见错误</span>
              </div>
            </div>
            <div class="api-table-wrapper">
              <table class="api-spec-table">
                <thead>
                  <tr>
                    <th>状态码</th>
                    <th>错误说明</th>
                    <th>可能原因及处理建议</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="code-status-tag status-200">200 OK</span></td>
                    <td>请求成功</td>
                    <td>正常生成并返回对话内容。</td>
                  </tr>
                  <tr>
                    <td><span class="code-status-tag status-400">400 Bad Request</span></td>
                    <td>请求参数错误</td>
                    <td>未提供 <code>message</code> 文本或格式不合法，请检查 JSON 体。</td>
                  </tr>
                  <tr>
                    <td><span class="code-status-tag status-401">401 Unauthorized</span></td>
                    <td>API Key 鉴权失败</td>
                    <td>请求头未包含 <code>Authorization: Bearer &lt;key&gt;</code>，或 Key 已失效。</td>
                  </tr>
                  <tr>
                    <td><span class="code-status-tag status-404">404 Not Found</span></td>
                    <td>智能体未找到</td>
                    <td>当前 API Key 对应的智能体已不存在或被删除。</td>
                  </tr>
                  <tr>
                    <td><span class="code-status-tag status-500">500 Internal Error</span></td>
                    <td>大模型网关或生成异常</td>
                    <td>模型服务提供商超时或网络异常，请查看网关配置或重试。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 2: ONLINE PLAYGROUND -->
        <div v-show="activeDetailTab === 'playground'" class="api-playground-view">
          <!-- Playground Form -->
          <div class="playground-control-card">
            <div class="pg-card-header">
              <div class="pg-title">
                <i class="fa-solid fa-play" style="color: var(--accent-blue);"></i>
                <span>API 在线请求参数配置</span>
              </div>
              <div class="pg-mode-selector">
                <label
                  class="mode-pill"
                  :class="{ active: playParams.response_mode === 'streaming' }"
                >
                  <input
                    v-model="playParams.response_mode"
                    type="radio"
                    value="streaming"
                  >
                  <i class="fa-solid fa-bolt"></i> 流式 (streaming)
                </label>
                <label
                  class="mode-pill"
                  :class="{ active: playParams.response_mode === 'blocking' }"
                >
                  <input
                    v-model="playParams.response_mode"
                    type="radio"
                    value="blocking"
                  >
                  <i class="fa-solid fa-cube"></i> 阻塞 (blocking)
                </label>
              </div>
            </div>

            <div class="pg-grid-inputs">
              <div class="pg-input-item">
                <label class="pg-label">
                  <span>用户标识 (user)</span>
                  <span class="pg-hint">追踪调用者</span>
                </label>
                <input
                  v-model="playParams.user"
                  type="text"
                  class="pg-text-input"
                  placeholder="如: api-developer-01"
                >
              </div>
              <div class="pg-input-item">
                <label class="pg-label">
                  <span>会话标识 (conversation_id)</span>
                  <span class="pg-hint">留空自动新建</span>
                </label>
                <div class="pg-input-with-action">
                  <input
                    v-model="playParams.conversation_id"
                    type="text"
                    class="pg-text-input"
                    placeholder="留空即创建新会话"
                  >
                  <button
                    v-if="playParams.conversation_id"
                    type="button"
                    class="btn-clear-id"
                    title="清空并开启新会话"
                    @click="playParams.conversation_id = ''"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="pg-input-item message-input-box">
              <label class="pg-label">
                <span>请求消息 (message) <span style="color: var(--accent-rose);">*</span></span>
                <span class="pg-hint">发送给智能体的实际问题</span>
              </label>
              <textarea
                v-model="playParams.message"
                class="pg-textarea"
                rows="3"
                placeholder="请输入要向当前智能体提问的内容..."
              ></textarea>
            </div>

            <div class="pg-action-bar">
              <div class="pg-preset-row">
                <span class="preset-tag" @click="playParams.message = '请用简练的语言做个自我介绍'">自我介绍</span>
                <span class="preset-tag" @click="playParams.message = '请告诉我你拥有哪些工具扩展能力？'">查询工具能力</span>
                <span class="preset-tag" @click="playParams.message = '写一个快速排序算法的 Python 实现'">写 Python 算法</span>
              </div>
              <button
                type="button"
                class="btn-send-play"
                :disabled="playLoading || !playParams.message.trim()"
                @click="executePlaygroundRequest"
              >
                <i v-if="playLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-paper-plane"></i>
                <span>{{ playLoading ? '请求执行中...' : '发送 API 请求' }}</span>
              </button>
            </div>
          </div>

          <!-- Playground Console Output -->
          <div class="playground-console-card">
            <div class="console-header">
              <div class="console-title-group">
                <div class="console-title">
                  <i class="fa-solid fa-terminal"></i>
                  <span>执行结果响应报文 (Response Console)</span>
                </div>
                <div v-if="playStatus" class="console-badges">
                  <span
                    class="badge-code"
                    :class="playStatus.success ? 'status-ok' : 'status-err'"
                  >
                    HTTP {{ playStatus.code }}
                  </span>
                  <span v-if="playStatus.latencyMs" class="badge-meta">
                    <i class="fa-regular fa-clock"></i> {{ playStatus.latencyMs }}ms
                  </span>
                  <span v-if="playStatus.tokens" class="badge-meta">
                    <i class="fa-solid fa-ticket"></i> {{ playStatus.tokens }} Tokens
                  </span>
                </div>
              </div>

              <div class="console-actions">
                <button
                  type="button"
                  class="btn-console-tool"
                  :class="{ active: playViewMode === 'formatted' }"
                  @click="playViewMode = 'formatted'"
                >
                  {{ playParams.response_mode === 'streaming' ? '流式文本' : '格式化' }}
                </button>
                <button
                  type="button"
                  class="btn-console-tool"
                  :class="{ active: playViewMode === 'raw' }"
                  @click="playViewMode = 'raw'"
                >
                  原始报文
                </button>
                <button
                  v-if="playResponseText"
                  type="button"
                  class="btn-console-tool"
                  title="复制结果"
                  @click="copyText(playResponseText, '响应报文已复制')"
                >
                  <i class="fa-regular fa-copy"></i>
                </button>
                <button
                  type="button"
                  class="btn-console-tool"
                  title="清空控制台"
                  @click="clearConsole"
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <!-- Console Body -->
            <div class="console-body" ref="consoleBodyRef">
              <div v-if="!playLoading && !playResponseText && !playRawStream.length" class="console-empty">
                <i class="fa-solid fa-terminal console-empty-icon"></i>
                <p>点击「发送 API 请求」后，此处将实时展示调用响应与 SSE 流式事件流</p>
              </div>

              <!-- Stream Text View -->
              <div
                v-else-if="playViewMode === 'formatted' && playParams.response_mode === 'streaming'"
                class="stream-formatted-view"
              >
                <div class="stream-text-content">
                  {{ playStreamAccumulated }}
                  <span v-if="playLoading" class="typing-cursor"></span>
                </div>
                <div v-if="playStreamMeta" class="stream-meta-footer">
                  <div class="meta-item"><i class="fa-solid fa-microchip"></i> 模型: {{ playStreamMeta.model || effectiveModel }}</div>
                  <div class="meta-item"><i class="fa-regular fa-clock"></i> 耗时: {{ playStreamMeta.latency_ms || playStatus?.latencyMs || 0 }}ms</div>
                  <div class="meta-item"><i class="fa-solid fa-ticket"></i> Token: {{ playStreamMeta.tokens_used || 0 }}</div>
                  <div v-if="playParams.conversation_id" class="meta-item"><i class="fa-solid fa-comments"></i> 会话 ID: {{ playParams.conversation_id }}</div>
                </div>
              </div>

              <!-- Formatted JSON View -->
              <pre
                v-else-if="playViewMode === 'formatted' && playParams.response_mode === 'blocking'"
                class="console-code-block"
              ><code>{{ playResponseText }}</code></pre>

              <!-- Raw Stream Chunks View -->
              <div v-else class="raw-stream-view">
                <div
                  v-for="(chunk, idx) in playRawStream"
                  :key="idx"
                  class="raw-chunk-row"
                >
                  <span class="chunk-idx">#{{ idx + 1 }}</span>
                  <span class="chunk-event">{{ chunk.event || 'message' }}</span>
                  <code class="chunk-payload">{{ chunk.payload }}</code>
                </div>
                <pre v-if="playParams.response_mode === 'blocking'" class="console-code-block"><code>{{ playResponseText }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Regenerate API Key Confirmation Modal -->
    <div v-if="regenModalOpen" class="tool-modal-backdrop" @click.self="regenModalOpen = false">
      <div class="tool-modal-dialog regen-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i>
            <span>确认重新生成 API Key？</span>
          </div>
          <button type="button" class="btn-modal-close" @click="regenModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div class="regen-warning-card">
            <p>
              重新生成后，<b>旧的 API Key 将立即失效并永久销毁</b>。
              所有当前正在使用该 Key 接入的外部自动化服务、应用系统等将全部无法访问，必须手动替换为新 Key。
            </p>
            <div class="regen-current-key-row">
              <span class="label">当前密钥：</span>
              <code>{{ agent?.apiKey || '无' }}</code>
            </div>
          </div>
        </div>
        <div class="tool-modal-footer">
          <button type="button" class="btn-modal-cancel" @click="regenModalOpen = false">取消</button>
          <button
            type="button"
            class="btn-regen-confirm"
            :disabled="regening"
            @click="confirmRegenerateKey"
          >
            <i v-if="regening" class="fa-solid fa-circle-notch fa-spin"></i>
            <i v-else class="fa-solid fa-arrows-rotate"></i>
            <span>{{ regening ? '生成中...' : '确认重置并生成' }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const props = defineProps({
  agent: {
    type: Object,
    required: true
  },
  routedChannel: {
    type: String,
    default: ''
  },
  routedModel: {
    type: String,
    default: ''
  },
  routedLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['agent-updated'])
const { showToast } = useToast()

const localGatewayRoute = ref({ channel: '', model: '', label: '' })

async function fetchGatewayRoute() {
  try {
    const res = await http.get('/api/model-gateway')
    if (res.success && res.data) {
      const providers = res.data.providers || []
      const policy = res.data.policy || {}
      const ready = providers.filter((p) => p.enabled && p.configured)
      const defaultId = policy.defaultProviderId || ''
      const primary = ready.find((p) => p.id === defaultId) || ready[0]
      if (primary) {
        const ch = primary.name || ''
        const mo = primary.defaultModel || ''
        localGatewayRoute.value = {
          channel: ch,
          model: mo,
          label: ch && mo ? `${ch} · ${mo}` : (mo || ch || '默认模型')
        }
      }
    }
  } catch {}
}

onMounted(() => {
  fetchGatewayRoute()
})

watch(() => props.agent?.id, () => {
  fetchGatewayRoute()
})

const effectiveChannel = computed(() => {
  return props.routedChannel || localGatewayRoute.value.channel || ''
})

const effectiveModel = computed(() => {
  return props.routedModel || localGatewayRoute.value.model || props.agent?.modelName || '默认模型'
})

const effectiveRouteLabel = computed(() => {
  if (props.routedLabel && props.routedLabel !== '未配置网关') return props.routedLabel
  if (localGatewayRoute.value.label) return localGatewayRoute.value.label
  if (effectiveChannel.value && effectiveModel.value) {
    return `${effectiveChannel.value} · ${effectiveModel.value}`
  }
  return effectiveModel.value || props.agent?.modelName || '默认模型'
})

// View states
const activeDetailTab = ref('docs')
const showKey = ref(false)
const codeLang = ref('curl-stream')
const respSampleMode = ref('stream')
const regenModalOpen = ref(false)
const regening = ref(false)

// Playground states
const playParams = ref({
  message: '你好，请做个简短的自我介绍。',
  response_mode: 'streaming',
  conversation_id: '',
  user: 'developer-tester'
})
const playLoading = ref(false)
const playStatus = ref(null)
const playResponseText = ref('')
const playStreamAccumulated = ref('')
const playStreamMeta = ref(null)
const playRawStream = ref([])
const playViewMode = ref('formatted')
const consoleBodyRef = ref(null)

// Computed
const apiBaseUrl = computed(() => {
  return `${window.location.origin}/api/v1`
})

const maskedKey = computed(() => {
  const key = props.agent?.apiKey
  if (!key) return 'sk-agent-••••••••••••••••••••••••'
  if (key.length <= 14) return key
  return key.substring(0, 9) + '••••••••••••••••' + key.substring(key.length - 4)
})

const statusLabel = computed(() => {
  const s = (props.agent?.status || '').toUpperCase()
  if (s === 'RUNNING') return '运行中'
  if (s === 'STOPPED') return '已停用'
  return '草稿'
})

const statusClass = computed(() => {
  const s = (props.agent?.status || '').toUpperCase()
  if (s === 'RUNNING') return 'status-running'
  if (s === 'STOPPED') return 'status-stopped'
  return 'status-draft'
})

const codeLangLabel = computed(() => {
  switch (codeLang.value) {
    case 'curl-stream': return 'cURL (流式 SSE)'
    case 'curl-block': return 'cURL (非流式 JSON)'
    case 'python': return 'Python (requests 流式)'
    case 'javascript': return 'JavaScript (Fetch API)'
    default: return 'Code'
  }
})

const activeCodeSnippet = computed(() => {
  const url = `${apiBaseUrl.value}/chat-messages`
  const key = props.agent?.apiKey || 'YOUR_API_KEY'

  if (codeLang.value === 'curl-stream') {
    return `curl -X POST '${url}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "message": "你好，请自我介绍一下",
    "response_mode": "streaming",
    "user": "external-user-1"
  }'`
  }

  if (codeLang.value === 'curl-block') {
    return `curl -X POST '${url}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "message": "你好，请介绍一下你的功能",
    "response_mode": "blocking",
    "user": "external-user-1"
  }'`
  }

  if (codeLang.value === 'python') {
    return `import requests
import json

url = "${url}"
headers = {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json"
}
payload = {
    "message": "你好，请自我介绍一下",
    "response_mode": "streaming",
    "user": "python-client"
}

# 流式消费 SSE 响应
with requests.post(url, headers=headers, json=payload, stream=True) as response:
    for line in response.iter_lines():
        if line:
            decoded = line.decode('utf-8')
            if decoded.startswith('data:'):
                data = json.loads(decoded[5:].strip())
                if data.get('event') == 'message':
                    print(data.get('answer', ''), end='', flush=True)
                elif data.get('event') == 'message_end':
                    print("\\n[完成] Tokens:", data.get('metadata', {}).get('tokens_used'))`
  }

  if (codeLang.value === 'javascript') {
    return `// JavaScript / Node.js Fetch 示例
const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "你好，请自我介绍一下",
    response_mode: "streaming",
    user: "web-client"
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");
let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  
  const lines = buffer.split("\\n");
  buffer = lines.pop(); // 保留未完整的行
  
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const data = JSON.parse(line.slice(5).trim());
      if (data.event === "message") {
        process.stdout.write(data.answer || "");
      }
    }
  }
}`
  }

  return ''
})

const activeRespSnippet = computed(() => {
  const currentModel = effectiveModel.value || 'deepseek-chat'
  if (respSampleMode.value === 'stream') {
    return `// 响应头: Content-Type: text/event-stream;charset=UTF-8

event: message
data: {"event":"message","conversation_id":"conv-8f2a1b9c","message_id":"msg-4a1d9c2e","answer":"您好","created_at":1741234567}

event: message
data: {"event":"message","conversation_id":"conv-8f2a1b9c","message_id":"msg-4a1d9c2e","answer":"！我是","created_at":1741234567}

event: message
data: {"event":"message","conversation_id":"conv-8f2a1b9c","message_id":"msg-4a1d9c2e","answer":"您的智能助手。","created_at":1741234567}

event: message_end
data: {"event":"message_end","conversation_id":"conv-8f2a1b9c","message_id":"msg-4a1d9c2e","metadata":{"model":"${currentModel}","tokens_used":48,"latency_ms":312,"tool_called":null}}`
  }

  return `// 响应头: Content-Type: application/json;charset=UTF-8
// HTTP 状态码: 200 OK

{
  "code": 200,
  "message": "success",
  "data": {
    "conversation_id": "conv-8f2a1b9c",
    "message_id": "msg-4a1d9c2e",
    "reply": "您好！我是您的智能助手，具备联网检索、代码编写和实时问答等能力，请问今天有什么可以帮您？",
    "model": "${currentModel}",
    "tool_called": null,
    "tokens_used": 68,
    "latency_ms": 420,
    "created_at": 1741234567
  }
}`
})

// Methods
function copyText(text, successMsg) {
  if (!text) {
    showToast('内容为空，无法复制', 'warning')
    return
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || '已复制到剪贴板', 'success')
  }).catch(() => {
    // Fallback
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    showToast(successMsg || '已复制到剪贴板', 'success')
  })
}

function openRegenModal() {
  regenModalOpen.value = true
}

async function confirmRegenerateKey() {
  if (!props.agent?.id) return
  regening.value = true
  try {
    const res = await http.post(`/api/agents/${props.agent.id}/regenerate-api-key`)
    if (res.success && res.data?.apiKey) {
      showToast('API Key 重新生成成功', 'success', 2500)
      emit('agent-updated', {
        ...props.agent,
        apiKey: res.data.apiKey
      })
      regenModalOpen.value = false
    } else {
      showToast(res.message || '生成失败，请重试', 'error')
    }
  } catch (err) {
    showToast(err.message || '生成请求发生错误', 'error')
  } finally {
    regening.value = false
  }
}

function clearConsole() {
  playResponseText.value = ''
  playStreamAccumulated.value = ''
  playStreamMeta.value = null
  playRawStream.value = []
  playStatus.value = null
}

async function executePlaygroundRequest() {
  if (!playParams.value.message.trim()) {
    showToast('请输入提问内容', 'warning')
    return
  }

  const startTime = Date.now()
  playLoading.value = true
  playStatus.value = null
  playResponseText.value = ''
  playStreamAccumulated.value = ''
  playStreamMeta.value = null
  playRawStream.value = []

  const isStreaming = playParams.value.response_mode === 'streaming'
  const endpoint = `${apiBaseUrl.value}/chat-messages`
  const key = props.agent?.apiKey || ''

  if (isStreaming) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          message: playParams.value.message.trim(),
          response_mode: 'streaming',
          conversation_id: playParams.value.conversation_id || undefined,
          user: playParams.value.user || undefined
        })
      })

      playStatus.value = {
        code: resp.status,
        success: resp.ok,
        latencyMs: Date.now() - startTime,
        tokens: 0
      }

      if (!resp.ok) {
        const errText = await resp.text()
        playResponseText.value = errText
        showToast(`请求失败: HTTP ${resp.status}`, 'error')
        playLoading.value = false
        return
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let streamBuffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        streamBuffer += chunkText
        const lines = streamBuffer.split('\n')
        streamBuffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim()
            try {
              const data = JSON.parse(jsonStr)
              playRawStream.value.push({ event: data.event, payload: jsonStr })

              if (data.event === 'message') {
                playStreamAccumulated.value += (data.answer || '')
                if (data.conversation_id && !playParams.value.conversation_id) {
                  playParams.value.conversation_id = data.conversation_id
                }
              } else if (data.event === 'message_end') {
                playStreamMeta.value = data.metadata || {}
                if (playStatus.value && data.metadata?.tokens_used) {
                  playStatus.value.tokens = data.metadata.tokens_used
                }
              }
            } catch (e) {
              playRawStream.value.push({ event: 'raw', payload: jsonStr })
            }
          }
        }
        await nextTick()
        if (consoleBodyRef.value) {
          consoleBodyRef.value.scrollTop = consoleBodyRef.value.scrollHeight
        }
      }

      playStatus.value.latencyMs = Date.now() - startTime
      showToast('流式调用完成', 'success', 1500)
    } catch (err) {
      playStatus.value = {
        code: 500,
        success: false,
        latencyMs: Date.now() - startTime,
        tokens: 0
      }
      playResponseText.value = `请求异常: ${err.message}`
      showToast('网络或服务端异常: ' + err.message, 'error')
    } finally {
      playLoading.value = false
    }
  } else {
    // Blocking mode
    try {
      const res = await http.post('/api/v1/chat-messages', {
        message: playParams.value.message.trim(),
        response_mode: 'blocking',
        conversation_id: playParams.value.conversation_id || undefined,
        user: playParams.value.user || undefined
      }, {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      })

      const latency = Date.now() - startTime
      playStatus.value = {
        code: res.code || 200,
        success: res.success,
        latencyMs: res.data?.latency_ms || latency,
        tokens: res.data?.tokens_used || 0
      }

      playResponseText.value = JSON.stringify(res, null, 2)

      if (res.success && res.data?.conversation_id) {
        playParams.value.conversation_id = res.data.conversation_id
      }
      showToast('阻塞调用成功', 'success', 1500)
    } catch (err) {
      playStatus.value = {
        code: 500,
        success: false,
        latencyMs: Date.now() - startTime,
        tokens: 0
      }
      playResponseText.value = JSON.stringify(err, null, 2)
      showToast('请求失败', 'error')
    } finally {
      playLoading.value = false
    }
  }
}
</script>

<style scoped>
.api-workspace {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.heading-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.api-version-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.3);
  letter-spacing: 0.5px;
}

/* 3 Top Summary Cards */
.api-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.api-stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.api-stat-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.icon-blue {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-blue);
}

.icon-emerald {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
}

.icon-purple {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

.card-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.badge-blue {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 14px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-running {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.status-running .status-dot {
  background: var(--accent-emerald);
  box-shadow: 0 0 6px var(--accent-emerald);
}

.status-stopped {
  background: rgba(156, 163, 175, 0.12);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}
.status-stopped .status-dot {
  background: var(--text-muted);
}

.status-draft {
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.status-draft .status-dot {
  background: var(--accent-amber);
}

.card-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.card-val-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
}

.code-url, .code-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-model-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.btn-icon-action {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-action:hover {
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.12);
}

.btn-regen-key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-purple);
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-regen-key:hover {
  background: rgba(139, 92, 246, 0.25);
  transform: translateY(-1px);
}

.card-footer-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.card-footer-tip.tip-warn {
  color: var(--accent-amber);
}

/* Split Layout */
.api-main-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}

/* Sidebar */
.api-sidebar-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 6px;
}

.future-group {
  margin-top: 14px;
}

.endpoint-nav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.endpoint-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.endpoint-nav-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--accent-blue);
}

.endpoint-nav-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: transparent;
  border-color: var(--border-color);
}

.endpoint-nav-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.endpoint-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endpoint-name {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.method-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.method-post {
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.35);
}

.method-get {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.tag-disabled {
  background: rgba(156, 163, 175, 0.1);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.nav-state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-blue);
  box-shadow: 0 0 6px var(--accent-blue);
}

.plan-tag {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-input);
  padding: 1px 6px;
  border-radius: 4px;
}

/* Detail Panel */
.api-detail-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-subtabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 14px;
}

.detail-subtabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.subtab-btn:hover {
  color: var(--text-primary);
}

.subtab-btn.active {
  background: var(--bg-input);
  color: var(--accent-blue);
  border-color: var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.endpoint-meta-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-endpoint-uri {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

/* Doc Cards */
.api-doc-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.doc-section-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.doc-sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.doc-sec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.doc-endpoint-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
}

.method-badge-lg {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--accent-blue);
  color: white;
}

.full-url-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
}

.btn-copy-sm {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-copy-sm:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.doc-desc-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.headers-spec-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.header-spec-item {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-type {
  font-size: 11px;
  color: var(--text-muted);
}

.header-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: var(--accent-cyan);
}

/* API Tables */
.api-table-wrapper {
  overflow-x: auto;
}

.api-spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.api-spec-table th {
  padding: 10px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.api-spec-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  line-height: 1.5;
}

.api-spec-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.param-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: var(--accent-blue);
}

.type-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-muted);
}

.req-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.req-tag.required {
  background: rgba(244, 63, 94, 0.12);
  color: var(--accent-rose);
}

.req-tag.optional {
  background: rgba(156, 163, 175, 0.12);
  color: var(--text-muted);
}

.code-status-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-200 { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
.status-400 { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
.status-401 { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }
.status-404 { background: rgba(139, 92, 246, 0.15); color: var(--accent-purple); }
.status-500 { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }

/* Code Blocks */
.code-tab-pills {
  display: flex;
  gap: 6px;
}

.code-tab-pill {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.code-tab-pill.active {
  background: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
}

.code-display-box {
  background: #080c14;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.code-box-header {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-lang-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: var(--text-muted);
}

.btn-copy-code {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 11.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
}

.btn-copy-code:hover {
  color: var(--accent-blue);
}

.code-content {
  padding: 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #e2e8f0;
  overflow-x: auto;
  white-space: pre;
}

.response-pre {
  color: #7dd3fc;
}

/* Playground View */
.api-playground-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.playground-control-card, .playground-console-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pg-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pg-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.pg-mode-selector {
  display: flex;
  gap: 8px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-pill input {
  display: none;
}

.mode-pill.active {
  background: var(--bg-secondary);
  color: var(--accent-blue);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.pg-grid-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.pg-input-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.pg-hint {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}

.pg-text-input {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.pg-text-input:focus {
  border-color: var(--accent-blue);
}

.pg-input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.pg-input-with-action .pg-text-input {
  width: 100%;
  padding-right: 32px;
}

.btn-clear-id {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-clear-id:hover {
  color: var(--accent-rose);
}

.pg-textarea {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.pg-textarea:focus {
  border-color: var(--accent-blue);
}

.pg-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pg-preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.preset-tag {
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.preset-tag:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.1);
}

.btn-send-play {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 22px;
  border-radius: 8px;
  background: var(--accent-blue);
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-send-play:hover:not(:disabled) {
  background: var(--accent-blue-hover);
  transform: translateY(-1px);
}

.btn-send-play:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Console Card */
.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.console-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.console-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.console-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.status-ok { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
.status-err { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }

.badge-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-console-tool {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-console-tool.active {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.btn-console-tool:hover {
  color: var(--text-primary);
}

.console-body {
  min-height: 220px;
  max-height: 480px;
  overflow-y: auto;
  background: #080c14;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.console-empty {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.console-empty-icon {
  font-size: 32px;
  opacity: 0.3;
}

.stream-formatted-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stream-text-content {
  font-size: 13.5px;
  line-height: 1.7;
  color: #f1f5f9;
  white-space: pre-wrap;
  word-break: break-word;
}

.typing-cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  background: var(--accent-blue);
  margin-left: 4px;
  vertical-align: middle;
  animation: blink 0.9s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.stream-meta-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.console-code-block {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #38bdf8;
  white-space: pre-wrap;
  word-break: break-all;
}

.raw-stream-view {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.raw-chunk-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  padding: 3px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
}

.chunk-idx {
  color: var(--text-muted);
  width: 32px;
  flex-shrink: 0;
}

.chunk-event {
  color: var(--accent-emerald);
  font-weight: 600;
  width: 90px;
  flex-shrink: 0;
}

.chunk-payload {
  color: #e2e8f0;
  word-break: break-all;
}

/* Regenerate Modal */
.regen-modal-dialog {
  max-width: 480px;
}

.regen-warning-card {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 8px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.regen-current-key-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.regen-current-key-row code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--accent-amber);
}

.btn-regen-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--accent-amber);
  color: #0f172a;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-regen-confirm:hover:not(:disabled) {
  background: #f59e0be6;
  transform: translateY(-1px);
}

.btn-regen-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .api-summary-grid {
    grid-template-columns: 1fr;
  }
  .api-main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
