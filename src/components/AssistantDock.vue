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

    <transition name="ad-slide">
      <aside v-if="open" class="ad-panel" role="dialog" aria-label="AI 助手">
        <header class="ad-head">
          <span class="ad-title">AI 助手</span>
          <div class="ad-head-actions">
            <button type="button" title="新对话" :disabled="sending || !messages.length" @click="newChat">
              <SquarePen :size="16" :stroke-width="1.75" />
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
import { nextTick, ref } from 'vue'
import { Workflow, BookOpen, Network, Wrench, KeyRound, Stethoscope, ArrowUp, SquarePen, X } from 'lucide-vue-next'
import { http } from '../api/http'
import AgentMascot from './AgentMascot.vue'

const open = ref(false)
const draft = ref('')
const sending = ref(false)
const focused = ref(false)
const messages = ref([]) // { role, content, html, meta?, degraded? }
const scrollRef = ref(null)
const inputRef = ref(null)

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
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 950;
  width: min(420px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: -18px 0 40px -24px rgba(0, 0, 0, 0.35);
}

.ad-slide-enter-active,
.ad-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.ad-slide-enter-from,
.ad-slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

.ad-head {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--border-color);
}

.ad-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.ad-head-actions {
  display: flex;
  gap: 4px;
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
