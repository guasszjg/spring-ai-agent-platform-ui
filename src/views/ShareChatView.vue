<template>
  <div class="sc-page">
    <!-- 加载中 -->
    <div v-if="stage === 'loading'" class="sc-center">
      <i class="fa-solid fa-circle-notch fa-spin sc-spinner"></i>
    </div>

    <!-- 失效：不显示任何智能体信息 -->
    <div v-else-if="stage === 'invalid'" class="sc-center">
      <div class="sc-card sc-state-card">
        <div class="sc-state-icon sc-icon-off"><i class="fa-solid fa-link-slash"></i></div>
        <h1 class="sc-state-title">链接已失效</h1>
        <p class="sc-state-text">请联系提供方获取新的链接。</p>
      </div>
    </div>

    <!-- 输入访问码 -->
    <div v-else-if="stage === 'code'" class="sc-center">
      <form class="sc-card sc-state-card" @submit.prevent="submitCode">
        <div class="sc-state-icon"><i class="fa-solid fa-lock"></i></div>
        <h1 class="sc-state-title">{{ title }}</h1>
        <p class="sc-state-text">请输入访问码</p>
        <input
          ref="codeInputRef"
          v-model="accessCode"
          class="sc-code-input"
          :class="{ 'sc-code-error': codeError }"
          maxlength="32"
          autocomplete="one-time-code"
          inputmode="text"
          placeholder="访问码"
          :disabled="submitting"
        >
        <p v-if="codeError" class="sc-error">{{ codeError }}</p>
        <button type="submit" class="sc-btn-primary" :disabled="submitting || !accessCode.trim()">
          <i v-if="submitting" class="fa-solid fa-circle-notch fa-spin"></i> 进入
        </button>
      </form>
    </div>

    <!-- 聊天 -->
    <div v-else class="sc-chat">
      <header class="sc-header">
        <button type="button" class="sc-icon-btn sc-history-btn" title="历史对话" @click="toggleHistory">
          <i class="fa-solid fa-bars"></i>
        </button>
        <h1 class="sc-title" :title="title">{{ title }}</h1>
        <button type="button" class="sc-icon-btn" title="新对话" :disabled="sending" @click="newConversation">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
      </header>

      <div class="sc-body">
        <aside class="sc-history" :class="{ open: historyOpen }">
          <div class="sc-history-head">
            <span>历史对话</span>
            <button type="button" class="sc-icon-btn sc-history-close" @click="historyOpen = false"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <button type="button" class="sc-new-btn" :disabled="sending" @click="newConversation">
            <i class="fa-solid fa-plus"></i> 新对话
          </button>
          <div v-if="!history.length" class="sc-history-empty">还没有历史对话</div>
          <button
            v-for="c in history"
            :key="c.id"
            type="button"
            class="sc-history-item"
            :class="{ active: c.id === conversationId }"
            :disabled="sending"
            @click="openConversation(c)"
          >
            {{ c.title || '未命名对话' }}
          </button>
        </aside>
        <div v-if="historyOpen" class="sc-history-mask" @click="historyOpen = false"></div>

        <main class="sc-main">
          <!-- 访客变量表单（智能体配置了自定义变量时展示） -->
          <div v-if="variables.length" class="sc-vars-wrap">
            <div class="sc-vars-card" :class="{ warn: missingRequiredVars.length }">
              <div class="sc-vars-head" @click="varsOpen = !varsOpen">
                <div class="sc-vars-title">
                  <i class="fa-solid fa-sliders"></i>
                  <span>对话参数</span>
                  <span v-if="missingRequiredVars.length" class="sc-vars-warn">
                    有 {{ missingRequiredVars.length }} 项必填待填
                  </span>
                  <span v-else-if="!varsOpen && filledVarSummary" class="sc-vars-summary" :title="filledVarSummary">
                    {{ filledVarSummary }}
                  </span>
                </div>
                <i :class="varsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="sc-vars-chevron"></i>
              </div>
              <div v-if="varsOpen" class="sc-vars-grid">
                <div v-for="v in variables" :key="v.key" class="sc-var-field" :class="{ full: v.type === 'paragraph' }">
                  <label class="sc-var-label">
                    {{ v.label || v.key }}<span v-if="v.required" class="sc-var-req">*</span>
                  </label>
                  <select v-if="v.type === 'select'" v-model="variableValues[v.key]" class="sc-var-input">
                    <option value="">{{ v.placeholder || '请选择...' }}</option>
                    <option v-for="opt in (v.options || [])" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <textarea
                    v-else-if="v.type === 'paragraph'"
                    v-model="variableValues[v.key]"
                    class="sc-var-input"
                    rows="2"
                    :placeholder="v.placeholder || (v.defaultValue ? `默认：${v.defaultValue}` : `请输入 ${v.label || v.key}`)"
                  ></textarea>
                  <input
                    v-else
                    v-model="variableValues[v.key]"
                    :type="v.type === 'number' ? 'number' : 'text'"
                    class="sc-var-input"
                    :placeholder="v.placeholder || (v.defaultValue ? `默认：${v.defaultValue}` : `请输入 ${v.label || v.key}`)"
                  >
                </div>
              </div>
            </div>
          </div>

          <div ref="scrollRef" class="sc-messages">
            <div v-if="!messages.length" class="sc-welcome">
              <div class="sc-welcome-icon"><i class="fa-regular fa-comments"></i></div>
              <p class="sc-welcome-text">{{ renderedWelcome || '你好，有什么可以帮你？' }}</p>
              <div v-if="examples.length" class="sc-examples">
                <button v-for="q in examples" :key="q" type="button" class="sc-example" :disabled="sending" @click="send(q)">{{ q }}</button>
              </div>
            </div>
            <div v-for="(m, i) in messages" :key="i" class="sc-row" :class="m.role === 'user' ? 'sc-row-user' : 'sc-row-bot'">
              <div v-if="m.role === 'user'" class="sc-bubble sc-bubble-user">{{ m.content }}</div>
              <div v-else class="sc-bubble sc-bubble-bot">
                <div v-if="m.html" class="sc-md" v-html="m.html"></div>
                <span v-else-if="m.pending" class="sc-typing"><i></i><i></i><i></i></span>
                <FaqMediaGallery
                  v-if="(m.images && m.images.length) || (m.videos && m.videos.length)"
                  :images="m.images"
                  :videos="m.videos"
                />
                <div v-if="m.notice" class="sc-msg-notice">{{ m.notice }}</div>
              </div>
            </div>
          </div>

          <div class="sc-composer">
            <p v-if="inlineError" class="sc-error sc-inline-error">{{ inlineError }}</p>
            <form class="sc-input-row" @submit.prevent="send()">
              <textarea
                ref="inputRef"
                v-model="input"
                class="sc-input"
                rows="1"
                maxlength="4000"
                placeholder="输入问题，回车发送"
                @keydown.enter.exact.prevent="send()"
                @input="autoGrow"
              ></textarea>
              <button v-if="sending" type="button" class="sc-send sc-stop" title="停止生成" @click="stop">
                <i class="fa-solid fa-stop"></i>
              </button>
              <button v-else type="submit" class="sc-send" :disabled="!input.trim()" title="发送">
                <i class="fa-solid fa-arrow-up"></i>
              </button>
            </form>
            <p v-if="showRecordNotice" class="sc-footnote">对话内容会被记录，用于改进服务。回答由 AI 生成，仅供参考。</p>
            <p v-else class="sc-footnote">回答由 AI 生成，仅供参考。</p>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { shareApi, shareStore } from '../api/share'
