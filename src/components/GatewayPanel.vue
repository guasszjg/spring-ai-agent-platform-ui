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
            <th>API Key</th>
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
                  <i :class="vendorIcon(p.vendor)"></i>
                </div>
                <div>
                  <div class="table-agent-title">{{ p.name }}</div>
                  <div class="table-agent-code">{{ vendorLabel(p.vendor) }}</div>
                </div>
              </div>
            </td>
            <td>
              <code class="gateway-key-mask">{{ p.configured ? p.apiKeyMasked : '未配置' }}</code>
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
              <label class="switch" :title="p.configured ? '启用调度' : '请先配置密钥'">
                <input type="checkbox" :checked="p.enabled" :disabled="toggling === p.id" @change="toggle(p, $event.target.checked)">
                <span class="slider-toggle"></span>
              </label>
            </td>
            <td style="text-align:right;">
              <div class="agent-actions" style="justify-content:flex-end;">
                <button class="btn-card-action btn-action-icon" title="测试连通性" :disabled="probing === p.id || !p.configured" @click="probe(p)">
                  <i :class="probing === p.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
                </button>
                <button class="btn-card-action btn-chat-primary" @click="openEdit(p)">
                  <i class="fa-solid fa-key"></i><span>配置</span>
                </button>
                <button v-if="!p.builtin" class="btn-card-action btn-action-icon btn-action-danger" @click="removeCustom(p)">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="modal-backdrop" :class="{ open: modalOpen }">
    <div class="modal-dialog" style="max-width: 520px;">
      <div class="modal-header">
        <h3>{{ form.id ? '配置通道' : '添加通道' }}</h3>
        <button class="btn-modal-close" @click="modalOpen = false"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form @submit.prevent="saveProvider">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="form.name" class="form-control-styled" required>
          </div>
          <div class="form-group">
            <label class="form-label">Base URL</label>
            <input v-model="form.baseUrl" class="form-control-styled" required>
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
          <button type="button" class="btn-secondary gateway-test-btn" :disabled="testing" @click="testInModal">
            <i :class="testing ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
            <span>{{ testing ? '测试中...' : '测试连通性' }}</span>
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
  id: '', vendor: 'CUSTOM', name: '', baseUrl: '', apiKey: '', apiKeyMasked: '',
  defaultModel: '', models: '', timeoutMs: 30000, remark: '', enabled: false, configured: false
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

function vendorIcon(vendor) {
  return {
    DEEPSEEK: 'fa-solid fa-water',
    QIANWEN: 'fa-solid fa-cloud',
    TENCENT: 'fa-solid fa-comment-dots',
    BYTEDANCE: 'fa-solid fa-bolt',
    CUSTOM: 'fa-solid fa-plug'
  }[vendor] || 'fa-solid fa-microchip'
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
    id: '', vendor: 'CUSTOM', name: '自定义通道',
    baseUrl: preset.baseUrl || 'https://api.openai.com/v1',
    apiKey: '', apiKeyMasked: '', defaultModel: preset.defaultModel || '',
    models: (preset.models || []).join(', '),
    timeoutMs: 30000, remark: '', enabled: true, configured: false
  })
  testResult.value = null
  fetchedModels.value = []
  modalOpen.value = true
}

function openEdit(provider) {
  Object.assign(form, {
    id: provider.id,
    vendor: provider.vendor,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: '',
    apiKeyMasked: provider.apiKeyMasked || '',
    defaultModel: provider.defaultModel || '',
    models: provider.models || '',
    timeoutMs: provider.timeoutMs || 30000,
    remark: provider.remark || '',
    enabled: provider.enabled,
    configured: provider.configured
  })
  testResult.value = null
  fetchedModels.value = provider.modelList || []
  modalOpen.value = true
}

function outgoingApiKey() {
  const value = form.apiKey.trim()
  if (!value || value.includes('*') || value === form.apiKeyMasked) return ''
  return value
}

async function saveProvider() {
  saving.value = true
  const payload = {
    vendor: form.vendor,
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
