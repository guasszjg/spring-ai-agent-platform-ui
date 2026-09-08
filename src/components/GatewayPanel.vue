<template>
  <div class="gateway-page">
    <div class="gateway-toolbar">
      <div>
        <h2>模型通道</h2>
        <p>{{ overview.readyCount || 0 }} 个已就绪 · 默认 {{ defaultName }}</p>
      </div>
      <button class="btn-create-agent" @click="openCreate">
        <i class="fa-solid fa-plus"></i><span>添加通道</span>
      </button>
    </div>

    <div class="gateway-policy-bar">
      <label>默认
        <select v-model="policy.defaultProviderId" :disabled="!readyProviders.length">
          <option v-if="!readyProviders.length" value="" disabled>暂无就绪通道</option>
          <option v-for="p in readyProviders" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label>降级
        <select v-model="policy.fallbackProviderId">
          <option value="">不设置</option>
          <option v-for="p in readyProviders" :key="'fb-' + p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label class="gateway-inline-switch">
        <input v-model="policy.failoverEnabled" type="checkbox">
        故障转移
      </label>
      <button class="btn-secondary" :disabled="savingPolicy" @click="savePolicy">{{ savingPolicy ? '保存中...' : '保存路由' }}</button>
    </div>

    <div class="table-view-card gateway-table-card">
      <table class="agent-table">
        <thead>
          <tr>
            <th>通道</th>
            <th>接口 / 密钥</th>
            <th>默认模型</th>
            <th>状态</th>
            <th>启用</th>
            <th style="text-align:right;">操作</th>
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
              <code v-else class="gateway-key-mask">{{ p.configured ? p.apiKeyMasked : '未配置' }}</code>
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

  <div class="modal-backdrop" :class="{ open: modalOpen }">
    <div class="modal-dialog" style="max-width: 640px;">
      <div class="modal-header">
        <h3>{{ form.id ? '配置通道' : '添加通道' }}</h3>
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
            <div class="form-group">
              <label class="form-label">Base URL</label>
              <input v-model="form.baseUrl" class="form-control-styled" placeholder="https://api.openai.com/v1" required>
            </div>
            <div class="form-group">
              <label class="form-label">API Key</label>
              <div v-if="form.configured" class="gateway-saved-key">
                <span>当前密钥</span>
                <code>{{ form.apiKeyMasked }}</code>
                <em>已保存，明文不会回显</em>
              </div>
              <input
                v-model="form.apiKey"
                class="form-control-styled"
                type="password"
                autocomplete="new-password"
                :placeholder="form.configured ? '如需更换，在此输入新密钥' : 'sk-...'"
                :required="!form.id && !form.configured"
              >
            </div>
            <div class="form-group">
              <label class="form-label">默认模型</label>
              <select v-model="form.defaultModel" class="form-control-styled" required>
                <option value="" disabled>{{ modelOptions.length ? '请选择模型' : '先测试连通性，自动拉取模型' }}</option>
                <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
              </select>
              <p class="gateway-field-hint">填好密钥后点测试，会按供应商返回的模型列表选择。</p>
            </div>
          </template>

          <!-- 模式二：自定义 HTTP REST 接口 -->
          <template v-else>
            <div class="gateway-custom-toolbar">
              <span class="gateway-field-hint">针对第三方非标 REST 接口，支持灵活模板变量替换与响应结果提取。</span>
              <button type="button" class="btn-sample-load" @click="loadSampleCustomConfig">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 载入示例模板 (appId/deviceMac/prompt)
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
                <input v-model="form.baseUrl" class="form-control-styled" placeholder="http://82.157.197.25:9540/api/..." required>
              </div>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">模型标识名称</label>
                <input v-model="form.defaultModel" class="form-control-styled" placeholder="如 customer-llm" required>
                <p class="gateway-field-hint">智能体在模型列表中将直接显示此名称</p>
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
                <span class="gateway-var-tag">支持变量: <code>&#123;&#123;prompt&#125;&#125;</code> <code>&#123;&#123;user_message&#125;&#125;</code> <code>&#123;&#123;system_prompt&#125;&#125;</code></span>
              </div>
              <textarea v-model="form.customBodyTemplate" class="form-control-styled code-textarea" rows="5" placeholder='{\n  "appId": "EM7C8J0FKC",\n  "deviceMac": "8CFCA0288618",\n  "prompt": "{{prompt}}"\n}' required></textarea>
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

