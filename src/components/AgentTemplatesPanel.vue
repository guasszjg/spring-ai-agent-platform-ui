<template>
  <div class="templates-view-container">
    <!-- Top Hero Section -->
    <div class="templates-hero-header">
      <div class="hero-text-group">
        <div class="hero-title-row">
          <div class="hero-icon-box">
            <i class="fa-solid fa-shapes"></i>
          </div>
          <div>
            <h2 class="hero-title">行业场景模板中心</h2>
            <p class="hero-desc">
              开箱即用的行业专家智能体预设。支持自定义增删改查；设置好的模板在「注册新智能体」时可直接一键选择并自动填充。
            </p>
          </div>
        </div>
      </div>
      <button type="button" class="btn-primary-create" @click="openCreateModal">
        <i class="fa-solid fa-plus"></i>
        <span>新建场景模板</span>
      </button>
    </div>

    <!-- Toolbar: Categories Filter & Search -->
    <div class="templates-toolbar">
      <div class="category-pills-row">
        <button
          v-for="cat in categoryList"
          :key="cat"
          type="button"
          class="cat-filter-pill"
          :class="{ active: currentCategory === cat }"
          @click="selectCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>

      <div class="toolbar-right">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            v-model="searchKeyword"
            type="text"
            class="template-search-input"
            placeholder="搜索模板名称、账号、场景描述或标签..."
            @input="debounceSearch"
          >
          <button
            v-if="searchKeyword"
            type="button"
            class="btn-search-clear"
            @click="clearSearch"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="view-mode-group">
          <button
            type="button"
            class="btn-view-mode"
            :class="{ active: viewMode === 'card' }"
            title="卡片视图"
            @click="viewMode = 'card'"
          >
            <i class="fa-solid fa-table-cells-large"></i>
          </button>
          <button
            type="button"
            class="btn-view-mode"
            :class="{ active: viewMode === 'list' }"
            title="列表表格视图"
            @click="viewMode = 'list'"
          >
            <i class="fa-solid fa-list-ul"></i>
          </button>
        </div>
        <button type="button" class="btn-refresh" title="刷新模板列表" @click="loadTemplates">
          <i class="fa-solid fa-rotate"></i>
        </button>
      </div>
    </div>

    <!-- Templates Cards Grid -->
    <div v-if="loading" class="templates-loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>正在加载行业场景模板...</span>
    </div>

    <div v-else-if="!templates.length" class="templates-empty">
      <div class="empty-icon"><i class="fa-solid fa-shapes"></i></div>
      <h3>暂无匹配的场景模板</h3>
      <p>没有找到符合当前分类或搜索关键词的模板，您可以新建一个自定义专属场景模板</p>
      <button type="button" class="btn-primary-create" @click="openCreateModal">
        <i class="fa-solid fa-plus"></i>
        <span>新建场景模板</span>
      </button>
    </div>

    <div v-else-if="viewMode === 'card'" class="templates-grid">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="template-card"
      >
        <div class="tpl-card-header">
          <div class="tpl-avatar-box">
            <span>{{ tpl.avatar || '🤖' }}</span>
          </div>
          <div class="tpl-header-meta">
            <div class="tpl-title-row">
              <h3 class="tpl-name" :title="tpl.name">{{ tpl.name }}</h3>
              <span v-if="tpl.isBuiltin" class="tpl-badge builtin-badge">
                <i class="fa-solid fa-sparkles"></i> 系统预设
              </span>
              <span v-else class="tpl-badge custom-badge">
                {{ accountLabel(tpl) }}
              </span>
            </div>
            <span class="tpl-category-tag">{{ tpl.category || '通用智能' }}</span>
          </div>
        </div>

        <p class="tpl-desc" :title="tpl.description">
          {{ tpl.description || '暂无场景功能描述' }}
        </p>

        <!-- System Prompt Box -->
        <div class="tpl-prompt-box">
          <div class="tpl-prompt-bar">
            <div class="prompt-bar-left">
              <i class="fa-solid fa-terminal"></i>
              <span>系统提示词设定</span>
              <span class="prompt-len">({{ (tpl.systemPrompt || '').length }} 字)</span>
            </div>
            <button
              type="button"
              class="btn-copy-prompt"
              title="复制提示词"
              @click.stop="copyText(tpl.systemPrompt, '提示词已复制到剪贴板')"
            >
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
          <div
            class="tpl-prompt-content"
            :class="{ expanded: expandedPrompts[tpl.id] }"
            @click="togglePromptExpand(tpl.id)"
          >
            {{ tpl.systemPrompt }}
          </div>
          <div
            v-if="(tpl.systemPrompt || '').length > 90"
            class="tpl-prompt-toggle"
            @click="togglePromptExpand(tpl.id)"
          >
            <span>{{ expandedPrompts[tpl.id] ? '收起提示词' : '展开查看全部' }}</span>
            <i :class="expandedPrompts[tpl.id] ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </div>
        </div>

        <!-- Tags Row -->
        <div v-if="tpl.tags && tpl.tags.length" class="tpl-tags-row">
          <span
            v-for="tag in getTagArray(tpl.tags)"
            :key="tag"
            class="tpl-tag-chip"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Card Footer -->
        <div class="tpl-card-footer">
          <div class="tpl-meta-info">
            <span class="meta-temp" :title="`采样温度: ${tpl.temperature != null ? tpl.temperature : 0.7}`">
              <i class="fa-solid fa-temperature-half"></i>
              温度: {{ tpl.temperature != null ? tpl.temperature : 0.7 }}
            </span>
          </div>

          <div class="tpl-card-actions">
            <button
              type="button"
              class="btn-action-icon"
              title="编辑模板"
              @click.stop="openEditModal(tpl)"
            >
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button
              type="button"
              class="btn-action-icon btn-action-danger"
              title="删除模板"
              @click.stop="openDeleteModal(tpl)"
            >
              <i class="fa-regular fa-trash-can"></i>
            </button>
            <button
              type="button"
              class="btn-use-tpl"
              title="基于此模板快速注册智能体"
              @click="useTemplateToCreate(tpl)"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>以此注册</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table / List View -->
    <div v-else class="table-view-card">
      <table class="agent-table template-table">
        <thead>
          <tr>
            <th style="min-width: 190px;">模板信息</th>
            <th style="min-width: 110px;">所属账号</th>
            <th style="min-width: 110px;">业务分类</th>
            <th style="min-width: 170px;">场景功能描述</th>
            <th style="min-width: 200px;">系统提示词</th>
            <th style="min-width: 95px;">建议温度</th>
            <th style="min-width: 170px;">业务标签</th>
            <th style="min-width: 210px; text-align: right;">操作管理</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tpl in templates" :key="tpl.id">
            <td>
              <div class="table-agent-meta">
                <div class="table-agent-avatar">{{ tpl.avatar || '🤖' }}</div>
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="table-agent-title">{{ tpl.name }}</span>
                    <span v-if="tpl.isBuiltin" class="tpl-badge builtin-badge" style="font-size: 10px; padding: 1px 6px; white-space: nowrap;">预设</span>
                    <span v-else class="tpl-badge custom-badge" style="font-size: 10px; padding: 1px 6px; white-space: nowrap;">{{ accountLabel(tpl) }}</span>
                  </div>
                  <div class="table-agent-code">排序权重: {{ tpl.sortOrder || 0 }}</div>
                </div>
              </div>
            </td>
            <td>{{ tpl.isBuiltin ? '系统公共' : accountLabel(tpl) }}</td>
            <td class="col-category">
              <span class="spec-badge"><i class="fa-solid fa-tag"></i> {{ tpl.category || '通用智能' }}</span>
            </td>
            <td class="col-desc">
              <div class="table-desc-cell" :title="tpl.description">
                {{ tpl.description || '暂无场景功能描述' }}
              </div>
            </td>
            <td class="col-prompt">
              <div class="table-prompt-cell" :title="tpl.systemPrompt">
                {{ tpl.systemPrompt || '暂未设定 System Prompt' }}
              </div>
            </td>
            <td class="col-temp">
              <span class="spec-badge">
                <i class="fa-solid fa-temperature-half"></i>
                T:{{ tpl.temperature != null ? tpl.temperature : 0.7 }}
              </span>
            </td>
            <td class="col-tags">
              <div class="table-tags-box">
                <span v-for="t in getTagArray(tpl.tags).slice(0, 2)" :key="t" class="table-tag-item">#{{ t }}</span>
                <span v-if="getTagArray(tpl.tags).length > 2" class="table-tag-more">+{{ getTagArray(tpl.tags).length - 2 }}</span>
              </div>
            </td>
            <td class="col-actions">
              <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
                <button
                  type="button"
                  class="btn-card-action btn-chat-primary btn-use-tpl-table"
                  title="基于此模板快速注册智能体"
                  @click="useTemplateToCreate(tpl)"
                >
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  <span>以此注册</span>
                </button>
                <button
                  type="button"
                  class="btn-card-action btn-action-icon"
                  style="flex-shrink: 0;"
                  title="复制系统提示词"
                  @click.stop="copyText(tpl.systemPrompt, '提示词已复制到剪贴板')"
                >
                  <i class="fa-regular fa-copy"></i>
                </button>
                <button
                  type="button"
                  class="btn-card-action btn-action-icon"
                  style="flex-shrink: 0;"
                  title="编辑模板"
                  @click.stop="openEditModal(tpl)"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button
                  type="button"
                  class="btn-card-action btn-action-icon btn-action-danger"
                  style="flex-shrink: 0;"
                  title="删除模板"
                  @click.stop="openDeleteModal(tpl)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Section -->
    <section v-if="total > 0" class="pagination-container">
      <div class="page-summary">
        共 {{ total }} 个场景模板 · 第 {{ page }} / {{ totalPages }} 页
        <select v-model.number="pageSize" class="status-select" style="margin-left: 12px; padding: 4px 8px; font-size: 12px;" @change="onPageSizeChange">
          <option :value="6">6 条/页</option>
          <option :value="12">12 条/页</option>
          <option :value="24">24 条/页</option>
        </select>
      </div>
      <div class="pagination-controls">
        <button
          type="button"
          class="btn-page"
          :disabled="page <= 1"
          title="上一页"
          @click="changePage(-1)"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button
          v-for="n in totalPages"
          :key="n"
          type="button"
          class="btn-page"
          :class="{ active: n === page }"
          @click="goToPage(n)"
        >
          {{ n }}
        </button>
        <button
          type="button"
          class="btn-page"
          :disabled="page >= totalPages"
          title="下一页"
          @click="changePage(1)"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <!-- Create / Edit Template Modal -->
    <div v-if="modalOpen" class="modal-backdrop" :class="{ open: modalOpen }">
      <div class="modal-dialog template-modal-dialog">
        <div class="modal-header">
          <h3>
            <i :class="editingId ? 'fa-regular fa-pen-to-square' : 'fa-solid fa-shapes'" style="color: var(--accent-blue);"></i>
            <span>{{ editingId ? '编辑行业场景模板' : '新建行业场景模板' }}</span>
          </h3>
          <button type="button" class="btn-modal-close" @click="closeModal">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form @submit.prevent="saveTemplate">
          <div class="modal-body">
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">模板名称 <span class="required-star">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-control-styled"
                  placeholder="如: 代码审计专家、电商客服等"
                  required
                >
              </div>
              <div class="form-group">
                <label class="form-label">行业分类 <span class="required-star">*</span></label>
                <select v-model="form.category" class="form-control-styled category-select" required>
                  <option disabled value="">请选择行业分类</option>
                  <option v-for="cat in industryCategories" :key="cat" :value="cat">{{ cat }}</option>
                  <option
                    v-if="form.category && !industryCategories.includes(form.category)"
                    :value="form.category"
                  >{{ form.category }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">业务头像 / Emoji 图标</label>
              <div class="emoji-selector-list">
                <button
                  v-for="e in emojiCatalog"
                  :key="e"
                  type="button"
                  class="emoji-btn"
                  :class="{ active: form.avatar === e }"
                  @click="form.avatar = e"
                >
                  {{ e }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span>推荐采样温度 (Temperature)</span>
                <span class="temp-hint">
                  {{ form.temperature <= 0.3 ? '严谨精准' : form.temperature >= 0.8 ? '创意发散' : '均衡稳定' }}
                </span>
              </label>
              <div class="slider-wrapper">
                <input
                  v-model.number="form.temperature"
                  type="range"
                  class="range-slider"
                  min="0"
                  max="2"
                  step="0.05"
                >
                <span class="slider-value-pill">{{ form.temperature }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">场景功能描述</label>
              <textarea
                v-model="form.description"
                class="form-control-styled"
                rows="2"
                placeholder="简明扼要地介绍该智能体适用的行业业务场景与核心价值..."
              ></textarea>
            </div>

            <div class="form-group">
              <div class="label-with-action">
                <label class="form-label">预设系统提示词 (System Prompt) <span class="required-star">*</span></label>
                <button
                  type="button"
                  class="btn-text-action"
                  @click="insertPromptTemplate"
                >
                  <i class="fa-solid fa-wand-magic-sparkles"></i> 填充标准人设骨架
                </button>
              </div>
              <textarea
                v-model="form.systemPrompt"
                class="form-control-styled prompt-input-area"
                rows="6"
                placeholder="设定智能体的角色定位、职责边界、工作流程与输出规范..."
                required
              ></textarea>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">业务标签 (逗号分隔)</label>
                <input
                  v-model="form.tagsText"
                  type="text"
                  class="form-control-styled"
                  placeholder="如: 代码审计, 漏洞挖掘, 最佳实践"
                >
              </div>
              <div class="form-group">
                <label class="form-label">排序权重 (越小越靠前)</label>
                <input
                  v-model.number="form.sortOrder"
                  type="number"
                  class="form-control-styled"
                  placeholder="如: 1, 2, 3"
                >
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn-create-agent" :disabled="saving">
              <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else :class="editingId ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-check'"></i>
              <span>{{ saving ? '保存中...' : (editingId ? '保存修改' : '立即创建') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteModalOpen" class="modal-backdrop" :class="{ open: deleteModalOpen }">
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="color: var(--accent-rose);">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>确认删除场景模板？</span>
          </h3>
          <button type="button" class="btn-modal-close" @click="deleteModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body" style="padding: 20px 24px;">
          <p style="font-size: 14px; line-height: 1.6; color: var(--text-secondary);">
            确定要彻底删除场景模板 <strong>{{ pendingDelete?.name }}</strong> 吗？
          </p>
          <p v-if="pendingDelete?.isBuiltin" style="margin-top: 8px; font-size: 12px; color: var(--accent-amber);">
            提示：该模板为系统预设模板，删除后在“注册新智能体”的下拉列表中将不再显示。
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="deleteModalOpen = false">取消</button>
          <button
            type="button"
            class="btn-danger-confirm"
            :disabled="deleting"
            @click="confirmDelete"
          >
            <i v-if="deleting" class="fa-solid fa-circle-notch fa-spin"></i>
            <span v-else>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { accountLabel } from '../composables/useAccountOptions'

const props = defineProps({
  isSuperAdmin: { type: Boolean, default: false }
})
const emit = defineEmits(['use-template', 'templates-updated'])
const { showToast } = useToast()

const industryCategories = ['代码研发', '内容创作', '数据分析', '客户服务', '金融风控', '通用智能', '行政法务', '教育培训']
const categoryList = ['全部', ...industryCategories]
const emojiCatalog = ['💻', '📚', '📊', '🎧', '⚖️', '🚀', '🤖', '🎯', '💡', '🛡️', '🔍', '📝', '🎨', '💼', '🔬', '🌐']

const currentCategory = ref('全部')
const searchKeyword = ref('')
const templates = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const expandedPrompts = reactive({})

// View Mode ('card' | 'list')
const viewMode = ref(localStorage.getItem('templateViewMode') || 'card')
watch(viewMode, (v) => localStorage.setItem('templateViewMode', v))

// Pagination
const page = ref(1)
const pageSize = ref(Number(localStorage.getItem('templatePageSize')) || 6)
const total = ref(0)
const totalPages = ref(1)

// Modal States
const modalOpen = ref(false)
const editingId = ref(null)
const deleteModalOpen = ref(false)
const pendingDelete = ref(null)

let searchDebounceTimer = null

const form = reactive({
  name: '',
  category: '通用智能',
  avatar: '🤖',
  description: '',
  systemPrompt: '',
  temperature: 0.7,
  tagsText: '',
  sortOrder: 1
})

function getTagArray(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  return String(tags).split(/[,，]/).map(t => t.trim()).filter(Boolean)
}

function selectCategory(cat) {
  currentCategory.value = cat
  page.value = 1
  loadTemplates()
}

function debounceSearch() {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    page.value = 1
    loadTemplates()
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  page.value = 1
  loadTemplates()
}

function changePage(delta) {
  const target = page.value + delta
  if (target >= 1 && target <= totalPages.value) {
    page.value = target
    loadTemplates()
  }
}

function goToPage(n) {
  if (n >= 1 && n <= totalPages.value) {
    page.value = n
    loadTemplates()
  }
}

function onPageSizeChange() {
  localStorage.setItem('templatePageSize', String(pageSize.value))
  page.value = 1
  loadTemplates()
}

function togglePromptExpand(id) {
  expandedPrompts[id] = !expandedPrompts[id]
}

function copyText(text, msg) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg || '复制成功', 'success')
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast(msg || '复制成功', 'success')
  })
}

async function loadTemplates() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      size: pageSize.value
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    if (currentCategory.value && currentCategory.value !== '全部') {
      params.category = currentCategory.value
    }
    const res = await http.get('/api/agent-templates', params)
    if (res.success && res.data) {
      if (res.data.records !== undefined) {
        templates.value = res.data.records || []
        total.value = res.data.total || 0
        totalPages.value = Math.max(1, res.data.totalPages || 1)
        page.value = res.data.page || 1
      } else if (Array.isArray(res.data)) {
        templates.value = res.data
        total.value = res.data.length
        totalPages.value = 1
        page.value = 1
      }
    } else {
      templates.value = []
      total.value = 0
      totalPages.value = 1
    }
  } catch (err) {
    showToast('加载场景模板失败: ' + (err.message || '网络错误'), 'error')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    category: currentCategory.value !== '全部' ? currentCategory.value : '通用智能',
    avatar: '🤖',
    description: '',
    systemPrompt: '',
    temperature: 0.7,
    tagsText: '',
    sortOrder: (templates.value.length || 0) + 1
  })
}

