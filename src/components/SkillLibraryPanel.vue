<template>
  <div class="tools-mgmt-page skill-page">
    <div class="tools-mgmt-header">
      <div class="tools-mgmt-heading">
        <h2>技能库</h2>
        <span class="tools-count">{{ skills.length }}</span>
      </div>
      <div class="tools-mgmt-header-right">
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新" @click="load">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
        <template v-if="canManage">
          <button type="button" class="skill-btn" @click="openImport">
            <i class="fa-solid fa-file-import"></i>
            <span>导入 SKILL.md</span>
          </button>
          <button type="button" class="btn-create-agent btn-tool-add" @click="openCreate">
            <i class="fa-solid fa-plus"></i>
            <span>新建技能</span>
          </button>
        </template>
      </div>
    </div>

    <div class="skill-intro">
      把「遇到某类问题该怎么处理」写成技能，在智能体调试页关联。对话时系统提示里只列出技能名称和适用场景，
      模型判断用得上时才读取完整步骤；同一个技能可以给多个智能体用。需要模型通道支持工具调用。
    </div>

    <div class="tools-mgmt-toolbar">
      <div class="tools-search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="keyword" type="search" autocomplete="off" placeholder="搜索名称或描述">
      </div>
      <div class="tools-filter-pills">
        <button
          v-for="chip in scopeChips"
          :key="chip.id"
          type="button"
          class="btn-filter-pill"
          :class="{ active: scope === chip.id }"
          @click="scope = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>
    </div>

    <div v-if="loading && !skills.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>正在加载技能…</span>
    </div>
    <div v-else-if="!filtered.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <span>{{ skills.length ? '没有符合条件的技能' : '还没有技能。可以新建，也可以导入社区现成的 SKILL.md。' }}</span>
    </div>

    <div class="skill-grid">
      <article v-for="skill in filtered" :key="skill.id" class="skill-card" :class="{ off: !skill.enabled }">
        <header class="skill-card-head">
          <div class="skill-card-title">
            <i class="fa-solid fa-wand-magic-sparkles skill-icon"></i>
            <h4 :title="skill.name">{{ skill.name }}</h4>
            <span v-if="skill.isSystem" class="tools-cat-tag ok">系统内置</span>
            <span v-if="!skill.enabled" class="tools-cat-tag muted">已停用</span>
            <span class="tools-cat-tag muted">v{{ skill.version }}</span>
          </div>
          <label v-if="skill.canManage" class="switch" :title="skill.enabled ? '停用后关联它的智能体不再加载' : '启用'">
            <input type="checkbox" :checked="skill.enabled" :disabled="busy === skill.id" @change="toggle(skill, $event.target.checked)">
            <span class="slider-toggle"></span>
          </label>
        </header>
        <p class="skill-desc">{{ skill.description }}</p>
        <div class="skill-meta">
          <span :class="{ warn: skill.contentLength > limits.softContentChars }">步骤 {{ skill.contentLength }} 字</span>
          <span v-if="skill.requiredTools.length" :title="skill.requiredTools.join('\n')">需要 {{ skill.requiredTools.length }} 个工具</span>
          <span>{{ skill.agentCount }} 个智能体在用</span>
          <span>加载 {{ skill.loadCount }} 次<template v-if="skill.lastLoadedAt"> · 最近 {{ formatTime(skill.lastLoadedAt) }}</template></span>
          <span v-if="!skill.isSystem && skill.ownerUsername">{{ skill.ownerUsername }}</span>
        </div>
        <footer class="skill-card-actions">
          <button type="button" class="skill-btn" @click="openEdit(skill)">
            <i :class="skill.canManage ? 'fa-solid fa-pen' : 'fa-regular fa-eye'"></i>
            <span>{{ skill.canManage ? '编辑' : '查看' }}</span>
          </button>
          <button type="button" class="skill-btn" @click="openVersions(skill)">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>版本</span>
          </button>
          <button type="button" class="skill-btn" @click="exportSkill(skill)">
            <i class="fa-solid fa-file-export"></i>
            <span>导出</span>
          </button>
          <button v-if="skill.canManage" type="button" class="btn-tool-icon-danger" :disabled="busy === skill.id" title="删除技能" @click="remove(skill)">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </footer>
      </article>
    </div>

    <!-- 新建 / 编辑 -->
    <div v-if="editorOpen" class="tool-modal-backdrop" @click.self="closeEditor">
      <div class="tool-modal-dialog skill-editor-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-wand-magic-sparkles skill-icon"></i>
            <span>{{ form.id ? (readonly ? `查看技能 · ${form.name}` : `编辑技能 · ${form.name}`) : '新建技能' }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="closeEditor">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body skill-editor-body">
          <div class="skill-form-row">
            <div class="tool-form-group">
              <label class="tool-form-label">
                <span>名称</span>
                <span class="label-sub">模型加载时用这个名字，平台内唯一</span>
              </label>
              <input v-model="form.name" class="tool-form-input" maxlength="64" :disabled="readonly" placeholder="例如：退款处理、weather-report">
            </div>
            <div v-if="isSuperAdmin" class="tool-form-group skill-system-toggle">
              <label class="skill-check">
                <input v-model="form.isSystem" type="checkbox" :disabled="readonly">
                <span>系统内置（所有开发者可用）</span>
              </label>
            </div>
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>什么时候用（描述）</span>
              <span class="label-sub">对话时只把这句话放进系统提示，模型据此判断要不要加载；写清楚适用的问题类型</span>
            </label>
            <textarea v-model="form.description" class="tool-form-input skill-desc-input" maxlength="1024" rows="2" :disabled="readonly"
              placeholder="例如：用户要求退款、退货或投诉订单问题时使用"></textarea>
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>需要的工具</span>
              <span class="label-sub">智能体没启用这些工具时，编辑页会提示，加载技能时也会提醒模型</span>
            </label>
            <div class="skill-tool-chips">
              <span v-for="code in form.requiredTools" :key="code" class="skill-tool-chip">
                {{ toolLabel(code) }}
                <button v-if="!readonly" type="button" title="移除" @click="removeTool(code)"><i class="fa-solid fa-xmark"></i></button>
              </span>
              <select v-if="!readonly" class="tool-form-select skill-tool-select" value="" @change="addTool($event)">
                <option value="">+ 添加工具</option>
                <option v-for="t in toolOptions" :key="t.code" :value="t.code" :disabled="form.requiredTools.includes(t.code)">
                  {{ t.label }}（{{ t.code }}）
                </option>
              </select>
              <span v-if="readonly && !form.requiredTools.length" class="label-sub">不需要特定工具</span>
            </div>
          </div>
          <div class="tool-form-group skill-content-group">
            <label class="tool-form-label">
              <span>详细步骤（Markdown）</span>
              <span class="label-sub" :class="contentLevel">
                {{ form.content.length }} / {{ limits.maxContentChars }} 字<template v-if="contentLevel === 'warn'">，较长，加载时会占用较多上下文，小窗口通道会被截断</template><template v-else-if="contentLevel === 'error'">，超出上限</template>
              </span>
            </label>
            <div class="skill-split">
              <textarea v-model="form.content" class="skill-md-input" :disabled="readonly" spellcheck="false"
                placeholder="## 处理步骤&#10;1. 先确认订单号和购买时间&#10;2. ……&#10;&#10;## 注意事项&#10;- ……"></textarea>
              <div v-if="form.content.trim()" class="skill-md-preview md-body" v-html="preview"></div>
              <div v-else class="skill-md-preview skill-md-empty">左边写步骤，这里显示预览</div>
            </div>
          </div>
          <div v-if="form.id && !readonly" class="tool-form-group">
            <label class="tool-form-label"><span>修改说明</span><span class="label-sub">可选，记在版本记录里</span></label>
            <input v-model="form.changeNote" class="tool-form-input" maxlength="200" placeholder="例如：补充了退货地址">
          </div>
        </div>
        <div class="tool-modal-footer">
          <span class="label-sub">{{ form.id ? `当前 v${form.version}，保存改动会生成新版本` : '' }}</span>
          <div class="skill-footer-buttons">
            <button type="button" class="btn-modal-cancel" @click="closeEditor">{{ readonly ? '关闭' : '取消' }}</button>
            <button v-if="!readonly" type="button" class="btn-modal-save" :disabled="saving || contentLevel === 'error'" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入 -->
    <div v-if="importOpen" class="tool-modal-backdrop" @click.self="importOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-file-import skill-icon"></i>
            <span>导入技能</span>
          </div>
          <button type="button" class="btn-modal-close" @click="importOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <p class="skill-import-hint">
            选择 <code>SKILL.md</code>，或包含 SKILL.md 的 <code>.zip</code> 技能包（社区技能通常是这种格式）。
            只导入 SKILL.md 的名称、描述和正文；压缩包里的脚本和其它文件不导入。
          </p>
          <input ref="fileInput" type="file" accept=".md,.zip,text/markdown,application/zip" class="skill-file-input" @change="onPickFile">
          <label class="skill-check">
            <input v-model="importOverwrite" type="checkbox">
            <span>覆盖同名技能（保存为它的新版本，只能覆盖自己有权管理的技能）</span>
          </label>
          <div v-if="importResult" class="skill-import-result">
            <div class="ok"><i class="fa-solid fa-circle-check"></i> {{ importResult.updated ? '已更新' : '已导入' }}「{{ importResult.skill.name }}」</div>
            <ul v-if="importResult.warnings.length">
              <li v-for="w in importResult.warnings" :key="w">{{ w }}</li>
            </ul>
          </div>
        </div>
        <div class="tool-modal-footer">
          <span></span>
          <div class="skill-footer-buttons">
            <button type="button" class="btn-modal-cancel" @click="importOpen = false">完成</button>
            <button type="button" class="btn-modal-save" :disabled="!importFile || importing" @click="doImport">
              {{ importing ? '导入中…' : '导入' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本记录 -->
    <div v-if="versionsOpen" class="tool-modal-backdrop" @click.self="versionsOpen = false">
      <div class="tool-modal-dialog pv-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-clock-rotate-left skill-icon"></i>
            <span>版本记录 · {{ versionsSkill?.name }}</span>
            <span class="pv-count">{{ versions.length }} 个版本</span>
          </div>
          <button type="button" class="btn-modal-close" @click="versionsOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="skill-versions-body">
          <div class="skill-versions-list">
            <div v-if="!versions.length" class="pv-empty">加载中…</div>
            <button
              v-for="v in versions"
              :key="v.id"
              type="button"
              class="skill-version-item"
              :class="{ active: selectedVersion?.id === v.id }"
              @click="selectedVersion = v"
            >
              <div><b>v{{ v.version }}</b> <span class="tools-cat-tag muted">{{ sourceLabel(v.source) }}</span>
                <span v-if="v.version === versionsSkill?.version" class="tools-cat-tag ok">当前</span></div>
              <div class="skill-version-sub">{{ formatTime(v.createdAt) }} · {{ v.createdBy || '—' }}</div>
              <div v-if="v.note" class="skill-version-sub">{{ v.note }}</div>
            </button>
          </div>
          <div class="skill-version-view">
            <template v-if="selectedVersion">
              <div class="skill-version-head">
                <div>
                  <div class="skill-version-desc"><b>描述：</b>{{ selectedVersion.description }}</div>
                  <div v-if="selectedVersion.requiredTools?.length" class="skill-version-desc"><b>需要的工具：</b>{{ selectedVersion.requiredTools.join('、') }}</div>
                </div>
                <button
                  v-if="versionsSkill?.canManage && selectedVersion.version !== versionsSkill?.version"
                  type="button"
                  class="skill-btn"
                  :disabled="restoring"
                  @click="restore(selectedVersion)"
                >
                  <i class="fa-solid fa-rotate-left"></i><span>恢复此版本</span>
                </button>
              </div>
              <div class="skill-md-preview md-body" v-html="renderMd(selectedVersion.content)"></div>
            </template>
            <div v-else class="pv-empty">选择左侧的版本查看内容</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  canManage: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  active: { type: Boolean, default: false }
})

const { showToast } = useToast()

const skills = ref([])
const loading = ref(false)
const busy = ref('')
const keyword = ref('')
const scope = ref('all')
const limits = reactive({ maxContentChars: 20000, softContentChars: 6000, maxSkillsPerAgent: 20 })
const toolCatalog = ref([])

const scopeChips = computed(() => [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '可编辑' },
  { id: 'system', label: '系统内置' }
])

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return skills.value.filter(s => {
    if (scope.value === 'mine' && !s.canManage) return false
    if (scope.value === 'system' && !s.isSystem) return false
    if (!kw) return true
    return s.name.toLowerCase().includes(kw) || (s.description || '').toLowerCase().includes(kw)
  })
})

