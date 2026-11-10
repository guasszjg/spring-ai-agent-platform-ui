<template>
  <div class="mcp-panel">
    <div class="mcp-intro">
      <div class="mcp-intro-text">
        <b>MCP 服务</b>
        <span>填一个 MCP 服务地址，平台拉取它提供的工具。工具默认不启用，逐个审核启用后，智能体才能在调试页选用。</span>
      </div>
      <div class="mcp-intro-actions">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新" @click="load">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
        <button type="button" class="btn-create-agent btn-tool-add" @click="openCreate">
          <i class="fa-solid fa-plus"></i>
          <span>添加 MCP 服务</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !servers.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>正在加载 MCP 服务…</span>
    </div>
    <div v-else-if="!servers.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-plug"></i>
      <span>还没有 MCP 服务。只支持远程地址（Streamable HTTP 或 SSE），不支持本地命令方式。</span>
    </div>

    <article v-for="server in servers" :key="server.id" class="mcp-server" :class="{ disabled: !server.enabled }">
      <header class="mcp-server-head" @click="toggleExpand(server.id)">
        <i class="fa-solid mcp-chevron" :class="expanded[server.id] ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
        <div class="mcp-server-main">
          <div class="mcp-server-title">
            <h4>{{ server.name }}</h4>
            <span class="tools-prefix-badge">{{ server.slug }}</span>
            <span class="tools-cat-tag" :class="statusClass(server)">{{ statusLabel(server) }}</span>
            <span v-if="server.pendingToolCount" class="tools-cat-tag warn">{{ server.pendingToolCount }} 个待审核</span>
            <span v-if="server.allowPrivateAddress" class="tools-cat-tag muted" title="已对这个服务放行内网地址">内网</span>
          </div>
          <div class="mcp-server-sub">
            <code>{{ server.url }}</code>
            <span>{{ server.transport === 'SSE' ? 'SSE' : 'Streamable HTTP' }}</span>
            <span>已启用 {{ server.enabledToolCount }} / {{ server.toolCount }} 个工具</span>
          </div>
          <div v-if="server.lastMessage" class="mcp-server-msg" :class="{ fail: server.lastStatus === 'FAILED' }">
            {{ server.lastMessage }}<template v-if="server.lastCheckedAt"> · {{ formatTime(server.lastCheckedAt) }}</template>
          </div>
        </div>
        <div class="mcp-server-actions" @click.stop>
          <button type="button" class="mcp-btn" :disabled="busy === server.id" title="连接服务并同步工具列表" @click="refresh(server)">
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': busy === server.id }"></i>
            <span>拉取工具</span>
          </button>
          <button type="button" class="mcp-btn" :disabled="busy === server.id" @click="openEdit(server)">
            <i class="fa-solid fa-pen"></i>
            <span>编辑</span>
          </button>
          <label class="switch" :title="server.enabled ? '停用后它的全部工具都不可用' : '启用服务'">
            <input type="checkbox" :checked="server.enabled" :disabled="busy === server.id" @change="toggleServer(server, $event.target.checked)">
            <span class="slider-toggle"></span>
          </label>
          <button type="button" class="btn-tool-icon-danger" :disabled="busy === server.id" title="删除服务" @click="removeServer(server)">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </header>

      <div v-if="expanded[server.id]" class="mcp-tools">
        <p v-if="!server.tools.length" class="mcp-tools-empty">还没有工具，点「拉取工具」从服务同步。</p>
        <div v-for="tool in server.tools" :key="tool.id" class="mcp-tool" :class="{ off: !tool.enabled }">
          <div class="mcp-tool-main">
            <div class="mcp-tool-title">
              <b>{{ tool.title || tool.toolName }}</b>
              <code>{{ tool.functionName }}</code>
              <span class="tools-cat-tag" :class="reviewClass(tool)">{{ reviewLabel(tool) }}</span>
              <span v-if="tool.writeOperation" class="tools-cat-tag warn" title="会创建、修改或删除数据，启用前需要单独确认">写操作</span>
            </div>
            <p class="mcp-tool-desc">{{ tool.description || '（服务没有提供说明）' }}</p>
            <div class="mcp-tool-meta">
              <span v-if="paramNames(tool).length">参数：{{ paramNames(tool).join('、') }}</span>
              <span v-else>无参数</span>
              <span v-if="tool.totalCalls">本月 {{ tool.monthCalls }} 次 · 累计 {{ tool.totalCalls }} 次<template v-if="tool.monthSuccessRate != null"> · 成功率 {{ Math.round(tool.monthSuccessRate * 100) }}%</template></span>
              <button type="button" class="mcp-link" @click="schemaTool = tool">查看参数格式</button>
            </div>
            <div v-if="tool.similarTools?.length" class="mcp-tool-warn">
              <i class="fa-solid fa-triangle-exclamation"></i>
              同类工具已启用：{{ tool.similarTools.join('、') }}。同一个智能体里同类工具建议只选一个，否则模型选择不稳定、可能重复计费。
            </div>
          </div>
          <div class="mcp-tool-side">
            <select class="tool-form-select mcp-cat-select" :value="tool.category || 'OTHER'" :disabled="busyTool === tool.id" title="工具类别，用于提示同类重复" @change="updateTool(server, tool, { category: $event.target.value })">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <label class="switch" :title="tool.reviewStatus === 'REMOVED' ? '服务里已经没有这个工具' : (tool.enabled ? '停用' : '审核通过并启用')">
              <input type="checkbox" :checked="tool.enabled" :disabled="busyTool === tool.id || tool.reviewStatus === 'REMOVED'" @change="toggleTool(server, tool, $event)">
              <span class="slider-toggle"></span>
            </label>
          </div>
        </div>
      </div>
    </article>

    <div v-if="editorOpen" class="tool-modal-backdrop" @click.self="editorOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-plug mcp-title-icon"></i>
            <span>{{ form.id ? `编辑 MCP 服务 · ${form.name}` : '添加 MCP 服务' }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="editorOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div class="tool-form-group">
            <label class="tool-form-label"><span>服务名称</span></label>
            <input v-model="form.name" class="tool-form-input" maxlength="60" placeholder="例如：高德地图">
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>标识</span>
              <span class="label-sub">工具名前缀，如 amap → mcp_amap__maps_weather；创建后不能改</span>
            </label>
            <input v-model="form.slug" class="tool-form-input" maxlength="16" :disabled="!!form.id" placeholder="小写字母和数字，2–16 位；不填按名称生成">
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>服务地址</span>
              <span v-if="form.id" class="label-sub">地址里的 Key 已打码；不改就保持原样</span>
            </label>
            <input v-model="form.url" class="tool-form-input" placeholder="https://mcp.example.com/mcp">
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label"><span>传输方式</span></label>
            <select v-model="form.transport" class="tool-form-select">
              <option value="STREAMABLE_HTTP">Streamable HTTP（主流，地址通常以 /mcp 结尾）</option>
              <option value="SSE">SSE（旧服务，地址通常以 /sse 结尾）</option>
            </select>
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label"><span>鉴权方式</span></label>
            <select v-model="form.authType" class="tool-form-select">
              <option value="NONE">无（或 Key 已写在地址里）</option>
              <option value="BEARER">Bearer Token</option>
              <option value="HEADERS">自定义请求头</option>
            </select>
          </div>
          <div v-if="form.authType === 'BEARER'" class="tool-form-group">
            <label class="tool-form-label">
              <span>Token</span>
              <span v-if="form.hasAuth" class="label-sub">已密文保存，明文不回显；留空表示不改</span>
            </label>
            <input v-model="form.authSecret" class="tool-form-input" type="password" autocomplete="new-password" :placeholder="form.hasAuth ? '如需更换，在此输入新 Token' : '服务提供的访问 Token'">
          </div>
          <div v-if="form.authType === 'HEADERS'" class="tool-form-group">
            <label class="tool-form-label">
              <span>请求头 (JSON)</span>
              <span v-if="form.hasAuth" class="label-sub">已密文保存，明文不回显；留空表示不改</span>
            </label>
            <textarea v-model="form.authSecret" class="tool-form-input mcp-headers" rows="3" placeholder='{"X-Api-Key": "..."}'></textarea>
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>单次调用超时</span>
              <span class="label-sub">({{ form.timeoutSeconds }} 秒)</span>
            </label>
            <div class="tool-range-row">
              <input v-model.number="form.timeoutSeconds" type="range" min="3" max="120" class="tool-range-slider">
              <input v-model.number="form.timeoutSeconds" type="number" min="3" max="300" class="tool-form-input tool-range-num">
            </div>
          </div>
          <label class="mcp-check">
            <input v-model="form.allowPrivateAddress" type="checkbox">
            <span>允许这个服务使用内网地址</span>
          </label>
          <p class="mcp-check-hint">默认不允许连接本机或内网地址。只有确认是自己部署的内部服务时才勾选。</p>

          <div v-if="testResult" class="mcp-test-result" :class="testResult.success ? 'ok' : 'fail'">
            <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
            <span>{{ testResult.message }}</span>
          </div>
        </div>
        <div class="tool-modal-footer">
          <button type="button" class="btn-modal-cancel" @click="editorOpen = false">取消</button>
          <button type="button" class="btn-modal-cancel" :disabled="testing" @click="testDraft">
            {{ testing ? '测试中…' : '测试连接' }}
          </button>
          <button type="button" class="btn-modal-save" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="schemaTool" class="tool-modal-backdrop" @click.self="schemaTool = null">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-code mcp-title-icon"></i>
            <span>参数格式 · {{ schemaTool.toolName }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="schemaTool = null">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <p class="mcp-tool-desc">{{ schemaTool.description }}</p>
          <pre class="mcp-schema">{{ JSON.stringify(schemaTool.inputSchema, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['changed'])
const { showToast } = useToast()

const categories = [
  { id: 'SEARCH', label: '联网检索' },
  { id: 'MAP', label: '地图天气' },
  { id: 'DATABASE', label: '数据库' },
  { id: 'FILE', label: '文件' },
  { id: 'OTHER', label: '其它' }
]

const servers = ref([])
const loading = ref(false)
const busy = ref('')
const busyTool = ref('')
const expanded = reactive({})
const editorOpen = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)
const schemaTool = ref(null)
const form = reactive(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', slug: '', url: '', transport: 'STREAMABLE_HTTP', authType: 'NONE', authSecret: '',
    hasAuth: false, timeoutSeconds: 30, allowPrivateAddress: false
  }
}

async function load() {
  loading.value = true
  const res = await http.get('/api/mcp-servers')
  loading.value = false
  if (res.success) {
    servers.value = res.data || []
    emit('changed', servers.value)
  } else {
    showToast(res.message || 'MCP 服务加载失败', 'error')
  }
}

function replaceServer(view) {
  const index = servers.value.findIndex(s => s.id === view.id)
  if (index >= 0) servers.value.splice(index, 1, view)
  else servers.value.push(view)
  emit('changed', servers.value)
}

function toggleExpand(id) {
  expanded[id] = !expanded[id]
}

function statusLabel(server) {
  if (!server.enabled) return '已停用'
  if (server.lastStatus === 'OK') return '连接正常'
  if (server.lastStatus === 'FAILED') return '连接失败'
  return '未测试'
}

function statusClass(server) {
  if (!server.enabled) return 'muted'
  if (server.lastStatus === 'OK') return 'ok'
  if (server.lastStatus === 'FAILED') return 'warn'
  return 'muted'
}

function reviewLabel(tool) {
  if (tool.reviewStatus === 'APPROVED') return tool.enabled ? '已启用' : '已审核 · 未启用'
  if (tool.reviewStatus === 'CHANGED') return '上游有变化，需重新审核'
  if (tool.reviewStatus === 'REMOVED') return '服务已删除'
  return '待审核'
}

function reviewClass(tool) {
  if (tool.reviewStatus === 'APPROVED') return tool.enabled ? 'ok' : 'muted'
  if (tool.reviewStatus === 'REMOVED') return 'muted'
  return 'warn'
}

function paramNames(tool) {
  return Object.keys(tool.inputSchema?.properties || {})
}

function formatTime(value) {
  return String(value || '').replace('T', ' ').slice(5, 16)
}

function openCreate() {
  Object.assign(form, emptyForm())
  testResult.value = null
  editorOpen.value = true
}

function openEdit(server) {
  Object.assign(form, emptyForm(), {
    id: server.id, name: server.name, slug: server.slug, url: server.url, transport: server.transport,
    authType: server.authType, hasAuth: server.hasAuth, timeoutSeconds: server.timeoutSeconds || 30,
    allowPrivateAddress: !!server.allowPrivateAddress
  })
  testResult.value = null
  editorOpen.value = true
}

function payload() {
  return {
    name: form.name.trim(),
    slug: form.id ? undefined : (form.slug.trim() || undefined),
    url: form.url.trim(),
    transport: form.transport,
    authType: form.authType,
    authSecret: form.authSecret.trim() || undefined,
    timeoutSeconds: Number(form.timeoutSeconds) || 30,
    allowPrivateAddress: !!form.allowPrivateAddress
  }
}

async function testDraft() {
  testing.value = true
  testResult.value = null
  const res = await http.post('/api/mcp-servers/test' + (form.id ? `?id=${encodeURIComponent(form.id)}` : ''), payload())
  testing.value = false
  testResult.value = { success: !!res.success, message: res.message || (res.success ? '连接成功' : '连接失败') }
}

async function save() {
  if (!form.name.trim()) {
    showToast('请填写服务名称', 'warning')
    return
  }
  saving.value = true
  const res = form.id
    ? await http.put(`/api/mcp-servers/${form.id}`, payload())
    : await http.post('/api/mcp-servers', payload())
  saving.value = false
  if (!res.success) {
    showToast(res.message || '保存失败', 'error')
    return
  }
  const created = !form.id
  editorOpen.value = false
  replaceServer(res.data)
  if (created) {
    expanded[res.data.id] = true
    await refresh(res.data)
  } else {
    showToast(res.message || '已保存', 'success', 1800)
  }
}

async function refresh(server) {
  busy.value = server.id
  const res = await http.post(`/api/mcp-servers/${server.id}/refresh`)
  busy.value = ''
  if (res.success && res.data) {
    replaceServer(res.data)
    expanded[server.id] = true
    showToast(res.message || '工具列表已同步', 'success', 2500)
  } else {
    showToast(res.message || '拉取工具失败', 'error', 4000)
    await load()
  }
}

async function toggleServer(server, enabled) {
  busy.value = server.id
  const res = await http.patch(`/api/mcp-servers/${server.id}/enabled`, { enabled })
  busy.value = ''
  if (res.success && res.data) {
    replaceServer(res.data)
    showToast(res.message || '已更新', 'success', 1800)
  } else {
    showToast(res.message || '操作失败', 'error')
    await load()
  }
}

async function removeServer(server) {
  if (!window.confirm(`确定删除 MCP 服务「${server.name}」？它的 ${server.toolCount} 个工具会一起删除，智能体里已选用的将失效。`)) return
  busy.value = server.id
  const res = await http.del(`/api/mcp-servers/${server.id}`)
  busy.value = ''
  if (res.success) {
    showToast(res.message || '已删除', 'success', 1800)
    await load()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function toggleTool(server, tool, event) {
  const enabled = event.target.checked
  const body = { enabled }
  if (enabled && tool.writeOperation) {
    const ok = window.confirm(`「${tool.title || tool.toolName}」是写操作类工具，可能创建、修改或删除数据。\n启用后，选用它的智能体可以在对话中直接执行，不会再逐次确认。确定启用？`)
    if (!ok) {
      event.target.checked = false
      return
    }
    body.confirmWrite = true
  }
  const ok = await updateTool(server, tool, body)
  if (!ok) event.target.checked = tool.enabled
}

async function updateTool(server, tool, body) {
  busyTool.value = tool.id
  const res = await http.patch(`/api/mcp-servers/${server.id}/tools/${tool.id}`, body)
  busyTool.value = ''
  if (!res.success) {
    showToast(res.message || '保存失败', 'error', 4000)
    return false
  }
  // 启用状态和类别会影响其它工具的「同类已启用」提示，整个服务重新取一次
  const fresh = await http.get(`/api/mcp-servers/${server.id}`)
  if (fresh.success && fresh.data) replaceServer(fresh.data)
  return true
}

onMounted(load)
defineExpose({ load })
</script>

<style scoped>
.mcp-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
}

.mcp-intro-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.mcp-intro-text b {
  font-size: 13px;
  color: var(--text-primary);
}

.mcp-intro-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mcp-server {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  margin-bottom: 12px;
  overflow: hidden;
}

.mcp-server.disabled .mcp-server-main {
  opacity: 0.6;
}

.mcp-server-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
}

.mcp-chevron {
  margin-top: 4px;
  width: 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.mcp-server-main {
  flex: 1;
  min-width: 0;
}

.mcp-server-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mcp-server-title h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.mcp-server-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.mcp-server-sub code {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 11.5px;
}

.mcp-server-msg {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.mcp-server-msg.fail {
  color: var(--accent-amber);
}

.mcp-server-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mcp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.mcp-btn:hover:not(:disabled) {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.mcp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mcp-tools {
  border-top: 1px solid var(--border-color);
  padding: 4px 16px 8px 40px;
}

.mcp-tools-empty {
  margin: 12px 0;
  font-size: 12px;
  color: var(--text-muted);
}

.mcp-tool {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border-color);
}

.mcp-tool:last-child {
  border-bottom: none;
}

.mcp-tool.off .mcp-tool-title b,
.mcp-tool.off .mcp-tool-desc {
  color: var(--text-muted);
}

.mcp-tool-main {
  flex: 1;
  min-width: 0;
}

.mcp-tool-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-primary);
}

.mcp-tool-title code {
  font-size: 11px;
  color: var(--text-muted);
}

.mcp-tool-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-line;
}

.tool-modal-body .mcp-tool-desc {
  display: block;
  margin-bottom: 10px;
}

.mcp-tool-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.mcp-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--accent-blue);
  font-size: 11.5px;
  cursor: pointer;
}

.mcp-tool-warn {
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.08);
  color: var(--accent-amber);
  font-size: 12px;
  line-height: 1.5;
}

.mcp-tool-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.mcp-cat-select {
  width: 104px;
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
}

.mcp-title-icon {
  color: var(--accent-blue);
}

.mcp-headers {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  resize: vertical;
}

.mcp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.mcp-check-hint {
  margin: 4px 0 0 22px;
  font-size: 12px;
  color: var(--text-muted);
}

.mcp-test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12.5px;
}

.mcp-test-result.ok {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-emerald);
}

.mcp-test-result.fail {
  background: rgba(245, 158, 11, 0.1);
  color: var(--accent-amber);
}

.mcp-schema {
  margin: 0;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  border-radius: 8px;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .mcp-intro,
  .mcp-server-head,
  .mcp-tool {
    flex-direction: column;
  }

  .mcp-tools {
    padding-left: 16px;
  }
}
</style>
