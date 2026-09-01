<template>
  <div class="toast-container">
    <div v-for="item in toasts" :key="item.id" class="toast show" :class="'toast-' + item.type">
      <i v-if="item.type === 'success'" class="fa-solid fa-circle-check toast-icon" style="color: var(--accent-emerald);"></i>
      <i v-else-if="item.type === 'error'" class="fa-solid fa-circle-exclamation toast-icon" style="color: var(--accent-rose);"></i>
      <i v-else class="fa-solid fa-circle-info toast-icon" style="color: var(--accent-blue);"></i>
      <div class="toast-message">{{ item.message }}</div>
    </div>
  </div>
  <router-view />
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