import { renderMarkdown } from '../utils/markdown'
import FaqMediaGallery from '../components/FaqMediaGallery.vue'

const route = useRoute()
const code = String(route.params.code || '')

const stage = ref('loading') // loading | invalid | code | chat
const title = ref('')
const accessMode = ref('ACCESS_CODE')
const accessCode = ref('')
const codeError = ref('')
const submitting = ref(false)
const codeInputRef = ref(null)

const token = ref('')
const welcome = ref('')
const examples = ref([])
const variables = ref([])
const variableValues = reactive({})
const varsOpen = ref(false)
const showRecordNotice = ref(true)

const missingRequiredVars = computed(() =>
  variables.value.filter(v => {
    if (!v.required) return false
    const val = String(variableValues[v.key] ?? '').trim()
    const def = String(v.defaultValue ?? '').trim()
    return !val && !def
  })
)

const filledVarSummary = computed(() => {
  const parts = []
  for (const v of variables.value) {
    const val = String(variableValues[v.key] ?? '').trim() || String(v.defaultValue ?? '').trim()
    if (val) parts.push(`${v.label || v.key}=${val}`)
  }
  return parts.join(' · ')
})

const renderedWelcome = computed(() => {
  const text = welcome.value || ''
  if (!text || !variables.value.length) return text
  return text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (match, key) => {
    const def = variables.value.find(v => v.key === key)
    if (!def) return match
    const val = String(variableValues[key] ?? '').trim() || String(def.defaultValue ?? '').trim()
    return val || match
  })
})