function openCreateModal() {
  resetForm()
  modalOpen.value = true
}

function openEditModal(tpl) {
  editingId.value = tpl.id
  Object.assign(form, {
    name: tpl.name || '',
    category: tpl.category || '通用智能',
    avatar: tpl.avatar || '🤖',
    description: tpl.description || '',
    systemPrompt: tpl.systemPrompt || '',
    temperature: tpl.temperature != null ? tpl.temperature : 0.7,
    tagsText: Array.isArray(tpl.tags) ? tpl.tags.join(', ') : (tpl.tags || ''),
    sortOrder: tpl.sortOrder || 1
  })
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function insertPromptTemplate() {
  form.systemPrompt = `### 角色定位
你是一名专业的【${form.name || '行业智能助手'}】，专注于为用户解决【${form.category || '业务'}】领域的核心问题。

### 核心能力与工作流程
1. 深入分析用户输入的问题与上下文背景；
2. 给出逻辑严谨、条理清晰且易于落地的专业建议与回答；
3. 如遇到模糊不明确的需求，主动提问澄清关键参数。

### 输出规范
- 格式规范，优先使用 Markdown 标题、加粗与列表呈现；
- 语言态度保持专业、严谨、客观与积极。`
}

async function saveTemplate() {
  if (!form.name.trim() || !form.systemPrompt.trim()) {
    showToast('模板名称与系统提示词为必填项', 'warning')
    return
  }

  saving.value = true
  const payload = {
    name: form.name.trim(),
    category: form.category.trim(),
    avatar: form.avatar,
    description: form.description.trim(),
    systemPrompt: form.systemPrompt.trim(),
    temperature: Number(form.temperature),
    tags: form.tagsText ? form.tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [],
    sortOrder: Number(form.sortOrder || 0),
    isBuiltin: false
  }

  try {
    let res
    if (editingId.value) {
      res = await http.put(`/api/agent-templates/${editingId.value}`, payload)
    } else {
      res = await http.post('/api/agent-templates', payload)
    }

    if (res.success) {
      showToast(editingId.value ? '场景模板已成功更新' : '场景模板创建成功', 'success')
      closeModal()
      if (!editingId.value) {
        page.value = 1
      }
      await loadTemplates()
      emit('templates-updated')
    } else {
      showToast(res.message || '保存模板失败', 'error')
    }
  } catch (err) {
    showToast('保存异常: ' + err.message, 'error')
  } finally {
    saving.value = false
  }
}

function openDeleteModal(tpl) {
  pendingDelete.value = tpl
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!pendingDelete.value?.id) return
  deleting.value = true
  try {
    const res = await http.del(`/api/agent-templates/${pendingDelete.value.id}`)
    if (res.success) {
      showToast('场景模板已成功删除', 'success')
      deleteModalOpen.value = false
      if (templates.value.length === 1 && page.value > 1) {
        page.value -= 1
      }
      await loadTemplates()
      emit('templates-updated')
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  } catch (err) {
    showToast('删除请求失败: ' + err.message, 'error')
  } finally {
    deleting.value = false
  }
}

function useTemplateToCreate(tpl) {
  emit('use-template', tpl)
}

onMounted(loadTemplates)
</script>

<style scoped>
.templates-view-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 0;
}

