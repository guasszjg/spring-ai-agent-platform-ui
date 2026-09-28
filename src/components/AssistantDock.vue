<template>
  <!-- 平台 AI 助手：右侧悬浮入口 + 滑出式对话面板；流式对话（/api/assistant/chat/stream），执行模式可调用只读平台工具 -->
  <div class="ad">
    <button
      v-show="!open"
      type="button"
      class="ad-launcher"
      title="AI 助手"
      @click="openPanel"
    >
      <AgentMascot :size="34" animated />
    </button>

    <transition :name="effectiveMode === 'dock' ? 'ad-slide' : 'ad-pop'">
      <aside
        v-if="open"
        ref="panelRef"
        class="ad-panel"
        :class="['mode-' + effectiveMode, { interacting }]"
        :style="panelStyle"
        role="dialog"
        aria-label="AI 助手"
      >
        <!-- 调整大小的拖拽区域：停靠模式拖左边缘；悬浮模式拖右边、下边、右下角 -->
        <div v-if="effectiveMode === 'dock'" class="ad-resize ad-resize-w" @pointerdown="startResize($event, 'w')"></div>
        <template v-if="effectiveMode === 'float'">
          <div class="ad-resize ad-resize-e" @pointerdown="startResize($event, 'e')"></div>
          <div class="ad-resize ad-resize-s" @pointerdown="startResize($event, 's')"></div>
          <div class="ad-resize ad-resize-se" @pointerdown="startResize($event, 'se')"></div>
        </template>

        <header
          class="ad-head"
          :class="{ draggable: effectiveMode === 'float' }"
          @pointerdown="startDrag"
          @dblclick="toggleFull"
        >
          <span class="ad-title">
            <AgentMascot :size="20" />
            AI 助手
          </span>
          <div class="ad-head-actions" @pointerdown.stop @dblclick.stop>
            <button
              type="button"
              :class="{ on: view === 'history' }"
              title="历史对话"
              :disabled="sending"
              @click="toggleHistory"
            >
              <History :size="16" :stroke-width="1.75" />
            </button>
            <button type="button" title="新对话" :disabled="sending || (!messages.length && view === 'chat')" @click="newChat">
              <SquarePen :size="16" :stroke-width="1.75" />
            </button>
            <span class="ad-head-sep"></span>
            <button
              v-if="!isNarrow"
              type="button"
              :class="{ on: mode === 'dock' }"
              title="停靠在右侧"
              @click="setMode('dock')"
            >
              <PanelRight :size="16" :stroke-width="1.75" />
            </button>
            <button
              v-if="!isNarrow"
              type="button"
              :class="{ on: mode === 'float' }"
              title="悬浮窗口（可拖动、调整大小）"
              @click="setMode('float')"
            >
              <PictureInPicture2 :size="16" :stroke-width="1.75" />
            </button>
            <button
              v-if="!isNarrow"
              type="button"
              :title="mode === 'full' ? '退出全屏（Esc）' : '全屏'"
              @click="toggleFull"
            >
              <component :is="mode === 'full' ? Minimize2 : Maximize2" :size="15" :stroke-width="1.75" />
            </button>
            <button type="button" title="关闭" @click="open = false">
              <X :size="17" :stroke-width="1.75" />
            </button>
          </div>
        </header>

        <div ref="scrollRef" class="ad-body">
          <!-- 历史对话 -->
          <div v-if="view === 'history'" class="ad-history">
            <div class="ad-section-label">历史对话（保留 90 天）</div>
            <div v-if="historyLoading" class="ad-history-empty">加载中…</div>
            <div v-else-if="!historyList.length" class="ad-history-empty">还没有历史对话</div>
            <template v-else>
              <div
                v-for="c in historyList"
                :key="c.id"
                class="ad-history-item"
                :class="{ active: c.id === conversationId }"
                role="button"
                tabindex="0"
                @click="openConversation(c.id)"
                @keydown.enter="openConversation(c.id)"
              >
                <MessageSquare :size="15" :stroke-width="1.75" class="ad-history-icon" />
                <div class="ad-history-text">
                  <span class="ad-history-title">{{ c.title || '新对话' }}</span>
                  <span class="ad-history-time">{{ formatTime(c.updatedAt) }}</span>
                </div>
                <button type="button" class="ad-history-del" title="删除" @click.stop="deleteConversation(c.id)">
                  <Trash2 :size="14" :stroke-width="1.75" />
                </button>
              </div>
            </template>
          </div>

          <!-- 欢迎页 -->
          <div v-else-if="!messages.length" class="ad-welcome">
            <div class="ad-hero">
              <AgentMascot :size="88" animated />
              <div class="ad-hero-text">
                <strong>您好，欢迎使用</strong>
                <span>AgentMatrix 助手</span>
              </div>
            </div>

            <div class="ad-section-label">我可以帮您</div>
            <div class="ad-caps">
              <button
                v-for="c in capabilities"
                :key="c.label"
                type="button"
                class="ad-cap"
                @click="send(c.prompt)"
              >
                <span class="ad-cap-icon"><component :is="c.icon" :size="16" :stroke-width="1.75" /></span>
                <span>{{ c.label }}</span>
              </button>
            </div>

            <div class="ad-examples">
              <button v-for="q in examples" :key="q" type="button" @click="send(q)">
                <span>#</span>{{ q }}
              </button>
            </div>
          </div>

          <!-- 对话 -->
          <template v-else>
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="ad-msg"
              :class="m.role === 'user' ? 'is-user' : 'is-bot'"
            >
              <span v-if="m.role !== 'user'" class="ad-msg-avatar"><AgentMascot :size="22" :animated="!!m.streaming" /></span>
              <div class="ad-msg-main">
                <div v-if="m.tools && m.tools.length" class="ad-tools">
                  <span v-for="t in m.tools" :key="t.id" class="ad-tool" :class="t.status">
                    <LoaderCircle v-if="t.status === 'running'" :size="13" :stroke-width="2" class="ad-spin" />
                    <Check v-else-if="t.status === 'done'" :size="13" :stroke-width="2.2" />
                    <CircleAlert v-else :size="13" :stroke-width="2" />
                    {{ t.status === 'running' ? '正在' + t.label + '…' : t.label }}
                  </span>
                </div>
                <div v-if="m.html" class="ad-bubble" :class="{ degraded: m.degraded }" v-html="m.html"></div>
                <div v-else-if="m.streaming" class="ad-bubble ad-typing"><i></i><i></i><i></i></div>
                <!-- 操作卡片：写操作不直接执行，用户确认后才执行 -->
                <div
                  v-for="card in m.actions || []"
                  :key="card.id"
                  class="ad-card"
                  :class="['status-' + cardStatus(card).toLowerCase()]"
                >
                  <div class="ad-card-head">
                    <span class="ad-card-icon">
                      <component :is="card.riskLevel === 'W2' ? PencilLine : Plus" :size="14" :stroke-width="2" />
                    </span>
                    <span class="ad-card-title">{{ card.title }}</span>
                    <span class="ad-card-risk" :class="card.riskLevel">{{ card.riskLevel === 'W2' ? '修改' : '新建' }}</span>
                  </div>

                  <dl v-if="card.preview && card.preview.fields" class="ad-card-fields">
                    <template v-for="f in card.preview.fields" :key="f.label">
                      <dt>{{ f.label }}</dt>
                      <dd v-if="!f.multiline">{{ f.value }}</dd>
                      <dd v-else>
                        <div class="ad-card-long" :class="{ open: card.expanded && card.expanded[f.label] }">{{ f.value }}</div>
                        <button v-if="f.value && f.value.length > 120" type="button" class="ad-card-toggle" @click="toggleField(card, f.label)">
                          {{ card.expanded && card.expanded[f.label] ? '收起' : '展开全部' }}
                        </button>
                      </dd>
                    </template>
                  </dl>

                  <div v-if="card.preview && card.preview.diff" class="ad-card-diff">
                    <div class="ad-card-diff-label">{{ card.preview.diff.label }}</div>
                    <div class="ad-card-diff-cols">
                      <div class="before">
                        <span>修改前</span>
                        <div class="ad-card-long" :class="{ open: card.expanded && card.expanded.__diff }">{{ card.preview.diff.before || '（空）' }}</div>
                      </div>
                      <div class="after">
                        <span>修改后</span>
                        <div class="ad-card-long" :class="{ open: card.expanded && card.expanded.__diff }">{{ card.preview.diff.after || '（空）' }}</div>
                      </div>
                    </div>
                    <button
                      v-if="(card.preview.diff.before || '').length > 120 || (card.preview.diff.after || '').length > 120"
                      type="button"
                      class="ad-card-toggle"
                      @click="toggleField(card, '__diff')"
                    >{{ card.expanded && card.expanded.__diff ? '收起' : '展开全部' }}</button>
                  </div>

                  <p v-if="card.preview && card.preview.note" class="ad-card-note">{{ card.preview.note }}</p>

                  <div class="ad-card-foot">
                    <template v-if="cardStatus(card) === 'PENDING'">
                      <span class="ad-card-hint"><Clock :size="12" :stroke-width="2" /> {{ expiryText(card) }}</span>
                      <div class="ad-card-actions">
                        <button type="button" class="btn-cancel" :disabled="card.busy" @click="cancelAction(card)">取消</button>
                        <button type="button" class="btn-confirm" :disabled="card.busy" @click="confirmAction(card)">
                          <LoaderCircle v-if="card.busy" :size="13" :stroke-width="2" class="ad-spin" />
                          {{ card.riskLevel === 'W2' ? '确认修改' : '确认创建' }}
                        </button>
                      </div>
                    </template>
                    <template v-else-if="cardStatus(card) === 'EXECUTED'">
                      <span class="ad-card-result ok"><Check :size="13" :stroke-width="2.2" /> {{ card.result && card.result.message || '已执行' }}</span>
                      <button
                        v-if="card.result && card.result.link"
                        type="button"
                        class="ad-card-link"
                        @click="openLink(card.result.link.url)"
                      >{{ card.result.link.label }} <ExternalLink :size="12" :stroke-width="2" /></button>
                    </template>
                    <span v-else-if="cardStatus(card) === 'FAILED'" class="ad-card-result fail">
                      <CircleAlert :size="13" :stroke-width="2" /> 执行失败：{{ card.result && card.result.error || '未知原因' }}
                    </span>
                    <span v-else class="ad-card-result muted">{{ statusText(cardStatus(card)) }}</span>
                  </div>
                  <p v-if="card.error" class="ad-card-error">{{ card.error }}</p>
                </div>

                <div v-if="m.notice" class="ad-notice">{{ m.notice }}</div>
                <div v-if="m.meta || (m.id && !m.streaming && !m.degraded)" class="ad-meta-row">
                  <span v-if="m.meta" class="ad-meta">{{ m.meta }}</span>
                  <span v-if="m.id && !m.streaming && !m.degraded" class="ad-feedback">
                    <button
                      type="button"
                      :class="{ on: m.feedback === 'UP' }"
                      title="有用"
                      @click="sendFeedback(m, 'UP')"
                    ><ThumbsUp :size="13" :stroke-width="1.9" /></button>
                    <button
                      type="button"
                      :class="{ on: m.feedback === 'DOWN' }"
                      title="没用"
                      @click="sendFeedback(m, 'DOWN')"
                    ><ThumbsDown :size="13" :stroke-width="1.9" /></button>
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <footer class="ad-foot">
          <div class="ad-input" :class="{ focused }">
            <textarea
              ref="inputRef"
              v-model="draft"
              rows="1"
              :placeholder="chatMode === 'CHAT'
                ? '问答模式：只回答使用问题，不查询平台数据'
                : '输入你的问题，Enter 发送，Shift+Enter 换行'"
              @focus="focused = true"
              @blur="focused = false"
              @input="autosize"
              @keydown.enter.exact.prevent="!sending && send()"
            ></textarea>
            <button
              v-if="sending"
              type="button"
              class="ad-send"
              title="停止生成"
              @click="stop"
            >
              <Square :size="12" :stroke-width="0" fill="currentColor" />
            </button>
            <button
              v-else
              type="button"
              class="ad-send"
              :disabled="!draft.trim()"
              title="发送"
              @click="send()"
            >
              <ArrowUp :size="16" :stroke-width="2.2" />
            </button>
          </div>
          <div class="ad-foot-bar">
            <div class="ad-mode" role="radiogroup" aria-label="对话模式">
              <button
                v-for="opt in modeOptions"
                :key="opt.value"
                type="button"
                role="radio"
                :aria-checked="chatMode === opt.value"
                :class="{ on: chatMode === opt.value }"
                :title="opt.hint"
                :disabled="sending"
                @click="setChatMode(opt.value)"
              >
                <component :is="opt.icon" :size="13" :stroke-width="2" />
                {{ opt.label }}
              </button>
            </div>
            <span class="ad-disclaimer">内容由 AI 生成，仅供参考</span>
          </div>
        </footer>
      </aside>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  Workflow, BookOpen, Network, Wrench, KeyRound, Stethoscope, ArrowUp, SquarePen, X,
  PanelRight, PictureInPicture2, Maximize2, Minimize2, History, Square, LoaderCircle, Check,
  CircleAlert, Trash2, MessageSquare, Zap, ThumbsUp, ThumbsDown, ExternalLink, PencilLine, Plus, Clock
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { http } from '../api/http'
import AgentMascot from './AgentMascot.vue'