function buildInputsPayload() {
  if (!variables.value.length) return undefined
  const out = {}
  variables.value.forEach(v => {
    const val = variableValues[v.key]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      out[v.key] = String(val).trim()
    }
  })
  return out
}
const history = ref([])
const historyOpen = ref(false)
const conversationId = ref('')
const messages = ref([])
const input = ref('')
const inputRef = ref(null)
const scrollRef = ref(null)
const sending = ref(false)
const inlineError = ref('')
let controller = null

function setPageTitle(text) {
  document.title = text || '智能助手'
}

async function init() {
  const entry = await shareApi.entry(code)
  if (!entry.success) {
    stage.value = 'invalid'
    setPageTitle('链接已失效')
    return
  }
  title.value = entry.data.title || '智能助手'
  accessMode.value = entry.data.accessMode
  setPageTitle(title.value)
  const saved = shareStore.token(code)
  if (saved && await enter(saved)) return
  await authenticate()
}

/** 用已有令牌进入聊天；令牌失效时返回 false */
async function enter(t) {
  const res = await shareApi.config(code, t)
  if (!res.success) {
    if (res.code === 'link_invalid') {
      stage.value = 'invalid'
      return true
    }
    shareStore.clearToken(code)
    return false
  }
  token.value = t
  title.value = res.data.title || title.value
  welcome.value = res.data.welcomeMessage || ''
  examples.value = res.data.exampleQuestions || []
  variables.value = Array.isArray(res.data.variables) ? res.data.variables : []
  Object.keys(variableValues).forEach(k => delete variableValues[k])
  variables.value.forEach(v => {
    if (v?.key) variableValues[v.key] = v.defaultValue ?? ''
  })
  varsOpen.value = missingRequiredVars.value.length > 0
  showRecordNotice.value = res.data.showRecordNotice !== false
  setPageTitle(title.value)
  stage.value = 'chat'
  loadHistory()
  await nextTick()
  inputRef.value?.focus()
  return true
}

/** 公开链接直接换令牌；访问码链接显示输入框 */
async function authenticate() {
  if (accessMode.value === 'PUBLIC') {
    const res = await shareApi.session(code, shareStore.visitorId(code), null)
    if (res.success) {
      shareStore.save(code, res.data)
      if (await enter(res.data.token)) return
    }
    stage.value = 'invalid'
    return
  }
  stage.value = 'code'
  await nextTick()
  codeInputRef.value?.focus()
}

async function submitCode() {
  if (!accessCode.value.trim() || submitting.value) return
  submitting.value = true
  codeError.value = ''
  try {
    const res = await shareApi.session(code, shareStore.visitorId(code), accessCode.value.trim())
    if (!res.success) {
      if (res.code === 'link_invalid') { stage.value = 'invalid'; return }
      codeError.value = res.message || '访问码不正确'
      return
    }
    shareStore.save(code, res.data)
    accessCode.value = ''
    if (!(await enter(res.data.token))) codeError.value = '进入失败，请重试'
  } finally {
    submitting.value = false
  }
}

async function loadHistory() {
  const res = await shareApi.conversations(code, token.value)
  if (res.success) history.value = res.data || []
}

