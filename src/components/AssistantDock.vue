<template>
  <!-- 平台 AI 助手：右侧悬浮入口 + 滑出式对话面板；对话走模型网关默认路由（/api/assistant/chat） -->
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
            <button type="button" title="新对话" :disabled="sending || !messages.length" @click="newChat">
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
          <!-- 欢迎页 -->
          <div v-if="!messages.length" class="ad-welcome">
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
              <span v-if="m.role !== 'user'" class="ad-msg-avatar"><AgentMascot :size="22" /></span>
              <div class="ad-msg-main">
                <div class="ad-bubble" :class="{ degraded: m.degraded }" v-html="m.html"></div>
                <div v-if="m.meta" class="ad-meta">{{ m.meta }}</div>
              </div>
            </div>
            <div v-if="sending" class="ad-msg is-bot">
              <span class="ad-msg-avatar"><AgentMascot :size="22" animated /></span>
              <div class="ad-msg-main">
                <div class="ad-bubble ad-typing"><i></i><i></i><i></i></div>
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
              placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
              :disabled="sending"
              @focus="focused = true"
              @blur="focused = false"
              @input="autosize"
              @keydown.enter.exact.prevent="send()"
            ></textarea>
            <button
              type="button"
              class="ad-send"
              :disabled="sending || !draft.trim()"
              title="发送"
              @click="send()"
            >
              <ArrowUp :size="16" :stroke-width="2.2" />
            </button>
          </div>
          <p class="ad-disclaimer">内容由 AI 生成，仅供参考</p>
        </footer>
      </aside>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  Workflow, BookOpen, Network, Wrench, KeyRound, Stethoscope, ArrowUp, SquarePen, X,
  PanelRight, PictureInPicture2, Maximize2, Minimize2
} from 'lucide-vue-next'
import { http } from '../api/http'
import AgentMascot from './AgentMascot.vue'

const open = ref(false)
const draft = ref('')
const sending = ref(false)
const focused = ref(false)
const messages = ref([]) // { role, content, html, meta?, degraded? }
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
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
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
  '平台内置引擎和 Dify 外部引擎有什么区别？',
  '向量模型测试连接失败怎么办？',
  '开发者和超级管理员的权限有什么不同？'
]

function openPanel() {
  open.value = true
  nextTick(() => inputRef.value && inputRef.value.focus())
}

function newChat() {
  messages.value = []
  draft.value = ''
  nextTick(autosize)
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

async function send(text) {
  const content = (text ?? draft.value).trim()
  if (!content || sending.value) return
  const history = messages.value
    .filter(m => !m.degraded)
    .map(m => ({ role: m.role, content: m.content }))

  messages.value.push({ role: 'user', content, html: escapeHtml(content).replace(/\n/g, '<br>') })
  draft.value = ''
  nextTick(autosize)
  sending.value = true
  scrollToBottom()

  try {
    const res = await http.post('/api/assistant/chat', { message: content, history })
    if (res && res.success && res.data) {
      const d = res.data
      const meta = [d.model, d.latencyMs != null ? (d.latencyMs / 1000).toFixed(1) + 's' : '', d.tokensUsed ? d.tokensUsed + ' tokens' : '']
        .filter(Boolean).join(' · ')
      messages.value.push({
        role: 'assistant',
        content: d.reply || '',
        html: renderMarkdown(d.reply || ''),
        meta: d.degraded ? '' : meta,
        degraded: !!d.degraded
      })
    } else {
      messages.value.push({ role: 'assistant', content: '', html: escapeHtml((res && res.message) || '请求失败，请稍后重试'), degraded: true })
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '', html: '网络异常，请稍后重试', degraded: true })
  } finally {
    sending.value = false
    scrollToBottom()
    nextTick(() => inputRef.value && inputRef.value.focus())
  }
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

.ad-disclaimer {
  margin-top: 8px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-muted);
}

@media (max-width: 520px) {
  .ad-caps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .ad-slide-enter-active,
  .ad-slide-leave-active,
  .ad-typing i {
    transition: none;
    animation: none;
  }
}
</style>
