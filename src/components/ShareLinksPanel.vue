<template>
  <section class="slp">
    <div class="slp-head">
      <div>
        <h3 class="slp-title">分享链接</h3>
        <p class="slp-desc">
          生成一个免登录的聊天页地址，发给客户演示或请同事试用。链接默认需要访问码，到期、用完或停用后立即失效。
        </p>
      </div>
      <button type="button" class="slp-btn slp-btn-primary" :disabled="!canManage || links.length >= MAX_LINKS"
              :title="links.length >= MAX_LINKS ? `每个智能体最多 ${MAX_LINKS} 个分享链接，请先删除不用的链接` : ''" @click="openCreate">
        <i class="fa-solid fa-plus"></i> 新建链接
      </button>
    </div>

    <div v-if="knowledgeHint" class="slp-notice">
      <i class="fa-solid fa-circle-info"></i>
      <span>该智能体关联了知识库。拿到链接的人可以通过提问看到知识库内容，给外部客户的链接请只关联可以公开的资料。</span>
    </div>

    <div v-if="loadError" class="slp-empty">{{ loadError }}</div>
    <div v-else-if="loading && !links.length" class="slp-empty"><i class="fa-solid fa-circle-notch fa-spin"></i> 加载中…</div>
    <div v-else-if="!links.length" class="slp-empty">
      还没有分享链接。点「新建链接」生成第一个。
    </div>

    <template v-else>
    <div class="slp-toolbar">
      <div class="slp-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="keyword" class="slp-input" placeholder="搜索名称或链接码">
      </div>
      <div class="slp-seg">
        <button v-for="f in FILTERS" :key="f.value" type="button" :class="{ active: filter === f.value }" @click="filter = f.value">
          {{ f.label }}<span class="slp-seg-count">{{ filterCount(f.value) }}</span>
        </button>
      </div>
      <span class="slp-total" :class="{ 'slp-warn': links.length >= MAX_LINKS }">共 {{ links.length }} / {{ MAX_LINKS }} 个</span>
    </div>

    <div class="slp-list">
      <div class="slp-row slp-row-head" aria-hidden="true">
        <span>名称</span>
        <span>链接地址</span>
        <span>用量</span>
        <span>到期 / 最近使用</span>
        <span class="slp-col-actions">操作</span>
      </div>
      <div v-if="!visibleLinks.length" class="slp-empty">没有符合条件的链接</div>
      <article v-for="l in visibleLinks" :key="l.id" class="slp-row slp-card" :class="{ 'slp-card-off': l.state !== 'ACTIVE' }">
        <div class="slp-card-name">
          <span class="slp-name" :title="l.name">{{ l.name }}</span>
          <span class="slp-badges">
            <span class="slp-badge" :class="stateClass(l.state)">{{ stateLabel(l.state) }}</span>
            <span class="slp-badge slp-badge-plain">{{ l.accessMode === 'PUBLIC' ? '公开' : '访问码' }}</span>
            <span v-if="l.expiringSoon" class="slp-badge slp-badge-warn" title="24 小时内到期">即将到期</span>
          </span>
        </div>
        <div class="slp-url-row">
          <code class="slp-url" :title="linkUrl(l)">{{ linkUrl(l) }}</code>
        </div>
        <div class="slp-stats">
          <span title="已用对话次数 / 上限"><i class="fa-regular fa-message"></i> {{ l.messageCount }}{{ l.maxMessages ? ' / ' + l.maxMessages : '' }}</span>
          <span title="已用 token / 上限"><i class="fa-solid fa-ticket"></i> {{ formatNum(l.tokenCount) }}{{ l.maxTokens ? ' / ' + formatNum(l.maxTokens) : '' }}</span>
          <span title="访客数 / 上限"><i class="fa-regular fa-user"></i> {{ l.visitorCount }}{{ l.maxVisitors ? ' / ' + l.maxVisitors : '' }}</span>
        </div>
        <div class="slp-times">
          <span :title="l.expiresAt ? '到期时间' : ''"><i class="fa-regular fa-clock"></i> {{ l.expiresAt ? formatTime(l.expiresAt) : '永不过期' }}</span>
          <span v-if="l.lastUsedAt" title="最近使用"><i class="fa-solid fa-bolt"></i> {{ formatTime(l.lastUsedAt) }}</span>
        </div>
          <div class="slp-card-actions slp-col-actions">
            <button type="button" class="slp-icon" title="复制链接" :disabled="l.state !== 'ACTIVE'" @click="copyLink(l)"><i class="fa-regular fa-copy"></i></button>
            <button type="button" class="slp-icon" title="二维码" :disabled="l.state !== 'ACTIVE'" @click="showQr(l)"><i class="fa-solid fa-qrcode"></i></button>
            <!-- 公开链接没有访问码：保留占位，让每行的操作按钮对齐 -->
            <span v-if="l.accessMode !== 'ACCESS_CODE'" class="slp-icon slp-icon-placeholder" aria-hidden="true"></span>
            <button v-else type="button" class="slp-icon"
                    :title="l.accessCodeViewable ? '查看访问码' : '旧版本创建的访问码无法查看，请在编辑中重新设置'"
                    :disabled="!canManage || busyId === l.id" @click="viewAccessCode(l)"><i class="fa-solid fa-key"></i></button>
            <button type="button" class="slp-icon" title="访客记录" @click="openRecords(l)"><i class="fa-regular fa-comments"></i></button>
            <button type="button" class="slp-icon" title="编辑" :disabled="!canManage" @click="openEdit(l)"><i class="fa-regular fa-pen-to-square"></i></button>
            <button type="button" class="slp-icon" :title="l.status === 'ACTIVE' ? '停用' : '启用'" :disabled="!canManage || busyId === l.id" @click="toggle(l)">
              <i :class="l.status === 'ACTIVE' ? 'fa-regular fa-circle-pause' : 'fa-regular fa-circle-play'"></i>
            </button>
            <button type="button" class="slp-icon" title="重置地址（旧地址立即失效）" :disabled="!canManage || busyId === l.id" @click="reset(l)"><i class="fa-solid fa-rotate"></i></button>
            <button type="button" class="slp-icon slp-icon-danger" title="删除" :disabled="!canManage || busyId === l.id" @click="remove(l)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
      </article>
    </div>
    </template>

    <!-- 新建 / 编辑 -->
    <div v-if="form.open" class="slp-backdrop" @click.self="form.open = false">
      <div class="slp-modal" role="dialog" :aria-label="form.id ? '编辑分享链接' : '新建分享链接'">
        <div class="slp-modal-head">
          <span>{{ form.id ? '编辑分享链接' : '新建分享链接' }}</span>
          <button type="button" class="slp-icon" @click="form.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="slp-modal-body">
          <label class="slp-field">
            <span class="slp-label">名称 <em>*</em></span>
            <input v-model="form.name" class="slp-input" maxlength="100" placeholder="例如：给 A 客户演示、门店试用">
          </label>

          <div class="slp-field">
            <span class="slp-label">访问方式</span>
            <div class="slp-seg">
              <button type="button" :class="{ active: form.accessMode === 'ACCESS_CODE' }" @click="form.accessMode = 'ACCESS_CODE'">访问码</button>
              <button type="button" :class="{ active: form.accessMode === 'PUBLIC' }" :disabled="!publicEnabled" :title="publicEnabled ? '' : '需要超级管理员在「工具」设置中允许公开链接'" @click="form.accessMode = 'PUBLIC'">公开</button>
            </div>
            <span class="slp-hint">{{ form.accessMode === 'PUBLIC' ? '拿到链接的人都能直接对话，请设置用量上限' : '访客需要输入访问码才能对话；连续输错 5 次锁定 15 分钟' }}</span>
          </div>

          <div v-if="form.accessMode === 'ACCESS_CODE'" class="slp-field">
            <span class="slp-label">访问码</span>
            <label v-if="form.id && form.hasAccessCode" class="slp-check">
              <input v-model="form.changeCode" type="checkbox"> 重新设置访问码（旧访问码立即失效）
            </label>
            <template v-if="!form.id || !form.hasAccessCode || form.changeCode">
              <input v-model="form.accessCode" class="slp-input" maxlength="32" placeholder="不填则自动生成 6 位数字">
              <span class="slp-hint">4～32 位字母或数字。加密保存，之后可在链接卡片上点 <i class="fa-solid fa-key"></i> 查看</span>
            </template>
          </div>

          <div class="slp-field">
            <span class="slp-label">有效期</span>
            <div class="slp-seg">
              <button v-for="d in [1, 7, 30]" :key="d" type="button" :class="{ active: form.expiryMode === String(d) }" @click="form.expiryMode = String(d)">{{ d }} 天</button>
              <button type="button" :class="{ active: form.expiryMode === 'custom' }" @click="form.expiryMode = 'custom'">自定义</button>
              <button v-if="form.id" type="button" :class="{ active: form.expiryMode === 'keep' }" @click="form.expiryMode = 'keep'">不改</button>
            </div>
            <input v-if="form.expiryMode === 'custom'" v-model="form.expiresAt" class="slp-input" type="datetime-local">
            <span class="slp-hint">
              <template v-if="form.expiryMode === 'keep'">保持当前到期时间：{{ form.currentExpiresAt ? formatTime(form.currentExpiresAt) : '无' }}</template>
              <template v-else-if="form.id">从现在起重新计算，链接地址不变</template>
              <template v-else>最长 365 天</template>
            </span>
          </div>

          <div class="slp-grid">
            <label class="slp-field">
              <span class="slp-label">对话次数上限</span>
              <input v-model.number="form.maxMessages" class="slp-input" type="number" min="0" placeholder="0 = 不限">
            </label>
            <label class="slp-field">
              <span class="slp-label">token 总量上限</span>
              <input v-model.number="form.maxTokens" class="slp-input" type="number" min="0" placeholder="0 = 不限">
            </label>
            <label class="slp-field">
              <span class="slp-label">访客数上限</span>
              <input v-model.number="form.maxVisitors" class="slp-input" type="number" min="0" placeholder="0 = 不限">
            </label>
            <label class="slp-field">
              <span class="slp-label">每个访客每分钟消息数</span>
              <input v-model.number="form.visitorRpm" class="slp-input" type="number" min="1" max="120">
            </label>
          </div>
          <span class="slp-hint">用完任意一项上限，链接自动失效。上限填 0 表示不限</span>

          <div class="slp-divider">聊天页显示</div>
          <label class="slp-field">
            <span class="slp-label">标题</span>
            <input v-model="form.title" class="slp-input" maxlength="100" placeholder="不填则用智能体名称">
          </label>
          <label class="slp-field">
            <span class="slp-label">欢迎语</span>
            <textarea v-model="form.welcomeMessage" class="slp-input slp-textarea" maxlength="1000" rows="2" placeholder="访客进入后看到的第一句话"></textarea>
          </label>
          <label class="slp-field">
            <span class="slp-label">示例问题</span>
            <textarea v-model="form.examplesText" class="slp-input slp-textarea" rows="3" placeholder="每行一个，最多 6 个，访客点击即可发送"></textarea>
          </label>
          <label class="slp-check">
            <input v-model="form.showRecordNotice" type="checkbox"> 在聊天页提示「对话会被记录」
          </label>
        </div>
        <div class="slp-modal-foot">
          <button type="button" class="slp-btn" @click="form.open = false">取消</button>
          <button type="button" class="slp-btn slp-btn-primary" :disabled="saving" @click="save">
            <i v-if="saving" class="fa-solid fa-circle-notch fa-spin"></i> {{ form.id ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 创建成功 / 访问码 / 二维码 -->
    <div v-if="share.open" class="slp-backdrop" @click.self="share.open = false">
      <div class="slp-modal slp-modal-sm" role="dialog" aria-label="分享链接">
        <div class="slp-modal-head">
          <span>{{ share.title }}</span>
          <button type="button" class="slp-icon" @click="share.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="slp-modal-body slp-share-body">
          <img v-if="share.qr" :src="share.qr" class="slp-qr" alt="链接二维码">
          <div class="slp-share-row">
            <code class="slp-url">{{ share.url }}</code>
            <button type="button" class="slp-icon" title="复制链接" @click="copy(share.url, '链接已复制')"><i class="fa-regular fa-copy"></i></button>
          </div>
          <div v-if="share.accessCode" class="slp-code-box">
            <span>访问码</span>
            <strong>{{ share.accessCode }}</strong>
            <button type="button" class="slp-icon" title="复制访问码" @click="copy(share.accessCode, '访问码已复制')"><i class="fa-regular fa-copy"></i></button>
          </div>
          <p v-if="share.accessCode" class="slp-hint">关闭后可在链接卡片上点 <i class="fa-solid fa-key"></i> 再次查看，每次查看都会记入审计日志。</p>
          <button v-if="share.accessCode" type="button" class="slp-btn" @click="copy(share.url + '\n访问码：' + share.accessCode, '链接和访问码已复制')">
            复制链接和访问码
          </button>
          <a :href="share.url" target="_blank" rel="noopener" class="slp-link">在新窗口打开 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      </div>
    </div>

    <!-- 访客记录 -->
    <div v-if="records.open" class="slp-backdrop" @click.self="records.open = false">
      <div class="slp-modal slp-modal-lg" role="dialog" aria-label="访客记录">
        <div class="slp-modal-head">
          <span>访客记录 · {{ records.link?.name }}</span>
          <button type="button" class="slp-icon" @click="records.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="slp-records">
          <div class="slp-rec-list">
            <div v-if="records.loading" class="slp-empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
            <div v-else-if="!records.items.length" class="slp-empty">还没有访客对话</div>
            <button v-for="c in records.items" :key="c.id" type="button" class="slp-rec-item" :class="{ active: records.selected === c.id }" @click="openConversation(c)">
              <span class="slp-rec-title">{{ c.title || '未命名会话' }}</span>
              <span class="slp-rec-meta">{{ c.visitor }} · {{ c.messageCount / 2 }} 轮 · {{ formatTime(c.updatedAt) }}</span>
            </button>
          </div>
          <div class="slp-rec-detail">
            <div v-if="!records.selected" class="slp-empty">选择左侧会话查看内容</div>
            <div v-else-if="records.detailLoading" class="slp-empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
            <template v-else>
              <div v-for="(m, i) in records.messages" :key="i" class="slp-msg" :class="m.role === 'user' ? 'slp-msg-user' : 'slp-msg-bot'">
                <div class="slp-msg-role">{{ m.role === 'user' ? '访客' : '智能体' }} · {{ formatTime(m.createdAt) }}</div>
                <div class="slp-msg-text">{{ m.content }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import QRCode from 'qrcode'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { copyToClipboard } from '../utils/clipboard'

const props = defineProps({
  agent: { type: Object, required: true },
  canManage: { type: Boolean, default: false }
})

const { showToast } = useToast()
const links = ref([])
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const busyId = ref('')
const publicEnabled = ref(false)
const knowledgeHint = computed(() => Array.isArray(props.agent?.knowledgeBaseIds) && props.agent.knowledgeBaseIds.length > 0)
const base = computed(() => `/api/agents/${encodeURIComponent(props.agent.id)}/share-links`)

const STATE_LABELS = {
  ACTIVE: '可用',
  DISABLED: '已停用',
  EXPIRED: '已过期',
  EXHAUSTED: '已用完',
  PUBLIC_DISABLED: '公开链接未开放',
  AGENT_NOT_RUNNING: '智能体未运行'
}
function stateLabel(state) { return STATE_LABELS[state] || state }

// 与后端 ShareLinkService.MAX_LINKS_PER_AGENT 一致
const MAX_LINKS = 50
const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '可用' },
  { value: 'inactive', label: '不可用' },
  { value: 'expiring', label: '即将到期' }
]
const keyword = ref('')
const filter = ref('all')
function matchesFilter(l, f) {
  if (f === 'active') return l.state === 'ACTIVE'
  if (f === 'inactive') return l.state !== 'ACTIVE'
  if (f === 'expiring') return !!l.expiringSoon
  return true
}
function filterCount(f) { return links.value.filter(l => matchesFilter(l, f)).length }
const visibleLinks = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return links.value.filter(l => matchesFilter(l, filter.value)
    && (!kw || (l.name || '').toLowerCase().includes(kw) || (l.code || '').toLowerCase().includes(kw)))
})
function stateClass(state) { return state === 'ACTIVE' ? 'slp-badge-ok' : 'slp-badge-off' }