const router = useRouter()

const open = ref(false)
const draft = ref('')
const sending = ref(false)
const focused = ref(false)
// { role, content, html, meta?, degraded?, streaming?, notice?, tools?: [{ id, label, status }] }
const messages = ref([])
const conversationId = ref(null)
const view = ref('chat') // chat | history
const historyList = ref([])
const historyLoading = ref(false)
let abortCtrl = null

// ==================== 对话模式：执行（可查询平台数据）/ 问答 ====================
const MODE_KEY = 'agentmatrix.assistant.mode'
const modeOptions = [
  { value: 'AGENT', label: '执行', icon: Zap, hint: '可以查询你有权限的智能体、知识库、模型通道与用量，并诊断问题' },
  { value: 'CHAT', label: '问答', icon: MessageSquare, hint: '只回答使用问题，不查询平台数据，回复更快' }
]
const chatMode = ref('AGENT')

function loadChatMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'AGENT' || saved === 'CHAT') chatMode.value = saved
  } catch { /* 本地存储不可用时使用默认模式 */ }
}

function setChatMode(value) {
  chatMode.value = value
  try { localStorage.setItem(MODE_KEY, value) } catch { /* 忽略 */ }
}
const scrollRef = ref(null)
const inputRef = ref(null)
const panelRef = ref(null)

