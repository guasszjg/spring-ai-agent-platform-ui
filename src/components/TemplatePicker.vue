<template>
  <!-- 行业模板选择器：搜索 + 分类筛选 + 后端分页，选中后回传完整模板 -->
  <div class="tp">
    <button type="button" class="tp-trigger" :class="{ open }" @click="toggle">
      <template v-if="selected">
        <SceneIcon :category="selected.category" :size="24" />
        <span class="tp-trigger-name">{{ selected.name }}</span>
        <span class="tp-trigger-cat">{{ selected.category }}</span>
      </template>
      <span v-else class="tp-trigger-placeholder">从行业模板快速填充（可选）</span>
      <span class="tp-trigger-actions">
        <span v-if="selected" class="tp-clear" title="清除选择" @click.stop="clear">
          <X :size="14" :stroke-width="2" />
        </span>
        <ChevronDown class="tp-chevron" :size="16" :stroke-width="1.75" />
      </span>
    </button>

    <div v-if="open" class="tp-panel">
      <div class="tp-search">
        <Search :size="15" :stroke-width="1.75" />
        <input
          ref="searchRef"
          v-model="keyword"
          type="text"
          placeholder="搜索模板名称或描述"
          @input="onKeyword"
          @keydown.enter.prevent
        >
      </div>

      <div class="tp-cats">
        <button
          v-for="c in categories"
          :key="c"
          type="button"
          :class="{ active: category === c }"
          @click="setCategory(c)"
        >{{ c }}</button>
      </div>

      <div class="tp-list">
        <div v-if="loading" class="tp-state">正在加载…</div>
        <div v-else-if="!items.length" class="tp-state">没有匹配的模板</div>
        <button
          v-for="t in items"
          v-else
          :key="t.id"
          type="button"
          class="tp-item"
          :class="{ active: selected && selected.id === t.id }"
          @click="pick(t)"
        >
          <SceneIcon :category="t.category" :size="32" />
          <span class="tp-item-main">
            <span class="tp-item-title">
              <strong>{{ t.name }}</strong>
              <em>{{ t.category }}</em>
            </span>
            <span class="tp-item-desc">{{ t.description || '暂无描述' }}</span>
          </span>
          <Check v-if="selected && selected.id === t.id" class="tp-item-check" :size="16" :stroke-width="2" />
        </button>
      </div>

      <div class="tp-foot">
        <span>共 {{ total }} 个模板</span>
        <span class="tp-pager">
          <button type="button" :disabled="page <= 1 || loading" @click="go(page - 1)">
            <ChevronLeft :size="15" :stroke-width="1.75" />
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages || loading" @click="go(page + 1)">
            <ChevronRight :size="15" :stroke-width="1.75" />
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, X } from 'lucide-vue-next'
import { http } from '../api/http'
import SceneIcon from './SceneIcon.vue'

const emit = defineEmits(['select', 'clear'])

const PAGE_SIZE = 5
const categories = ['全部', '代码研发', '内容创作', '数据分析', '客户服务', '金融风控', '通用智能', '行政法务', '教育培训']

const open = ref(false)
const selected = ref(null)
const keyword = ref('')
const category = ref('全部')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const items = ref([])
const loading = ref(false)
const searchRef = ref(null)

let timer = null
let seq = 0

async function load() {
  const mySeq = ++seq
  loading.value = true
  const params = { page: page.value, size: PAGE_SIZE }
  if (keyword.value.trim()) params.keyword = keyword.value.trim()
  if (category.value !== '全部') params.category = category.value
  const res = await http.get('/api/agent-templates', params)
  if (mySeq !== seq) return
  const data = res && res.success ? res.data : null
  if (data && Array.isArray(data.records)) {
    items.value = data.records
    total.value = data.total || 0
    totalPages.value = Math.max(1, data.totalPages || 1)
  } else if (Array.isArray(data)) {
    items.value = data
    total.value = data.length
    totalPages.value = 1
  } else {
    items.value = []
    total.value = 0
    totalPages.value = 1
  }
  loading.value = false
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    load()
    nextTick(() => searchRef.value && searchRef.value.focus())
  }
}

function onKeyword() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function setCategory(c) {
  category.value = c
  page.value = 1
  load()
}

function go(p) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
  load()
}

function pick(t) {
  selected.value = t
  open.value = false
  emit('select', t)
}

function clear() {
  selected.value = null
  emit('clear')
}

// 供父组件在打开新建弹窗时重置；可传入已带入的模板用于回显
function reset(initial = null) {
  selected.value = initial
  open.value = false
  keyword.value = ''
  category.value = '全部'
  page.value = 1
}

defineExpose({ reset })
</script>

<style scoped>
.tp {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tp-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  padding: 6px 10px 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.tp-trigger:hover,
.tp-trigger.open {
  border-color: var(--border-hover);
}

.tp-trigger-placeholder {
  color: var(--text-muted);
}

.tp-trigger-name {
  font-weight: 500;
}

.tp-trigger-cat {
  font-size: 12px;
  color: var(--text-muted);
}

.tp-trigger-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.tp-clear {
  display: inline-flex;
  padding: 3px;
  border-radius: 6px;
}

.tp-clear:hover {
  background: var(--surface-subtle);
  color: var(--text-primary);
}

.tp-chevron {
  transition: transform 0.15s;
}

.tp-trigger.open .tp-chevron {
  transform: rotate(180deg);
}

.tp-panel {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  overflow: hidden;
}

.tp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-muted);
}

.tp-search input {
  flex: 1;
  height: 40px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
}

.tp-cats {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color);
  scrollbar-width: none;
}

.tp-cats button {
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.tp-cats button:hover {
  background: var(--surface-subtle);
}

.tp-cats button.active {
  background: var(--surface-active);
  color: var(--active-fg, var(--text-primary));
  border-color: var(--border-hover);
}

.tp-list {
  display: flex;
  flex-direction: column;
  min-height: 250px;
  padding: 6px;
}

.tp-state {
  margin: auto;
  font-size: 13px;
  color: var(--text-muted);
}

.tp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.tp-item:hover {
  background: var(--surface-subtle);
}

.tp-item.active {
  background: var(--brand-soft, var(--surface-active));
}

.tp-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.tp-item-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.tp-item-title strong {
  font-size: 13px;
  font-weight: 600;
}

.tp-item-title em {
  font-style: normal;
  font-size: 12px;
  color: var(--text-muted);
}

.tp-item-desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tp-item-check {
  color: var(--brand, var(--accent-blue));
  flex-shrink: 0;
}

.tp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}

.tp-pager {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.tp-pager button {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.tp-pager button:hover:not(:disabled) {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.tp-pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
