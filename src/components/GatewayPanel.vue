<template>
  <div class="gateway-page">
    <!-- 顶部主导航 Tab 切换 -->
    <div class="gateway-header-bar">
      <div class="gateway-header-info">
        <h2>AI 引擎与模型网关</h2>
        <p class="gateway-header-sub">集中管理大语言模型路由通道、向量化 Embedding 模型及外部 Dify 知识引擎，配置密文持久化至数据库，安全可靠。</p>
      </div>
      <div class="gateway-nav-tabs">
        <button
          type="button"
          class="gateway-nav-tab"
          :class="{ active: activeSection === 'llm' }"
          @click="activeSection = 'llm'"
        >
          <i class="fa-solid fa-comments"></i>
          <span>LLM 大语言模型</span>
          <span class="tab-badge">{{ overview.readyCount || 0 }} 就绪</span>
        </button>

        <button
          type="button"
          class="gateway-nav-tab"
          :class="{ active: activeSection === 'embedding' }"
          @click="activeSection = 'embedding'"
        >
          <i class="fa-solid fa-dna"></i>
          <span>Embedding 向量模型</span>
          <span v-if="activeEmbedding" class="tab-badge badge-active" :title="'当前生效: ' + activeEmbedding.name">
            {{ activeEmbedding.modelName || activeEmbedding.name }}
          </span>
        </button>

        <button
          type="button"
          class="gateway-nav-tab"
          :class="{ active: activeSection === 'dify' }"
          @click="activeSection = 'dify'"
        >
          <i class="fa-solid fa-book-atlas"></i>
          <span>Dify 知识引擎</span>
          <span v-if="activeDify" class="tab-badge badge-active" :title="'当前生效: ' + activeDify.name">
            {{ activeDify.name }}
          </span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 1: LLM 大语言模型通道与路由策略                     -->
    <!-- ======================================================== -->
    <div v-show="activeSection === 'llm'" class="gateway-section-content">
      <div class="gateway-toolbar">
        <div>
          <h3>LLM 模型通道调度</h3>
          <p>{{ overview.readyCount || 0 }} 个已就绪 · 默认通道：<strong>{{ defaultName }}</strong></p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refreshAll">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
          </button>
          <button class="btn-create-agent" @click="openCreate">
            <i class="fa-solid fa-plus"></i><span>添加模型通道</span>
          </button>
        </div>
      </div>

      <div class="gateway-policy-bar">
        <label>默认通道
          <select v-model="policy.defaultProviderId" :disabled="!readyProviders.length">
            <option v-if="!readyProviders.length" value="" disabled>暂无就绪通道</option>
            <option v-for="p in readyProviders" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label>降级备用
          <select v-model="policy.fallbackProviderId">
            <option value="">不设置降级</option>
            <option v-for="p in readyProviders" :key="'fb-' + p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="gateway-inline-switch">
          <input v-model="policy.failoverEnabled" type="checkbox">
          <span>自动故障转移 (Failover)</span>
        </label>
        <button class="btn-secondary" :disabled="savingPolicy" @click="savePolicy">
          {{ savingPolicy ? '保存中...' : '保存路由策略' }}
        </button>
      </div>

      <div class="table-view-card gateway-table-card">
        <table class="agent-table">
          <thead>
            <tr>
              <th style="min-width: 220px;">通道名称</th>
              <th style="min-width: 180px;">接口端点 / 凭据</th>
              <th style="min-width: 150px;">默认模型</th>
              <th style="min-width: 100px;">状态</th>
              <th style="min-width: 90px;">调度开关</th>
              <th style="min-width: 160px; text-align:right;">操作管理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in providers" :key="p.id">
              <td>
                <div class="gateway-name-cell">
                  <div class="gateway-vendor-mark" :class="'mark-' + (p.vendor || '').toLowerCase()">
                    <img :src="vendorLogo(p)" :alt="vendorLabel(p.vendor)" class="gateway-vendor-logo">
                  </div>
                  <div>
                    <div class="table-agent-title">{{ p.name }}</div>
                    <div class="table-agent-code">
                      <span>{{ vendorLabel(p.vendor) }}</span>
                      <span v-if="p.protocol === 'CUSTOM_HTTP'" class="gateway-proto-badge proto-custom">自定义 HTTP</span>
                      <span v-else-if="p.vendor === 'CUSTOM'" class="gateway-proto-badge proto-openai">OpenAI 兼容</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <code v-if="p.protocol === 'CUSTOM_HTTP'" class="gateway-key-mask" :title="p.baseUrl || '自定义接口'">{{ p.baseUrl ? p.baseUrl : '自定义模板' }}</code>
                <code v-else-if="p.apiKeyMasked" class="gateway-key-mask">{{ p.apiKeyMasked }}</code>
                <code v-else class="gateway-key-mask">{{ p.configured ? '已配置' : '未配置' }}</code>
              </td>
              <td>
                <div class="gateway-model-cell">{{ p.defaultModel || '-' }}</div>
                <div class="table-agent-code">{{ (p.modelList || []).length ? p.modelList.length + ' 个可用' : '' }}</div>
              </td>
              <td>
                <div class="badge-status" :class="statusClass(p)">
                  <span class="status-dot"></span><span>{{ statusLabel(p) }}</span>
                </div>
              </td>
              <td>
                <label class="switch" :title="p.configured ? '启用调度' : '请先配置通道参数'">
                  <input type="checkbox" :checked="p.enabled" :disabled="toggling === p.id" @change="toggle(p, $event.target.checked)">
                  <span class="slider-toggle"></span>
                </label>
              </td>
              <td style="text-align:right;">
                <div class="agent-actions" style="justify-content:flex-end;">
                  <button
                    class="btn-card-action btn-action-icon"
                    :class="{
                      'probe-btn-success': p.lastProbeStatus === 'SUCCESS',
                      'probe-btn-fail': p.lastProbeStatus === 'FAILED'
                    }"
                    :title="p.lastProbeStatus === 'SUCCESS' ? '连通正常 (点击重新测试)' : (p.lastProbeStatus === 'FAILED' ? '连通失败 (点击重新测试)' : '测试连通性')"
                    :disabled="probing === p.id || !p.configured"
                    @click="probe(p)"
                  >
                    <i :class="probing === p.id ? 'fa-solid fa-spinner fa-spin' : (p.lastProbeStatus === 'SUCCESS' ? 'fa-solid fa-circle-check' : (p.lastProbeStatus === 'FAILED' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-plug-circle-check'))"></i>
                  </button>
                  <button class="btn-card-action btn-chat-primary" @click="openEdit(p)">
                    <i class="fa-solid fa-gear"></i><span>配置</span>
                  </button>
                  <button
                    v-if="!p.builtin"
                    class="btn-card-action btn-action-icon btn-action-danger"
                    title="删除通道"
                    @click="removeCustom(p)"
                  >
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                  <button
                    v-else
                    class="btn-card-action btn-action-icon btn-action-locked"
                    disabled
                    title="系统预设通道，受保护不可删除"
                  >
                    <i class="fa-solid fa-lock"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 2: Embedding 向量嵌入模型多实例管理                -->
    <!-- ======================================================== -->
    <div v-show="activeSection === 'embedding'" class="gateway-section-content">
      <!-- 激活状态横幅 -->
      <div class="gateway-hero-banner">
        <div class="hero-metric-left">
          <div class="hero-icon-box icon-emb"><i class="fa-solid fa-dna"></i></div>
          <div class="hero-text-box">
            <div class="hero-tag-row">
              <span class="hero-state-pill">当前系统全局生效向量模型</span>
              <span v-if="activeEmbedding" class="hero-vendor-pill">{{ activeEmbedding.provider }}</span>
            </div>
            <h3 v-if="activeEmbedding">{{ activeEmbedding.name }} <code class="hero-model-code">{{ activeEmbedding.modelName }}</code></h3>
            <h3 v-else class="hero-empty-title">暂无激活的外部向量模型（当前降级使用平台高维特征投影）</h3>
            <p v-if="activeEmbedding" class="hero-subtext">
              接口地址: <code>{{ activeEmbedding.baseUrl || 'https://api.openai.com/v1' }}</code> · 向量维度: <strong>{{ activeEmbedding.dimension || 1024 }} 维</strong>
            </p>
          </div>
        </div>
        <div class="hero-metric-right" style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refreshAll">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
          </button>
          <button class="btn-create-agent" @click="openCreateEmbedding">
            <i class="fa-solid fa-plus"></i><span>添加向量模型</span>
          </button>
        </div>
      </div>

      <!-- 向量模型列表 -->
      <div class="table-view-card gateway-table-card">
        <table class="agent-table">
          <thead>
            <tr>
              <th style="min-width: 200px;">配置名称 / 提供商</th>
              <th style="min-width: 200px;">接口地址 (Base URL)</th>
              <th style="min-width: 150px;">向量模型 (Model)</th>
              <th style="min-width: 90px;">维度</th>
              <th style="min-width: 100px;">连通状态</th>
              <th style="min-width: 120px;">当前生效状态</th>
              <th style="min-width: 180px; text-align:right;">操作管理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!embeddings.length">
              <td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-dna" style="font-size: 28px; margin-bottom: 8px; display:block; opacity:0.4;"></i>
                暂无 Embedding 向量模型配置，点击上方“添加向量模型”录入
              </td>
            </tr>
            <tr v-for="e in embeddings" :key="e.id">
              <td>
                <div class="table-agent-meta">
                  <div class="table-agent-avatar" style="font-size: 16px;"><i class="fa-solid fa-microchip"></i></div>
                  <div>
                    <div class="table-agent-title">{{ e.name }}</div>
                    <div class="table-agent-code">
                      <span class="spec-badge" style="padding: 1px 5px;">{{ e.provider }}</span>
                      <span v-if="e.apiKeyMasked" class="gateway-key-mask" style="margin-left: 4px;">{{ e.apiKeyMasked }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <code class="gateway-key-mask" :title="e.baseUrl">{{ e.baseUrl || 'https://api.openai.com/v1' }}</code>
              </td>
              <td>
                <span class="hero-model-code" style="font-size: 12px;">{{ e.modelName }}</span>
              </td>
              <td>
                <span class="spec-badge">{{ e.dimension || 1024 }} 维</span>
              </td>
              <td>
                <div class="badge-status" :class="e.lastProbeStatus === 'SUCCESS' ? 'badge-success' : (e.lastProbeStatus === 'FAILED' ? 'badge-danger' : 'badge-warning')">
                  <span class="status-dot"></span>
                  <span>{{ e.lastProbeStatus === 'SUCCESS' ? '就绪' : (e.lastProbeStatus === 'FAILED' ? '异常' : '未测试') }}</span>
                </div>
              </td>
              <td>
                <span v-if="e.isActive" class="active-badge-tag"><i class="fa-solid fa-circle-check"></i> 当前生效中</span>
                <button v-else class="btn-activate-action" title="设为当前生效的向量模型" @click="activateEmbedding(e)">
                  <i class="fa-solid fa-bolt"></i> 设为生效
                </button>
              </td>
              <td style="text-align:right;">
                <div class="agent-actions" style="justify-content:flex-end;">
                  <button
                    class="btn-card-action btn-action-icon"
                    :class="{
                      'probe-btn-success': e.lastProbeStatus === 'SUCCESS',
                      'probe-btn-fail': e.lastProbeStatus === 'FAILED'
                    }"
                    :title="e.lastProbeMessage || '测试接口连通性'"
                    :disabled="probingEmb === e.id"
                    @click="probeEmbedding(e)"
                  >
                    <i :class="probingEmb === e.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
                  </button>
                  <button class="btn-card-action btn-action-icon" title="编辑配置" @click="openEditEmbedding(e)">
                    <i class="fa-regular fa-pen-to-square"></i>
                  </button>
                  <button class="btn-card-action btn-action-icon btn-action-danger" title="删除配置" @click="removeEmbedding(e)">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 3: Dify 知识库引擎接入与实例管理                    -->
    <!-- ======================================================== -->
    <div v-show="activeSection === 'dify'" class="gateway-section-content">
      <!-- 激活状态横幅 -->
      <div class="gateway-hero-banner">
        <div class="hero-metric-left">
          <div class="hero-icon-box icon-dify"><i class="fa-solid fa-book-atlas"></i></div>
          <div class="hero-text-box">
            <div class="hero-tag-row">
              <span class="hero-state-pill">当前知识库全局路由 Dify 实例</span>
            </div>
            <h3 v-if="activeDify">{{ activeDify.name }} <code class="hero-model-code">{{ activeDify.baseUrl }}</code></h3>
            <h3 v-else class="hero-empty-title">尚未配置或激活外部 Dify 实例（系统仅使用本地 Spring AI 自研 RAG 引擎）</h3>
            <p v-if="activeDify" class="hero-subtext">
              密钥脱敏: <code>{{ activeDify.apiKeyMasked }}</code> · 备注: {{ activeDify.description || '无备注' }}
            </p>
          </div>
        </div>
        <div class="hero-metric-right" style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refreshAll">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
          </button>
          <button class="btn-create-agent" @click="openCreateDify">
            <i class="fa-solid fa-plus"></i><span>接入 Dify 实例</span>
          </button>
        </div>
      </div>

      <!-- Dify 实例列表 -->
      <div class="table-view-card gateway-table-card">
        <table class="agent-table">
          <thead>
            <tr>
              <th style="min-width: 180px;">Dify 实例名称</th>
              <th style="min-width: 220px;">服务地址 (Base URL)</th>
              <th style="min-width: 180px;">Dataset API Key</th>
              <th style="min-width: 100px;">连通状态</th>
              <th style="min-width: 120px;">当前生效状态</th>
              <th style="min-width: 180px; text-align:right;">操作管理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!difys.length">
              <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-book-atlas" style="font-size: 28px; margin-bottom: 8px; display:block; opacity:0.4;"></i>
                暂无 Dify 接入配置，点击上方“接入 Dify 实例”录入
              </td>
            </tr>
            <tr v-for="d in difys" :key="d.id">
              <td>
                <div class="table-agent-meta">
                  <div class="table-agent-avatar" style="font-size: 16px; background: rgba(59, 130, 246, 0.1); color: var(--accent-blue);">
                    <i class="fa-solid fa-server"></i>
                  </div>
                  <div>
                    <div class="table-agent-title">{{ d.name }}</div>
                    <div class="table-agent-code">{{ d.description || '自建 Dify 知识库实例' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <code class="gateway-key-mask" :title="d.baseUrl">{{ d.baseUrl }}</code>
              </td>
              <td>
                <code class="gateway-key-mask">{{ d.apiKeyMasked }}</code>
              </td>
              <td>
                <div class="badge-status" :class="d.lastProbeStatus === 'SUCCESS' ? 'badge-success' : (d.lastProbeStatus === 'FAILED' ? 'badge-danger' : 'badge-warning')">
                  <span class="status-dot"></span>
                  <span>{{ d.lastProbeStatus === 'SUCCESS' ? '就绪' : (d.lastProbeStatus === 'FAILED' ? '异常' : '未测试') }}</span>
                </div>
              </td>
              <td>
                <span v-if="d.isActive" class="active-badge-tag"><i class="fa-solid fa-circle-check"></i> 当前生效中</span>
                <button v-else class="btn-activate-action" title="设为当前生效的 Dify 知识库引擎" @click="activateDify(d)">
                  <i class="fa-solid fa-bolt"></i> 设为生效
                </button>
              </td>
              <td style="text-align:right;">
                <div class="agent-actions" style="justify-content:flex-end;">
                  <button
                    class="btn-card-action btn-action-icon"
                    :class="{
                      'probe-btn-success': d.lastProbeStatus === 'SUCCESS',
                      'probe-btn-fail': d.lastProbeStatus === 'FAILED'
                    }"
                    :title="d.lastProbeMessage || '测试 Dify 连通性'"
                    :disabled="probingDifyId === d.id"
                    @click="probeDify(d)"
                  >
                    <i :class="probingDifyId === d.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
                  </button>
                  <button class="btn-card-action btn-action-icon" title="编辑配置" @click="openEditDify(d)">
                    <i class="fa-regular fa-pen-to-square"></i>
                  </button>
                  <button class="btn-card-action btn-action-icon btn-action-danger" title="删除实例" @click="removeDify(d)">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- MODAL 1: LLM 模型通道配置弹窗                              -->
  <!-- ======================================================== -->
  <div class="modal-backdrop" :class="{ open: modalOpen }">
    <div class="modal-dialog" style="max-width: 640px;">
      <div class="modal-header">
        <h3>{{ form.id ? '配置模型通道' : '添加模型通道' }}</h3>
        <button class="btn-modal-close" @click="modalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form @submit.prevent="saveProvider">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="form.name" class="form-control-styled" placeholder="通道显示名称" required>
          </div>

          <!-- 协议类型切换 (仅限 CUSTOM 供应商) -->
          <div v-if="form.vendor === 'CUSTOM'" class="form-group">
            <label class="form-label">协议类型</label>
            <div class="gateway-protocol-switch">
              <button
                type="button"
                class="protocol-tab-btn"
                :class="{ active: form.protocol !== 'CUSTOM_HTTP' }"
                @click="form.protocol = 'OPENAI'"
              >
                <img :src="logoCustomOpenAi" alt="OpenAI" class="protocol-tab-icon">
                <span>OpenAI 兼容协议</span>
              </button>
              <button
                type="button"
                class="protocol-tab-btn"
                :class="{ active: form.protocol === 'CUSTOM_HTTP' }"
                @click="form.protocol = 'CUSTOM_HTTP'"
              >
                <img :src="logoCustomHttp" alt="Custom HTTP" class="protocol-tab-icon">
                <span>自定义 HTTP 接口</span>
              </button>
            </div>
          </div>

          <!-- 模式一：OpenAI 兼容协议 -->
          <template v-if="form.protocol !== 'CUSTOM_HTTP'">
            <div v-if="form.vendor === 'CUSTOM'" class="gateway-custom-toolbar" style="margin-bottom: 12px;">
              <span class="gateway-field-hint">支持标准 OpenAI 协议及无 Key、特定 Header 鉴权通道（如鱼亮 LLM，支持 Tool Call 与多轮对话）。</span>
              <button type="button" class="btn-sample-load" @click="loadSampleOpenAiHeaders">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 载入第三方(鱼亮)示例
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">接口地址 (Base URL / Endpoint)</label>
              <input v-model="form.baseUrl" class="form-control-styled" placeholder="如 https://api.openai.com/v1 或 http://82.157.197.25:9540/api/..." required>
              <p class="gateway-field-hint">可填标准 Base URL（自动调用 /chat/completions），亦可直接填完整 Endpoint 地址。</p>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="margin: 0;">自定义请求头 (Headers JSON，可选)</label>
                <span class="gateway-var-tag">如 app_id / device_mac</span>
              </div>
              <textarea
                v-model="form.openAiHeaders"
                class="form-control-styled code-textarea"
                rows="3"
                placeholder='{\n  "app_id": "0JO1CFNCJ3",\n  "device_mac": "66666"\n}'
              ></textarea>
              <p class="gateway-field-hint">若接口无需 Bearer API Key，而是通过特定 Header 鉴权，在此配置即可。</p>
            </div>

            <div class="form-group">
              <label class="form-label">API Key (可选)</label>
              <div v-if="form.configured && form.apiKeyMasked && form.apiKeyMasked !== '[自定义Header鉴权]'" class="gateway-saved-key">
                <span>当前密钥</span>
                <code>{{ form.apiKeyMasked }}</code>
                <em>已密文保存，明文不回显</em>
              </div>
              <input
                v-model="form.apiKey"
                class="form-control-styled"
                type="password"
                autocomplete="new-password"
                :placeholder="form.openAiHeaders ? '若使用自定义 Header 鉴权，Key 可留空' : (form.configured ? '如需更换，在此输入新密钥' : 'sk-...')"
              >
            </div>

            <div class="form-group">
              <label class="form-label">默认模型</label>
              <div style="display: flex; gap: 8px;">
                <input
                  v-model="form.defaultModel"
                  list="openAiModelOptions"
                  class="form-control-styled"
                  placeholder="如 deepseek-v4-flash，可自由输入或从下拉选择"
                  required
                >
                <datalist id="openAiModelOptions">
                  <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
                </datalist>
                <select
                  v-if="modelOptions.length"
                  class="form-control-styled"
                  style="width: 160px;"
                  @change="if ($event.target.value) { form.defaultModel = $event.target.value; $event.target.value = ''; }"
                >
                  <option value="">快捷选择...</option>
                  <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <p class="gateway-field-hint">支持自由输入模型标识，或点击“测试连通性”自动拉取。</p>
            </div>

            <label class="gateway-enable-row" style="margin-top: 10px; margin-bottom: 6px;">
              <input v-model="form.openAiWebSearch" type="checkbox">
              <span>启用服务端原生联网搜索 (Web Search)</span>
            </label>
          </template>

          <!-- 模式二：自定义 HTTP REST 接口 -->
          <template v-else>
            <div class="gateway-custom-toolbar">
              <span class="gateway-field-hint">针对第三方非标 REST 接口，支持灵活模板变量替换与响应结果提取。</span>
              <button type="button" class="btn-sample-load" @click="loadSampleCustomConfig">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 载入示例模板
              </button>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="width: 120px;">
                <label class="form-label">请求方式</label>
                <select v-model="form.customHttpMethod" class="form-control-styled">
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">接口地址 (Endpoint URL)</label>
                <input v-model="form.baseUrl" class="form-control-styled" placeholder="http://..." required>
              </div>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">模型标识名称</label>
                <input v-model="form.defaultModel" class="form-control-styled" placeholder="如 customer-llm" required>
              </div>
              <div class="form-group" style="width: 140px;">
                <label class="form-label">超时时间 (ms)</label>
                <input v-model.number="form.timeoutMs" type="number" class="form-control-styled" placeholder="30000">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">请求头配置 (JSON)</label>
              <textarea v-model="form.customHeaders" class="form-control-styled code-textarea" rows="2" placeholder='{"Content-Type": "application/json;charset=utf-8"}'></textarea>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="margin: 0;">请求 Body 模板 (JSON)</label>
                <span class="gateway-var-tag">支持变量: <code>&#123;&#123;prompt&#125;&#125;</code></span>
              </div>
              <textarea v-model="form.customBodyTemplate" class="form-control-styled code-textarea" rows="5" placeholder='{\n  "prompt": "{{prompt}}"\n}' required></textarea>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="width: 120px;">
                <label class="form-label">业务成功码</label>
                <input v-model.number="form.customSuccessCode" type="number" class="form-control-styled" placeholder="200" required>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">回答提取路径</label>
                <input v-model="form.customResultPath" class="form-control-styled" placeholder="如 data.result" required>
              </div>
              <div class="form-group" style="width: 130px;">
                <label class="form-label">错误提取路径</label>
                <input v-model="form.customErrorMessagePath" class="form-control-styled" placeholder="如 msg" required>
              </div>
            </div>
          </template>

          <label class="gateway-enable-row">
            <input v-model="form.enabled" type="checkbox">
            <span>启用该通道</span>
          </label>

          <div v-if="testResult" class="gateway-test-result" :class="testResult.success ? 'is-ok' : 'is-fail'">
            <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
            <span>{{ testResult.message }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalOpen = false">取消</button>
          <button
            type="button"
            class="btn-secondary gateway-test-btn"
            :class="{
              'test-btn-success': testResult && testResult.success,
              'test-btn-fail': testResult && !testResult.success
            }"
            :disabled="testing"
            @click="testInModal"
          >
            <i :class="testing ? 'fa-solid fa-spinner fa-spin' : (testResult ? (testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark') : 'fa-solid fa-plug-circle-check')"></i>
            <span>{{ testing ? '测试中...' : (testResult ? (testResult.success ? '测试通过' : '测试失败') : '测试连通性') }}</span>
          </button>
          <button type="submit" class="btn-create-agent" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- MODAL 2: Embedding 向量模型配置弹窗                        -->
  <!-- ======================================================== -->
  <div class="modal-backdrop" :class="{ open: embModalOpen }">
    <div class="modal-dialog" style="max-width: 580px;">
      <div class="modal-header">
        <h3>{{ embForm.id ? '编辑 Embedding 向量模型' : '添加 Embedding 向量模型' }}</h3>
        <button class="btn-modal-close" @click="embModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form @submit.prevent="saveEmbedding">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">常用厂商快速预设</label>
            <div class="preset-pill-group">
              <button type="button" class="preset-pill" @click="applyEmbPreset('qwen')">通义百炼 (Qwen)</button>
              <button type="button" class="preset-pill" @click="applyEmbPreset('openai')">OpenAI</button>
              <button type="button" class="preset-pill" @click="applyEmbPreset('zhipu')">智谱 AI</button>
              <button type="button" class="preset-pill" @click="applyEmbPreset('ollama')">本地 Ollama (bge-m3)</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">配置名称 *</label>
            <input v-model="embForm.name" class="form-control-styled" placeholder="如 通义千问 text-embedding-v3" required>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">厂商协议提供商</label>
              <select v-model="embForm.provider" class="form-control-styled">
                <option value="DASHSCOPE">通义千问 (DashScope)</option>
                <option value="OPENAI">OpenAI 官方</option>
                <option value="ZHIPU">智谱 AI (GLM)</option>
                <option value="OLLAMA">Ollama 本地部署</option>
                <option value="CUSTOM">自定义 OpenAI 兼容协议</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">向量维度 (Dimension)</label>
              <input v-model.number="embForm.dimension" type="number" class="form-control-styled" placeholder="1024" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">接口地址 (Base URL)</label>
            <input v-model="embForm.baseUrl" class="form-control-styled" placeholder="如 https://dashscope.aliyuncs.com/compatible-mode/v1">
            <p class="gateway-field-hint">支持标准 OpenAI 兼容的 Base URL，系统将自动调用 <code>/embeddings</code> 端点。</p>
          </div>

          <div class="form-group">
            <label class="form-label">API Key (密文安全存储)</label>
            <div v-if="embForm.apiKeyMasked" class="gateway-saved-key">
              <span>已保存密钥</span>
              <code>{{ embForm.apiKeyMasked }}</code>
              <em>已加密，留空则保持不变</em>
            </div>
            <input
              v-model="embForm.apiKey"
              type="password"
              class="form-control-styled"
              autocomplete="new-password"
              :placeholder="embForm.apiKeyMasked ? '若无需修改密钥，此处留空' : 'sk-...（本地 Ollama 可不填）'"
            >
          </div>

          <div class="form-group">
            <label class="form-label">向量模型名称 (Model Identifier) *</label>
            <input v-model="embForm.modelName" class="form-control-styled" placeholder="如 text-embedding-v3 或 bge-m3" required>
          </div>

          <label class="gateway-enable-row">
            <input v-model="embForm.isActive" type="checkbox">
            <span>保存后直接设为系统全局生效的向量模型</span>
          </label>

          <div v-if="embTestResult" class="gateway-test-result" :class="embTestResult.success ? 'is-ok' : 'is-fail'">
            <i :class="embTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
            <span>{{ embTestResult.message }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="embModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent" :disabled="savingEmb">
            {{ savingEmb ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- MODAL 3: Dify 知识库引擎实例配置弹窗                        -->
  <!-- ======================================================== -->
  <div class="modal-backdrop" :class="{ open: difyModalOpen }">
    <div class="modal-dialog" style="max-width: 580px;">
      <div class="modal-header">
        <h3>{{ difyForm.id ? '编辑 Dify 知识引擎实例' : '接入 Dify 知识引擎实例' }}</h3>
        <button class="btn-modal-close" @click="difyModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form @submit.prevent="saveDify">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">实例名称 *</label>
            <input v-model="difyForm.name" class="form-control-styled" placeholder="如 阿里云生产 Dify 知识库" required>
          </div>

          <div class="form-group">
            <label class="form-label">Dify 服务器 API 地址 (Base URL) *</label>
            <input v-model="difyForm.baseUrl" class="form-control-styled" placeholder="如 http://120.79.38.143/v1" required>
            <p class="gateway-field-hint">请填写 Dify API 服务地址（需包含 <code>/v1</code> 后缀，系统将自动校验和补齐）。</p>
          </div>

          <div class="form-group">
            <label class="form-label">Dify Dataset API Key *</label>
            <div v-if="difyForm.apiKeyMasked" class="gateway-saved-key">
              <span>已保存密钥</span>
              <code>{{ difyForm.apiKeyMasked }}</code>
              <em>已加密存储，留空则保持不变</em>
            </div>
            <input
              v-model="difyForm.apiKey"
              type="password"
              class="form-control-styled"
              autocomplete="new-password"
              :placeholder="difyForm.apiKeyMasked ? '若无需更换密钥，此处留空' : 'dataset-xxxxxx'"
              :required="!difyForm.id"
            >
            <p class="gateway-field-hint">请在 Dify 控制台进入知识库创建「知识库 API 密钥 (Dataset API Key)」，以 <code>dataset-</code> 开头。</p>
          </div>

          <div class="form-group">
            <label class="form-label">描述备注 (可选)</label>
            <input v-model="difyForm.description" class="form-control-styled" placeholder="用于区分环境，如 测试环境/专用客服知识库">
          </div>

          <label class="gateway-enable-row">
            <input v-model="difyForm.isActive" type="checkbox">
            <span>保存后直接设为系统全局生效的 Dify 实例</span>
          </label>

          <div v-if="difyTestResult" class="gateway-test-result" :class="difyTestResult.success ? 'is-ok' : 'is-fail'">
            <i :class="difyTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
            <span>{{ difyTestResult.message }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="difyModalOpen = false">取消</button>
          <button type="submit" class="btn-create-agent" :disabled="savingDify">
            {{ savingDify ? '保存中...' : '保存接入' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import logoDeepseek from '../assets/vendors/deepseek-color.svg'
import logoQwen from '../assets/vendors/qwen-color.svg'
import logoHunyuan from '../assets/vendors/hunyuan-color.svg'
import logoDoubao from '../assets/vendors/doubao-color.svg'
import logoCustomHttp from '../assets/vendors/custom-http-color.svg'
import logoCustomOpenAi from '../assets/vendors/custom-openai-color.svg'
import logoCustom from '../assets/vendors/custom-color.svg'

const { showToast } = useToast()

// Tab 切换状态
const activeSection = ref('llm') // 'llm' | 'embedding' | 'dify'

// ==========================================
// 1. LLM 相关数据与方法
// ==========================================
const overview = ref({ providers: [], policy: {}, configuredCount: 0, enabledCount: 0, readyCount: 0 })
const catalog = ref([])
const modalOpen = ref(false)
const saving = ref(false)
const savingPolicy = ref(false)
const probing = ref('')
const toggling = ref('')
const testing = ref(false)
const testResult = ref(null)
const fetchedModels = ref([])
const policy = reactive({
  defaultProviderId: '',
  fallbackProviderId: '',
  failoverEnabled: true,
  timeoutMs: 30000,
  maxRetries: 1
})
const form = reactive({
  id: '', vendor: 'CUSTOM', protocol: 'OPENAI', name: '', baseUrl: '', apiKey: '', apiKeyMasked: '',
  defaultModel: '', models: '', timeoutMs: 30000, remark: '', enabled: false, configured: false,
  openAiHeaders: '',
  openAiWebSearch: false,
  customHttpMethod: 'POST',
  customHeaders: '{\n  "Content-Type": "application/json;charset=utf-8"\n}',
  customBodyTemplate: '{\n  "prompt": "{{prompt}}"\n}',
  customSuccessCode: 200,
  customResultPath: 'data.result',
  customErrorCodePath: 'code',
  customErrorMessagePath: 'msg'
})

const providers = computed(() => overview.value.providers || [])
const readyProviders = computed(() =>
  providers.value.filter((p) => p.enabled && p.configured && p.lastProbeStatus === 'SUCCESS')
)
const defaultName = computed(() => {
  const found = readyProviders.value.find((p) => p.id === policy.defaultProviderId)
  return found ? found.name : (readyProviders.value[0]?.name || '无')
})
const suggestionModels = computed(() => {
  const preset = catalog.value.find((item) => item.vendor === form.vendor)
  return preset?.models || []
})
const modelOptions = computed(() => fetchedModels.value.length ? fetchedModels.value : suggestionModels.value)

function vendorLogo(item) {
  if (!item) return logoCustom
  if (typeof item === 'string') {
    return {
      DEEPSEEK: logoDeepseek,
      QIANWEN: logoQwen,
      TENCENT: logoHunyuan,
      BYTEDANCE: logoDoubao,
      CUSTOM: logoCustom
    }[item] || logoCustom
  }
  if (item.vendor === 'CUSTOM') {
    return item.protocol === 'CUSTOM_HTTP' ? logoCustomHttp : logoCustomOpenAi
  }
  return {
    DEEPSEEK: logoDeepseek,
    QIANWEN: logoQwen,
    TENCENT: logoHunyuan,
    BYTEDANCE: logoDoubao
  }[item.vendor] || logoCustom
}

function vendorLabel(vendor) {
  return {
    DEEPSEEK: 'DeepSeek',
    QIANWEN: '通义千问',
    TENCENT: '腾讯混元',
    BYTEDANCE: '字节豆包',
    CUSTOM: '自定义'
  }[vendor] || vendor
}

function statusLabel(p) {
  if (!p.configured) return '未配置'
  if (!p.enabled) return '已停用'
  if (p.lastProbeStatus === 'FAILED') return '探测失败'
  if (p.lastProbeStatus === 'SUCCESS') return '就绪'
  return '待探测'
}

function statusClass(p) {
  if (!p.configured) return 'badge-warning'
  if (!p.enabled) return 'badge-danger'
  if (p.lastProbeStatus === 'FAILED') return 'badge-danger'
  return 'badge-success'
}

// ==========================================
// 2. Embedding 相关数据与方法
// ==========================================
const embeddings = ref([])
const embModalOpen = ref(false)
const savingEmb = ref(false)
const probingEmb = ref('')
const embTestResult = ref(null)
const embForm = reactive({
  id: '',
  name: '',
  provider: 'DASHSCOPE',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: '',
  apiKeyMasked: '',
  modelName: 'text-embedding-v3',
  dimension: 1024,
  isActive: true,
  enabled: true
})

const activeEmbedding = computed(() => embeddings.value.find((e) => e.isActive))

function applyEmbPreset(type) {
  if (type === 'qwen') {
    embForm.name = '阿里云百炼 text-embedding-v3'
    embForm.provider = 'DASHSCOPE'
    embForm.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    embForm.modelName = 'text-embedding-v3'
    embForm.dimension = 1024
  } else if (type === 'openai') {
    embForm.name = 'OpenAI text-embedding-3-small'
    embForm.provider = 'OPENAI'
    embForm.baseUrl = 'https://api.openai.com/v1'
    embForm.modelName = 'text-embedding-3-small'
    embForm.dimension = 1536
  } else if (type === 'zhipu') {
    embForm.name = '智谱 AI embedding-3'
    embForm.provider = 'ZHIPU'
    embForm.baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
    embForm.modelName = 'embedding-3'
    embForm.dimension = 1024
  } else if (type === 'ollama') {
    embForm.name = '本地 Ollama (bge-m3)'
    embForm.provider = 'OLLAMA'
    embForm.baseUrl = 'http://localhost:11434/v1'
    embForm.modelName = 'bge-m3'
    embForm.dimension = 1024
  }
}

function openCreateEmbedding() {
  Object.assign(embForm, {
    id: '',
    name: '',
    provider: 'DASHSCOPE',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    apiKeyMasked: '',
    modelName: 'text-embedding-v3',
    dimension: 1024,
    isActive: embeddings.value.length === 0,
    enabled: true
  })
  embTestResult.value = null
  embModalOpen.value = true
}

function openEditEmbedding(item) {
  Object.assign(embForm, {
    id: item.id,
    name: item.name,
    provider: item.provider || 'OPENAI',
    baseUrl: item.baseUrl,
    apiKey: '',
    apiKeyMasked: item.apiKeyMasked || '',
    modelName: item.modelName,
    dimension: item.dimension || 1024,
    isActive: item.isActive,
    enabled: item.enabled
  })
  embTestResult.value = null
  embModalOpen.value = true
}

async function loadEmbeddings() {
  const res = await http.get('/api/model-gateway/embeddings')
  if (res.success) {
    embeddings.value = res.data || []
  }
}

async function saveEmbedding() {
  if (!embForm.name.trim() || !embForm.modelName.trim()) {
    showToast('请填写配置名称与模型名称', 'error')
    return
  }
  savingEmb.value = true
  const payload = {
    name: embForm.name.trim(),
    provider: embForm.provider,
    baseUrl: embForm.baseUrl.trim(),
    apiKey: embForm.apiKey.trim(),
    modelName: embForm.modelName.trim(),
    dimension: Number(embForm.dimension) || 1024,
    isActive: embForm.isActive,
    enabled: embForm.enabled
  }
  const res = embForm.id
    ? await http.put(`/api/model-gateway/embeddings/${embForm.id}`, payload)
    : await http.post('/api/model-gateway/embeddings', payload)
  savingEmb.value = false
  if (res.success) {
    showToast(res.message || '向量模型配置已保存', 'success')
    embModalOpen.value = false
    await loadEmbeddings()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function activateEmbedding(item) {
  const res = await http.post(`/api/model-gateway/embeddings/${item.id}/activate`)
  if (res.success) {
    showToast(`已成功激活【${item.name}】作为当前全局向量模型`, 'success')
    await loadEmbeddings()
  } else {
    showToast(res.message || '激活失败', 'error')
  }
}

async function removeEmbedding(item) {
  if (!confirm(`确定删除向量模型配置【${item.name}】吗？`)) return
  const res = await http.delete(`/api/model-gateway/embeddings/${item.id}`)
  if (res.success) {
    showToast('配置已删除', 'success')
    await loadEmbeddings()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function probeEmbedding(item) {
  probingEmb.value = item.id
  const res = await http.post(`/api/model-gateway/embeddings/${item.id}/probe`)
  probingEmb.value = ''
  if (res.success) {
    showToast(res.message || '连通正常', 'success')
  } else {
    showToast(res.message || '连通失败', 'error')
  }
  await loadEmbeddings()
}

// ==========================================
// 3. Dify 相关数据与方法
// ==========================================
const difys = ref([])
const difyModalOpen = ref(false)
const savingDify = ref(false)
const probingDifyId = ref('')
const difyTestResult = ref(null)
const difyForm = reactive({
  id: '',
  name: '',
  baseUrl: '',
  apiKey: '',
  apiKeyMasked: '',
  description: '',
  isActive: true,
  enabled: true
})

const activeDify = computed(() => difys.value.find((d) => d.isActive))

function openCreateDify() {
  Object.assign(difyForm, {
    id: '',
    name: '自建 Dify 知识库实例',
    baseUrl: 'http://120.79.38.143/v1',
    apiKey: '',
    apiKeyMasked: '',
    description: '知识库导入与召回专用实例',
    isActive: difys.value.length === 0,
    enabled: true
  })
  difyTestResult.value = null
  difyModalOpen.value = true
}

function openEditDify(item) {
  Object.assign(difyForm, {
    id: item.id,
    name: item.name,
    baseUrl: item.baseUrl,
    apiKey: '',
    apiKeyMasked: item.apiKeyMasked || '',
    description: item.description || '',
    isActive: item.isActive,
    enabled: item.enabled
  })
  difyTestResult.value = null
  difyModalOpen.value = true
}

async function loadDifys() {
  const res = await http.get('/api/model-gateway/dify')
  if (res.success) {
    difys.value = res.data || []
  }
}

async function saveDify() {
  if (!difyForm.name.trim() || !difyForm.baseUrl.trim()) {
    showToast('请填写实例名称与服务器 API 地址', 'error')
    return
  }
  if (!difyForm.id && !difyForm.apiKey.trim()) {
    showToast('请填写 Dify Dataset API Key', 'error')
    return
  }
  savingDify.value = true
  const payload = {
    name: difyForm.name.trim(),
    baseUrl: difyForm.baseUrl.trim(),
    apiKey: difyForm.apiKey.trim(),
    description: difyForm.description.trim(),
    isActive: difyForm.isActive,
    enabled: difyForm.enabled
  }
  const res = difyForm.id
    ? await http.put(`/api/model-gateway/dify/${difyForm.id}`, payload)
    : await http.post('/api/model-gateway/dify', payload)
  savingDify.value = false
  if (res.success) {
    showToast(res.message || 'Dify 实例已接入', 'success')
    difyModalOpen.value = false
    await loadDifys()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function activateDify(item) {
  const res = await http.post(`/api/model-gateway/dify/${item.id}/activate`)
  if (res.success) {
    showToast(`已成功激活【${item.name}】作为当前 Dify 知识库引擎`, 'success')
    await loadDifys()
  } else {
    showToast(res.message || '激活失败', 'error')
  }
}

async function removeDify(item) {
  if (!confirm(`确定删除 Dify 接入实例【${item.name}】吗？`)) return
  const res = await http.delete(`/api/model-gateway/dify/${item.id}`)
  if (res.success) {
    showToast('Dify 实例已删除', 'success')
    await loadDifys()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function probeDify(item) {
  probingDifyId.value = item.id
  const res = await http.post(`/api/model-gateway/dify/${item.id}/probe`)
  probingDifyId.value = ''
  if (res.success) {
    showToast(res.message || 'Dify 连通正常', 'success')
  } else {
    showToast(res.message || '连通失败', 'error')
  }
  await loadDifys()
}

// ==========================================
// 4. 初始化加载与原有 LLM 逻辑
// ==========================================
async function load() {
  const [ov, cat] = await Promise.all([
    http.get('/api/model-gateway'),
    http.get('/api/model-gateway/catalog')
  ])
  if (ov.success) {
    overview.value = ov.data || {}
    const p = ov.data?.policy || {}
    policy.defaultProviderId = p.defaultProviderId || ''
    policy.fallbackProviderId = p.fallbackProviderId || ''
    policy.failoverEnabled = p.failoverEnabled !== false
    policy.timeoutMs = p.timeoutMs || 30000
    policy.maxRetries = p.maxRetries == null ? 1 : p.maxRetries
    ensureDefaultProvider()
  }
  if (cat.success) catalog.value = cat.data || []
}

function ensureDefaultProvider() {
  const ready = readyProviders.value
  if (!ready.length) {
    policy.defaultProviderId = ''
    return
  }
  if (!ready.some((p) => p.id === policy.defaultProviderId)) {
    policy.defaultProviderId = ready[0].id
  }
}

function openCreate() {
  const preset = catalog.value.find((item) => item.vendor === 'CUSTOM') || {}
  Object.assign(form, {
    id: '', vendor: 'CUSTOM', protocol: 'OPENAI', name: '自定义通道',
    baseUrl: preset.baseUrl || 'https://api.openai.com/v1',
    apiKey: '', apiKeyMasked: '', defaultModel: preset.defaultModel || '',
    models: (preset.models || []).join(', '),
    timeoutMs: 30000, remark: '', enabled: true, configured: false,
    openAiHeaders: '',
    openAiWebSearch: false,
    customHttpMethod: 'POST',
    customHeaders: '{\n  "Content-Type": "application/json;charset=utf-8"\n}',
    customBodyTemplate: '{\n  "prompt": "{{prompt}}"\n}',
    customSuccessCode: 200,
    customResultPath: 'data.result',
    customErrorCodePath: 'code',
    customErrorMessagePath: 'msg'
  })
  testResult.value = null
  fetchedModels.value = []
  modalOpen.value = true
}

function openEdit(provider) {
  let customCfg = {}
  if (provider.customConfig) {
    try {
      customCfg = JSON.parse(provider.customConfig)
    } catch (e) {
      console.warn('Failed to parse customConfig JSON:', e)
    }
  }
  const openAiHdrs = (provider.protocol !== 'CUSTOM_HTTP' && customCfg.headers)
    ? JSON.stringify(customCfg.headers, null, 2)
    : ''

  Object.assign(form, {
    id: provider.id,
    vendor: provider.vendor,
    protocol: provider.protocol || 'OPENAI',
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: '',
    apiKeyMasked: provider.apiKeyMasked || '',
    defaultModel: provider.defaultModel || '',
    models: provider.models || '',
    timeoutMs: provider.timeoutMs || 30000,
    remark: provider.remark || '',
    enabled: provider.enabled,
    configured: provider.configured,
    openAiHeaders: openAiHdrs,
    openAiWebSearch: !!(customCfg.webSearch || customCfg.enable_search),
    customHttpMethod: customCfg.httpMethod || 'POST',
    customHeaders: customCfg.headers ? JSON.stringify(customCfg.headers, null, 2) : '{\n  "Content-Type": "application/json;charset=utf-8"\n}',
    customBodyTemplate: customCfg.bodyTemplate || '{\n  "prompt": "{{prompt}}"\n}',
    customSuccessCode: customCfg.successCode != null ? customCfg.successCode : 200,
    customResultPath: customCfg.resultPath || 'data.result',
    customErrorCodePath: customCfg.errorCodePath || 'code',
    customErrorMessagePath: customCfg.errorMessagePath || 'msg'
  })
  if (provider.lastProbeStatus === 'SUCCESS') {
    testResult.value = { success: true, message: provider.lastProbeMessage || '连通正常' }
  } else if (provider.lastProbeStatus === 'FAILED') {
    testResult.value = { success: false, message: provider.lastProbeMessage || '连通失败' }
  } else {
    testResult.value = null
  }
  fetchedModels.value = provider.modelList || []
  modalOpen.value = true
}

function loadSampleOpenAiHeaders() {
  if (form.name === '自定义通道' || !form.name) {
    form.name = '第三方鱼亮通道'
  }
  form.baseUrl = 'http://82.157.197.25:9540/api/modelConfig/modelLlmModel'
  form.openAiHeaders = JSON.stringify({
    "app_id": "0JO1CFNCJ3",
    "device_mac": "66666"
  }, null, 2)
  form.defaultModel = 'deepseek-v4-flash'
  form.apiKey = ''
  form.openAiWebSearch = true
  showToast('已载入第三方 (鱼亮) Header 鉴权与联网搜索示例', 'info', 2000)
}

function loadSampleCustomConfig() {
  if (form.name === '自定义通道' || !form.name) {
    form.name = '第三方定制通道'
  }
  form.baseUrl = 'http://82.157.197.25:9540/api/modelConfig/modelLlmModel'
  form.customHttpMethod = 'POST'
  form.customHeaders = '{\n  "Content-Type": "application/json;charset=utf-8"\n}'
  form.customBodyTemplate = JSON.stringify({
    appId: "EM7C8J0FKC",
    deviceMac: "8CFCA0288618",
    prompt: "{{prompt}}"
  }, null, 2)
  form.customSuccessCode = 200
  form.customResultPath = 'data.result'
  form.customErrorCodePath = 'code'
  form.customErrorMessagePath = 'msg'
  form.defaultModel = 'customer-llm'
  showToast('已载入第三方定制通道示例配置', 'info', 2000)
}

async function saveProvider() {
  if (form.protocol === 'CUSTOM_HTTP') {
    if (!form.baseUrl.trim()) {
      showToast('请填写接口地址 (Endpoint URL)', 'error')
      return
    }
    if (!form.defaultModel.trim()) {
      showToast('请填写模型标识名称', 'error')
      return
    }
    let headersObj = {}
    if (form.customHeaders && form.customHeaders.trim()) {
      try {
        headersObj = JSON.parse(form.customHeaders)
      } catch (e) {
        showToast('请求头必须是合法的 JSON 对象', 'error')
        return
      }
    }
    if (form.customBodyTemplate && form.customBodyTemplate.trim()) {
      try {
        JSON.parse(form.customBodyTemplate)
      } catch (e) {
        showToast('请求 Body 模板必须是合法的 JSON', 'error')
        return
      }
    }
    saving.value = true
    const customConfigObj = {
      endpointUrl: form.baseUrl.trim(),
      httpMethod: form.customHttpMethod || 'POST',
      headers: headersObj,
      bodyTemplate: form.customBodyTemplate,
      successCode: Number(form.customSuccessCode) || 200,
      resultPath: form.customResultPath.trim() || 'data.result',
      errorCodePath: form.customErrorCodePath.trim() || 'code',
      errorMessagePath: form.customErrorMessagePath.trim() || 'msg',
      modelName: form.defaultModel.trim() || 'custom-model'
    }
    const payload = {
      vendor: form.vendor,
      protocol: 'CUSTOM_HTTP',
      customConfig: JSON.stringify(customConfigObj, null, 2),
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      defaultModel: form.defaultModel.trim(),
      models: form.defaultModel.trim(),
      timeoutMs: form.timeoutMs,
      remark: form.remark.trim(),
      enabled: form.enabled
    }
    const res = form.id
      ? await http.put(`/api/model-gateway/providers/${form.id}`, payload)
      : await http.post('/api/model-gateway/providers', payload)
    saving.value = false
    if (res.success) {
      showToast(res.message || '通道已保存', 'success')
      modalOpen.value = false
      await load()
    } else {
      showToast(res.message || '保存失败', 'error')
    }
    return
  }

  // OpenAI 兼容
  saving.value = true
  let headersObj = {}
  if (form.openAiHeaders && form.openAiHeaders.trim()) {
    try {
      headersObj = JSON.parse(form.openAiHeaders)
    } catch (e) {
      showToast('自定义请求头必须是合法的 JSON 格式', 'error')
      saving.value = false
      return
    }
  }

  const customConfigObj = {
    headers: headersObj,
    webSearch: !!form.openAiWebSearch
  }

  const payload = {
    vendor: form.vendor,
    protocol: 'OPENAI',
    customConfig: JSON.stringify(customConfigObj, null, 2),
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    defaultModel: form.defaultModel.trim(),
    models: form.models.trim(),
    timeoutMs: form.timeoutMs,
    remark: form.remark.trim(),
    enabled: form.enabled
  }

  const res = form.id
    ? await http.put(`/api/model-gateway/providers/${form.id}`, payload)
    : await http.post('/api/model-gateway/providers', payload)
  saving.value = false
  if (res.success) {
    showToast(res.message || '通道已保存', 'success')
    modalOpen.value = false
    await load()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function testInModal() {
  testing.value = true
  testResult.value = null
  let headersObj = {}
  if (form.protocol === 'CUSTOM_HTTP') {
    if (form.customHeaders && form.customHeaders.trim()) {
      try {
        headersObj = JSON.parse(form.customHeaders)
      } catch (e) {
        testResult.value = { success: false, message: '请求头必须是合法的 JSON' }
        testing.value = false
        return
      }
    }
  } else if (form.openAiHeaders && form.openAiHeaders.trim()) {
    try {
      headersObj = JSON.parse(form.openAiHeaders)
    } catch (e) {
      testResult.value = { success: false, message: '请求头必须是合法的 JSON' }
      testing.value = false
      return
    }
  }

  const payload = {
    vendor: form.vendor,
    protocol: form.protocol,
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    apiKeyMasked: form.apiKeyMasked,
    model: form.defaultModel.trim(),
    timeoutMs: form.timeoutMs,
    customConfig: form.protocol === 'CUSTOM_HTTP'
      ? JSON.stringify({
          endpointUrl: form.baseUrl.trim(),
          httpMethod: form.customHttpMethod || 'POST',
          headers: headersObj,
          bodyTemplate: form.customBodyTemplate,
          successCode: Number(form.customSuccessCode) || 200,
          resultPath: form.customResultPath.trim() || 'data.result',
          errorCodePath: form.customErrorCodePath.trim() || 'code',
          errorMessagePath: form.customErrorMessagePath.trim() || 'msg',
          modelName: form.defaultModel.trim() || 'custom-model'
        })
      : JSON.stringify({ headers: headersObj, webSearch: !!form.openAiWebSearch })
  }

  const res = await http.post('/api/model-gateway/probe', payload)
  testing.value = false
  if (res.success && res.data) {
    testResult.value = res.data
    if (res.data.discoveredModels && res.data.discoveredModels.length) {
      fetchedModels.value = res.data.discoveredModels
    }
  } else {
    testResult.value = { success: false, message: res.message || '测试失败' }
  }
}

async function probe(p) {
  probing.value = p.id
  const res = await http.post(`/api/model-gateway/providers/${p.id}/probe`)
  probing.value = ''
  if (res.success) {
    showToast(res.message || '探测完成', 'success')
  } else {
    showToast(res.message || '探测失败', 'error')
  }
  await load()
}

async function toggle(p, enabled) {
  toggling.value = p.id
  const res = await http.patch(`/api/model-gateway/providers/${p.id}/enabled`, { enabled })
  toggling.value = ''
  if (res.success) {
    p.enabled = enabled
    showToast(`通道【${p.name}】已${enabled ? '启用' : '停用'}`, 'success')
    await load()
  } else {
    showToast(res.message || '切换状态失败', 'error')
  }
}

async function removeCustom(p) {
  if (!confirm(`确定删除通道【${p.name}】吗？`)) return
  const res = await http.delete(`/api/model-gateway/providers/${p.id}`)
  if (res.success) {
    showToast('通道已删除', 'success')
    await load()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function savePolicy() {
  savingPolicy.value = true
  const res = await http.put('/api/model-gateway/policy', policy)
  savingPolicy.value = false
  if (res.success) {
    showToast('路由策略已保存', 'success')
    await load()
  } else {
    showToast(res.message || '保存路由失败', 'error')
  }
}

const loading = ref(false)

async function refreshAll() {
  loading.value = true
  try {
    await Promise.all([load(), loadEmbeddings(), loadDifys()])
  } catch (err) {
    console.error('刷新网关失败:', err)
  } finally {
    loading.value = false
  }
}

defineExpose({
  refreshAll,
  load,
  loadEmbeddings,
  loadDifys
})

onMounted(refreshAll)
</script>

<style scoped>
.gateway-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 顶部 Tab 导航栏 */
.gateway-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  box-shadow: var(--shadow-card);
  flex-wrap: wrap;
}

.gateway-header-info h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.gateway-header-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
  max-width: 600px;
  line-height: 1.5;
}

.gateway-nav-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.gateway-nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.gateway-nav-tab:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
}

.gateway-nav-tab.active {
  background: var(--bg-card);
  color: var(--accent-blue);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-muted);
  font-weight: 500;
}

.tab-badge.badge-active {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* 激活横幅 Hero Banner */
.gateway-hero-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.hero-metric-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.hero-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.icon-emb {
  background: rgba(139, 92, 246, 0.12);
  color: var(--accent-purple);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.icon-dify {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.hero-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.hero-state-pill {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.hero-vendor-pill {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-muted);
}

.hero-text-box h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.hero-model-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  background: var(--bg-input);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--accent-cyan);
  border: 1px solid var(--border-color);
}

.hero-subtext {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.hero-empty-title {
  font-size: 14.5px;
  color: var(--text-muted);
  font-weight: 500;
}

/* 激活徽标与设为生效按钮 */
.active-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11.5px;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
  white-space: nowrap;
}

.btn-activate-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11.5px;
  font-weight: 500;
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-activate-action:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-1px);
}

/* 厂商快捷选择 */
.preset-pill-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-pill {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-pill:hover {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

/* 原有网关工具条与策略条 */
.gateway-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.gateway-toolbar h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px 0;
}

.gateway-toolbar p {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
}

.gateway-policy-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.gateway-policy-bar label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.gateway-policy-bar select {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12.5px;
  color: var(--text-primary);
  outline: none;
}

.gateway-inline-switch {
  cursor: pointer;
}

.gateway-table-card {
  margin-bottom: 0;
}

.gateway-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gateway-vendor-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.gateway-vendor-logo {
  width: 20px;
  height: 20px;
}

.gateway-key-mask {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: var(--text-muted);
}

.gateway-model-cell {
  font-weight: 600;
  color: var(--text-primary);
}

.gateway-proto-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 6px;
}

.proto-custom {
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
}

.proto-openai {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
}

.gateway-protocol-switch {
  display: flex;
  gap: 10px;
}

.protocol-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.protocol-tab-btn.active {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  font-weight: 600;
}

.protocol-tab-icon {
  width: 18px;
  height: 18px;
}

.gateway-saved-key {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  padding: 5px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 12px;
}

.gateway-saved-key code {
  color: var(--accent-cyan);
  font-family: monospace;
}

.gateway-saved-key em {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: auto;
  font-style: normal;
}

.gateway-enable-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  margin-top: 14px;
  cursor: pointer;
}

.gateway-test-result {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.gateway-test-result.is-ok {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.gateway-test-result.is-fail {
  background: rgba(244, 63, 94, 0.12);
  color: var(--accent-rose);
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.probe-btn-success {
  color: var(--accent-emerald) !important;
  background: rgba(16, 185, 129, 0.1) !important;
}

.probe-btn-fail {
  color: var(--accent-rose) !important;
  background: rgba(244, 63, 94, 0.1) !important;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.code-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

/* 白天模式增强适配 */
[data-theme="light"] .gateway-header-bar,
[data-theme="light"] .gateway-policy-bar,
[data-theme="light"] .gateway-hero-banner {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

[data-theme="light"] .gateway-nav-tabs {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

[data-theme="light"] .gateway-nav-tab.active {
  background: #ffffff;
  color: #2563eb;
}

[data-theme="light"] .hero-metric-left h3 {
  color: #0f172a;
}

[data-theme="light"] .hero-model-code {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #0284c7;
}

[data-theme="light"] .btn-activate-action {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #64748b;
}

[data-theme="light"] .btn-activate-action:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}
</style>