// ==================== 窗口布局：停靠 / 悬浮 / 全屏 ====================
const LAYOUT_KEY = 'agentmatrix.assistant.layout'
const DOCK_MIN = 360
const FLOAT_MIN_W = 340
const FLOAT_MIN_H = 420
const EDGE = 12 // 悬浮窗与视口边缘的最小间距

const mode = ref('dock')          // 用户选择的模式
const prevMode = ref('dock')      // 进入全屏前的模式，退出时恢复
const dockWidth = ref(440)
const floatRect = reactive({ x: 0, y: 0, w: 420, h: 640 })
const viewport = reactive({ w: window.innerWidth, h: window.innerHeight })
const interacting = ref(false)    // 拖动 / 调整大小进行中，关闭过渡避免卡顿

const isNarrow = computed(() => viewport.w < 640)
const effectiveMode = computed(() => (isNarrow.value ? 'full' : mode.value))

const panelStyle = computed(() => {
  if (effectiveMode.value === 'dock') {
    return { width: clampDock(dockWidth.value) + 'px' }
  }
  if (effectiveMode.value === 'float') {
    const r = clampFloat({ ...floatRect })
    return { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }
  }
  return {}
})

function clampDock(w) {
  return Math.round(Math.min(Math.max(w, DOCK_MIN), Math.max(DOCK_MIN, viewport.w * 0.7)))
}