async function load() {
  loading.value = true
  const res = await http.get('/api/skills')
  loading.value = false
  if (res.success) skills.value = res.data || []
  else showToast(res.message || '技能加载失败', 'error')
}

async function loadLimits() {
  const res = await http.get('/api/skills/limits')
  if (res.success && res.data) Object.assign(limits, res.data)
}

async function loadToolCatalog() {
  const [platform, mcp] = await Promise.all([
    http.get('/api/platform-tools'),
    http.get('/api/mcp-servers/available-tools')
  ])
  const rows = Array.isArray(platform?.data) ? platform.data : (platform?.data?.records || [])
  const list = rows.filter(t => t.code).map(t => ({ code: t.code, label: t.name || t.code }))
  if (mcp?.success && Array.isArray(mcp.data)) {
    mcp.data.forEach(t => list.push({ code: t.functionName, label: `MCP ${t.serverName} · ${t.title || t.toolName}` }))
  }
  toolCatalog.value = list
}

const toolOptions = computed(() => toolCatalog.value)

function toolLabel(code) {
  const t = toolCatalog.value.find(item => item.code === code)
  return t ? t.label : code
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

function sourceLabel(source) {
  return { CREATE: '新建', EDIT: '编辑', IMPORT: '导入', RESTORE: '恢复' }[source] || source || '编辑'
}

function renderMd(text) {
  return renderMarkdown(text || '')
}

// ---------- 编辑 ----------
const editorOpen = ref(false)
const saving = ref(false)
const readonly = ref(false)
const form = reactive(emptyForm())
let formSnapshot = ''

function emptyForm() {
  return { id: '', name: '', description: '', content: '', requiredTools: [], isSystem: false, version: 1, changeNote: '' }
}

const preview = computed(() => renderMd(form.content))
const contentLevel = computed(() => {
  if (form.content.length > limits.maxContentChars) return 'error'
  if (form.content.length > limits.softContentChars) return 'warn'
  return ''
})

function snapshot() {
  return JSON.stringify([form.name, form.description, form.content, form.requiredTools, form.isSystem])
}

async function openCreate() {
  Object.assign(form, emptyForm())
  readonly.value = false
  formSnapshot = snapshot()
  editorOpen.value = true
  if (!toolCatalog.value.length) loadToolCatalog()
}

async function openEdit(skill) {
  const res = await http.get(`/api/skills/${skill.id}`)
  if (!res.success) {
    showToast(res.message || '技能加载失败', 'error')
    return
  }
  const s = res.data
  Object.assign(form, {
    id: s.id, name: s.name, description: s.description, content: s.content || '',
    requiredTools: [...(s.requiredTools || [])], isSystem: s.isSystem, version: s.version, changeNote: ''
  })
  readonly.value = !s.canManage
  formSnapshot = snapshot()
  editorOpen.value = true
  if (!toolCatalog.value.length) loadToolCatalog()
}

function closeEditor() {
  if (!readonly.value && snapshot() !== formSnapshot && !window.confirm('有未保存的修改，确定关闭？')) return
  editorOpen.value = false
}

function addTool(event) {
  const code = event.target.value
  event.target.value = ''
  if (code && !form.requiredTools.includes(code)) form.requiredTools.push(code)
}

function removeTool(code) {
  form.requiredTools = form.requiredTools.filter(c => c !== code)
}

async function save() {
  saving.value = true
  const body = {
    name: form.name,
    description: form.description,
    content: form.content,
    requiredTools: form.requiredTools,
    isSystem: form.isSystem,
    changeNote: form.changeNote
  }
  const res = form.id ? await http.put(`/api/skills/${form.id}`, body) : await http.post('/api/skills', body)
  saving.value = false
  if (!res.success) {
    showToast(res.message || '保存失败', 'error')
    return
  }
  showToast(res.message || '已保存', 'success', 2000)
  editorOpen.value = false
  load()
}

async function toggle(skill, enabled) {
  busy.value = skill.id
  const res = await http.patch(`/api/skills/${skill.id}/enabled`, { enabled })
  busy.value = ''
  if (res.success) {
    showToast(res.message, 'success', 2000)
    load()
  } else {
    showToast(res.message || '操作失败', 'error')
    load()
  }
}

async function remove(skill) {
  const usage = skill.agentCount ? `，${skill.agentCount} 个智能体关联了它，删除后会自动取消关联` : ''
  if (!window.confirm(`确定删除技能「${skill.name}」${usage}？版本记录会一起删除，不能恢复。`)) return
  busy.value = skill.id
  const res = await http.del(`/api/skills/${skill.id}`)
  busy.value = ''
  if (res.success) {
    showToast('技能已删除', 'success', 2000)
    load()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

async function exportSkill(skill) {
  try {
    const res = await fetch(`/api/skills/${skill.id}/export`, { credentials: 'include' })
    if (!res.ok) {
      showToast(`导出失败 (HTTP ${res.status})`, 'error')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skill.name}-SKILL.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('导出失败：' + err.message, 'error')
  }
}

// ---------- 导入 ----------
const importOpen = ref(false)
const importFile = ref(null)
const importOverwrite = ref(false)
const importing = ref(false)
const importResult = ref(null)
const fileInput = ref(null)

function openImport() {
  importFile.value = null
  importResult.value = null
  importOverwrite.value = false
  importOpen.value = true
}

function onPickFile(event) {
  importFile.value = event.target.files?.[0] || null
  importResult.value = null
}

async function doImport() {
  if (!importFile.value) return
  importing.value = true
  const fd = new FormData()
  fd.append('file', importFile.value)
  const res = await http.upload(`/api/skills/import?overwrite=${importOverwrite.value}`, fd)
  importing.value = false
  if (!res.success) {
    showToast(res.message || '导入失败', 'error')
    return
  }
  importResult.value = res.data
  importFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  load()
}

// ---------- 版本 ----------
const versionsOpen = ref(false)
const versionsSkill = ref(null)
const versions = ref([])
const selectedVersion = ref(null)
const restoring = ref(false)

async function openVersions(skill) {
  versionsSkill.value = skill
  versions.value = []
  selectedVersion.value = null
  versionsOpen.value = true
  const res = await http.get(`/api/skills/${skill.id}/versions`)
  if (res.success) {
    versions.value = res.data || []
    selectedVersion.value = versions.value[0] || null
  } else {
    showToast(res.message || '版本加载失败', 'error')
  }
}

async function restore(v) {
  if (!window.confirm(`把「${versionsSkill.value.name}」恢复到 v${v.version}？会生成一个新版本，当前内容仍保留在版本记录里。`)) return
  restoring.value = true
  const res = await http.post(`/api/skills/${versionsSkill.value.id}/versions/${v.version}/restore`)
  restoring.value = false
  if (!res.success) {
    showToast(res.message || '恢复失败', 'error')
    return
  }
  showToast(res.message, 'success', 2000)
  versionsSkill.value = { ...versionsSkill.value, version: res.data.version }
  load()
  const list = await http.get(`/api/skills/${versionsSkill.value.id}/versions`)
  if (list.success) {
    versions.value = list.data || []
    selectedVersion.value = versions.value[0] || null
  }
}

watch(() => props.active, (active) => {
  if (active) load()
})

onMounted(() => {
  loadLimits()
  if (props.active) load()
})

defineExpose({ load })
</script>

<style scoped>
.skill-intro {
  margin: 4px 0 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.skill-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  min-width: 0;
}

.skill-card.off {
  opacity: 0.62;
}

.skill-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.skill-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.skill-card-title h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.skill-icon {
  color: #8b5cf6;
}

.skill-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.9em;
}

.skill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.skill-meta .warn {
  color: #f59e0b;
}

.skill-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.skill-card-actions .btn-tool-icon-danger {
  margin-left: auto;
}

.skill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  cursor: pointer;
}

.skill-btn:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--accent-blue);
}

