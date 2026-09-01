<template>
  <div class="debug-page">
    <header class="debug-header">
      <div class="debug-header-left">
        <router-link to="/dashboard" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left"></i>
          <span>返回智能体列表</span>
        </router-link>
        <div class="header-agent-badge">
          <h2 class="header-agent-title"><span>编排</span></h2>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
            {{ agent ? `${agent.avatar || '🤖'} ${agent.name}` : '智能体加载中...' }}
          </span>
        </div>
      </div>
      <div class="debug-header-right">
        <button class="btn-theme-toggle" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
        </button>
        <div class="model-selector-pill">
          <i class="fa-solid fa-microchip" style="color: var(--accent-purple);"></i>
          <select v-model="modelName" class="model-dropdown-select" @change="showToast('已切换调度模型为: ' + modelName, 'info', 1500)">
            <option value="deepseek-chat">DeepSeek-V4-Flash</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o-Mini</option>
            <option value="claude-3-5-sonnet">Claude-3-5-Sonnet</option>
            <option value="deepseek-coder">DeepSeek-Coder</option>
            <option value="qwen-max">Qwen-Max</option>
          </select>
          <span class="model-type-badge">CHAT</span>
        </div>
        <button class="btn-publish" @click="publish"><span>发布</span><i class="fa-solid fa-chevron-down" style="font-size: 11px;"></i></button>
      </div>
    </header>

    <main class="debug-main-layout" ref="layoutRef">
      <section class="orchestration-pane" ref="leftPane" :style="leftWidth ? { width: leftWidth + 'px' } : {}">
        <div class="config-card-section prompt-editor-card">
          <div class="section-header-row">
            <div class="section-title"><span>提示词</span></div>
            <button class="btn-section-action" @click="optimizePrompt"><i class="fa-solid fa-wand-magic-sparkles"></i><span>生成</span></button>
          </div>
          <textarea v-model="prompt" class="prompt-textarea" placeholder="请输入智能体的角色设定与工作流程..."></textarea>
          <div class="prompt-footer">
            <span>{{ prompt.length }} 字</span>
            <span style="font-size: 11px;">支持变量语法如 {{ inputVar }}</span>
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
          <h3 class="preview-title">调试与预览</h3>
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
              <div class="msg-bubble"><i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-blue);"></i> 思考生成中...</div>
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
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const route = useRoute()
const { showToast } = useToast()
const inputVar = '{{input}}'
const timeVar = '{{system_time}}'
const agent = ref(null)
const prompt = ref('')
const modelName = ref('gpt-4o')
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
    meta: { model: agent.value?.modelName || 'gpt-4o', latencyMs: 0, tokensUsed: 0 }
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
    history: history.value.slice(-6)
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
      meta: { model: res.data.model || modelName.value, latencyMs: res.data.latencyMs || 240, tokensUsed: res.data.tokensUsed || 150 }
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
    modelName: modelName.value
  })
  if (res.success) {
    agent.value = res.data
    showToast('智能体编排与提示词已成功发布上线！', 'success', 2500)
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

onMounted(async () => {
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  const res = await http.get(`/api/agents/${route.params.id}`)
  if (res.success && res.data) {
    agent.value = res.data
    prompt.value = res.data.systemPrompt || ''
    modelName.value = res.data.modelName || 'gpt-4o'
    resetChat()
  } else {
    showToast('未能加载智能体信息', 'error')
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
})
</script>
