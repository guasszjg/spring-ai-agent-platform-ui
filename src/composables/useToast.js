import { reactive } from 'vue'

const toasts = reactive([])

export function useToast() {
  function showToast(message, type = 'info', duration = 3500) {
    const id = Date.now() + Math.random()
    toasts.push({ id, message, type })
    setTimeout(() => {
      const index = toasts.findIndex((item) => item.id === id)
      if (index >= 0) toasts.splice(index, 1)
    }, duration)
  }

  return { toasts, showToast }
}