function clampFloat(r) {
  const w = Math.min(Math.max(r.w, FLOAT_MIN_W), viewport.w - EDGE * 2)
  const h = Math.min(Math.max(r.h, FLOAT_MIN_H), viewport.h - EDGE * 2)
  const x = Math.min(Math.max(r.x, EDGE), viewport.w - w - EDGE)
  const y = Math.min(Math.max(r.y, EDGE), viewport.h - h - EDGE)
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

function defaultFloatRect() {
  const w = 420
  const h = Math.min(640, viewport.h - EDGE * 2 - 60)
  return { x: viewport.w - w - 28, y: viewport.h - h - 28, w, h }
}

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null')
    if (saved) {
      if (['dock', 'float', 'full'].includes(saved.mode)) mode.value = saved.mode
      if (['dock', 'float'].includes(saved.prevMode)) prevMode.value = saved.prevMode
      if (Number(saved.dockWidth) > 0) dockWidth.value = Number(saved.dockWidth)
      if (saved.floatRect && Number(saved.floatRect.w) > 0) {
        Object.assign(floatRect, saved.floatRect)
        return
      }
    }
  } catch { /* 忽略损坏的本地配置 */ }
  Object.assign(floatRect, defaultFloatRect())
}

function saveLayout() {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({
      mode: mode.value,
      prevMode: prevMode.value,
      dockWidth: clampDock(dockWidth.value),
      floatRect: clampFloat({ ...floatRect })
    }))
  } catch { /* 本地存储不可用时忽略 */ }
}

function setMode(m) {
  if (m !== 'full') prevMode.value = m
  mode.value = m
  saveLayout()
}

function toggleFull() {
  if (isNarrow.value) return
  setMode(mode.value === 'full' ? (prevMode.value || 'dock') : 'full')
}

// 悬浮模式：拖动标题栏移动窗口
function startDrag(e) {
  if (effectiveMode.value !== 'float' || e.button !== 0) return
  const start = { mx: e.clientX, my: e.clientY, x: floatRect.x, y: floatRect.y }
  beginPointer(e, (ev) => {
    const next = clampFloat({ ...floatRect, x: start.x + ev.clientX - start.mx, y: start.y + ev.clientY - start.my })
    floatRect.x = next.x
    floatRect.y = next.y
  })
}

// 调整大小：停靠模式拖左边缘；悬浮模式拖右边 / 下边 / 右下角
function startResize(e, dir) {
  if (e.button !== 0) return
  const start = { mx: e.clientX, my: e.clientY, w: floatRect.w, h: floatRect.h }
  beginPointer(e, (ev) => {
    if (dir === 'w') {
      dockWidth.value = clampDock(viewport.w - ev.clientX)
      return
    }
    if (dir.includes('e')) floatRect.w = Math.max(FLOAT_MIN_W, Math.min(start.w + ev.clientX - start.mx, viewport.w - floatRect.x - EDGE))
    if (dir.includes('s')) floatRect.h = Math.max(FLOAT_MIN_H, Math.min(start.h + ev.clientY - start.my, viewport.h - floatRect.y - EDGE))
  })
}