.templates-view-container > .pagination-container {
  margin-top: -8px;
}

/* Hero Header */
.templates-hero-header {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border: 1px solid rgba(59, 130, 246, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--accent-blue);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2);
}

.hero-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.4px;
}

.hero-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.5;
}

.btn-primary-create {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-blue) 0%, #4f46e5 100%);
  border: none;
  color: white;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-primary-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
}

/* Toolbar */
.templates-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.category-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cat-filter-pill {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cat-filter-pill:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.cat-filter-pill.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.template-search-input {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 32px 8px 34px;
  font-size: 13px;
  color: var(--text-primary);
  width: 260px;
  outline: none;
  transition: all 0.2s;
}

.template-search-input:focus {
  border-color: var(--accent-blue);
  width: 300px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.btn-search-clear {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
}

.count-badge {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Loading & Empty States */
.templates-loading {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: var(--text-muted);
  font-size: 14px;
}

.templates-loading i {
  font-size: 28px;
  color: var(--accent-blue);
}

.templates-empty {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  text-align: center;
}

.templates-empty .empty-icon {
  font-size: 40px;
  color: var(--text-muted);
  opacity: 0.4;
}

.templates-empty h3 {
  font-size: 16px;
  color: var(--text-primary);
}

.templates-empty p {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 440px;
  margin-bottom: 10px;
}

/* Grid & Cards */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.template-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: var(--shadow-card);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.template-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.tpl-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tpl-avatar-box {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.tpl-header-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.tpl-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tpl-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.builtin-badge {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.custom-badge {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.tpl-category-tag {
  font-size: 11.5px;
  color: var(--accent-blue);
  font-weight: 500;
}

.tpl-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Prompt Box */
.tpl-prompt-box {
  background: #080c14;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tpl-prompt-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.prompt-bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.prompt-len {
  font-weight: 400;
  opacity: 0.7;
}

.btn-copy-prompt {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  font-size: 11.5px;
  transition: color 0.2s;
}

.btn-copy-prompt:hover {
  color: var(--accent-blue);
}

.tpl-prompt-content {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  color: #cbd5e1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
  white-space: pre-wrap;
  word-break: break-word;
}

.tpl-prompt-content.expanded {
  display: block;
  max-height: 240px;
  overflow-y: auto;
}

.tpl-prompt-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent-blue);
  cursor: pointer;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Tags */
.tpl-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tpl-tag-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-muted);
}

/* Footer */
.tpl-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  padding-top: 14px;
  margin-top: auto;
}

.tpl-meta-info {
  font-size: 11.5px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.tpl-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-action-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-icon:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-action-danger:hover {
  border-color: var(--accent-rose);
  color: var(--accent-rose);
}

.btn-use-tpl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border-radius: 8px;
  background: var(--accent-blue);
  border: none;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-use-tpl:hover {
  background: var(--accent-blue-hover);
  transform: translateY(-1px);
}

/* Modal Custom Styles */
.template-modal-dialog {
  max-width: 640px;
}

.category-select {
  cursor: pointer;
  appearance: auto;
  -webkit-appearance: menulist;
}

.required-star {
  color: var(--accent-rose);
}

.temp-hint {
  font-size: 11px;
  color: var(--accent-blue);
  font-weight: 500;
}

.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-text-action {
  background: transparent;
  border: none;
  color: var(--accent-blue);
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-text-action:hover {
  text-decoration: underline;
}

.prompt-input-area {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
}

.table-view-card {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.template-table {
  min-width: 1080px;
  width: 100%;
}

.col-category .spec-badge,
.col-temp .spec-badge {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.table-desc-cell {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
  font-size: 12.5px;
}

.table-prompt-cell {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
  font-size: 12px;
}

.table-tags-box {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.table-tag-item {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.4;
  word-break: keep-all;
}

.table-tag-more {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.4;
}

.col-actions {
  white-space: nowrap;
}

.btn-use-tpl-table {
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .templates-hero-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .templates-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-right {
    justify-content: space-between;
  }
  .template-search-input {
    width: 100%;
  }
  .template-search-input:focus {
    width: 100%;
  }
}
</style>
