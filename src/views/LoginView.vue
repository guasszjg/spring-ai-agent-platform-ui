<template>
  <div class="login-wrapper">
    <!-- Sci-Fi AI Agent Background Image Layer -->
    <div class="scifi-bg-layer" :style="{ backgroundImage: `url(${bgImage})` }"></div>
    <div class="scifi-vignette"></div>
    <div class="scifi-grid-overlay"></div>

    <!-- Minimalist Sci-Fi Top Bar -->
    <header class="minimal-nav">
      <div class="brand-badge">
        <AgentLogo :size="38" />
        <div class="brand-info">
          <span class="brand-title">AgentMatrix</span>
          <span class="brand-tag">v2.6</span>
        </div>
      </div>
      <div class="nav-actions">
        <div class="status-indicator">
          <span class="pulse-dot"></span>
          <span>系统在线</span>
        </div>
        <button class="theme-btn" :title="theme === 'light' ? '切换为暗黑模式' : '切换为明亮模式'" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
        </button>
      </div>
    </header>

    <!-- Main Viewport (Zero Scrollbar) -->
    <main class="login-main">
      <div class="login-layout-inner">
        <!-- Left: Ultra-Clean Concise Slogan -->
        <div class="hero-left-pane">
          <div class="hero-chip">
            <span class="chip-dot"></span>
            <span>AI AGENT PLATFORM</span>
          </div>
          <h1 class="hero-heading">智能体协同中枢</h1>
          <p class="hero-subtext">连接自主多步推理与企业业务执行</p>
          <div class="hero-meta-pills">
            <span class="meta-pill"><i class="fa-solid fa-robot"></i> 智能体编排</span>
            <span class="meta-pill"><i class="fa-solid fa-microchip"></i> 多模型网关</span>
            <span class="meta-pill"><i class="fa-solid fa-bolt"></i> 工具链调用</span>
          </div>
        </div>

        <!-- Right: Modern Frosted Glass Login Console -->
        <div class="login-card-glass">
          <div class="card-header">
            <h2 class="card-heading">控制台登录</h2>
            <p class="card-hint">请输入企业访问凭据</p>
          </div>

          <!-- Quick Role Selector Pills -->
          <div class="quick-role-row">
            <button
              type="button"
              class="role-pill"
              :class="{ active: currentRole === 'admin' }"
              @click="selectRole('admin', 'admin123')"
            >
              <i class="fa-solid fa-shield-halved"></i>
              <span>管理员</span>
            </button>
            <button
              type="button"
              class="role-pill"
              :class="{ active: currentRole === 'dev' }"
              @click="selectRole('developer', 'dev123456')"
            >
              <i class="fa-solid fa-code"></i>
              <span>开发者</span>
            </button>
          </div>

          <!-- Form -->
          <form class="login-form" @submit.prevent="handleLogin">
            <div class="input-field">
              <i class="fa-regular fa-user field-icon"></i>
              <input
                v-model="username"
                type="text"
                class="text-input"
                placeholder="账号"
                required
                autocomplete="username"
              >
            </div>

            <div class="input-field">
              <i class="fa-solid fa-lock field-icon"></i>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="text-input"
                placeholder="密码"
                required
                autocomplete="current-password"
              >
              <button
                type="button"
                class="btn-eye"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
              </button>
            </div>

            <div class="form-sub-row">
              <label class="check-wrap">
                <input v-model="rememberMe" type="checkbox" class="check-box">
                <span>记住凭据</span>
              </label>
              <a href="javascript:void(0)" class="link-muted" @click="showToast('如需重置密码，请联系管理员', 'info')">
                忘记密码?
              </a>
            </div>

            <button type="submit" class="btn-login-submit" :disabled="submitting">
              <span class="btn-shimmer"></span>
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '验证中...' : '进入工作台' }}</span>
              <i v-if="!submitting" class="fa-solid fa-arrow-right btn-arrow"></i>
            </button>
          </form>

          <div class="card-foot-notice">
            <i class="fa-solid fa-shield-check"></i>
            <span>零信任架构安全保护</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import bgImage from '../assets/login-bg.jpg'
import AgentLogo from '../components/AgentLogo.vue'

const router = useRouter()
const { showToast } = useToast()

const username = ref('admin')
const password = ref('admin123')
const currentRole = ref('admin')
const rememberMe = ref(true)
const showPassword = ref(false)
const submitting = ref(false)
const theme = ref(localStorage.getItem('theme') || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
  showToast(`已切换至 ${theme.value === 'dark' ? '暗黑模式' : '明亮模式'}`, 'info', 1200)
}

function selectRole(user, pass) {
  username.value = user
  password.value = pass
  currentRole.value = user === 'admin' ? 'admin' : 'dev'
  showToast(`已选择【${user === 'admin' ? '管理员' : '开发者'}】身份`, 'info', 1200)
}

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    showToast('请输入账号和密码', 'error')
    return
  }
  submitting.value = true
  try {
    const res = await http.post('/api/auth/login', {
      username: username.value.trim(),
      password: password.value
    })
    if (res && res.success && res.data) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data))
      showToast('登录成功，正在进入控制台...', 'success', 1200)
      setTimeout(() => router.push('/dashboard'), 500)
    } else {
      showToast((res && res.message) || '登录失败，请检查账号密码', 'error')
      submitting.value = false
    }
  } catch (err) {
    showToast('网络或服务异常，请稍后重试', 'error')
    submitting.value = false
  }
}
</script>
