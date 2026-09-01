<template>
  <div class="debug-page">
    <header class="debug-header">
      <div class="debug-header-left">
        <router-link to="/dashboard?tab=agents" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left"></i>
          <span>返回智能体列表</span>
        </router-link>
        <div class="header-agent-badge">
          <h2 class="header-agent-title">
            <span>编排</span>
            <span class="header-tag-pill" :class="promptDirty ? 'draft' : 'published'">
              {{ promptDirty ? '未发布' : '已发布' }}
            </span>
          </h2>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
            {{ agent ? `${agent.avatar || '🤖'} ${agent.name}` : '智能体加载中...' }}
          </span>
        </div>
      </div>
      <div class="debug-header-right">
        <button class="btn-theme-toggle" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
        </button>
        <router-link
          to="/dashboard?tab=gateway"
          class="model-selector-pill"
          title="模型已在网关页选定，点击前往修改"
        >
          <i class="fa-solid fa-microchip" style="color: var(--accent-purple);"></i>
          <span class="model-current-name">{{ routedLabel }}</span>
          <span class="model-type-badge">CHAT</span>
        </router-link>
        <div class="model-settings-wrap" ref="settingsWrap">
          <button class="btn-model-settings" type="button" title="模型设置" @click="toggleSettings">
            <i class="fa-solid fa-sliders"></i>
          </button>
          <div v-if="settingsOpen" class="model-settings-panel">
            <div class="ms-header">
              <span>模型设置</span>
              <div class="ms-header-actions">
                <button type="button" class="ms-save" @click="saveModelSettings">保存</button>
                <button type="button" class="ms-close" @click="discardAndClose">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div class="ms-body">
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.temperature.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">温度 <i class="fa-regular fa-circle-question" title="越高输出越随机，越低越稳定"></i></div>
                <input v-model.number="settings.temperature.value" class="ms-range" type="range" min="0" max="2" step="0.01">
                <input v-model.number="settings.temperature.value" class="ms-num" type="number" min="0" max="2" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.maxTokens.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">最大标记 <i class="fa-regular fa-circle-question" title="单次回复最多生成的 token 数"></i></div>
                <input v-model.number="settings.maxTokens.value" class="ms-range" type="range" min="1" max="16384" step="1">
                <input v-model.number="settings.maxTokens.value" class="ms-num" type="number" min="1" max="32768" step="1">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.topP.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">Top P <i class="fa-regular fa-circle-question" title="核采样阈值，越小候选词越少"></i></div>
                <input v-model.number="settings.topP.value" class="ms-range" type="range" min="0" max="1" step="0.01">
                <input v-model.number="settings.topP.value" class="ms-num" type="number" min="0" max="1" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.n.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">取样数量 <i class="fa-regular fa-circle-question" title="一次请求返回的候选回复数"></i></div>
                <span class="ms-spacer"></span>
                <input v-model.number="settings.n.value" class="ms-num" type="number" min="0" max="8" step="1">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.frequencyPenalty.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">频率惩罚 <i class="fa-regular fa-circle-question" title="降低重复用词的概率"></i></div>
                <input v-model.number="settings.frequencyPenalty.value" class="ms-range" type="range" min="0" max="2" step="0.01">
                <input v-model.number="settings.frequencyPenalty.value" class="ms-num" type="number" min="0" max="2" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.responseFormat.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">回复格式 <i class="fa-regular fa-circle-question" title="约束模型输出为普通文本或 JSON"></i></div>
                <select v-model="settings.responseFormat.value" class="ms-select">
                  <option value="text">文本</option>
                  <option value="json_object">JSON</option>
                </select>
              </div>
              <div class="ms-row ms-row-choice">
                <label class="switch ms-switch">
                  <input v-model="settings.webSearch.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">联网搜索 <i class="fa-regular fa-circle-question" title="打开后允许模型检索网络（需供应商支持）"></i></div>
                <span class="ms-flag">{{ settings.webSearch.enabled ? '已开启' : '已关闭' }}</span>
              </div>
              <div class="ms-row ms-row-choice">
                <label class="switch ms-switch">
                  <input v-model="settings.thinking.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">思考模式 <i class="fa-regular fa-circle-question" title="DeepSeek V4 默认会思考。关闭后会显式关掉思考，只返回最终答案。"></i></div>
                <span class="ms-flag">{{ settings.thinking.enabled ? '已开启' : '已关闭' }}</span>
              </div>
              <div class="ms-row ms-row-headers">
                <label class="switch ms-switch">
                  <input v-model="settings.extraHeaders.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <input v-model="settings.extraHeaders.value" class="ms-text" type="text" placeholder="额外请求头, Json字符串格式">
              </div>
            </div>
            <div class="ms-footer">
              <button type="button" class="ms-cancel" @click="discardAndClose">取消</button>
              <button type="button" class="ms-save" @click="saveModelSettings">保存</button>
            </div>
          </div>
        </div>
        <button
          class="btn-publish"
          :disabled="!agent || !promptDirty"
          :title="promptDirty ? '将当前草稿发布为线上系统提示词' : '没有未发布的更改'"
          @click="publish"
        >
          <span>发布上线</span>
        </button>
      </div>
    </header>

    <main class="debug-main-layout" ref="layoutRef">
      <section class="orchestration-pane" ref="leftPane" :style="leftWidth ? { width: leftWidth + 'px' } : {}">
        <div class="config-card-section prompt-editor-card">
          <div class="section-header-row">
            <div class="section-title"><span>系统提示词（草稿）</span></div>
            <button class="btn-section-action" @click="optimizePrompt"><i class="fa-solid fa-wand-magic-sparkles"></i><span>生成</span></button>
          </div>
          <textarea v-model="prompt" class="prompt-textarea" placeholder="请输入智能体的角色设定与工作流程..."></textarea>
          <div class="prompt-footer">
            <span>{{ prompt.length }} 字</span>
            <span style="font-size: 11px;">右侧调试用这份草稿；点「发布上线」后才成为线上系统提示词</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row"><div class="section-title"><span>变量</span></div></div>
          <p class="section-hint">变量能使用户输入表单引入提示词或开场白</p>
          <div class="var-tag-list">
            <span class="var-chip"><i class="fa-solid fa-code" style="color: var(--accent-blue);"></i> {{ inputVar }} (用户输入)</span>
            <span class="var-chip"><i class="fa-solid fa-clock" style="color: var(--accent-amber);"></i> {{ timeVar }}</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row"><div class="section-title"><span>知识库</span></div></div>
          <div class="knowledge-item-card">
            <div class="knowledge-meta"><i class="fa-solid fa-book" style="color: #ec4899;"></i><span>ShiMeta数字标牌V7.0.0使用手册.pdf</span></div>
            <span class="knowledge-badge">高质量 · 混合检索</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row"><div class="section-title"><span>工具</span></div></div>
          <div class="tools-grid">
            <div v-for="tool in tools" :key="tool.name" class="tool-item-card">
              <div class="tool-left">
                <div class="tool-icon" :class="tool.iconClass"><i :class="tool.icon"></i></div>
                <span>{{ tool.label }}</span>
              </div>
              <label class="switch">
                <input v-model="tool.enabled" type="checkbox" @change="showToast(`工具 [${tool.name}] 已${tool.enabled ? '启用' : '禁用'}`, 'info', 1500)">
                <span class="slider-toggle"></span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <div class="resize-divider" @mousedown.prevent="startDrag"></div>

      <section class="preview-pane">
        <div class="preview-header">
          <div>
            <h3 class="preview-title">调试预览</h3>
            <p class="preview-hint">{{ promptDirty ? '正在使用未发布的草稿提示词' : '正在使用已发布的系统提示词' }}</p>
          </div>
          <button class="btn-icon-round" @click="resetChat"><i class="fa-solid fa-rotate-right"></i></button>
        </div>
        <div class="chat-history-scroll" ref="streamRef">
          <div v-for="(msg, i) in messages" :key="i" class="chat-msg-row" :class="msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'">
            <div class="msg-avatar" :class="msg.role === 'user' ? 'msg-avatar-user' : 'msg-avatar-bot'">
              <i v-if="msg.role === 'user'" class="fa-regular fa-user"></i>
              <template v-else>{{ agent?.avatar || '🤖' }}</template>
            </div>
            <div class="msg-content-wrapper">
              <div v-if="msg.tool" class="msg-tool-chip"><i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> 工具调用: {{ msg.tool }}</div>
              <div class="msg-bubble" v-html="msg.html"></div>
              <div v-if="msg.meta" class="msg-meta-info">
                <span><i class="fa-solid fa-microchip"></i> {{ msg.meta.model }}</span>
                <span><i class="fa-regular fa-clock"></i> {{ msg.meta.latencyMs }}ms</span>
                <span><i class="fa-solid fa-ticket"></i> {{ msg.meta.tokensUsed }} Tokens</span>
              </div>
            </div>
          </div>
          <div v-if="sending" class="chat-msg-row chat-msg-bot">
            <div class="msg-avatar msg-avatar-bot">{{ agent?.avatar || '🤖' }}</div>
            <div class="msg-content-wrapper">
              <div class="msg-bubble"><i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-blue);"></i> {{ appliedSettings.thinking.enabled ? '思考中...' : '生成中...' }}</div>
            </div>
          </div>
        </div>
        <div class="preview-input-container">
          <div class="preset-pills-row">
            <span class="preset-chip" @click="sendQuick('请介绍你的核心人设与工作流程')">介绍工作流程</span>
            <span class="preset-chip" @click="sendQuick('现在系统时间是几点？星期几？')">查询当前时间</span>
            <span class="preset-chip" @click="sendQuick('帮我写一个 Spring AI 2.0.1 动态提示词编排代码')">生成 Spring AI 代码</span>
          </div>
          <form class="input-bar-wrapper" @submit.prevent="sendChat">
            <input v-model="inputText" class="main-chat-input" placeholder="和 Bot 聊天" autocomplete="off">
            <button type="submit" class="btn-input-send" :disabled="sending"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
          <div class="bottom-statusbar">
            <div class="status-left-tag"><i class="fa-solid fa-quote-left"></i><span style="color: var(--text-secondary);">功能已开启</span></div>
            <div class="speed-meter-pill"><span>{{ speedText }}</span></div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const route = useRoute()
