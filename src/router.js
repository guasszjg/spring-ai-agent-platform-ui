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

  const session = await http.get('/api/auth/me')
  if (to.meta.requiresAuth && !session.success) return '/login'
  if (to.name === 'login' && session.success) return '/dashboard'
  return true
})

export default router