async function openConversation(c) {
  historyOpen.value = false
  if (c.id === conversationId.value) return
  const res = await shareApi.messages(code, token.value, c.id)
  if (!res.success) { await handleFailure(res); return }
  conversationId.value = c.id
  messages.value = (res.data || []).map(m => m.role === 'user'
    ? { role: 'user', content: m.content }
    : { role: 'assistant', html: renderMarkdown(m.content || '') })
  inlineError.value = ''
  scrollToBottom()
}

function newConversation() {
  historyOpen.value = false
  conversationId.value = ''
  messages.value = []
  inlineError.value = ''
  inputRef.value?.focus()
}

function toggleHistory() {
  historyOpen.value = !historyOpen.value
  if (historyOpen.value) loadHistory()
}

/** 统一处理拒绝：链接失效、需要重新进入、其他原因显示在输入框上方 */
async function handleFailure(res) {
  if (res.code === 'link_invalid') {
    stage.value = 'invalid'
    setPageTitle('链接已失效')
    return
  }
  if (res.code === 'session_expired') {
    shareStore.clearToken(code)
    token.value = ''
    inlineError.value = ''
    await authenticate()
    return
  }
  inlineError.value = res.message || '发送失败，请重试'
}

async function send(text) {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return
  if (missingRequiredVars.value.length) {
    varsOpen.value = true
    const first = missingRequiredVars.value[0]
    inlineError.value = `请先填写必填项「${first.label || first.key}」`
    return
  }
  inlineError.value = ''
  input.value = ''
  autoGrow()
  messages.value.push({ role: 'user', content })
  const reply = { role: 'assistant', html: '', pending: true, notice: '', images: [], videos: [] }
  messages.value.push(reply)
  const replyIndex = messages.value.length - 1
  sending.value = true
  scrollToBottom()

  let answer = ''
  let ended = false
  let streamError = ''
  controller = new AbortController()
  const res = await shareApi.send(code, token.value, content, conversationId.value, {
    signal: controller.signal,
    inputs: buildInputsPayload(),
    onEvent: (event, data) => {
      const msg = messages.value[replyIndex]
      if (event === 'message') {
        answer += data?.answer || ''
        msg.pending = false
        msg.html = renderMarkdown(answer)
        scrollToBottom()
      } else if (event === 'message_end') {
        ended = true
        if (data?.conversation_id) conversationId.value = data.conversation_id
        if (Array.isArray(data?.images)) msg.images = data.images
        if (Array.isArray(data?.videos)) msg.videos = data.videos
      } else if (event === 'guardrail') {
        msg.notice = data?.message || '回答中包含不合适的内容，已停止输出'
      } else if (event === 'error') {
        streamError = data?.message || '回答失败，请重试'
      }
    }
  })
  controller = null
  sending.value = false
  const msg = messages.value[replyIndex]
  msg.pending = false

  if (res.aborted) {
    if (!answer) messages.value.splice(replyIndex, 1)
    else msg.notice = '已停止生成'
  } else if (!res.success) {
    messages.value.splice(replyIndex, 1)
    if (res.code !== 'session_expired' && res.code !== 'link_invalid') {
      messages.value.splice(replyIndex - 1, 1)
      input.value = content
    }
    await handleFailure(res)
  } else if (streamError && !answer) {
    msg.html = ''
    msg.notice = streamError
  } else if (!ended && !msg.notice) {
    msg.notice = answer ? '连接中断，回答可能不完整' : '没有收到回答，请重试'
  }
  if (ended) loadHistory()
  scrollToBottom()
  nextTick(() => inputRef.value?.focus())
}

function stop() {
  controller?.abort()
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}

function autoGrow() {
  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  })
}

// 访客页固定用浅色主题（访客多半没用过平台，也不该受平台用户的主题设置影响）；离开时恢复
let previousTheme = null
onMounted(() => {
  previousTheme = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', 'light')
  init()
})
onUnmounted(() => {
  controller?.abort()
  if (previousTheme) document.documentElement.setAttribute('data-theme', previousTheme)
})
</script>

