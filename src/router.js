import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import DashboardView from './views/DashboardView.vue'
import DebugView from './views/DebugView.vue'
import { http } from './api/http'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/debug/:id', name: 'debug', component: DebugView, meta: { requiresAuth: true } },
    { path: '/', redirect: '/dashboard' }
  ]
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && to.name !== 'login') return true

  const cachedUser = localStorage.getItem('user')
  if (to.name === 'login' && !cachedUser) {
    return true
  }

  const session = await http.get('/api/auth/me')
  if (to.meta.requiresAuth && !session.success) {
    localStorage.removeItem('user')
    localStorage.removeItem('csrf_token')
    return '/login'
  }
  if (session.success && session.data) {
    localStorage.setItem('user', JSON.stringify(session.data))
    if (session.data.csrfToken) {
      localStorage.setItem('csrf_token', session.data.csrfToken)
    }
  }
  if (to.name === 'login' && session.success && cachedUser) {
    return '/dashboard'
  }
  return true
})

export default router
