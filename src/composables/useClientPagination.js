import { computed, ref, watch } from 'vue'

/**
 * 通用客户端分页（适合全量列表已加载、顶部统计/下拉需完整数据的配置页）
 */
export function useClientPagination(itemsRef, {
  storageKey = '',
  defaultSize = 10,
  sizeOptions = [6, 10, 20, 50]
} = {}) {
  const initialSize = (() => {
    if (!storageKey) return defaultSize
    try {
      const saved = Number(localStorage.getItem(storageKey))
      if (sizeOptions.includes(saved)) return saved
    } catch { /* ignore */ }
    return defaultSize
  })()

  const page = ref(1)
  const pageSize = ref(initialSize)

  const total = computed(() => (Array.isArray(itemsRef.value) ? itemsRef.value.length : 0))
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const pagedItems = computed(() => {
    const list = Array.isArray(itemsRef.value) ? itemsRef.value : []
    const safePage = Math.min(Math.max(1, page.value), totalPages.value)
    const start = (safePage - 1) * pageSize.value
    return list.slice(start, start + pageSize.value)
  })

  watch(totalPages, (max) => {
    if (page.value > max) page.value = max
    if (page.value < 1) page.value = 1
  })

  watch(pageSize, (val) => {
    page.value = 1
    if (!storageKey) return
    try { localStorage.setItem(storageKey, String(val)) } catch { /* ignore */ }
  })

  return {
    page,
    pageSize,
    sizeOptions,
    total,
    totalPages,
    pagedItems
  }
}
