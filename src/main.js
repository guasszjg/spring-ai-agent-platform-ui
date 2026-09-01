import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/common.css'
import './assets/login.css'
import './assets/dashboard.css'
import './assets/debug.css'

const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

createApp(App).use(router).mount('#app')