function linkUrl(l) { return `${window.location.origin}${l.path}` }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [res, settings] = await Promise.all([http.get(base.value), http.get('/api/platform-tools/settings')])
    if (res.success) links.value = res.data || []
    else loadError.value = res.message || '加载分享链接失败'
    if (settings.success && settings.data) publicEnabled.value = !!settings.data.sharePublicEnabled
  } finally {
    loading.value = false
  }
}

// ==================== 新建 / 编辑 ====================
const form = reactive({})
function resetForm(l) {
  Object.assign(form, {
    open: true,
    id: l?.id || '',
    name: l?.name || '',
    accessMode: l?.accessMode || 'ACCESS_CODE',
    hasAccessCode: !!l?.hasAccessCode,
    changeCode: false,
    accessCode: '',
    expiryMode: l ? 'keep' : '7',
    expiresAt: '',
    currentExpiresAt: l?.expiresAt || null,
    maxMessages: l ? (l.maxMessages || 0) : 200,
    maxTokens: l ? (l.maxTokens || 0) : 0,
    maxVisitors: l ? (l.maxVisitors || 0) : 0,
    visitorRpm: l?.visitorRpm || 10,
    title: l?.title || '',
    welcomeMessage: l?.welcomeMessage || '',
    examplesText: (l?.exampleQuestions || []).join('\n'),
    showRecordNotice: l ? l.showRecordNotice !== false : true
  })
}
function openCreate() { resetForm(null) }
function openEdit(l) { resetForm(l) }