.skill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tools-mgmt-header-right {
  gap: 8px;
}

.skill-editor-dialog {
  max-width: 1080px;
  width: 94%;
  height: min(860px, 92vh);
}

/* 弹窗固定高度，正文区填满剩余空间；步骤编辑区随弹窗伸缩，不再被底部按钮栏盖住 */
.skill-editor-body {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
}

.skill-editor-body .tool-form-label {
  flex-wrap: wrap;
  row-gap: 2px;
}

.skill-content-group {
  flex: 1;
  min-height: 260px;
}

.skill-form-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.skill-form-row > .tool-form-group:first-child {
  flex: 1;
}

.skill-system-toggle {
  padding-bottom: 8px;
}

.skill-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
}

.skill-desc-input {
  resize: vertical;
  min-height: 52px;
  font-family: inherit;
  line-height: 1.5;
}

.skill-tool-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.skill-tool-chip {
  display: inline-flex;
  line-height: 20px;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
  font-size: 12px;
}

.skill-tool-chip button {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  padding: 0 2px;
  font-size: 11px;
}

.skill-tool-select {
  width: auto;
  min-width: 180px;
  height: 34px;
  padding: 0 10px;
  line-height: 32px;
  font-size: 13px;
}

.label-sub.warn {
  color: #f59e0b;
}