function beginPointer(e, onMove) {
  e.preventDefault()
  interacting.value = true
  const prevSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
  const move = (ev) => onMove(ev)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.userSelect = prevSelect
    interacting.value = false
    saveLayout()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onWindowResize() {
  viewport.w = window.innerWidth
  viewport.h = window.innerHeight
  Object.assign(floatRect, clampFloat({ ...floatRect }))
}

function onKeydown(e) {
  if (e.key === 'Escape' && open.value && mode.value === 'full' && !isNarrow.value) {
    setMode(prevMode.value || 'dock')
  }
}

onMounted(() => {
  loadLayout()
  loadChatMode()
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  if (abortCtrl) abortCtrl.abort()
})

const capabilities = [
  { label: '搭建智能体', icon: Workflow, prompt: '我想新建一个智能体，需要哪些步骤？' },
  { label: '知识库问答', icon: BookOpen, prompt: '怎么创建知识库并让智能体基于它回答问题？' },
  { label: '模型配置', icon: Network, prompt: '模型网关里的默认通道、降级备用和故障转移分别是什么意思？' },
  { label: '工具接入', icon: Wrench, prompt: '如何给智能体添加一个自定义 HTTP 工具？' },
  { label: '开放 API', icon: KeyRound, prompt: '如何通过开放 API 在我的系统里调用智能体？' },
  { label: '问题排查', icon: Stethoscope, prompt: '智能体调试时没有回复，应该怎么排查？' }
]

const examples = [
  '我有哪些运行中的智能体？哪个调用最多？',
  '这周 token 用了多少，成本多少？',
  '模型通道现在都正常吗？',
  '平台内置引擎和 Dify 外部引擎有什么区别？'
]

function openPanel() {
  open.value = true
  nextTick(() => inputRef.value && inputRef.value.focus())
}

function newChat() {
  messages.value = []
  conversationId.value = null
  view.value = 'chat'
  draft.value = ''
  nextTick(() => {
    autosize()
    inputRef.value && inputRef.value.focus()
  })
}

// ==================== 历史对话 ====================
async function toggleHistory() {
  if (view.value === 'history') {
    view.value = 'chat'
    return
  }
  view.value = 'history'
  historyLoading.value = true
  const res = await http.get('/api/assistant/conversations')
  historyLoading.value = false
  historyList.value = res && res.success && Array.isArray(res.data) ? res.data : []
}

async function openConversation(id) {
  const res = await http.get(`/api/assistant/conversations/${encodeURIComponent(id)}`)
  if (!res || !res.success || !res.data) {
    historyList.value = historyList.value.filter(c => c.id !== id)
    return
  }
  conversationId.value = res.data.id
  const actionsByMessage = {}
  for (const card of res.data.actions || []) {
    if (!card.messageId) continue
    ;(actionsByMessage[card.messageId] ||= []).push(card)
  }
  messages.value = (res.data.messages || []).map(m => fromStoredMessage(m, actionsByMessage[m.id] || []))
  view.value = 'chat'
  scrollToBottom()
}

function fromStoredMessage(m, actions = []) {
  if (m.role === 'user') {
    return { role: 'user', content: m.content || '', html: escapeHtml(m.content || '').replace(/\n/g, '<br>') }
  }
  let tools = []
  try {
    tools = (JSON.parse(m.toolCalls || '[]') || []).map((t, i) => ({ id: `${m.id}-${i}`, label: t.label, status: t.ok ? 'done' : 'failed' }))
  } catch { /* 忽略损坏的工具记录 */ }
  return {
    id: m.id,
    role: 'assistant',
    content: m.content || '',
    html: renderMarkdown(m.content || ''),
    degraded: !!m.degraded,
    feedback: m.feedback || null,
    tools,
    actions,
    meta: m.degraded ? '' : metaText(m.model, m.latencyMs, (m.promptTokens || 0) + (m.completionTokens || 0))
  }
}

async function deleteConversation(id) {
  const res = await http.del(`/api/assistant/conversations/${encodeURIComponent(id)}`)
  if (res && res.success) {
    historyList.value = historyList.value.filter(c => c.id !== id)
    if (conversationId.value === id) {
      conversationId.value = null
      messages.value = []
    }
  }
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function metaText(model, latencyMs, tokens) {
  return [model, latencyMs != null ? (latencyMs / 1000).toFixed(1) + 's' : '', tokens ? tokens + ' tokens' : '']
    .filter(Boolean).join(' · ')
}

function autosize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 140) + 'px'
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 轻量 Markdown：先转义，再处理代码块、标题、列表、引用、分隔线与行内格式；块级元素前后不再额外插入空行
function renderMarkdown(text) {
  let html = escapeHtml(String(text || '').replace(/\r\n/g, '\n').trim())
  const blocks = []
  const keep = (s) => { blocks.push(s); return `@@B${blocks.length - 1}@@` }
  html = html.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, (_, code) => keep(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`))
  html = html
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    // 表格：表头行 + 分隔行（|---|:---:|）+ 数据行；流式输出中分隔行尚未到达时按普通文本显示
    .replace(/^(\|.*\|)[ \t]*\n\|?[ \t]*:?-{2,}:?[ \t]*(?:\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*\n((?:\|.*\|[ \t]*(?:\n|$))*)/gm,
      (_, head, body) => keep(renderTable(head, body)))
    .replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm, () => keep('<hr>'))
    .replace(/^#{1,4} (.+)$/gm, (_, t) => keep(`<h4>${t}</h4>`))
    .replace(/^&gt; ?(.*)$/gm, '<bq>$1</bq>')
    .replace(/((?:<bq>.*<\/bq>\n?)+)/g, (m) => keep(`<blockquote>${m.replace(/<\/?bq>/g, '').trim().replace(/\n/g, '<br>')}</blockquote>`))
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\s*(\d+)\. (.+)$/gm, '<li class="ol" data-n="$1">$2</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, (m) => keep(`<ul>${m.replace(/\n/g, '')}</ul>`))
  // 块级占位符前后的换行不再转成 <br>；普通段落之间保留一个空行
  html = html
    .replace(/\n*(@@B\d+@@)\n*/g, '$1')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
  return html.replace(/@@B(\d+)@@/g, (_, i) => blocks[Number(i)])
}

function renderTable(head, body) {
  const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  const th = cells(head).map(c => `<th>${c}</th>`).join('')
  const rows = body.split('\n').filter(r => r.trim())
    .map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<div class="md-table"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`
}

// 流式回复：增量到达时按帧合并重绘，避免每个字都重新渲染 Markdown
function scheduleRender(msg) {
  if (msg.renderPending) return
  msg.renderPending = true
  requestAnimationFrame(() => {
    msg.renderPending = false
    msg.html = renderMarkdown(msg.content)
    scrollToBottom()
  })
}

function upsertTool(msg, data) {
  const existing = msg.tools.find(t => t.id === data.id)
  if (existing) existing.status = data.status
  else msg.tools.push({ id: data.id, label: data.label || data.name, status: data.status })
  scrollToBottom()
}

async function send(text) {
  const content = (text ?? draft.value).trim()
  if (!content || sending.value) return
  view.value = 'chat'

  messages.value.push({ role: 'user', content, html: escapeHtml(content).replace(/\n/g, '<br>') })
  messages.value.push({ role: 'assistant', content: '', html: '', streaming: true, tools: [], actions: [], notice: '', meta: '' })
  // 取响应式代理，后续修改才会触发界面更新
  const reply = messages.value[messages.value.length - 1]
  draft.value = ''
  nextTick(autosize)
  sending.value = true
  scrollToBottom()

  abortCtrl = new AbortController()
  const result = await http.stream('/api/assistant/chat/stream',
    { conversationId: conversationId.value, message: content, mode: chatMode.value },
    {
      signal: abortCtrl.signal,
      onEvent(event, data) {
        if (event === 'start') {
          conversationId.value = data.conversationId
        } else if (event === 'tool') {
          upsertTool(reply, data)
        } else if (event === 'action') {
          reply.actions.push(data)
          scrollToBottom()
        } else if (event === 'message') {
          reply.content += data.delta || ''
          scheduleRender(reply)
        } else if (event === 'guardrail') {
          reply.notice = data.message || '输出命中内容安全策略，已中断'
        } else if (event === 'done') {
          reply.content = data.content || reply.content
          reply.html = renderMarkdown(reply.content)
          reply.degraded = !!data.degraded
          if (data.notice) reply.notice = data.notice
          reply.meta = data.degraded ? '' : metaText(data.model, data.latencyMs, (data.promptTokens || 0) + (data.completionTokens || 0))
          reply.id = data.messageId
          if (data.conversationId) conversationId.value = data.conversationId
        } else if (event === 'error') {
          reply.content = data.message || '请求失败，请稍后重试'
          reply.html = escapeHtml(reply.content)
          reply.degraded = true
        }
      }
    })

  if (result.aborted) {
    reply.notice = '已停止生成'
    if (!reply.content) {
      reply.content = '（已停止）'
      reply.degraded = true
    }
    reply.html = renderMarkdown(reply.content)
  } else if (!result.success) {
    reply.content = result.message || '请求失败，请稍后重试'
    reply.html = escapeHtml(reply.content)
    reply.degraded = true
  }
  // 运行中的工具在中断后不再更新，统一标记为未完成
  reply.tools.forEach(t => { if (t.status === 'running') t.status = 'failed' })
  reply.streaming = false
  abortCtrl = null
  sending.value = false
  scrollToBottom()
  nextTick(() => inputRef.value && inputRef.value.focus())
}

function stop() {
  if (abortCtrl) abortCtrl.abort()
}

// ==================== 操作卡片 ====================
// 每 15 秒刷新一次"剩余有效时间"与过期状态（以服务端为准，这里只影响展示）
const now = ref(Date.now())
let clockTimer = null
onMounted(() => { clockTimer = setInterval(() => { now.value = Date.now() }, 15000) })
onBeforeUnmount(() => clearInterval(clockTimer))

function cardStatus(card) {
  if (card.status === 'PENDING' && card.expiresAt && new Date(card.expiresAt).getTime() <= now.value) return 'EXPIRED'
  return card.status || 'PENDING'
}

function expiryText(card) {
  if (!card.expiresAt) return '10 分钟内有效'
  const left = Math.max(0, Math.ceil((new Date(card.expiresAt).getTime() - now.value) / 60000))
  return left > 0 ? `${left} 分钟内有效` : '即将过期'
}

function statusText(status) {
  return { CANCELLED: '已取消', EXPIRED: '已过期，如需执行请让助手重新生成', EXECUTING: '执行中…' }[status] || status
}

function toggleField(card, key) {
  card.expanded = { ...(card.expanded || {}), [key]: !(card.expanded && card.expanded[key]) }
}

async function actOnCard(card, verb) {
  card.busy = true
  card.error = ''
  const res = await http.post(`/api/assistant/actions/${encodeURIComponent(card.id)}/${verb}`)
  card.busy = false
  if (res && res.success && res.data) {
    const { expanded } = card
    Object.assign(card, res.data, { expanded })
  } else {
    card.error = (res && res.message) || '操作失败，请稍后重试'
  }
}

const confirmAction = (card) => actOnCard(card, 'confirm')
const cancelAction = (card) => actOnCard(card, 'cancel')

function openLink(url) {
  if (!url) return
  router.push(url).catch(() => {})
  // 小屏全屏展示时跳转后收起面板，便于查看目标页面
  if (isNarrow.value || mode.value === 'full') open.value = false
}

// ==================== 回复反馈 ====================
async function sendFeedback(m, rating) {
  const next = m.feedback === rating ? null : rating
  const prev = m.feedback
  m.feedback = next
  const res = await http.post(`/api/assistant/messages/${encodeURIComponent(m.id)}/feedback`, { rating: next })
  if (!res || !res.success) m.feedback = prev
}
</script>

<style scoped>
/* ---------- 悬浮入口 ---------- */
.ad-launcher {
  position: fixed;
  right: 20px;
  bottom: 28px;
  z-index: 900;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  box-shadow: 0 10px 28px -10px rgba(60, 30, 10, 0.35);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.ad-launcher:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px -10px rgba(60, 30, 10, 0.45);
}

/* ---------- 面板 ---------- */
.ad-panel {
  position: fixed;
  z-index: 950;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  transition: width 0.18s ease, height 0.18s ease;
}

.ad-panel.interacting {
  transition: none;
}

/* 停靠：贴右侧全高，左边缘可拖动调宽 */
.ad-panel.mode-dock {
  top: 0;
  right: 0;
  bottom: 0;
  border-left: 1px solid var(--border-color);
  box-shadow: -18px 0 40px -24px rgba(0, 0, 0, 0.35);
}

/* 悬浮：独立小窗，可拖动与调整大小 */
.ad-panel.mode-float {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 24px 60px -18px rgba(40, 20, 8, 0.35),
    0 8px 20px -10px rgba(40, 20, 8, 0.2);
}

/* 全屏：铺满视口，内容居中限宽 */
.ad-panel.mode-full {
  inset: 0;
  z-index: 1000;
}

.mode-full .ad-body > *,
.mode-full .ad-foot > * {
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}

.mode-full .ad-welcome {
  padding-top: 8vh;
}

.ad-slide-enter-active,
.ad-slide-leave-active,
.ad-pop-enter-active,
.ad-pop-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.ad-slide-enter-from,
.ad-slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

.ad-pop-enter-from,
.ad-pop-leave-to {
  transform: scale(0.97) translateY(8px);
  opacity: 0;
}

/* ---------- 调整大小的拖拽区域 ---------- */
.ad-resize {
  position: absolute;
  z-index: 2;
}

.ad-resize-w {
  top: 0;
  bottom: 0;
  left: -3px;
  width: 7px;
  cursor: ew-resize;
}

.ad-resize-w::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 2px;
  width: 3px;
  height: 36px;
  margin-top: -18px;
  border-radius: 3px;
  background: var(--border-hover);
  opacity: 0;
  transition: opacity 0.15s;
}

.ad-resize-w:hover::after,
.interacting .ad-resize-w::after {
  opacity: 1;
}

.ad-resize-e {
  top: 16px;
  bottom: 16px;
  right: 0;
  width: 6px;
  cursor: ew-resize;
}

.ad-resize-s {
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 6px;
  cursor: ns-resize;
}

.ad-resize-se {
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

.ad-resize-se::after {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--border-hover);
  border-bottom: 2px solid var(--border-hover);
  border-bottom-right-radius: 2px;
}

.ad-head {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  user-select: none;
}

.ad-head.draggable {
  cursor: move;
}

.ad-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.ad-head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: default;
}

