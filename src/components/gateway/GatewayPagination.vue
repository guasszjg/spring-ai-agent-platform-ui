<template>
  <section v-if="total > 0" class="pagination-container gateway-pagination">
    <div class="page-summary">
      <span>共 {{ total }} {{ unit }} · 第 {{ page }} / {{ totalPages }} 页</span>
      <select
        :value="pageSize"
        class="status-select gateway-page-size"
        aria-label="每页显示条数"
        @change="onSizeChange($event)"
      >
        <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }} 条/页</option>
      </select>
    </div>
    <div class="pagination-controls">
      <button
        type="button"
        class="btn-page"
        :disabled="page <= 1"
        title="上一页"
        @click="goTo(page - 1)"
      >
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <template v-for="(item, idx) in visiblePages" :key="`${item}-${idx}`">
        <span v-if="item === '...'" class="gateway-page-ellipsis">…</span>
        <button
          v-else
          type="button"
          class="btn-page"
          :class="{ active: item === page }"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="btn-page"
        :disabled="page >= totalPages"
        title="下一页"
        @click="goTo(page + 1)"
      >
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  sizeOptions: { type: Array, default: () => [6, 10, 20, 50] },
  unit: { type: String, default: '条配置' }
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const visiblePages = computed(() => {
  const count = props.totalPages
  const cur = props.page
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  const pages = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(count - 1, cur + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < count - 1) pages.push('...')
  pages.push(count)
  return pages
})

function goTo(target) {
  if (target < 1 || target > props.totalPages || target === props.page) return
  emit('update:page', target)
}

function onSizeChange(e) {
  const next = Number(e.target.value)
  if (next > 0 && next !== props.pageSize) {
    emit('update:pageSize', next)
  }
}
</script>

<style scoped>
.gateway-pagination {
  margin-top: 14px;
}

.gateway-page-size {
  margin-left: 12px;
  padding: 4px 8px;
  font-size: 12px;
}

.gateway-page-ellipsis {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}
</style>