.label-sub.error {
  color: #ef4444;
}

.skill-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  min-height: 220px;
}

.skill-md-input {
  width: 100%;
  height: 100%;
  resize: none;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-input, var(--bg-main));
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  outline: none;
  box-sizing: border-box;
}

.skill-md-input:focus {
  border-color: var(--accent-blue);
}

.skill-md-preview {
  height: 100%;
  overflow-y: auto;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-primary);
  box-sizing: border-box;
}

.skill-md-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12.5px;
}

.skill-footer-buttons {
  display: flex;
  gap: 8px;
}

.skill-import-hint {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.skill-file-input {
  display: block;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.skill-import-result {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.08);
  font-size: 12.5px;
  color: var(--text-secondary);
}

.skill-import-result .ok {
  color: var(--accent-emerald);
  font-weight: 600;
}

.skill-import-result ul {
  margin: 6px 0 0;
  padding-left: 18px;
  line-height: 1.6;
}

.skill-versions-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  flex: 1;
  min-height: 0;
}

.skill-versions-list {
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  padding: 8px;
}

.skill-version-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 12.5px;
  cursor: pointer;
}

.skill-version-item.active,
.skill-version-item:hover {
  border-color: var(--border-color);
  background: var(--bg-hover, rgba(148, 163, 184, 0.08));
}

.skill-version-sub {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.skill-version-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  min-height: 0;
}

.skill-version-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.skill-version-desc {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.skill-version-view .skill-md-preview {
  flex: 1;
  height: auto;
}

@media (max-width: 760px) {
  .skill-split {
    grid-template-columns: 1fr;
    height: auto;
  }
  .skill-md-input,
  .skill-md-preview {
    height: 260px;
  }
  .skill-versions-body {
    grid-template-columns: 1fr;
  }
}
</style>