function applyFetchedModels(models) {
  const list = Array.isArray(models) ? models.filter(Boolean) : []
  fetchedModels.value = list
  if (!list.length) return
  form.models = list.join(',')
  if (!form.defaultModel || !list.includes(form.defaultModel)) {
    form.defaultModel = list[0]
  }
}

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

function outgoingApiKey() {
  const value = form.apiKey.trim()
  if (!value || value.includes('*') || value === form.apiKeyMasked) return ''
  return value
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

  // Standard OpenAI protocol
  saving.value = true
  const payload = {
    vendor: form.vendor,
    protocol: 'OPENAI',
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim(),
    defaultModel: form.defaultModel.trim(),
    models: fetchedModels.value.length ? fetchedModels.value.join(',') : form.models.trim(),
    timeoutMs: form.timeoutMs,
    remark: form.remark.trim(),
    enabled: form.enabled
  }
  const apiKey = outgoingApiKey()
  if (apiKey) payload.apiKey = apiKey
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

async function toggle(provider, enabled) {
  toggling.value = provider.id
  const res = await http.patch(`/api/model-gateway/providers/${provider.id}/enabled`, { enabled })
  toggling.value = ''
  if (res.success) {
    showToast(enabled ? `已启用 ${provider.name}` : `已停用 ${provider.name}`, 'success', 1800)
    await load()
  } else {
    showToast(res.message || '状态更新失败', 'error')
    await load()
  }
}

async function testInModal() {
  if (form.protocol === 'CUSTOM_HTTP') {
    if (!form.baseUrl.trim()) {
      showToast('请先填写接口地址 (Endpoint URL)', 'error')
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
    testing.value = true
    testResult.value = null
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
      providerId: form.id || null,
      protocol: 'CUSTOM_HTTP',
      customConfig: JSON.stringify(customConfigObj),
      baseUrl: form.baseUrl.trim(),
      timeoutMs: form.timeoutMs || 15000
    }
    const res = await http.post('/api/model-gateway/probe', payload)
    testing.value = false
    if (res.success && res.data) {
      testResult.value = { success: !!res.data.success, message: res.data.message || res.message }
      if (res.data.success) {
        if (!form.defaultModel && res.data.models && res.data.models.length) {
          form.defaultModel = res.data.models[0]
        }
      }
      showToast(testResult.value.success ? (testResult.value.message || '连通性测试通过') : (testResult.value.message || '测试失败'), testResult.value.success ? 'success' : 'error')
      if (form.id) await load()
    } else {
      testResult.value = { success: false, message: res.message || '测试失败' }
      showToast(testResult.value.message, 'error')
    }
    return
  }

  // Standard OpenAI probe
  if (!form.baseUrl.trim()) {
    showToast('请先填写 Base URL', 'error')
    return
  }
  if (!outgoingApiKey() && !form.configured) {
    showToast('请先填写 API Key 再测试', 'error')
    return
  }
  testing.value = true
  testResult.value = null
  const payload = {
    providerId: form.id || null,
    protocol: 'OPENAI',
    baseUrl: form.baseUrl.trim(),
    timeoutMs: form.timeoutMs || 15000
  }
  const apiKey = outgoingApiKey()
  if (apiKey) payload.apiKey = apiKey
  const res = await http.post('/api/model-gateway/probe', payload)
  testing.value = false
  if (res.success && res.data) {
    testResult.value = { success: !!res.data.success, message: res.data.message || res.message }
    if (res.data.success) applyFetchedModels(res.data.models || [])
    showToast(testResult.value.success ? (testResult.value.message || '连通性测试通过') : (testResult.value.message || '测试失败'), testResult.value.success ? 'success' : 'error')
    if (form.id) await load()
  } else {
    testResult.value = { success: false, message: res.message || '测试失败' }
    showToast(testResult.value.message, 'error')
  }
}

async function probe(provider) {
  probing.value = provider.id
  const res = await http.post(`/api/model-gateway/providers/${provider.id}/probe`)
  probing.value = ''
  if (res.success && res.data?.lastProbeStatus === 'SUCCESS') {
    showToast(`${provider.name} 连通正常`, 'success')
  } else {
    showToast(res.data?.lastProbeMessage || res.message || '探测失败', 'error')
  }
  await load()
}

async function savePolicy() {
  savingPolicy.value = true
  const res = await http.put('/api/model-gateway/policy', {
    defaultProviderId: policy.defaultProviderId || null,
    fallbackProviderId: policy.fallbackProviderId || null,
    failoverEnabled: policy.failoverEnabled,
    timeoutMs: policy.timeoutMs,
    maxRetries: policy.maxRetries
  })
  savingPolicy.value = false
  if (res.success) {
    showToast('路由策略已生效', 'success')
    await load()
  } else {
    showToast(res.message || '策略保存失败', 'error')
  }
}

async function removeCustom(provider) {
  if (!confirm(`确定删除通道「${provider.name}」？`)) return
  const res = await http.del(`/api/model-gateway/providers/${provider.id}`)
  if (res.success) {
    showToast('通道已删除', 'success')
    await load()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

onMounted(load)
</script>

<style scoped>
.gateway-proto-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}
.proto-openai {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.25);
}
.proto-custom {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.25);
}

