<template>
  <div class="gateway-section-content">
    <div class="gateway-hero-banner">
      <div class="hero-metric-left">
        <div class="hero-icon-box icon-ocr"><i class="fa-solid fa-eye"></i></div>
        <div class="hero-text-box">
          <div class="hero-tag-row">
            <span class="hero-state-pill">当前知识库解析生效的 OCR</span>
            <span v-if="activeOcr" class="hero-vendor-pill">{{ ocrProviderLabel(activeOcr.provider) }}</span>
          </div>
          <h3 v-if="activeOcr">{{ activeOcr.name }} <code class="hero-model-code">{{ activeOcr.modelName || activeOcr.endpoint }}</code></h3>
          <h3 v-else class="hero-empty-title">尚未在网关激活 OCR（扫描件将降级为待识别，不阻断其他文档）</h3>
          <p v-if="activeOcr" class="hero-subtext">
            接口: <code>{{ activeOcr.endpoint }}</code>
            <span v-if="activeOcr.modelName"> · 模型: <strong>{{ activeOcr.modelName }}</strong></span>
            · 超时 {{ activeOcr.timeoutSeconds || 30 }}s
          </p>
        </div>
      </div>
      <div class="hero-metric-right" style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
        <button class="btn-create-agent" @click="openCreateOcr">
          <i class="fa-solid fa-plus"></i><span>添加 OCR 引擎</span>
        </button>
      </div>
    </div>

    <div class="table-view-card gateway-table-card">
      <table class="agent-table">
        <thead>
          <tr>
            <th style="min-width: 200px;">配置名称 / 模式</th>
            <th style="min-width: 220px;">接口地址</th>
            <th style="min-width: 120px;">模型</th>
            <th style="min-width: 100px;">连通状态</th>
            <th style="min-width: 120px;">当前生效状态</th>
            <th style="min-width: 180px; text-align:right;">操作管理</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!ocrs.length">
            <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
              <i class="fa-solid fa-eye" style="font-size: 28px; margin-bottom: 8px; display:block; opacity:0.4;"></i>
              暂无 OCR 配置，点击上方“添加 OCR 引擎”录入本地 PaddleOCR 或在线 Vision API
            </td>
          </tr>
          <tr v-for="item in ocrs" :key="item.id">
            <td>
              <div class="table-agent-meta">
                <div class="table-agent-avatar" style="font-size: 16px;"><i class="fa-solid fa-eye"></i></div>
                <div>
                  <div class="table-agent-title">{{ item.name }}</div>
                  <div class="table-agent-code">
                    <span class="spec-badge" style="padding: 1px 5px;">{{ ocrProviderLabel(item.provider) }}</span>
                    <span v-if="item.apiKeyMasked" class="gateway-key-mask" style="margin-left: 4px;">{{ item.apiKeyMasked }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <code class="gateway-key-mask" :title="item.endpoint">{{ item.endpoint }}</code>
            </td>
            <td>
              <span class="hero-model-code" style="font-size: 12px;">{{ item.modelName || '—' }}</span>
            </td>
            <td>
              <div class="badge-status" :class="item.lastProbeStatus === 'SUCCESS' ? 'badge-success' : (item.lastProbeStatus === 'FAILED' ? 'badge-danger' : 'badge-warning')">
                <span class="status-dot"></span>
                <span>{{ item.lastProbeStatus === 'SUCCESS' ? '就绪' : (item.lastProbeStatus === 'FAILED' ? '异常' : '未测试') }}</span>
              </div>
            </td>
            <td>
              <span v-if="item.isActive" class="active-badge-tag"><i class="fa-solid fa-circle-check"></i> 当前生效中</span>
              <button v-else class="btn-activate-action" title="设为当前生效的 OCR" @click="activateOcr(item)">
                <i class="fa-solid fa-bolt"></i> 设为生效
              </button>
            </td>
            <td style="text-align:right;">
              <div class="agent-actions" style="justify-content:flex-end;">
                <button
                  class="btn-card-action btn-action-icon"
                  :class="{
                    'probe-btn-success': item.lastProbeStatus === 'SUCCESS',
                    'probe-btn-fail': item.lastProbeStatus === 'FAILED'
                  }"
                  :title="item.lastProbeMessage || '测试接口连通性'"
                  :disabled="probingOcr === item.id"
                  @click="probeOcr(item)"
                >
                  <i :class="probingOcr === item.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
                </button>
                <button class="btn-card-action btn-action-icon" title="编辑配置" @click="openEditOcr(item)">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="btn-card-action btn-action-icon btn-action-danger" title="删除配置" @click="removeOcr(item)">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL: OCR 引擎配置 -->
    <div class="modal-backdrop" :class="{ open: ocrModalOpen }">
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <h3>{{ ocrForm.id ? '编辑 OCR 识图引擎' : '添加 OCR 识图引擎' }}</h3>
          <button class="btn-modal-close" @click="ocrModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form @submit.prevent="saveOcr">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">常用预设</label>
              <div class="preset-pill-group">
                <button type="button" class="preset-pill" @click="applyOcrPreset('paddle')">本地 PaddleOCR</button>
                <button type="button" class="preset-pill" @click="applyOcrPreset('qwen')">通义千问 VL</button>
                <button type="button" class="preset-pill" @click="applyOcrPreset('openai')">OpenAI GPT-4o</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">配置名称 *</label>
              <input v-model="ocrForm.name" class="form-control-styled" placeholder="如 内网 PaddleOCR" required>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">运行模式</label>
                <select v-model="ocrForm.provider" class="form-control-styled">
                  <option value="LOCAL_PADDLE_OCR">本地 PaddleOCR（数据不出网）</option>
                  <option value="ONLINE_API">在线 Vision / 云 OCR API</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">超时秒数</label>
                <input v-model.number="ocrForm.timeoutSeconds" type="number" min="5" class="form-control-styled">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">接口地址 *</label>
              <input v-model="ocrForm.endpoint" class="form-control-styled" placeholder="本地如 http://192.x:8866/predict/ocr_system" required>
              <p class="gateway-field-hint">本地填 PaddleOCR HTTP 地址；在线填 OpenAI 兼容的 <code>/chat/completions</code>。</p>
            </div>

            <div v-if="ocrForm.provider === 'ONLINE_API'" class="form-group">
              <label class="form-label">API Key</label>
              <div v-if="ocrForm.apiKeyMasked" class="gateway-saved-key">
                <span>已保存密钥</span>
                <code>{{ ocrForm.apiKeyMasked }}</code>
                <em>已加密，留空则保持不变</em>
              </div>
              <input
                v-model="ocrForm.apiKey"
                type="password"
                class="form-control-styled"
                autocomplete="new-password"
                :placeholder="ocrForm.apiKeyMasked ? '若无需修改密钥，此处留空' : 'sk-...'"
                :required="!ocrForm.id"
              >
            </div>

            <div v-if="ocrForm.provider === 'ONLINE_API'" class="form-group">
              <label class="form-label">视觉模型名称</label>
              <input v-model="ocrForm.modelName" class="form-control-styled" placeholder="如 qwen-vl-plus 或 gpt-4o-mini">
            </div>

            <label class="gateway-enable-row">
              <input v-model="ocrForm.isActive" type="checkbox">
              <span>保存后直接设为系统全局生效的 OCR</span>
            </label>

            <div v-if="ocrTestResult" class="gateway-test-result" :class="ocrTestResult.success ? 'is-ok' : 'is-fail'">
              <i :class="ocrTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
              <span>{{ ocrTestResult.message }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="ocrModalOpen = false">取消</button>
            <button
              type="button"
              class="btn-secondary gateway-test-btn"
              :class="{
                'test-btn-success': ocrTestResult && ocrTestResult.success,
                'test-btn-fail': ocrTestResult && !ocrTestResult.success
              }"
              :disabled="testingOcr"
              @click="testOcrInModal"
            >
              <i :class="testingOcr ? 'fa-solid fa-spinner fa-spin' : (ocrTestResult ? (ocrTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark') : 'fa-solid fa-plug-circle-check')"></i>
              <span>{{ testingOcr ? '测试中...' : (ocrTestResult ? (ocrTestResult.success ? '测试通过' : '测试失败') : '测试连通性') }}</span>
            </button>
            <button type="submit" class="btn-create-agent" :disabled="savingOcr">
              {{ savingOcr ? '保存中...' : '保存配置' }}
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