const { showToast } = useToast()
const inputVar = '{{input}}'
const timeVar = '{{system_time}}'
const agent = ref(null)
const prompt = ref('')
const publishedPrompt = ref('')
const promptDirty = computed(() => prompt.value !== publishedPrompt.value)
const routedChannel = ref('')
const routedModel = ref('')
const routedLabel = computed(() => {
  if (routedChannel.value && routedModel.value) {
    return `${routedChannel.value} · ${routedModel.value}`
  }
  if (routedChannel.value) return routedChannel.value
  if (routedModel.value) return routedModel.value
  return '未配置网关'
})
const inputText = ref('')
const sending = ref(false)
const messages = ref([])
const history = ref([])
const speedText = ref('↑ 0 K/s  ↓ 2 K/s')
const theme = ref(localStorage.getItem('theme') || 'dark')
const leftWidth = ref(Number(localStorage.getItem('debugPaneWidth') || 0) || null)
const layoutRef = ref(null)
const leftPane = ref(null)
const streamRef = ref(null)
const settingsWrap = ref(null)
const settingsOpen = ref(false)
const settings = reactive(createDefaultSettings())
const appliedSettings = reactive(createDefaultSettings())
const drag = reactive({ active: false, startX: 0, startWidth: 0 })

const tools = reactive([
  { name: '时区转换', label: 'time 时区转换', icon: 'fa-solid fa-clock', iconClass: 'icon-orange', enabled: true },
  { name: '时间戳转换', label: 'time 时间戳转换', icon: 'fa-solid fa-clock', iconClass: 'icon-orange', enabled: true },
  { name: '获取当前时间', label: 'time 获取当前时间', icon: 'fa-solid fa-clock', iconClass: 'icon-orange', enabled: true },
  { name: '获取时间戳', label: 'time 获取时间戳', icon: 'fa-solid fa-clock', iconClass: 'icon-orange', enabled: true },
  { name: '星期几计算器', label: 'time 星期几计算器', icon: 'fa-solid fa-calendar-days', iconClass: 'icon-orange', enabled: true },
  { name: '联网检索', label: 'bocha Bocha Web Search', icon: 'fa-solid fa-globe', iconClass: 'icon-blue-tool', enabled: true }
])

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatHtml(content, isUser) {
  let html = escapeHtml(content)
  if (isUser) return html
  return html
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<pre style="background: var(--bg-primary); padding: 10px; border-radius: 8px; margin: 8px 0; overflow-x: auto; font-family: monospace; font-size: 12px;"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background: var(--bg-primary); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/### ([^\n]+)/g, '<h4 style="color: var(--accent-blue); margin: 6px 0;">$1</h4>')
    .replace(/\n/g, '<br>')
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

function resetChat() {
  history.value = []
  messages.value = [{
    role: 'assistant',
    html: `你好！我是 <strong>${escapeHtml(agent.value?.name)}</strong>。<br>我已就绪，当前挂载了 <strong>Spring AI 2.0.1 ChatClient</strong>。`,
    meta: { model: routedModel.value || agent.value?.modelName || '未配置', latencyMs: 0, tokensUsed: 0 }
  }]
}

function sendQuick(text) {
  inputText.value = text
  sendChat()
}

async function sendChat() {
  if (!agent.value || !inputText.value.trim() || sending.value) return
  const text = inputText.value.trim()
  inputText.value = ''
  messages.value.push({ role: 'user', html: escapeHtml(text) })
  history.value.push({ role: 'user', content: text })
  sending.value = true
  await nextTick()
  if (streamRef.value) streamRef.value.scrollTop = streamRef.value.scrollHeight

  let tool = null
  if (text.includes('时间') || text.includes('几点') || text.includes('星期') || text.includes('时区')) {
    tool = 'time.get_current_time (获取当前系统时间与星期)'
  } else if (text.includes('搜索') || text.includes('联网') || text.includes('最新')) {
    tool = 'bocha.web_search (联网深度检索)'
  }

  const res = await http.post(`/api/agents/${agent.value.id}/messages`, {
    message: text,
    prompt: prompt.value,
    history: history.value.slice(-6),
    generation: buildGeneration(appliedSettings)
  })
  sending.value = false
  if (res.success && res.data) {
    let reply = res.data.reply
    if (tool && tool.includes('time')) {
      const now = new Date()
      const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} (${days[now.getDay()]})`
      reply = `通过工具 \`time.get_current_time\` 查询完成：\n\n- **当前北京时间**：\`${timeStr}\`\n- **系统时区**：\`Asia/Shanghai (UTC+8)\``
    }
    messages.value.push({
      role: 'assistant',
      html: formatHtml(reply, false),
      tool,
      meta: { model: res.data.model || routedModel.value, latencyMs: res.data.latencyMs || 240, tokensUsed: res.data.tokensUsed || 150 }
    })
    history.value.push({ role: 'assistant', content: reply })
    speedText.value = `↑ 0.1 K/s  ↓ ${(Math.random() * 2.2 + 1.1).toFixed(1)} K/s`
  } else {
    messages.value.push({ role: 'assistant', html: `对话异常: ${res.message || '未知错误'}` })
  }
  await nextTick()
  if (streamRef.value) streamRef.value.scrollTop = streamRef.value.scrollHeight
}

