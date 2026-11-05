<template>
  <div class="gateway-section-content">
    <!-- 激活状态横幅 -->
    <div class="gateway-hero-banner">
      <div class="hero-metric-left">
        <div class="hero-icon-box icon-dify"><i class="fa-solid fa-book-atlas"></i></div>
        <div class="hero-text-box">
          <div class="hero-tag-row">
            <span class="hero-state-pill">当前知识库全局路由 Dify 实例</span>
          </div>
          <h3 v-if="activeDify">{{ activeDify.name }} <code class="hero-model-code">{{ activeDify.baseUrl }}</code></h3>
          <h3 v-else class="hero-empty-title">尚未配置或激活 Dify 实例（知识库将仅使用平台内置引擎）</h3>
          <p v-if="activeDify" class="hero-subtext">
            密钥脱敏: <code>{{ activeDify.apiKeyMasked }}</code> · 备注: {{ activeDify.description || '无备注' }}
          </p>
        </div>
      </div>
      <div class="hero-metric-right" style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新网关配置" @click="refresh">
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
              <input v-model="difyForm.baseUrl" class="form-control-styled" placeholder="如 https://dify.example.com/v1" required>
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
            <button
              type="button"
              class="btn-secondary gateway-test-btn"
              :class="{
                'test-btn-success': difyTestResult && difyTestResult.success,
                'test-btn-fail': difyTestResult && !difyTestResult.success
              }"
              :disabled="testingDify"
              @click="testDifyInModal"
            >
              <i :class="testingDify ? 'fa-solid fa-spinner fa-spin' : (difyTestResult ? (difyTestResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark') : 'fa-solid fa-plug-circle-check')"></i>
              <span>{{ testingDify ? '测试中...' : (difyTestResult ? (difyTestResult.success ? '测试通过' : '测试失败') : '测试连通性') }}</span>
            </button>
            <button type="submit" class="btn-create-agent" :disabled="savingDify">
              {{ savingDify ? '保存中...' : '保存接入' }}
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
// Dify 知识引擎实例：列表、增改删、激活与连通性测试
// ==========================================
const difys = ref([])
const difyModalOpen = ref(false)
const savingDify = ref(false)
const probingDifyId = ref('')
const testingDify = ref(false)
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
    baseUrl: '',
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

async function testDifyInModal() {
  if (!difyForm.baseUrl.trim()) {
    showToast('请先填写 Dify 服务器地址再测试', 'error')
    return
  }
  if (!difyForm.id && !difyForm.apiKey.trim()) {
    showToast('请先填写 Dataset API Key 再测试', 'error')
    return
  }
  testingDify.value = true
  difyTestResult.value = null
  const res = await http.post('/api/model-gateway/dify/test-connection', {
    id: difyForm.id || undefined,
    baseUrl: difyForm.baseUrl.trim(),
    apiKey: difyForm.apiKey.trim()
  })
  testingDify.value = false
  difyTestResult.value = {
    success: !!res.success,
    message: res.message || (res.success ? '连通正常' : '连通失败')
  }
  if (res.success) {
    showToast(res.message || 'Dify 连通正常', 'success')
  } else {
    showToast(res.message || '连通失败', 'error')
  }
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
// 刷新与状态上报（侧边栏子菜单的状态点）
// ==========================================
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    await loadDifys()
  } catch (err) {
    console.error('刷新失败:', err)
  } finally {
    loading.value = false
  }
}

const status = computed(() => {
  const a = activeDify.value
  if (!a) return { state: 'off', text: '未接入（可选）' }
  if (a.lastProbeStatus === 'FAILED') return { state: 'warn', text: a.name + ' 连通异常' }
  return { state: 'ok', text: '已接入：' + a.name }
})

watch(status, (value) => emit('status', value), { immediate: true })

defineExpose({ refresh })

onMounted(refresh)
</script>

<style scoped src="../../assets/gateway.css"></style>