<style scoped>
.sc-page {
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}
.sc-center { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
.sc-spinner { font-size: 28px; color: var(--accent-blue); }
.sc-card {
  width: 100%; max-width: 380px; padding: 32px 28px; box-sizing: border-box;
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}
.sc-state-card { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.sc-state-icon {
  width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 22px;
  color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); border-radius: 50%;
}
.sc-icon-off { color: var(--text-muted); background: var(--bg-input); }
.sc-state-title { margin: 4px 0 0; font-size: 19px; font-weight: 700; word-break: break-word; }
.sc-state-text { margin: 0; font-size: 14px; color: var(--text-secondary); }
.sc-code-input {
  width: 100%; box-sizing: border-box; margin-top: 8px; padding: 12px 14px; text-align: center;
  font: inherit; font-size: 20px; letter-spacing: 4px; color: var(--text-primary);
  background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px;
}
.sc-code-input:focus { outline: none; border-color: var(--accent-blue); }
.sc-code-error { border-color: var(--accent-rose); }
.sc-error { margin: 0; font-size: 13px; color: var(--accent-rose); }
.sc-btn-primary {
  width: 100%; margin-top: 6px; padding: 11px; font: inherit; font-size: 15px; font-weight: 600; color: #fff;
  background: var(--accent-blue); border: none; border-radius: 10px; cursor: pointer;
}
.sc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.sc-chat { height: 100%; display: flex; flex-direction: column; }
.sc-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 12px;
  background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);
}
.sc-title { flex: 1; margin: 0; font-size: 16px; font-weight: 700; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-icon-btn {
  width: 36px; height: 36px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  font-size: 15px; color: var(--text-secondary); background: transparent; border: none; border-radius: 8px; cursor: pointer;
}
.sc-icon-btn:hover:not(:disabled) { background: var(--bg-input); color: var(--text-primary); }
.sc-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sc-body { flex: 1; min-height: 0; display: flex; position: relative; }

.sc-history {
  width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; padding: 10px;
  overflow-y: auto; background: var(--bg-secondary); border-right: 1px solid var(--border-color); box-sizing: border-box;
}
.sc-history-head { display: none; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; padding: 0 2px 6px; }
.sc-history-btn { visibility: hidden; }
.sc-new-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; padding: 8px;
  font: inherit; font-size: 13px; color: var(--accent-blue); background: rgba(59, 130, 246, 0.08);
  border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 8px; cursor: pointer;
}
.sc-history-empty { padding: 12px 4px; font-size: 12px; color: var(--text-muted); }
.sc-history-item {
  padding: 8px 10px; text-align: left; font: inherit; font-size: 13px; color: var(--text-secondary);
  background: transparent; border: none; border-radius: 8px; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sc-history-item:hover:not(:disabled) { background: var(--bg-input); }
.sc-history-item.active { color: var(--text-primary); font-weight: 600; background: rgba(59, 130, 246, 0.1); }
.sc-history-mask { display: none; }

.sc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sc-vars-wrap { flex-shrink: 0; padding: 10px 16px 0; }
.sc-vars-card {
  max-width: 760px; margin: 0 auto; border: 1px solid var(--border-color); border-radius: 12px;
  background: var(--bg-card); overflow: hidden;
}
.sc-vars-card.warn { border-color: rgba(245, 158, 11, 0.55); }
.sc-vars-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 14px; background: var(--bg-input); cursor: pointer; user-select: none;
}
.sc-vars-title { display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.sc-vars-title > i { color: var(--accent-blue); }
.sc-vars-warn { padding: 1px 7px; border-radius: 999px; font-size: 11px; color: #d97706; background: rgba(245, 158, 11, 0.14); white-space: nowrap; }
.sc-vars-summary { font-size: 12px; font-weight: 400; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-vars-chevron { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.sc-vars-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px;
  padding: 12px 14px; border-top: 1px solid var(--border-color);
}
.sc-var-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sc-var-field.full { grid-column: 1 / -1; }
.sc-var-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.sc-var-req { color: var(--accent-rose); margin-left: 2px; }
.sc-var-input {
  width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px;
  border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);
  font: inherit; font-size: 13px; outline: none;
}
.sc-var-input:focus { border-color: var(--accent-blue); }
.sc-messages { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 14px; }
.sc-messages > * { width: 100%; max-width: 760px; margin-left: auto; margin-right: auto; box-sizing: border-box; }
.sc-welcome { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 8vh; text-align: center; }
.sc-welcome-icon {
  width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 22px;
  color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); border-radius: 50%;
}
.sc-welcome-text { margin: 0; font-size: 15px; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; }
.sc-examples { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; }
.sc-example {
  padding: 8px 14px; font: inherit; font-size: 13px; color: var(--text-primary); background: var(--bg-card);
  border: 1px solid var(--border-color); border-radius: 999px; cursor: pointer; text-align: left;
}
.sc-example:hover:not(:disabled) { border-color: var(--accent-blue); color: var(--accent-blue); }
.sc-row { display: flex; }
.sc-row-user { justify-content: flex-end; }
.sc-bubble { max-width: 85%; padding: 10px 14px; font-size: 14px; line-height: 1.7; border-radius: 14px; word-break: break-word; }
.sc-bubble-user { color: #fff; background: var(--accent-blue); border-bottom-right-radius: 4px; white-space: pre-wrap; }
.sc-bubble-bot { background: var(--bg-card); border: 1px solid var(--border-color); border-bottom-left-radius: 4px; }
.sc-md :deep(p) { margin: 0 0 8px; }
.sc-md :deep(p:last-child) { margin-bottom: 0; }
.sc-md :deep(ul), .sc-md :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.sc-md :deep(pre) { overflow-x: auto; padding: 10px; background: var(--bg-input); border-radius: 8px; font-size: 13px; }
.sc-md :deep(code) { font-family: ui-monospace, Consolas, monospace; font-size: 13px; }
.sc-md :deep(table) { border-collapse: collapse; display: block; overflow-x: auto; }
.sc-md :deep(th), .sc-md :deep(td) { border: 1px solid var(--border-color); padding: 4px 8px; }
.sc-md :deep(img) { max-width: 100%; }
.sc-msg-notice { margin-top: 6px; font-size: 12px; color: var(--accent-amber); }
.sc-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
.sc-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); animation: sc-blink 1.2s infinite ease-in-out; }
.sc-typing i:nth-child(2) { animation-delay: 0.2s; }
.sc-typing i:nth-child(3) { animation-delay: 0.4s; }
@keyframes sc-blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