// OCR 引擎配置：列表、增改删、激活与连通性测试
const ocrs = ref([])
const ocrModalOpen = ref(false)
const savingOcr = ref(false)
const probingOcr = ref('')
const testingOcr = ref(false)
const ocrTestResult = ref(null)
const ocrForm = reactive({
  id: '',
  name: '',
  provider: 'LOCAL_PADDLE_OCR',
  endpoint: 'http://localhost:8866/predict/ocr_system',
  apiKey: '',
  apiKeyMasked: '',
  modelName: '',
  timeoutSeconds: 30,
  isActive: true,
  enabled: true
})
const activeOcr = computed(() => ocrs.value.find((item) => item.isActive))

function ocrProviderLabel(provider) {
  const p = (provider || '').toUpperCase()
  if (p.includes('ONLINE') || p.includes('CLOUD')) return '在线 Vision API'
  return '本地 PaddleOCR'
}

function applyOcrPreset(kind) {
  if (kind === 'paddle') {
    ocrForm.provider = 'LOCAL_PADDLE_OCR'
    ocrForm.name = '本地 PaddleOCR'
    ocrForm.endpoint = 'http://localhost:8866/predict/ocr_system'
    ocrForm.modelName = ''
    ocrForm.timeoutSeconds = 30
  } else if (kind === 'qwen') {
    ocrForm.provider = 'ONLINE_API'
    ocrForm.name = '通义千问 VL OCR'
    ocrForm.endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    ocrForm.modelName = 'qwen-vl-plus'
    ocrForm.timeoutSeconds = 60
  } else {
    ocrForm.provider = 'ONLINE_API'
    ocrForm.name = 'OpenAI GPT-4o OCR'
    ocrForm.endpoint = 'https://api.openai.com/v1/chat/completions'
    ocrForm.modelName = 'gpt-4o-mini'
    ocrForm.timeoutSeconds = 60
  }
  ocrTestResult.value = null
}