.ad-head-sep {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--border-color);
}

.ad-head-actions button.on {
  background: var(--brand-soft, var(--surface-active));
  color: var(--brand-text, var(--text-primary));
}

.ad-head-actions button {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.ad-head-actions button:hover:not(:disabled) {
  background: var(--surface-subtle);
  color: var(--text-primary);
}

.ad-head-actions button:disabled {
  opacity: 0.35;
  cursor: default;
}

.ad-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
}

/* ---------- 欢迎页 ---------- */
.ad-welcome {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 28px;
}

.ad-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}

.ad-hero-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ad-hero-text strong {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.ad-hero-text span {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--brand, #d97757);
}

.ad-section-label {
  font-size: 13px;
  color: var(--text-muted);
}

.ad-caps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ad-cap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.ad-cap:hover {
  border-color: var(--brand-line, var(--border-hover));
  background: var(--brand-soft, var(--surface-subtle));
}

.ad-cap-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--brand, #d97757);
  background: var(--brand-soft, rgba(217, 119, 87, 0.1));
}

.ad-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ad-examples button {
  padding: 7px 11px;
  border-radius: 8px;
  border: none;
  background: var(--surface-subtle);
  color: var(--text-secondary);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}

.ad-examples button:hover {
  color: var(--text-primary);
  background: var(--surface-active);
}