.sc-composer {
  flex-shrink: 0; padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: var(--bg-primary); border-top: 1px solid var(--border-color);
}
.sc-composer > * { max-width: 760px; margin-left: auto; margin-right: auto; }
.sc-inline-error { margin-bottom: 6px; }
.sc-input-row {
  display: flex; align-items: flex-end; gap: 8px; padding: 6px 6px 6px 14px;
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;
}
.sc-input-row:focus-within { border-color: var(--accent-blue); }
.sc-input {
  flex: 1; min-height: 24px; max-height: 160px; padding: 7px 0; resize: none; font: inherit; font-size: 15px; line-height: 1.5;
  color: var(--text-primary); background: transparent; border: none; outline: none;
}
.sc-send {
  width: 38px; height: 38px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  font-size: 15px; color: #fff; background: var(--accent-blue); border: none; border-radius: 50%; cursor: pointer;
}
.sc-send:disabled { opacity: 0.35; cursor: not-allowed; }
.sc-stop { background: var(--text-secondary); }
.sc-footnote { margin: 6px auto 0; font-size: 11px; color: var(--text-muted); text-align: center; }

@media (max-width: 768px) {
  .sc-history-btn { visibility: visible; }
  .sc-history {
    position: absolute; top: 0; bottom: 0; left: 0; z-index: 20; width: 78%; max-width: 300px;
    transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }
  .sc-history.open { transform: translateX(0); }
  .sc-history-head { display: flex; }
  .sc-history-mask { display: block; position: absolute; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.3); }
  .sc-messages { padding: 14px 12px; }
  .sc-vars-wrap { padding: 8px 12px 0; }
  .sc-vars-grid { grid-template-columns: 1fr; }
  .sc-bubble { max-width: 90%; }
  .sc-composer { padding-left: 10px; padding-right: 10px; }
}
</style>