function buildRequest() {
  const req = {
    name: form.name.trim(),
    accessMode: form.accessMode,
    maxMessages: Number(form.maxMessages) || 0,
    maxTokens: Number(form.maxTokens) || 0,
    maxVisitors: Number(form.maxVisitors) || 0,
    visitorRpm: Number(form.visitorRpm) || 10,
    title: form.title,
    welcomeMessage: form.welcomeMessage,
    exampleQuestions: form.examplesText.split('\n').map(s => s.trim()).filter(Boolean),
    showRecordNotice: form.showRecordNotice
  }
  if (form.accessMode === 'ACCESS_CODE' && (!form.id || !form.hasAccessCode || form.changeCode)) {
    req.accessCode = form.accessCode.trim()
  }
  if (form.expiryMode === 'custom') {
    req.expiresAt = form.expiresAt ? (form.expiresAt.length === 16 ? form.expiresAt + ':00' : form.expiresAt) : null
  } else if (form.expiryMode !== 'keep') {
    req.expiresInDays = Number(form.expiryMode)
  }
  return req
}

async function save() {
  if (!form.name.trim()) { showToast('请填写链接名称', 'error'); return }
  if (form.expiryMode === 'custom' && !form.expiresAt) { showToast('请选择到期时间', 'error'); return }
  saving.value = true
  try {
    const req = buildRequest()
    const res = form.id ? await http.put(`${base.value}/${form.id}`, req) : await http.post(base.value, req)
    if (!res.success) { showToast(res.message || '保存失败', 'error'); return }
    const creating = !form.id
    form.open = false
    await load()
    if (creating || res.data?.accessCode) {
      await openShare(res.data, creating ? '分享链接已创建' : '访问码已更新')
    } else {
      showToast('已保存', 'success')
    }
  } finally {
    saving.value = false
  }
}

