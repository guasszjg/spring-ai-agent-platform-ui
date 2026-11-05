<template>
  <div class="gateway-section-content">
    <div class="gateway-toolbar">
      <div>
        <h3>通道调度</h3>
        <p>{{ providers.length }} 个通道 · 默认通道：<strong>{{ defaultName }}</strong></p>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refresh">
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
      <label title="平台 AI 助手使用的通道与模型，可选更便宜、工具调用更稳定的模型；专用通道不可用时自动回到默认通道">AI 助手
        <select v-model="policy.assistantProviderId" @change="policy.assistantModel = ''">
          <option value="">跟随默认通道</option>
          <option v-for="p in readyProviders" :key="'as-' + p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <select v-if="policy.assistantProviderId" v-model="policy.assistantModel">
          <option value="">通道默认模型{{ assistantProvider?.defaultModel ? '（' + assistantProvider.defaultModel + '）' : '' }}</option>
          <option v-for="m in assistantModelOptions" :key="'am-' + m" :value="m">{{ m }}</option>
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
                <span class="gateway-field-hint">支持标准 OpenAI 协议及无 Key、特定 Header 鉴权通道（支持 Tool Call 与多轮对话）。</span>
                <button type="button" class="btn-sample-load" @click="loadSampleOpenAiHeaders">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> 载入第三方 Header 鉴权示例
                </button>
              </div>

              <div class="form-group">
                <label class="form-label">接口地址 (Base URL / Endpoint)</label>
                <input v-model="form.baseUrl" class="form-control-styled" placeholder="如 https://api.openai.com/v1 或中转服务的完整接口地址" required>
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
                  placeholder='{\n  "app_id": "your-app-id",\n  "device_mac": "your-device-mac"\n}'
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
                    placeholder="如 deepseek-flash，可自由输入或从下拉选择"
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
              :title="testResult ? (testResult.success ? '上次测试通过，点击重新测试' : '上次测试失败，点击重新测试') : '测试连通性并拉取模型列表'"
              @click="testInModal"
            >
              <i :class="testing ? 'fa-solid fa-spinner fa-spin' : (testResult ? (testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark') : 'fa-solid fa-plug-circle-check')"></i>
              <span>{{ testing ? '测试中...' : (testResult ? '重新测试' : '测试连通性') }}</span>
            </button>
            <button type="submit" class="btn-create-agent" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../../api/http'
import { useToast } from '../../composables/useToast'
import logoDeepseek from '../../assets/vendors/deepseek-color.svg'
import logoQwen from '../../assets/vendors/qwen-color.svg'
import logoHunyuan from '../../assets/vendors/hunyuan-color.svg'
import logoZhipu from '../../assets/vendors/zhipu-color.svg'
import logoDoubao from '../../assets/vendors/doubao-color.svg'
import logoCustomHttp from '../../assets/vendors/custom-http-color.svg'
import logoCustomOpenAi from '../../assets/vendors/custom-openai-color.svg'
import logoCustom from '../../assets/vendors/custom-color.svg'

const emit = defineEmits(['status'])
const { showToast } = useToast()

// ==========================================
// 模型通道与路由策略：数据
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
  maxRetries: 1,
  assistantProviderId: '',
  assistantModel: ''
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
const assistantProvider = computed(() => providers.value.find(p => p.id === policy.assistantProviderId) || null)
const assistantModelOptions = computed(() => (assistantProvider.value?.modelList || [])
  .filter(m => m && m !== assistantProvider.value.defaultModel))
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
      ZHIPU: logoZhipu,
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
    BYTEDANCE: logoDoubao,
    ZHIPU: logoZhipu
  }[item.vendor] || logoCustom
}

function vendorLabel(vendor) {
  return {
    DEEPSEEK: 'DeepSeek',
    QIANWEN: '通义千问',
    TENCENT: '腾讯混元',
    BYTEDANCE: '字节豆包',
    ZHIPU: '智谱 GLM',
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
// 模型通道：加载、增改删、测试与路由策略保存
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
    policy.assistantProviderId = p.assistantProviderId || ''
    policy.assistantModel = p.assistantModel || ''
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
    form.name = '第三方 Header 鉴权通道'
  }
  form.baseUrl = 'https://your-gateway.example.com/v1'
  form.openAiHeaders = JSON.stringify({
    "app_id": "your-app-id",
    "device_mac": "your-device-mac"
  }, null, 2)
  form.defaultModel = 'deepseek-flash'
  form.apiKey = ''
  form.openAiWebSearch = true
  showToast('已载入第三方 Header 鉴权与联网搜索示例，请替换为实际地址和请求头', 'info', 2000)
}

function loadSampleCustomConfig() {
  if (form.name === '自定义通道' || !form.name) {
    form.name = '第三方定制通道'
  }
  form.baseUrl = 'https://your-gateway.example.com/api/chat'
  form.customHttpMethod = 'POST'
  form.customHeaders = '{\n  "Content-Type": "application/json;charset=utf-8"\n}'
  form.customBodyTemplate = JSON.stringify({
    appId: "your-app-id",
    deviceMac: "your-device-mac",
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
    // 编辑已有通道且没重新填 Key 时，后端按通道 ID 取已保存的密钥
    providerId: form.id || undefined,
    vendor: form.vendor,
    protocol: form.protocol,
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    apiKeyMasked: form.apiKeyMasked,
    model: form.defaultModel.trim(),
    defaultModel: form.defaultModel.trim(),
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

// ==========================================
// 刷新与状态上报（侧边栏子菜单的状态点）
// ==========================================
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    await load()
  } catch (err) {
    console.error('刷新失败:', err)
  } finally {
    loading.value = false
  }
}

const status = computed(() => {
  const ready = overview.value.readyCount || 0
  return ready > 0
    ? { state: 'ok', text: ready + ' 个通道就绪' }
    : { state: 'warn', text: '没有就绪的通道，智能体无法对话' }
})

watch(status, (value) => emit('status', value), { immediate: true })

defineExpose({ refresh })

onMounted(refresh)
</script>

<style scoped src="../../assets/gateway.css"></style>