.gateway-protocol-switch {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.protocol-tab-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #f8fafc);
  color: var(--text-secondary, #64748b);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.protocol-tab-btn:hover {
  background: var(--bg-hover, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.protocol-tab-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 600;
}

.gateway-custom-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(168, 85, 247, 0.06);
  border: 1px dashed rgba(168, 85, 247, 0.3);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.btn-sample-load {
  background: #a855f7;
  color: #fff;
  border: none;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.2s;
}

.btn-sample-load:hover {
  background: #9333ea;
}

.code-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.4;
}

.gateway-var-tag {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}

.gateway-var-tag code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: #3b82f6;
}

/* 弹窗中的测试连通性按钮状态 */
.gateway-test-btn {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 测试通过变绿 */
.gateway-test-btn.test-btn-success {
  background: #10b981 !important;
  border-color: #059669 !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
}

.gateway-test-btn.test-btn-success:hover {
  background: #059669 !important;
  border-color: #047857 !important;
}

/* 没通过变红 */
.gateway-test-btn.test-btn-fail {
  background: #ef4444 !important;
  border-color: #dc2626 !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
}

.gateway-test-btn.test-btn-fail:hover {
  background: #dc2626 !important;
  border-color: #b91c1c !important;
}

/* 通道列表行连通性测试按钮状态 */
.btn-action-icon.probe-btn-success {
  color: #10b981 !important;
  border-color: rgba(16, 185, 129, 0.4) !important;
  background: rgba(16, 185, 129, 0.12) !important;
}

.btn-action-icon.probe-btn-success:hover {
  background: rgba(16, 185, 129, 0.22) !important;
}

.btn-action-icon.probe-btn-fail {
  color: #ef4444 !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  background: rgba(239, 68, 68, 0.12) !important;
}

.btn-action-icon.probe-btn-fail:hover {
  background: rgba(239, 68, 68, 0.22) !important;
}

.protocol-tab-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

.gateway-vendor-mark.mark-custom {
  background: var(--bg-card, #ffffff) !important;
  border-color: rgba(99, 102, 241, 0.25) !important;
}

/* 系统预设通道锁定占位按钮 */
.btn-action-icon.btn-action-locked {
  opacity: 0.28;
  cursor: not-allowed !important;
  color: var(--text-muted, #94a3b8) !important;
  background: rgba(148, 163, 184, 0.06) !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
  pointer-events: auto;
  transition: opacity 0.2s;
}

.btn-action-icon.btn-action-locked:hover {
  opacity: 0.6;
  background: rgba(148, 163, 184, 0.12) !important;
}
</style>