// ==================== 分享弹窗 ====================
const share = reactive({ open: false, title: '', url: '', qr: '', accessCode: '' })
async function openShare(l, title) {
  const url = linkUrl(l)
  let qr = ''
  try {
    qr = await QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: 'M' })
  } catch { /* 二维码生成失败不影响复制链接 */ }
  Object.assign(share, { open: true, title, url, qr, accessCode: l.accessCode || '' })
}
function showQr(l) { openShare(l, '扫码打开') }
async function viewAccessCode(l) {
  busyId.value = l.id
  try {
    const res = await http.get(`${base.value}/${l.id}/access-code`)
    if (!res.success || !res.data?.accessCode) { showToast(res.message || '获取访问码失败', 'error'); return }
    await openShare({ ...l, accessCode: res.data.accessCode }, '访问码')
  } finally {
    busyId.value = ''
  }
}
function copyLink(l) {
  const url = linkUrl(l)
  copy(l.accessMode === 'ACCESS_CODE' ? url + '\n（需要访问码）' : url, '链接已复制')
}
async function copy(text, msg) {
  const ok = await copyToClipboard(text)
  showToast(ok ? msg : '复制失败，请手动复制', ok ? 'success' : 'error')
}

// ==================== 停用 / 启用 / 重置 / 删除 ====================
async function run(l, action, confirmText, okText) {
  if (confirmText && !confirm(confirmText)) return null
  busyId.value = l.id
  try {
    const res = action === 'delete'
      ? await http.delete(`${base.value}/${l.id}`)
      : await http.post(`${base.value}/${l.id}/${action}`)
    if (!res.success) { showToast(res.message || '操作失败', 'error'); return null }
    showToast(okText || res.message || '已完成', 'success')
    await load()
    return res.data
  } finally {
    busyId.value = ''
  }
}
function toggle(l) {
  return l.status === 'ACTIVE'
    ? run(l, 'disable', `停用「${l.name}」？正在对话的访客发下一条消息时会被拒绝。`, '链接已停用')
    : run(l, 'enable', null, '链接已启用')
}
async function reset(l) {
  const data = await run(l, 'reset', `重置「${l.name}」的地址？旧地址立即失效，已进入的访客需要用新地址重新进入。访问码不变。`, '已生成新地址')
  if (data) openShare(data, '新地址已生成')
}
function remove(l) {
  return run(l, 'delete', `删除「${l.name}」？链接立即失效，访客的对话记录仍保留在智能体日志里。`, '分享链接已删除')
}

