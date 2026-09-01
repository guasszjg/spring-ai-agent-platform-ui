<template>
  <div>
    <div class="ambient-glow glow-left"></div>
    <div class="ambient-glow glow-right"></div>

    <header class="commercial-top-nav">
      <a href="/login" class="nav-brand">
        <div class="brand-icon-square"><i class="fa-solid fa-brain"></i></div>
        <span class="brand-name">AgentMatrix</span>
        <span class="brand-tag">Enterprise v2.6</span>
      </a>
      <div class="nav-right-items">
        <div class="nav-status-indicator">
          <span class="status-dot-pulse"></span>
          <span>集群运行正常 · SLA 99.99%</span>
        </div>
        <button class="btn-theme-toggle" title="切换明亮/暗黑主题" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
        </button>
      </div>
    </header>

    <main class="login-split-container">
      <div class="login-showcase-pane">
        <div class="showcase-badge-pill">
          <i class="fa-solid fa-sparkles"></i>
          <span>企业级智能体统一运营与协同中枢</span>
        </div>
        <h1 class="showcase-title">让每一个核心业务场景<br>拥有专属智能体协作网络</h1>
        <p class="showcase-desc">构建覆盖自主多步推理、全栈工具生态调用与企业私有知识库检索增强的生产级 Agent 调度枢纽，全面释放大模型协同生产力。</p>
        <div class="metrics-row">
          <div class="metric-stat-card">
            <div class="metric-val">18.4M+</div>
            <div class="metric-lbl">日均 Agent 调度调用</div>
          </div>
          <div class="metric-stat-card">
            <div class="metric-val" style="color: var(--accent-emerald);">99.99%</div>
            <div class="metric-lbl">生产环境可用性 SLA</div>
          </div>
          <div class="metric-stat-card">
            <div class="metric-val" style="color: var(--accent-blue);">&lt; 260ms</div>
            <div class="metric-lbl">全链路推理响应耗时</div>
          </div>
        </div>
        <div class="pipeline-flow-card">
          <div class="pipeline-header">
            <div class="pipeline-title">
              <i class="fa-solid fa-diagram-project" style="color: var(--accent-blue);"></i>
              <span>Agent 协同调度架构链路</span>
            </div>
            <span class="pipeline-badge">实时活跃流水线</span>
          </div>
          <div class="pipeline-nodes-track">
            <div class="flow-node">
              <div class="node-icon-box"><i class="fa-solid fa-user-gear"></i></div>
              <span class="node-text">业务指令</span>
            </div>
            <div class="flow-connector"><i class="fa-solid fa-chevron-right"></i></div>
            <div class="flow-node">
              <div class="node-icon-box" style="color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.4);"><i class="fa-solid fa-brain"></i></div>
              <span class="node-text">路由调度中枢</span>
            </div>
            <div class="flow-connector"><i class="fa-solid fa-chevron-right"></i></div>
            <div class="flow-node">
              <div class="node-icon-box" style="color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.4);"><i class="fa-solid fa-bolt"></i></div>
              <span class="node-text">工具插件链</span>
            </div>
            <div class="flow-connector"><i class="fa-solid fa-chevron-right"></i></div>
            <div class="flow-node">
              <div class="node-icon-box" style="color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4);"><i class="fa-solid fa-layer-group"></i></div>
              <span class="node-text">私有知识库</span>
            </div>
            <div class="flow-connector"><i class="fa-solid fa-chevron-right"></i></div>
            <div class="flow-node">
              <div class="node-icon-box" style="color: #06b6d4; border-color: rgba(6, 182, 212, 0.4);"><i class="fa-solid fa-circle-check"></i></div>
              <span class="node-text">确定性决策</span>
            </div>
          </div>
        </div>
        <div class="compliance-trust-bar">
          <span class="trust-item"><i class="fa-solid fa-shield-halved"></i> SOC2 Type II 认证</span>
          <span class="trust-item"><i class="fa-solid fa-lock"></i> 256-bit 端到端传输加密</span>
          <span class="trust-item"><i class="fa-solid fa-building-shield"></i> 多租户物理隔离</span>
          <span class="trust-item"><i class="fa-solid fa-scale-balanced"></i> 内容合规安全护栏</span>
        </div>
      </div>

      <div class="login-form-pane">
        <div class="login-glass-card">
          <div class="login-card-header">
            <h3 class="login-card-title">登录控制台</h3>
            <p class="login-card-subtitle">企业统一身份认证中心 (Enterprise IAM)</p>
          </div>
          <div class="auth-tabs-row">
            <button type="button" class="auth-tab-btn" :class="{ active: authTab === 'password' }" @click="authTab = 'password'">
              <i class="fa-solid fa-key" style="font-size: 11px; margin-right: 4px;"></i> 账号密码认证
            </button>
            <button type="button" class="auth-tab-btn" :class="{ active: authTab === 'sso' }" @click="switchSso">
              <i class="fa-solid fa-building-user" style="font-size: 11px; margin-right: 4px;"></i> 企业 SSO / LDAP
            </button>
          </div>
          <form @submit.prevent="handleLogin">
            <div class="form-group-item">
              <label class="form-label-text">账号 / 邮箱</label>
              <div class="input-icon-wrapper">
                <i class="fa-regular fa-envelope input-prefix-icon"></i>
                <input v-model="username" type="text" class="styled-login-input" placeholder="请输入企业账号或邮箱" required autocomplete="username">
              </div>
            </div>
            <div class="form-group-item">
              <label class="form-label-text">安全密码</label>
              <div class="input-icon-wrapper">
                <i class="fa-solid fa-lock input-prefix-icon"></i>
                <input v-model="password" :type="showPassword ? 'text' : 'password'" class="styled-login-input" placeholder="请输入访问凭据" required autocomplete="current-password">
                <button type="button" class="password-toggle-btn" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </div>
            </div>
            <div class="form-remember-row">
              <label class="checkbox-label-styled">
                <input v-model="rememberMe" type="checkbox" class="checkbox-custom">
                <span>记住登录设备 (30天)</span>
              </label>
              <a href="javascript:void(0)" class="link-styled" @click="showToast('如需重置凭据，请联系企业 IT 管理员', 'info')">忘记凭据?</a>
            </div>
            <button type="submit" class="btn-submit-login" :disabled="submitting">
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '正在验证登录...' : '进入工作台' }}</span>
              <i v-if="!submitting" class="fa-solid fa-arrow-right"></i>
            </button>
          </form>
          <div class="commercial-demo-helper">
            <span class="demo-helper-title">演示体验凭据：</span>
            <div class="demo-chips-list">
              <button type="button" class="demo-chip-badge" @click="fillAccount('admin', 'admin123')">
                <i class="fa-solid fa-shield-halved"></i> admin (管理员)
              </button>
              <button type="button" class="demo-chip-badge" @click="fillAccount('developer', 'dev123456')">
                <i class="fa-solid fa-code"></i> developer (开发者)
              </button>
            </div>
          </div>
          <div class="login-card-footer">🔒 Protected by Zero-Trust IAM Architecture.</div>
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

const router = useRouter()
const { showToast } = useToast()
const username = ref('admin')
const password = ref('admin123')
const rememberMe = ref(true)
const showPassword = ref(false)
const submitting = ref(false)
const authTab = ref('password')
const theme = ref(localStorage.getItem('theme') || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
  showToast(`已切换至 ${theme.value === 'dark' ? '暗黑模式' : '明亮模式'}`, 'info', 1500)
}

function fillAccount(user, pass) {
  username.value = user
  password.value = pass
  showToast(`已自动填充账号: ${user}`, 'info', 2000)
}

function switchSso() {
  authTab.value = 'sso'
  showToast('已接入企业 SSO / LDAP 单点登录通道，请直接验证进入', 'info')
}

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    showToast('请输入用户名和密码', 'error')
    return
  }
  submitting.value = true
  const res = await http.post('/api/auth/login', {
    username: username.value.trim(),
    password: password.value
  })
  if (res.success && res.data) {
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data))
    showToast('登录成功，正在进入智能体控制台...', 'success', 1500)
    setTimeout(() => router.push('/dashboard'), 600)
  } else {
    showToast(res.message || '登录失败，请检查账号密码', 'error')
    submitting.value = false
  }
}
</script>
