<template>
  <div class="gateway-section-content">
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
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refresh">
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
                <button type="button" class="preset-pill" @click="applyEmbPreset('header-relay')">Header 鉴权中转</button>
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
              <p class="gateway-field-hint">
                填 OpenAI 兼容的 Base URL 时自动拼接 <code>/embeddings</code>；地址最后一段以 <code>embeddings</code> 结尾时
                （如 <code>/api/modelConfig/textEmbeddings</code>）视为完整接口地址，原样调用。
                实际调用：<code>{{ embEndpointPreview }}</code>
              </p>
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
              <label class="form-label">自定义请求头 (可选，加密存储)</label>
              <div v-for="(h, i) in embForm.headers" :key="i" class="emb-header-row">
                <input
                  v-model="h.name"
                  class="form-control-styled"
                  placeholder="名称，如 app_id"
                  autocomplete="off"
                  @input="embTestResult = null"
                >
                <input
                  v-model="h.value"
                  type="password"
                  class="form-control-styled"
                  autocomplete="new-password"
                  :placeholder="h.saved ? '已加密保存，留空不改' : '值'"
                  @input="embTestResult = null"
                >
                <button type="button" class="btn-icon-plain" title="删除" @click="removeEmbHeader(i)">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button type="button" class="btn-link-add" :disabled="embForm.headers.length >= 10" @click="addEmbHeader()">
                <i class="fa-solid fa-plus"></i> 添加请求头
              </button>
              <p class="gateway-field-hint">用于不走 <code>Authorization: Bearer</code> 的中转服务，例如 <code>app_id</code> / <code>device_mac</code>。与 API Key 可同时使用，也可只用其一。</p>
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
            <button
              type="button"
              class="btn-secondary gateway-test-btn"
              :class="{
                'test-btn-success': embTestResult && embTestResult.success,
                'test-btn-fail': embTestResult && !embTestResult.success
              }"
              :disabled="testingEmb"
              @click="testEmbeddingInModal"
            >
              <i :class="testingEmb ? 'fa-solid fa-spinner fa-spin' : (embTestResult ? (embTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark') : 'fa-solid fa-plug-circle-check')"></i>
              <span>{{ testingEmb ? '测试中...' : (embTestResult ? (embTestResult.success ? '测试通过' : '测试失败') : '测试连通性') }}</span>
            </button>
            <button type="submit" class="btn-create-agent" :disabled="savingEmb">
              {{ savingEmb ? '保存中...' : '保存配置' }}
            </button>
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

const emit = defineEmits(['status'])
const { showToast } = useToast()

// ==========================================
// 向量模型配置：列表、增改删、激活与连通性测试
// ==========================================
const embeddings = ref([])
const embModalOpen = ref(false)
const savingEmb = ref(false)
const probingEmb = ref('')
const testingEmb = ref(false)
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
  enabled: true,
  headers: [] // { name, value, saved }：saved 表示服务端已保存过该请求头，值留空即保持不变
})

const activeEmbedding = computed(() => embeddings.value.find((e) => e.isActive))

// 与后端 EmbeddingConfigService.resolveEndpoint 一致：最后一段以 embeddings 结尾时视为完整地址
const embEndpointPreview = computed(() => {
  let url = (embForm.baseUrl || '').trim() || 'https://api.openai.com/v1'
  url = url.replace(/\/+$/, '')
  const path = url.split('?')[0]
  const last = path.substring(path.lastIndexOf('/') + 1).toLowerCase()
  return last.endsWith('embeddings') ? url : url + '/embeddings'
})

function addEmbHeader(name = '', value = '') {
  if (embForm.headers.length >= 10) return
  embForm.headers.push({ name, value, saved: false })
  embTestResult.value = null
}

function removeEmbHeader(index) {
  embForm.headers.splice(index, 1)
  embTestResult.value = null
}

function embHeadersPayload() {
  return embForm.headers
    .filter(h => h.name.trim() || h.value.trim())
    .map(h => ({ name: h.name.trim(), value: h.value.trim() }))
}

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
  } else if (type === 'header-relay') {
    // 中转服务常见写法：完整接口地址 + 请求头鉴权，不需要 API Key。地址和模型由使用者填写
    embForm.name = 'Header 鉴权向量中转'
    embForm.provider = 'CUSTOM'
    embForm.baseUrl = ''
    embForm.modelName = ''
    embForm.dimension = 1024
    for (const name of ['app_id', 'device_mac']) {
      if (!embForm.headers.some(h => h.name.toLowerCase() === name)) addEmbHeader(name)
    }
  }
  embTestResult.value = null
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
    enabled: true,
    headers: []
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
    enabled: item.enabled,
    headers: (item.customHeaderNames || []).map(name => ({ name, value: '', saved: true }))
  })
  embTestResult.value = null
  embModalOpen.value = true
}

async function testEmbeddingInModal() {
  if (!embForm.modelName.trim()) {
    showToast('请先填写向量模型名称再测试', 'error')
    return
  }
  testingEmb.value = true
  embTestResult.value = null
  const res = await http.post('/api/model-gateway/embeddings/test-connection', {
    id: embForm.id || undefined,
    baseUrl: embForm.baseUrl.trim(),
    apiKey: embForm.apiKey.trim(),
    modelName: embForm.modelName.trim(),
    customHeaders: embHeadersPayload()
  })
  testingEmb.value = false
  embTestResult.value = {
    success: !!res.success,
    message: res.message || (res.success ? '连通正常' : '连通失败')
  }
  if (res.success) {
    showToast(res.message || '向量模型连通正常', 'success')
    if (res.data && res.data.dimension) {
      embForm.dimension = res.data.dimension
    }
  } else {
    showToast(res.message || '连通失败', 'error')
  }
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
    enabled: embForm.enabled,
    customHeaders: embHeadersPayload()
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
// 刷新与状态上报（侧边栏子菜单的状态点）
// ==========================================
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    await loadEmbeddings()
  } catch (err) {
    console.error('刷新失败:', err)
  } finally {
    loading.value = false
  }
}

const status = computed(() => {
  const a = activeEmbedding.value
  if (!a) return { state: 'warn', text: '未激活向量模型，知识库无法语义检索' }
  if (a.lastProbeStatus === 'FAILED') return { state: 'warn', text: a.modelName + ' 连通异常' }
  return { state: 'ok', text: '生效中：' + (a.modelName || a.name) }
})

watch(status, (value) => emit('status', value), { immediate: true })

defineExpose({ refresh })

onMounted(refresh)
</script>

<style scoped src="../../assets/gateway.css"></style>