// ==================== 访客记录 ====================
const records = reactive({ open: false, link: null, loading: false, items: [], selected: '', detailLoading: false, messages: [] })
async function openRecords(l) {
  Object.assign(records, { open: true, link: l, loading: true, items: [], selected: '', messages: [] })
  const res = await http.get(`${base.value}/${l.id}/conversations`)
  records.loading = false
  if (res.success) records.items = res.data || []
  else showToast(res.message || '加载访客记录失败', 'error')
}
async function openConversation(c) {
  records.selected = c.id
  records.detailLoading = true
  const res = await http.get(`${base.value}/${records.link.id}/conversations/${encodeURIComponent(c.id)}`)
  records.detailLoading = false
  records.messages = res.success ? (res.data?.messages || []) : []
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function formatNum(n) {
  if (n == null) return '0'
  return n >= 10000 ? (n / 10000).toFixed(1) + ' 万' : String(n)
}

onMounted(load)
defineExpose({ load })
</script>

<style scoped>
.slp { display: flex; flex-direction: column; gap: 14px; }
.slp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.slp-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.slp-desc { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.slp-notice {
  display: flex; gap: 8px; padding: 10px 12px; font-size: 12px; line-height: 1.6;
  color: var(--accent-amber); background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px;
}
.slp-notice i { margin-top: 3px; }
.slp-empty { padding: 28px 12px; text-align: center; font-size: 13px; color: var(--text-muted); }

.slp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 14px;
  font: inherit; font-size: 13px; color: var(--text-primary); background: var(--bg-input);
  border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; white-space: nowrap;
}
.slp-btn:hover:not(:disabled) { border-color: var(--border-hover); }
.slp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.slp-btn-primary { color: #fff; background: var(--accent-blue); border-color: var(--accent-blue); }
.slp-btn-primary:hover:not(:disabled) { background: var(--accent-blue-hover); }
.slp-icon {
  width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--text-secondary); background: transparent;
  border: 1px solid transparent; border-radius: 8px; cursor: pointer;
}
.slp-icon:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-card-hover); border-color: var(--border-color); }
.slp-icon:disabled { opacity: 0.35; cursor: not-allowed; }
.slp-icon-danger:hover:not(:disabled) { color: var(--accent-rose); }