function openCreateOcr() {
  Object.assign(ocrForm, {
    id: '',
    name: '本地 PaddleOCR',
    provider: 'LOCAL_PADDLE_OCR',
    endpoint: 'http://localhost:8866/predict/ocr_system',
    apiKey: '',
    apiKeyMasked: '',
    modelName: '',
    timeoutSeconds: 30,
    isActive: ocrs.value.length === 0,
    enabled: true
  })
  ocrTestResult.value = null
  ocrModalOpen.value = true
}

function openEditOcr(item) {
  Object.assign(ocrForm, {
    id: item.id,
    name: item.name,
    provider: item.provider || 'LOCAL_PADDLE_OCR',
    endpoint: item.endpoint || '',
    apiKey: '',
    apiKeyMasked: item.apiKeyMasked || '',
    modelName: item.modelName || '',
    timeoutSeconds: item.timeoutSeconds || 30,
    isActive: item.isActive,
    enabled: item.enabled
  })
  ocrTestResult.value = null
  ocrModalOpen.value = true
}

async function testOcrInModal() {
  if (!ocrForm.endpoint.trim()) {
    showToast('请先填写接口地址再测试连通性', 'error')
    return
  }
  if (ocrForm.provider === 'ONLINE_API' && !ocrForm.id && !ocrForm.apiKey.trim()) {
    showToast('在线 OCR 请先填写 API Key 再测试', 'error')
    return
  }
  testingOcr.value = true
  ocrTestResult.value = null
  const res = await http.post('/api/model-gateway/ocr/test-connection', {
    id: ocrForm.id || undefined,
    provider: ocrForm.provider,
    endpoint: ocrForm.endpoint.trim(),
    apiKey: ocrForm.apiKey.trim(),
    timeoutSeconds: ocrForm.timeoutSeconds
  })
  testingOcr.value = false
  ocrTestResult.value = {
    success: !!res.success,
    message: res.message || (res.success ? '连通正常' : '连通失败')
  }
  if (res.success) {
    showToast(res.message || 'OCR 连通正常', 'success')
  } else {
    showToast(res.message || '连通失败', 'error')
  }
}