function optimizePrompt() {
  prompt.value = `# 工作流程
1. 收到用户问题后，必须首先检索知识库。
2. 若知识库有匹配内容，直接基于检索结果回答，不添加额外推测。
3. 若知识库无匹配内容，且具备联网条件，开启联网搜索，优先采信权威来源整理回答。
4. 若知识库无匹配内容，且无法联网，则基于自身已有知识进行回答，遇到不确定的内容应明确说明“这一点我不确定”。`
  showToast('提示词已依据 Dify 标准规范结构化生成！', 'success', 2500)
}

async function publish() {
  if (!agent.value) return
  const res = await http.put(`/api/agents/${agent.value.id}`, {
    ...agent.value,
    systemPrompt: prompt.value,
    temperature: Number(appliedSettings.temperature.value),
    topP: Number(appliedSettings.topP.value),
    maxTokens: Number(appliedSettings.maxTokens.value)
  })
  if (res.success) {
    agent.value = res.data
    publishedPrompt.value = prompt.value
    showToast('已发布上线，当前草稿已成为线上系统提示词', 'success', 2500)
  } else {
    showToast(res.message || '发布失败', 'error')
  }
}

function startDrag(e) {
  drag.active = true
  drag.startX = e.clientX
  drag.startWidth = leftPane.value.getBoundingClientRect().width
  document.body.style.cursor = 'col-resize'
}