/* 工具栏：搜索 + 状态筛选 + 数量 */
.slp-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.slp-search { position: relative; flex: 0 1 280px; min-width: 180px; }
.slp-search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--text-muted); }
.slp-search .slp-input { padding-left: 30px; }
.slp-seg-count { margin-left: 5px; font-size: 11px; opacity: 0.7; }
.slp-total { margin-left: auto; font-size: 12px; color: var(--text-muted); white-space: nowrap; }

/* 列表：宽屏为表格式的一行一个链接，窄屏退回卡片 */
.slp-list {
  display: flex; flex-direction: column;
  /* clip 而不是 hidden：hidden 会让表头的 sticky 失效 */
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: clip;
}
.slp-row {
  display: grid; align-items: center; gap: 16px; padding: 10px 14px;
  /* 各行是独立的 grid，列宽不能用 auto，否则每行按内容算宽度会错位；操作列 = 8 个 30px 按钮 + 间距 */
  grid-template-columns: minmax(160px, 1.2fr) minmax(200px, 1.6fr) minmax(230px, 1.1fr) 120px 254px;
}
.slp-row-head {
  position: sticky; top: 0; z-index: 1; padding-top: 8px; padding-bottom: 8px;
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  background: var(--bg-input); border-bottom: 1px solid var(--border-color);
}
.slp-card { border-bottom: 1px solid var(--border-color); }
.slp-card:last-child { border-bottom: none; }
.slp-card:hover { background: var(--bg-card-hover); }
.slp-card-off { opacity: 0.7; }
.slp-card-name { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.slp-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slp-badges { display: flex; gap: 4px; flex-wrap: wrap; }
.slp-card-actions { display: flex; gap: 2px; flex-shrink: 0; justify-content: flex-end; }
.slp-col-actions { text-align: right; }
.slp-times { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.slp-times i { width: 14px; margin-right: 3px; }
.slp-badge { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; line-height: 18px; white-space: nowrap; }
.slp-badge-ok { color: var(--accent-emerald); background: rgba(16, 185, 129, 0.12); }
.slp-badge-off { color: var(--accent-rose); background: rgba(244, 63, 94, 0.1); }
.slp-badge-warn { color: var(--accent-amber); background: rgba(245, 158, 11, 0.14); }
.slp-badge-plain { color: var(--text-secondary); background: var(--bg-input); border: 1px solid var(--border-color); }
.slp-url-row { min-width: 0; }
.slp-url {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 5px 8px;
  font-size: 12px; color: var(--text-secondary); background: var(--bg-input); border-radius: 6px;
}
.slp-stats { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--text-muted); }
.slp-stats span { white-space: nowrap; }
.slp-icon-placeholder { visibility: hidden; }
.slp-stats i { margin-right: 3px; }

.slp-backdrop {
  position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(0, 0, 0, 0.45);
}
.slp-modal {
  width: 560px; max-width: 100%; max-height: calc(100vh - 32px); display: flex; flex-direction: column;
  background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); overflow: hidden;
}
.slp-modal-sm { width: 380px; }
.slp-modal-lg { width: 900px; height: min(640px, calc(100vh - 32px)); }
.slp-modal-head {
  display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
  font-size: 15px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-color);
}
.slp-modal-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.slp-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-color); }
.slp-field { display: flex; flex-direction: column; gap: 6px; }
.slp-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.slp-label em { color: var(--accent-rose); font-style: normal; }
.slp-hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.slp-warn { color: var(--accent-amber); }
.slp-input {
  width: 100%; box-sizing: border-box; padding: 7px 10px; font: inherit; font-size: 13px;
  color: var(--text-primary); background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px;
}
.slp-input:focus { outline: none; border-color: var(--accent-blue); }
.slp-textarea { resize: vertical; min-height: 54px; }
.slp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
.slp-seg { display: flex; flex-wrap: wrap; gap: 4px; }
.slp-seg button {
  padding: 5px 12px; font: inherit; font-size: 12px; color: var(--text-secondary); background: var(--bg-input);
  border: 1px solid var(--border-color); border-radius: 999px; cursor: pointer;
}
.slp-seg button.active { color: var(--accent-blue); border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.08); font-weight: 600; }
.slp-seg button:disabled { opacity: 0.45; cursor: not-allowed; }
.slp-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.slp-divider {
  margin-top: 4px; padding-top: 10px; font-size: 12px; font-weight: 600; color: var(--text-muted);
  border-top: 1px dashed var(--border-color);
}

