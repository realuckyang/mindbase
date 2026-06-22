import { ref } from 'vue'
import { api } from '@/api'

const authed = ref(false)
const ready  = ref(false)
let inflight = null

export async function checkAuth() {
  if (ready.value) return authed.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      await api.get('/api/auth/me')
      authed.value = true
    } catch {
      authed.value = false
    } finally {
      ready.value = true
      inflight = null
    }
    return authed.value
  })()
  return inflight
}

export async function login(username, password) {
  await api.post('/api/auth/login', { username, password })
  authed.value = true
  ready.value = true
}

export async function setupAuth(username, password) {
  await api.post('/api/auth/setup', { username, password })
  authed.value = true
  ready.value = true
}

export async function logout() {
  try { await api.post('/api/auth/logout') } catch {}
  authed.value = false
  ready.value = true
}

export function useAuth() {
  return {
    authed,
    ready,
    isAuthenticated: authed,
    checkAuth,
    login,
    logout,
  }
}