.ad-examples button span {
  margin-right: 5px;
  color: var(--brand, #d97757);
  font-weight: 600;
}

/* ---------- 消息 ---------- */
.ad-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.ad-msg.is-user {
  justify-content: flex-end;
}

.ad-msg-avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--brand-soft, rgba(217, 119, 87, 0.1));
}

.ad-msg-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 86%;
  min-width: 0;
}

.ad-msg.is-user .ad-msg-main {
  align-items: flex-end;
}

.ad-bubble {
  padding: 10px 13px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  word-break: break-word;
}

.is-user .ad-bubble {
  background: var(--brand-strong, #c15f3c);
  border-color: transparent;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.is-bot .ad-bubble {
  border-top-left-radius: 4px;
}

.ad-bubble.degraded {
  color: var(--text-secondary);
  background: var(--surface-subtle);
}

.ad-bubble :deep(h4) {
  margin: 10px 0 4px;
  font-size: 13.5px;
  font-weight: 600;
}

.ad-bubble :deep(h4:first-child) {
  margin-top: 0;
}

.ad-bubble :deep(hr) {
  margin: 10px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

.ad-bubble :deep(blockquote) {
  margin: 6px 0;
  padding: 6px 10px;
  border-left: 3px solid var(--brand-line, var(--border-hover));
  background: var(--surface-subtle);
  border-radius: 0 6px 6px 0;
  color: var(--text-secondary);
}

.ad-bubble :deep(ul) {
  margin: 4px 0 6px;
  padding-left: 18px;
}

.ad-bubble :deep(li) {
  margin: 2px 0;
}

.ad-bubble :deep(li.ol) {
  list-style: none;
  margin-left: -18px;
}

.ad-bubble :deep(li.ol)::before {
  content: attr(data-n) ". ";
  color: var(--text-muted);
}

.ad-bubble :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-active);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.ad-bubble :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  overflow-x: auto;
}

.ad-bubble :deep(pre code) {
  padding: 0;
  background: transparent;
}

.ad-meta {
  font-size: 11.5px;
  color: var(--text-muted);
  padding-left: 2px;
}

.ad-typing {
  display: inline-flex;
  gap: 5px;
  padding: 13px 14px;
}

.ad-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: ad-dot 1.1s infinite ease-in-out;
}

.ad-typing i:nth-child(2) { animation-delay: 0.15s; }
.ad-typing i:nth-child(3) { animation-delay: 0.3s; }

