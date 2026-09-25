<template>
  <div class="lg-page">
    <!-- 左侧：品牌色块 + 同心弧线纹理 + 产品示意卡片 -->
    <aside class="lg-brand">
      <svg class="lg-rings" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="lg-rings-br">
          <circle v-for="r in ringsLarge" :key="'l' + r" cx="820" cy="940" :r="r" />
        </g>
        <g class="lg-rings-tl">
          <circle v-for="r in ringsSmall" :key="'s' + r" cx="-40" cy="-60" :r="r" />
        </g>
      </svg>
      <div class="lg-grain" aria-hidden="true"></div>

      <div class="lg-logo">
        <AgentLogo :size="28" inverse />
        <span>AgentMatrix</span>
      </div>

      <div class="lg-hero">
        <div class="lg-statement">
          <h1>企业级智能体平台</h1>
          <p>统一编排、调度与治理组织内的每一个智能体。</p>
        </div>

        <!-- 编排示意动画：能力节点经连线汇聚到中心智能体 -->
        <svg class="lg-orchestra" viewBox="0 0 520 330" aria-hidden="true">
          <ellipse class="lg-orbit" cx="260" cy="165" rx="215" ry="128" />
          <circle class="lg-orbit-dot" r="3.5">
            <animateMotion dur="22s" repeatCount="indefinite" path="M475 165a215 128 0 1 1-430 0a215 128 0 1 1 430 0" />
          </circle>

          <g v-for="(n, i) in orchestraNodes" :key="n.label">
            <path class="lg-link" :d="n.path" />
            <path class="lg-pulse" :d="n.path" pathLength="100" :style="{ animationDelay: i * 0.7 + 's' }" />
            <g class="lg-node" :transform="`translate(${n.x} ${n.y})`">
              <rect x="-50" y="-17" width="100" height="34" rx="17" />
              <text y="5" text-anchor="middle">{{ n.label }}</text>
            </g>
          </g>

          <circle class="lg-halo" cx="260" cy="167" r="40" />
          <circle class="lg-halo lg-halo-2" cx="260" cy="167" r="40" />
          <AgentMascot class="lg-mascot" :size="100" x="210" y="108" inverse animated />
        </svg>
      </div>

      <div class="lg-foot">
        <span>智能体编排</span><span>模型网关</span><span>知识库检索</span><span>安全治理</span>
      </div>
    </aside>

    <!-- 右侧：登录表单 -->
    <main class="lg-main">
      <button
        class="lg-theme"
        type="button"
        :title="theme === 'light' ? '切换为暗色' : '切换为浅色'"
        @click="toggleTheme"
      >
        <component :is="theme === 'light' ? Moon : Sun" :size="16" :stroke-width="1.75" />
      </button>

      <div class="lg-form-wrap">
        <div class="lg-mobile-logo">
          <AgentLogo :size="28" />
        </div>
        <h2>登录</h2>
        <p class="lg-sub">使用企业账号登录控制台</p>

        <div class="lg-segment" role="tablist">
          <button
            type="button"
            :class="{ active: currentRole === 'admin' }"
            @click="selectRole('admin', 'Amx#Admin2026')"
          >管理员</button>
          <button
            type="button"
            :class="{ active: currentRole === 'dev' }"
            @click="selectRole('developer', 'Amx#Dev2026')"
          >开发者</button>
        </div>

        <form class="lg-form" autocomplete="off" @submit.prevent="handleLogin">
          <label class="lg-field">
            <span>账号</span>
            <input
              v-model="username"
              type="text"
              required
              autocomplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            >
          </label>

          <label class="lg-field">
            <span>密码</span>
            <div class="lg-input-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              >
              <button
                type="button"
                class="lg-eye"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <component :is="showPassword ? EyeOff : Eye" :size="16" :stroke-width="1.75" />
              </button>
            </div>
          </label>

          <div class="lg-row">
            <label class="lg-check">
              <input v-model="rememberMe" type="checkbox">
              <span>记住我</span>
            </label>
            <a href="javascript:void(0)" @click="showToast('如需重置密码，请联系管理员', 'info')">忘记密码？</a>
          </div>

          <button type="submit" class="lg-submit" :disabled="submitting">
            <Loader2 v-if="submitting" class="lg-spin" :size="16" :stroke-width="2" />
            <span>{{ submitting ? '正在登录' : '登录' }}</span>
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import AgentLogo from '../components/AgentLogo.vue'
import AgentMascot from '../components/AgentMascot.vue'
import { Sun, Moon, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const { showToast } = useToast()

const username = ref('admin')
const password = ref('Amx#Admin2026')
const currentRole = ref('admin')
const rememberMe = ref(true)
const showPassword = ref(false)
const submitting = ref(false)
const theme = ref(localStorage.getItem('theme') || 'dark')
// 同心弧线半径：右下角大圈、左上角小圈
const ringsLarge = Array.from({ length: 14 }, (_, i) => 90 + i * 64)
const ringsSmall = Array.from({ length: 6 }, (_, i) => 60 + i * 52)

// 编排动画的四个能力节点及其连向中心 (260,165) 的曲线
const orchestraNodes = [
  { label: '知识库', x: 82, y: 62, path: 'M132 62 C 200 62, 215 120, 228 142' },
  { label: '模型网关', x: 438, y: 62, path: 'M388 62 C 320 62, 305 120, 292 142' },
  { label: '工具调用', x: 82, y: 268, path: 'M132 268 C 200 268, 215 210, 228 188' },
  { label: '安全治理', x: 438, y: 268, path: 'M388 268 C 320 268, 305 210, 292 188' }
]

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

function selectRole(user, pass) {
  username.value = user
  password.value = pass
  currentRole.value = user === 'admin' ? 'admin' : 'dev'
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
      localStorage.setItem('user', JSON.stringify(res.data))
      password.value = ''
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
