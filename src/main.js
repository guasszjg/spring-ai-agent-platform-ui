import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/common.css'
import './assets/login.css'
import './assets/dashboard.css'
import './assets/debug.css'

const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)
// Remove the deprecated plaintext API-key cache from older releases.
localStorage.removeItem('global-bocha-api-key')

createApp(App).use(router).mount('#app')