async function loadOcrs() {
  const res = await http.get('/api/model-gateway/ocr')
  if (res.success) {
    ocrs.value = res.data || []
  }
}

async function saveOcr() {
  if (!ocrForm.name.trim() || !ocrForm.endpoint.trim()) {
    showToast('请填写名称与接口地址', 'error')
    return
  }
  if (ocrForm.provider === 'ONLINE_API' && !ocrForm.id && !ocrForm.apiKey.trim()) {
    showToast('在线 OCR 请填写 API Key', 'error')
    return
  }
  savingOcr.value = true
  const payload = {
    name: ocrForm.name.trim(),
    provider: ocrForm.provider,
    endpoint: ocrForm.endpoint.trim(),
    apiKey: ocrForm.apiKey.trim(),
    modelName: ocrForm.modelName.trim(),
    timeoutSeconds: ocrForm.timeoutSeconds,
    isActive: ocrForm.isActive,
    enabled: true
  }
  const res = ocrForm.id
    ? await http.put(`/api/model-gateway/ocr/${ocrForm.id}`, payload)
    : await http.post('/api/model-gateway/ocr', payload)
  savingOcr.value = false
  if (res.success) {
    showToast(res.message || 'OCR 配置已保存', 'success')
    ocrModalOpen.value = false
    await loadOcrs()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function activateOcr(item) {
  const res = await http.post(`/api/model-gateway/ocr/${item.id}/activate`)
  if (res.success) {
    showToast(`已激活【${item.name}】作为当前 OCR`, 'success')
    await loadOcrs()
  } else {
    showToast(res.message || '激活失败', 'error')
  }
}

async function removeOcr(item) {
  if (!confirm(`确定删除 OCR 配置【${item.name}】吗？`)) return
  const res = await http.delete(`/api/model-gateway/ocr/${item.id}`)
  if (res.success) {
    showToast('OCR 配置已删除', 'success')
    await loadOcrs()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function probeOcr(item) {
  probingOcr.value = item.id
  const res = await http.post(`/api/model-gateway/ocr/${item.id}/probe`)
  probingOcr.value = ''
  if (res.success) {
    showToast(res.message || 'OCR 服务可达', 'success')
  } else {
    showToast(res.message || '连通失败', 'error')
  }
  await loadOcrs()
}

// ==========================================
// 刷新与状态上报（侧边栏子菜单的状态点）
// ==========================================
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    await loadOcrs()
  } catch (err) {
    console.error('刷新失败:', err)
  } finally {
    loading.value = false
  }
}

const status = computed(() => {
  const a = activeOcr.value
  if (!a) return { state: 'off', text: '未启用（扫描件不会识别文字）' }
  if (a.lastProbeStatus === 'FAILED') return { state: 'warn', text: a.name + ' 连通异常' }
  return { state: 'ok', text: '生效中：' + a.name }
})

watch(status, (value) => emit('status', value), { immediate: true })

defineExpose({ refresh })

onMounted(refresh)
</script>

<style scoped src="../../assets/gateway.css"></style>