function onMove(e) {
  if (!drag.active || !layoutRef.value) return
  const total = layoutRef.value.getBoundingClientRect().width
  const min = Math.max(360, total * 0.25)
  const max = Math.min(total - 360, total * 0.75)
  let width = drag.startWidth + (e.clientX - drag.startX)
  width = Math.min(max, Math.max(min, width))
  leftWidth.value = width
}

function onUp() {
  if (!drag.active) return
  drag.active = false
  document.body.style.cursor = ''
  if (leftWidth.value) localStorage.setItem('debugPaneWidth', String(leftWidth.value))
}

function applyGatewayRoute(overview) {
  const providers = overview?.providers || []
  const policy = overview?.policy || {}
  const ready = providers.filter((p) => p.enabled && p.configured)
  const defaultId = policy.defaultProviderId || ''
  const primary = ready.find((p) => p.id === defaultId) || ready[0]
  routedChannel.value = primary?.name || ''
  routedModel.value = primary?.defaultModel || ''
}

function createDefaultSettings() {
  return {
    temperature: { enabled: false, value: 1 },
    maxTokens: { enabled: false, value: 4096 },
    topP: { enabled: false, value: 1 },
    n: { enabled: false, value: 0 },
    frequencyPenalty: { enabled: false, value: 0 },
    responseFormat: { enabled: false, value: 'text' },
    webSearch: { enabled: false },
    thinking: { enabled: false },
    extraHeaders: { enabled: false, value: '' }
  }
}

