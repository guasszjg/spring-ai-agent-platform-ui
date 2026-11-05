<template>
  <div class="gateway-section-content">
    <div class="gateway-hero-banner">
      <div class="hero-metric-left">
        <div class="hero-icon-box icon-emb"><i class="fa-solid fa-arrows-spin"></i></div>
        <div class="hero-text-box">
          <div class="hero-tag-row">
            <span class="hero-state-pill">当前系统全局生效 Rerank 模型</span>
          </div>
          <h3 v-if="activeConfig">{{ activeConfig.name }} <code class="hero-model-code">{{ activeConfig.modelName }}</code></h3>
          <h3 v-else class="hero-empty-title">暂无生效的 Rerank 模型（自建知识库只能使用权重设置）</h3>
          <p v-if="activeConfig" class="hero-subtext">接口地址: <code>{{ activeConfig.baseUrl }}</code></p>
        </div>
      </div>
      <div class="hero-metric-right" style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
        <button class="btn-create-agent" @click="openCreate">
          <i class="fa-solid fa-plus"></i><span>添加 Rerank 模型</span>
        </button>
      </div>
    </div>

    <div class="table-view-card gateway-table-card">
      <table class="agent-table">
        <thead>
          <tr>
            <th style="min-width: 200px;">配置名称</th>
            <th style="min-width: 240px;">接口地址</th>
            <th style="min-width: 150px;">模型 (Model)</th>
            <th style="min-width: 100px;">连通状态</th>
            <th style="min-width: 120px;">当前生效状态</th>
            <th style="min-width: 180px; text-align:right;">操作管理</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!configs.length">
            <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
              <i class="fa-solid fa-arrows-spin" style="font-size: 28px; margin-bottom: 8px; display:block; opacity:0.4;"></i>
              暂无 Rerank 模型配置，点击上方“添加 Rerank 模型”录入
            </td>
          </tr>
          <tr v-for="c in configs" :key="c.id">
            <td>
              <div class="table-agent-meta">
                <div class="table-agent-avatar" style="font-size: 16px;"><i class="fa-solid fa-arrows-spin"></i></div>
                <div>
                  <div class="table-agent-title">{{ c.name }}</div>
                  <div v-if="c.apiKeyMasked" class="table-agent-code">
                    <span class="gateway-key-mask">{{ c.apiKeyMasked }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td><code class="gateway-key-mask" :title="c.baseUrl">{{ c.baseUrl }}</code></td>
            <td><span class="hero-model-code" style="font-size: 12px;">{{ c.modelName }}</span></td>
            <td>
              <div class="badge-status" :class="c.lastProbeStatus === 'SUCCESS' ? 'badge-success' : (c.lastProbeStatus === 'FAILED' ? 'badge-danger' : 'badge-warning')">
                <span class="status-dot"></span>
                <span>{{ c.lastProbeStatus === 'SUCCESS' ? '就绪' : (c.lastProbeStatus === 'FAILED' ? '异常' : '未测试') }}</span>
              </div>
            </td>
            <td>
              <span v-if="c.isActive" class="active-badge-tag"><i class="fa-solid fa-circle-check"></i> 当前生效中</span>
              <button v-else class="btn-activate-action" title="设为当前生效的 Rerank 模型" @click="activate(c)">
                <i class="fa-solid fa-bolt"></i> 设为生效
              </button>
            </td>
            <td style="text-align:right;">
              <div class="agent-actions" style="justify-content:flex-end;">
                <button
                  class="btn-card-action btn-action-icon"
                  :class="{ 'probe-btn-success': c.lastProbeStatus === 'SUCCESS', 'probe-btn-fail': c.lastProbeStatus === 'FAILED' }"
                  :title="c.lastProbeMessage || '测试接口连通性'"
                  :disabled="probing === c.id"
                  @click="probe(c)"
                >
                  <i :class="probing === c.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
                </button>
                <button class="btn-card-action btn-action-icon" title="编辑配置" @click="openEdit(c)">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="btn-card-action btn-action-icon btn-action-danger" title="删除配置" @click="remove(c)">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal-backdrop" :class="{ open: modalOpen }">
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <h3>{{ form.id ? '编辑 Rerank 模型' : '添加 Rerank 模型' }}</h3>
          <button class="btn-modal-close" @click="modalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form @submit.prevent="save">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">常用厂商快速预设（可选）</label>
              <div class="preset-pill-group">
                <button v-for="p in PRESETS" :key="p.modelName" type="button" class="preset-pill" @click="applyPreset(p)">{{ p.label }}</button>
              </div>
              <p class="gateway-field-hint">预设只是帮你填好下面的内容，也可以直接填写其他模型。</p>
            </div>

            <div class="form-group">
              <label class="form-label">配置名称 *</label>
              <input v-model="form.name" class="form-control-styled" placeholder="如 通义千问 qwen3-rerank" required>
            </div>

            <div class="form-group">
              <label class="form-label">接口地址 *</label>
              <input v-model="form.baseUrl" class="form-control-styled" placeholder="如 https://api.example.com/v1" required @input="testResult = null">
              <p class="gateway-field-hint">
                地址最后一段以 <code>rerank</code> 或 <code>reranks</code> 结尾时原样调用，否则自动拼接 <code>/rerank</code>。
                实际调用：<code>{{ endpointPreview }}</code>
              </p>
            </div>

            <div class="form-group">
              <label class="form-label">API Key (密文安全存储)</label>
              <div v-if="form.apiKeyMasked" class="gateway-saved-key">
                <span>已保存密钥</span>
                <code>{{ form.apiKeyMasked }}</code>
                <em>已加密，留空则保持不变</em>
              </div>
              <input
                v-model="form.apiKey"
                type="password"
                class="form-control-styled"
                autocomplete="new-password"
                :placeholder="form.apiKeyMasked ? '若无需修改密钥，此处留空' : 'sk-...（无需密钥的服务可不填）'"
                @input="testResult = null"
              >
            </div>

            <div class="form-group">
              <label class="form-label">自定义请求头 (可选，加密存储)</label>
              <div v-for="(h, i) in form.headers" :key="i" class="emb-header-row">
                <input v-model="h.name" class="form-control-styled" placeholder="名称，如 app_id" autocomplete="off" @input="testResult = null">
                <input
                  v-model="h.value"
                  type="password"
                  class="form-control-styled"
                  autocomplete="new-password"
                  :placeholder="h.saved ? '已加密保存，留空不改' : '值'"
                  @input="testResult = null"
                >
                <button type="button" class="btn-icon-plain" title="删除" @click="form.headers.splice(i, 1)">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button type="button" class="btn-link-add" :disabled="form.headers.length >= 10" @click="form.headers.push({ name: '', value: '', saved: false })">
                <i class="fa-solid fa-plus"></i> 添加请求头
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">模型名称 (Model Identifier) *</label>
              <input v-model="form.modelName" class="form-control-styled" placeholder="填写接口要求的模型名称" required @input="testResult = null">
            </div>

            <label class="gateway-enable-row">
              <input v-model="form.isActive" type="checkbox">
              <span>保存后直接设为系统全局生效的 Rerank 模型</span>
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
              :class="{ 'test-btn-success': testResult && testResult.success, 'test-btn-fail': testResult && !testResult.success }"
              :disabled="testing"
              @click="testInModal"
            >
              <i :class="testing ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug-circle-check'"></i>
              <span>{{ testing ? '测试中...' : (testResult ? (testResult.success ? '测试通过' : '测试失败') : '测试连通性') }}</span>
            </button>
            <button type="submit" class="btn-create-agent" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</button>
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

const PRESETS = [
  { label: '通义百炼 qwen3-rerank', name: '通义百炼 qwen3-rerank', baseUrl: 'https://dashscope.aliyuncs.com/compatible-api/v1/reranks', modelName: 'qwen3-rerank' },
  { label: '硅基流动 bge-reranker-v2-m3', name: '硅基流动 bge-reranker-v2-m3', baseUrl: 'https://api.siliconflow.cn/v1/rerank', modelName: 'BAAI/bge-reranker-v2-m3' },
  { label: '智谱 rerank', name: '智谱 rerank', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/rerank', modelName: 'rerank' },
  { label: 'Jina reranker', name: 'Jina reranker-v2', baseUrl: 'https://api.jina.ai/v1/rerank', modelName: 'jina-reranker-v2-base-multilingual' }
]

const configs = ref([])
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const testing = ref(false)
const probing = ref('')
const testResult = ref(null)
const form = reactive({ id: '', name: '', baseUrl: '', apiKey: '', apiKeyMasked: '', modelName: '', isActive: false, headers: [] })

const activeConfig = computed(() => configs.value.find((c) => c.isActive))

// 与后端 RerankConfigService.resolveEndpoint 一致
const endpointPreview = computed(() => {
  const url = (form.baseUrl || '').trim().replace(/\/+$/, '')
  if (!url) return '（请先填写接口地址）'
  const path = url.split('?')[0]
  const last = path.substring(path.lastIndexOf('/') + 1).toLowerCase()
  return last.endsWith('rerank') || last.endsWith('reranks') ? url : url + '/rerank'
})

function headersPayload() {
  return form.headers
    .filter((h) => h.name.trim() || h.value.trim())
    .map((h) => ({ name: h.name.trim(), value: h.value.trim() }))
}

function applyPreset(preset) {
  form.name = preset.name
  form.baseUrl = preset.baseUrl
  form.modelName = preset.modelName
  testResult.value = null
}

function openCreate() {
  Object.assign(form, { id: '', name: '', baseUrl: '', apiKey: '', apiKeyMasked: '', modelName: '', isActive: !activeConfig.value, headers: [] })
  testResult.value = null
  modalOpen.value = true
}

function openEdit(item) {
  Object.assign(form, {
    id: item.id,
    name: item.name,
    baseUrl: item.baseUrl,
    apiKey: '',
    apiKeyMasked: item.apiKeyMasked || '',
    modelName: item.modelName,
    isActive: item.isActive,
    headers: (item.customHeaderNames || []).map((name) => ({ name, value: '', saved: true }))
  })
  testResult.value = null
  modalOpen.value = true
}

async function testInModal() {
  if (!form.baseUrl.trim() || !form.modelName.trim()) {
    showToast('请先填写接口地址和模型名称', 'error')
    return
  }
  testing.value = true
  testResult.value = null
  const res = await http.post('/api/model-gateway/reranks/test-connection', {
    id: form.id || undefined,
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    modelName: form.modelName.trim(),
    customHeaders: headersPayload()
  })
  testing.value = false
  testResult.value = { success: !!res.success, message: res.message || (res.success ? '连通正常' : '连通失败') }
}

async function save() {
  saving.value = true
  const payload = {
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    modelName: form.modelName.trim(),
    isActive: form.isActive,
    customHeaders: headersPayload()
  }
  const res = form.id
    ? await http.put(`/api/model-gateway/reranks/${form.id}`, payload)
    : await http.post('/api/model-gateway/reranks', payload)
  saving.value = false
  if (res.success) {
    showToast(res.message || 'Rerank 配置已保存', 'success')
    modalOpen.value = false
    await load()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function activate(item) {
  const res = await http.post(`/api/model-gateway/reranks/${item.id}/activate`)
  if (res.success) {
    showToast(`已将【${item.name}】设为当前生效的 Rerank 模型`, 'success')
    await load()
  } else {
    showToast(res.message || '设置失败', 'error')
  }
}

async function remove(item) {
  const warning = item.isActive ? '这是当前生效的模型，删除后使用 Rerank 模式的自建知识库会退回融合排序。\n' : ''
  if (!confirm(`${warning}确定删除 Rerank 配置【${item.name}】吗？`)) return
  const res = await http.delete(`/api/model-gateway/reranks/${item.id}`)
  if (res.success) {
    showToast('配置已删除', 'success')
    await load()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function probe(item) {
  probing.value = item.id
  const res = await http.post(`/api/model-gateway/reranks/${item.id}/probe`)
  probing.value = ''
  showToast(res.message || (res.success ? '连通正常' : '连通失败'), res.success ? 'success' : 'error')
  await load()
}

async function load() {
  const res = await http.get('/api/model-gateway/reranks')
  if (res.success) {
    configs.value = res.data || []
  }
}

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
  const a = activeConfig.value
  if (!a) return { state: 'idle', text: '未配置（可选）' }
  if (a.lastProbeStatus === 'FAILED') return { state: 'warn', text: a.modelName + ' 连通异常' }
  return { state: 'ok', text: '生效中：' + a.modelName }
})

watch(status, (value) => emit('status', value), { immediate: true })

defineExpose({ refresh })

onMounted(refresh)
</script>

<style scoped src="../../assets/gateway.css"></style>