@keyframes ad-dot {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

/* ---------- 输入区 ---------- */
.ad-foot {
  flex-shrink: 0;
  padding: 10px 14px 12px;
}

.ad-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 10px 10px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ad-input.focused {
  border-color: var(--brand-line, var(--border-hover));
  box-shadow: 0 0 0 3px var(--brand-soft-2, rgba(217, 119, 87, 0.12));
}

.ad-input textarea {
  flex: 1;
  min-height: 22px;
  max-height: 140px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.6;
}

.ad-send {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: var(--brand-strong, #c15f3c);
  color: #ffffff;
  cursor: pointer;
}

.ad-send:hover:not(:disabled) {
  background: var(--brand-strong-hover, #ad5232);
}

.ad-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ad-foot-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.ad-disclaimer {
  font-size: 11.5px;
  color: var(--text-muted);
}

/* ---------- 模式切换 ---------- */
.ad-mode {
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--surface-subtle);
}

.ad-mode button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.ad-mode button.on {
  background: var(--bg-card);
  color: var(--brand-text, var(--text-primary));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.ad-mode button:disabled {
  cursor: default;
  opacity: 0.6;
}

/* ---------- 工具调用提示 ---------- */
.ad-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ad-tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  border: 1px solid var(--border-color);
}

.ad-tool.done {
  color: var(--success, #3f8f5a);
}

.ad-tool.failed {
  color: var(--warning, #b7791f);
}

.ad-spin {
  animation: ad-spin 0.9s linear infinite;
}

@keyframes ad-spin {
  to { transform: rotate(360deg); }
}

.ad-notice {
  font-size: 12px;
  color: var(--warning, #b7791f);
  padding-left: 2px;
}

/* ---------- 表格 ---------- */
.ad-bubble :deep(.md-table) {
  margin: 6px 0;
  overflow-x: auto;
}

.ad-bubble :deep(table) {
  border-collapse: collapse;
  font-size: 12.5px;
  min-width: 100%;
}

.ad-bubble :deep(th),
.ad-bubble :deep(td) {
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.ad-bubble :deep(th) {
  background: var(--surface-subtle);
  font-weight: 600;
}

/* ---------- 回复元信息与反馈 ---------- */
.ad-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ad-feedback {
  display: inline-flex;
  gap: 2px;
  opacity: 0.55;
  transition: opacity 0.15s;
}

.ad-msg:hover .ad-feedback,
.ad-feedback:has(.on) {
  opacity: 1;
}

.ad-feedback button {
  width: 24px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ad-feedback button:hover {
  background: var(--surface-subtle);
  color: var(--text-primary);
}

.ad-feedback button.on {
  color: var(--brand, #d97757);
  background: var(--brand-soft, rgba(217, 119, 87, 0.1));
}

/* ---------- 操作卡片 ---------- */
.ad-card {
  border: 1px solid var(--brand-line, var(--border-hover));
  border-radius: 12px;
  background: var(--bg-card);
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
}

.ad-card.status-executed {
  border-color: var(--border-color);
}

.ad-card.status-cancelled,
.ad-card.status-expired {
  border-color: var(--border-color);
  opacity: 0.75;
}

.ad-card.status-failed {
  border-color: var(--warning, #b7791f);
}

.ad-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ad-card-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--brand, #d97757);
  background: var(--brand-soft, rgba(217, 119, 87, 0.1));
}

.ad-card-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ad-card-risk {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
}

.ad-card-risk.W2 {
  color: var(--warning, #b7791f);
  background: rgba(183, 121, 31, 0.1);
}

.ad-card-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  margin: 0;
}

.ad-card-fields dt {
  color: var(--text-muted);
  white-space: nowrap;
}

.ad-card-fields dd {
  margin: 0;
  min-width: 0;
  color: var(--text-primary);
  word-break: break-word;
}

.ad-card-long {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 4.8em;
  overflow: hidden;
  line-height: 1.6;
}

.ad-card-long.open {
  max-height: none;
}

.ad-card-toggle {
  margin-top: 2px;
  padding: 0;
  border: none;
  background: none;
  color: var(--brand, #d97757);
  font-size: 12px;
  cursor: pointer;
}

.ad-card-diff-label {
  margin-bottom: 6px;
  color: var(--text-muted);
}

.ad-card-diff-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ad-card-diff-cols > div {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12.5px;
}

.ad-card-diff-cols span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.ad-card-diff-cols .before {
  background: rgba(192, 57, 43, 0.06);
  border: 1px solid rgba(192, 57, 43, 0.15);
}

.ad-card-diff-cols .after {
  background: rgba(63, 143, 90, 0.07);
  border: 1px solid rgba(63, 143, 90, 0.18);
}

.ad-card-note {
  margin: 0;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--warning, #b7791f);
  background: rgba(183, 121, 31, 0.08);
}

.ad-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 2px;
}

.ad-card-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.ad-card-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.ad-card-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  cursor: pointer;
}

.ad-card-actions .btn-cancel {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
}

.ad-card-actions .btn-confirm {
  border: none;
  background: var(--brand-strong, #c15f3c);
  color: #ffffff;
}

.ad-card-actions .btn-confirm:hover:not(:disabled) {
  background: var(--brand-strong-hover, #ad5232);
}

.ad-card-actions button:disabled {
  opacity: 0.6;
  cursor: default;
}

.ad-card-result {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
}

.ad-card-result.ok {
  color: var(--success, #3f8f5a);
}

.ad-card-result.fail {
  color: var(--warning, #b7791f);
}

.ad-card-result.muted {
  color: var(--text-muted);
}

.ad-card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  font-size: 12.5px;
  cursor: pointer;
}

.ad-card-link:hover {
  background: var(--surface-subtle);
}

.ad-card-error {
  margin: 0;
  font-size: 12px;
  color: var(--danger, #c0392b);
}

@media (max-width: 520px) {
  .ad-card-diff-cols {
    grid-template-columns: 1fr;
  }
}

/* ---------- 历史对话 ---------- */
.ad-history {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ad-history .ad-section-label {
  margin-bottom: 6px;
}

.ad-history-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.ad-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.ad-history-item:hover,
.ad-history-item:focus-visible {
  background: var(--surface-subtle);
  outline: none;
}

.ad-history-item.active {
  background: var(--brand-soft, var(--surface-active));
}

.ad-history-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.ad-history-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ad-history-title {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ad-history-time {
  font-size: 11.5px;
  color: var(--text-muted);
}

.ad-history-del {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  opacity: 0;
  cursor: pointer;
}

.ad-history-item:hover .ad-history-del,
.ad-history-del:focus-visible {
  opacity: 1;
}

.ad-history-del:hover {
  color: var(--danger, #c0392b);
  background: var(--surface-active);
}

@media (max-width: 520px) {
  .ad-caps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .ad-slide-enter-active,
  .ad-slide-leave-active,
  .ad-typing i,
  .ad-spin {
    transition: none;
    animation: none;
  }
}
</style>