.slp-share-body { align-items: center; text-align: center; }
.slp-qr { width: 200px; height: 200px; border-radius: 8px; background: #fff; padding: 6px; }
.slp-share-row { display: flex; align-items: center; gap: 4px; width: 100%; }
.slp-share-row .slp-url { flex: 1; }
.slp-code-box {
  display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 13px; color: var(--text-secondary);
  background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px;
}
.slp-code-box strong { font-size: 20px; letter-spacing: 3px; color: var(--text-primary); font-family: ui-monospace, Consolas, monospace; }
.slp-link { font-size: 12px; color: var(--accent-blue); text-decoration: none; }

.slp-records { flex: 1; display: grid; grid-template-columns: 280px 1fr; min-height: 0; }
.slp-rec-list { overflow-y: auto; border-right: 1px solid var(--border-color); padding: 6px; }
.slp-rec-item {
  display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 10px; text-align: left; font: inherit;
  background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer;
}
.slp-rec-item:hover { background: var(--bg-card-hover); }
.slp-rec-item.active { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.3); }
.slp-rec-title { font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slp-rec-meta { font-size: 11px; color: var(--text-muted); }
.slp-rec-detail { overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.slp-msg { max-width: 85%; }
.slp-msg-user { align-self: flex-end; }
.slp-msg-role { font-size: 11px; color: var(--text-muted); margin-bottom: 3px; }
.slp-msg-user .slp-msg-role { text-align: right; }
.slp-msg-text {
  padding: 8px 12px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
  color: var(--text-primary); background: var(--bg-input); border-radius: 10px;
}
.slp-msg-user .slp-msg-text { background: rgba(59, 130, 246, 0.12); }

@media (max-width: 1180px) {
  .slp-row-head { display: none; }
  .slp-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "name actions" "url url" "stats times";
    gap: 8px 12px;
  }
  .slp-card-name { grid-area: name; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 6px; }
  .slp-card-actions { grid-area: actions; }
  .slp-url-row { grid-area: url; }
  .slp-stats { grid-area: stats; }
  .slp-times { grid-area: times; flex-direction: row; gap: 12px; }
}

@media (max-width: 720px) {
  .slp-row { grid-template-areas: "name name" "actions actions" "url url" "stats stats" "times times"; }
  .slp-card-actions { justify-content: flex-start; flex-wrap: wrap; }
  .slp-grid { grid-template-columns: 1fr; }
  .slp-records { grid-template-columns: 1fr; grid-template-rows: 200px 1fr; }
  .slp-rec-list { border-right: none; border-bottom: 1px solid var(--border-color); }
}
</style>
