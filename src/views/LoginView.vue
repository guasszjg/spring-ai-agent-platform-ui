<template>
  <div class="lg-page">
    <!-- 左侧：品牌陈述 -->
    <aside class="lg-brand">
      <div class="lg-logo">
        <AgentLogo :size="28" />
        <span>AgentMatrix</span>
      </div>

      <div class="lg-statement">
        <h1>企业级智能体平台</h1>
        <p>统一编排、调度与治理组织内的每一个智能体。</p>
        <ul class="lg-capabilities">
          <li>智能体编排</li>
          <li>模型网关</li>
          <li>知识库检索</li>
          <li>安全治理</li>
        </ul>
      </div>

      <div class="lg-foot">© {{ year }} AgentMatrix</div>
      <div class="lg-grid" aria-hidden="true"></div>
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
const year = new Date().getFullYear()

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
