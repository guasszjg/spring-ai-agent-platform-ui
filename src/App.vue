<template>
  <div class="toast-container">
    <div v-for="item in toasts" :key="item.id" class="toast show" :class="'toast-' + item.type">
      <i v-if="item.type === 'success'" class="fa-solid fa-circle-check toast-icon" style="color: var(--accent-emerald);"></i>
      <i v-else-if="item.type === 'error'" class="fa-solid fa-circle-exclamation toast-icon" style="color: var(--accent-rose);"></i>
      <i v-else class="fa-solid fa-circle-info toast-icon" style="color: var(--accent-blue);"></i>
      <div class="toast-message">{{ item.message }}</div>
    </div>
  </div>
  <!-- 调试页按智能体 ID 区分实例：从 /debug/a 跳到 /debug/b（例如点击助手回复中的链接）时重新加载。
       keep-alive 内只能有一个子节点，注释不要放进去 -->
  <router-view v-slot="{ Component }">
    <keep-alive include="DashboardView">
      <component :is="Component" :key="route.name === 'debug' ? route.path : undefined" />
    </keep-alive>
  </router-view>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from './composables/useToast'

const route = useRoute()
const { toasts } = useToast()

function applyBodyClass(name) {
  document.body.className = name === 'login' ? 'login-page-wrapper' : (name === 'debug' ? 'debug-page' : 'dashboard-page')
}

watch(() => route.name, (name) => applyBodyClass(name), { immediate: true })
</script>

<style>
#app {
  display: contents;
}
</style>