function copySettings(from, to) {
  Object.keys(to).forEach((key) => {
    if (from[key]) Object.assign(to[key], from[key])
  })
}

function settingsKey(id) {
  return 'debug-model-settings:' + id
}

function applyAgentSettings(data) {
  settings.temperature.value = data.temperature ?? 1
  settings.maxTokens.value = data.maxTokens ?? 4096
  settings.topP.value = data.topP ?? 1
  appliedSettings.temperature.value = settings.temperature.value
  appliedSettings.maxTokens.value = settings.maxTokens.value
  appliedSettings.topP.value = settings.topP.value
}

function loadPersistedSettings(agentId) {
  try {
    const raw = localStorage.getItem(settingsKey(agentId))
    if (!raw) return
    const parsed = JSON.parse(raw)
    copySettings(parsed, appliedSettings)
    copySettings(parsed, settings)
  } catch {
    // ignore broken local cache
  }
}

function buildGeneration(source) {
  const generation = {
    thinking: !!source.thinking.enabled,
    webSearch: !!source.webSearch.enabled
  }
  if (source.temperature.enabled) generation.temperature = Number(source.temperature.value)
  if (source.maxTokens.enabled) generation.maxTokens = Number(source.maxTokens.value)
  if (source.topP.enabled) generation.topP = Number(source.topP.value)
  if (source.n.enabled) generation.n = Number(source.n.value)
  if (source.frequencyPenalty.enabled) generation.frequencyPenalty = Number(source.frequencyPenalty.value)
  if (source.responseFormat.enabled) generation.responseFormat = source.responseFormat.value
  if (source.extraHeaders.enabled) generation.extraHeaders = source.extraHeaders.value
  return generation
}

function toggleSettings() {
  if (settingsOpen.value) {
    discardAndClose()
    return
  }
  copySettings(appliedSettings, settings)
  settingsOpen.value = true
}

function discardAndClose() {
  copySettings(appliedSettings, settings)
  settingsOpen.value = false
}

async function saveModelSettings() {
  copySettings(settings, appliedSettings)
  if (agent.value?.id) {
    localStorage.setItem(settingsKey(agent.value.id), JSON.stringify(appliedSettings))
    await http.put(`/api/agents/${agent.value.id}`, {
      ...agent.value,
      temperature: Number(appliedSettings.temperature.value),
      topP: Number(appliedSettings.topP.value),
      maxTokens: Number(appliedSettings.maxTokens.value)
    })
  }
  settingsOpen.value = false
  showToast(appliedSettings.thinking.enabled ? '模型设置已保存' : '模型设置已保存，已关闭思考模式', 'success', 2200)
}

function onDocClick(e) {
  if (!settingsOpen.value) return
  if (settingsWrap.value && !settingsWrap.value.contains(e.target)) {
    discardAndClose()
  }
}

onMounted(async () => {
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.addEventListener('mousedown', onDocClick)
  const overviewRes = await http.get('/api/model-gateway')
  if (overviewRes.success) applyGatewayRoute(overviewRes.data)
  const res = await http.get(`/api/agents/${route.params.id}`)
  if (res.success && res.data) {
    agent.value = res.data
    prompt.value = res.data.systemPrompt || ''
    publishedPrompt.value = prompt.value
    applyAgentSettings(res.data)
    loadPersistedSettings(res.data.id)
    resetChat()
  } else {
    showToast('未能加载智能体信息', 'error')
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
  document.removeEventListener('mousedown', onDocClick)
})
</script>
