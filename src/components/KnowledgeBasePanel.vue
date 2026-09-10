<template>
  <div class="kb-panel">
    <!-- 1. 知识库列表视图 -->
    <div v-if="currentView === 'list'" class="kb-list-view">
      <!-- 头部 Hero 工具条 -->
      <div class="kb-hero-toolbar">
        <div>
          <h2 class="kb-page-title">企业私有知识库中心 (Enterprise RAG)</h2>
        </div>
        <div class="kb-hero-actions">
          <button v-if="canSyncDify" class="btn-secondary kb-sync-btn" :disabled="syncing" title="从 Dify 导入或同步已有知识库" @click="syncFromDify">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': syncing }"></i>
            <span>{{ syncing ? '正在从 Dify 同步...' : '从 Dify 一键同步' }}</span>
          </button>
          <button class="btn-create-agent" @click="openCreateKb">
            <i class="fa-solid fa-plus"></i>
            <span>新建知识库</span>
          </button>
        </div>
      </div>

      <section class="stats-grid kb-stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">知识库</span>
            <span class="stat-value">{{ totalKbCount }}</span>
          </div>
          <div class="stat-icon-wrapper icon-blue"><i class="fa-solid fa-book-bookmark"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">入库文档</span>
            <span class="stat-value">{{ totalDocCount }}</span>
          </div>
          <div class="stat-icon-wrapper icon-purple"><i class="fa-solid fa-file-lines"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">FAQ 问答</span>
            <span class="stat-value">{{ totalFaqCount }}</span>
          </div>
          <div class="stat-icon-wrapper icon-emerald"><i class="fa-solid fa-comments"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Dify 引擎</span>
            <span class="stat-value kb-engine-status" :class="{ offline: !difyEngineConfigured }">
              {{ difyEngineConfigured ? '在线' : '未接入' }}
            </span>
            <span class="stat-desc kb-engine-host" :title="difyEngineHost">{{ difyEngineHost }}</span>
          </div>
          <div class="stat-icon-wrapper icon-amber"><i class="fa-solid fa-link"></i></div>
        </div>
      </section>

      <section class="toolbar-section kb-toolbar">
        <div class="kb-toolbar-left">
          <div class="kb-scope-group">
            <button
              type="button"
              class="btn-kb-scope-pill"
              :class="{ active: scopeFilter === 'all' }"
              title="查看全部可见知识库（系统公共 + 我的专属）"
              @click="scopeFilter = 'all'"
            >
              <i class="fa-solid fa-layer-group"></i>
              <span>全部知识库</span>
              <span class="kb-scope-count">{{ allKbCount }}</span>
            </button>
            <button
              type="button"
              class="btn-kb-scope-pill"
              :class="{ active: scopeFilter === 'mine' }"
              title="仅筛选由我创建的专属私有知识库"
              @click="scopeFilter = 'mine'"
            >
              <i class="fa-solid fa-user-pen"></i>
              <span>我的创建</span>
              <span class="kb-scope-count">{{ myKbCount }}</span>
            </button>
            <button
              type="button"
              class="btn-kb-scope-pill"
              :class="{ active: scopeFilter === 'system' }"
              title="仅筛选平台内置的标准公共知识库"
              @click="scopeFilter = 'system'"
            >
              <i class="fa-solid fa-building-shield"></i>
              <span>公共知识库</span>
              <span class="kb-scope-count">{{ systemKbCount }}</span>
            </button>
          </div>
        </div>

          <div class="kb-toolbar-right">
          <div class="search-box-wrapper kb-search-box">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              v-model="searchKeyword"
              class="search-input"
              type="search"
              placeholder="搜索知识库名称、描述或账号..."
              @input="debounceSearch"
            >
            <button
              v-if="searchKeyword"
              type="button"
              class="btn-clear-search"
              title="清空搜索"
              @click="searchKeyword = ''; loadKnowledgeBases()"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="view-mode-group">
            <button
              type="button"
              class="btn-view-mode"
              :class="{ active: viewLayout === 'card' }"
              title="卡片网格"
              @click="viewLayout = 'card'"
            >
              <i class="fa-solid fa-table-cells-large"></i>
            </button>
            <button
              type="button"
              class="btn-view-mode"
              :class="{ active: viewLayout === 'table' }"
              title="列表展示"
              @click="viewLayout = 'table'"
            >
              <i class="fa-solid fa-list-ul"></i>
            </button>
          </div>
          <button
            type="button"
            class="btn-refresh"
            :disabled="loadingKb"
            title="刷新知识库列表"
            @click="loadKnowledgeBases"
          >
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loadingKb }"></i>
          </button>
        </div>
      </section>

      <!-- 卡片网格展示 -->
      <div v-if="loadingKb" class="kb-loading-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>正在加载知识库资产...</span>
      </div>

      <div v-else-if="displayKbList.length === 0" class="kb-empty-state">
        <div class="empty-icon-wrap"><i class="fa-solid fa-book-open"></i></div>
        <h3>{{ scopeFilter === 'mine' ? '暂无我创建的私有知识库' : (scopeFilter === 'system' ? '暂无系统公共知识库' : (searchKeyword ? '未找到符合条件的知识库' : '暂无知识库资产')) }}</h3>
        <p>{{ scopeFilter === 'mine' ? '您可以点击上方「新建知识库」创建您的专属企业资料库。' : (searchKeyword ? '尝试更换检索词或清空筛选条件。' : (canSyncDify ? '您可以新建本地知识库并自动同步至 Dify 数据集，或者直接从 Dify 一键同步。' : '您可以点击上方「新建知识库」创建您的专属企业资料库。')) }}</p>
        <div class="empty-actions">
          <button class="btn-create-agent" @click="openCreateKb">
            <i class="fa-solid fa-plus"></i><span>立即创建知识库</span>
          </button>
          <button v-if="canSyncDify" class="btn-secondary" :disabled="syncing" @click="syncFromDify">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': syncing }"></i><span>从 Dify 导入已有数据</span>
          </button>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-else-if="viewLayout === 'card'" class="kb-grid">
        <div
          v-for="kb in displayKbList"
          :key="kb.id"
          class="kb-card"
          @click="openKbDetail(kb)"
        >
          <div class="kb-card-header">
            <div class="kb-card-avatar">{{ kb.avatar || '📚' }}</div>
            <div class="kb-card-title-group">
              <h3 class="kb-card-name" :title="kb.name">{{ kb.name }}</h3>
              <div class="kb-card-badges">
                <span v-if="kb.isSystem" class="provider-badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">
                  <i class="fa-solid fa-earth-americas"></i> 公共
                </span>
                <span v-else class="provider-badge" :style="isOwnKb(kb)
                  ? 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);'
                  : 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);'">
                  <i class="fa-solid fa-user"></i> {{ accountLabel(kb) }}
                </span>
                <span class="provider-badge dify">
                  <i class="fa-solid fa-link"></i> Dify
                </span>
                <span class="search-method-badge" :class="kb.searchMethod || 'hybrid_search'">
                  <i :class="getSearchMethodIcon(kb.searchMethod)"></i> {{ getSearchMethodLabel(kb.searchMethod, kb) }}
                </span>
                <span class="model-badge" title="Embedding 向量模型">
                  <i class="fa-solid fa-cube"></i> {{ kb.embeddingModel || 'text-embedding-v3' }}
                </span>
              </div>
            </div>
          </div>

          <p class="kb-card-desc">
            {{ kb.description || '暂无业务描述，点击进入可上传文档并维护企业问答对。' }}
          </p>

          <div class="kb-card-stats">
            <div class="kb-metric">
              <span class="metric-label"><i class="fa-solid fa-file-lines"></i> 文档数</span>
              <span class="metric-value">{{ kb.documentCount || 0 }} 篇</span>
            </div>
            <div class="kb-metric">
              <span class="metric-label"><i class="fa-solid fa-comments"></i> 问答 FAQ</span>
              <span class="metric-value">{{ kb.faqCount || 0 }} 条</span>
            </div>
            <div class="kb-metric">
              <span class="metric-label"><i class="fa-solid fa-font"></i> 字符量</span>
              <span class="metric-value">{{ formatWordCount(kb.wordCount) }}</span>
            </div>
          </div>

          <div class="kb-card-footer" @click.stop>
            <span class="kb-updated-at"><i class="fa-regular fa-clock"></i> 更新于 {{ formatTime(kb.updatedAt) }}</span>
            <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
              <button
                type="button"
                class="btn-card-action btn-chat-primary"
                :title="canManageKb(kb) ? '进入管理知识库文档与问答' : '查看知识库文档与问答'"
                @click="openKbDetail(kb)"
              >
                <i :class="canManageKb(kb) ? 'fa-solid fa-arrow-right-to-bracket' : 'fa-solid fa-eye'"></i>
                <span>{{ canManageKb(kb) ? '进入管理' : '查看内容' }}</span>
              </button>
              <button
                v-if="canManageKb(kb)"
                type="button"
                class="btn-card-action btn-action-icon"
                title="编辑知识库信息"
                @click="openEditKb(kb)"
              >
                <i class="fa-regular fa-pen-to-square"></i>
              </button>
              <button
                v-if="canManageKb(kb)"
                type="button"
                class="btn-card-action btn-action-icon btn-action-danger"
                title="删除知识库"
                @click="confirmDeleteKb(kb)"
              >
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-else class="table-view-card">
        <table class="agent-table">
          <thead>
            <tr>
              <th>知识库名称</th>
              <th>所属账号</th>
              <th>提供方</th>
              <th>检索模式 / 向量模型</th>
              <th>文档数量</th>
              <th>问答(FAQ)</th>
              <th>预估字数</th>
              <th>更新时间</th>
              <th style="text-align: right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="kb in displayKbList" :key="kb.id" class="table-row-hover" @click="openKbDetail(kb)">
              <td>
                <div class="kb-table-title-cell">
                  <span class="kb-table-avatar">{{ kb.avatar || '📚' }}</span>
                  <div>
                    <div class="table-agent-title" style="display: flex; align-items: center; gap: 6px;">
                      <span>{{ kb.name }}</span>
                      <span v-if="kb.isSystem" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.15); color: #818cf8;">公共</span>
                      <span v-else style="font-size: 11px; padding: 1px 6px; border-radius: 4px;" :style="isOwnKb(kb) ? 'background: rgba(16, 185, 129, 0.15); color: #34d399;' : 'background: rgba(245, 158, 11, 0.15); color: #fbbf24;'">{{ accountLabel(kb) }}</span>
                    </div>
                    <div class="table-agent-code">{{ kb.description || '暂无描述' }}</div>
                  </div>
                </div>
              </td>
              <td>{{ kb.isSystem ? '系统公共' : accountLabel(kb) }}</td>
              <td>
                <span class="provider-badge dify">Dify 外挂</span>
              </td>
              <td>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                  <span class="search-method-badge" :class="kb.searchMethod || 'hybrid_search'">
                    <i :class="getSearchMethodIcon(kb.searchMethod)"></i> {{ getSearchMethodLabel(kb.searchMethod, kb) }}
                  </span>
                  <span class="model-badge-sub">
                    <i class="fa-solid fa-cube"></i> {{ kb.embeddingModel || 'text-embedding-v3' }}
                  </span>
                </div>
              </td>
              <td><strong class="text-blue">{{ kb.documentCount || 0 }}</strong> 篇</td>
              <td><strong class="text-emerald">{{ kb.faqCount || 0 }}</strong> 条</td>
              <td>{{ formatWordCount(kb.wordCount) }}</td>
              <td>{{ formatTime(kb.updatedAt) }}</td>
              <td style="text-align: right; white-space: nowrap;" @click.stop>
                <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
                  <button
                    type="button"
                    class="btn-card-action btn-chat-primary"
                    :title="canManageKb(kb) ? '进入管理知识库' : '查看知识库'"
                    @click="openKbDetail(kb)"
                  >
                    <i :class="canManageKb(kb) ? 'fa-solid fa-arrow-right-to-bracket' : 'fa-solid fa-eye'"></i>
                    <span>{{ canManageKb(kb) ? '进入管理' : '查看内容' }}</span>
                  </button>
                  <button
                    v-if="canManageKb(kb)"
                    type="button"
                    class="btn-card-action btn-action-icon"
                    title="编辑知识库信息"
                    @click="openEditKb(kb)"
                  >
                    <i class="fa-regular fa-pen-to-square"></i>
                  </button>
                  <button
                    v-if="canManageKb(kb)"
                    type="button"
                    class="btn-card-action btn-action-icon btn-action-danger"
                    title="删除知识库"
                    @click="confirmDeleteKb(kb)"
                  >
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控制 -->
      <section v-if="totalKbCount > 0" class="pagination-container">
        <div class="page-summary">
          共 {{ totalKbCount }} 个知识库 · 第 {{ kbPage }} / {{ kbTotalPages }} 页
          <select
            v-model.number="kbPageSize"
            class="status-select"
            style="margin-left: 12px; padding: 4px 8px; font-size: 12px;"
            @change="onKbPageSizeChange"
          >
            <option :value="6">6 条/页</option>
            <option :value="12">12 条/页</option>
            <option :value="24">24 条/页</option>
          </select>
        </div>
        <div class="pagination-controls">
          <button
            type="button"
            class="btn-page"
            :disabled="kbPage <= 1"
            title="上一页"
            @click="changeKbPage(-1)"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button
            v-for="n in kbTotalPages"
            :key="n"
            type="button"
            class="btn-page"
            :class="{ active: n === kbPage }"
            @click="goToKbPage(n)"
          >
            {{ n }}
          </button>
          <button
            type="button"
            class="btn-page"
            :disabled="kbPage >= kbTotalPages"
            title="下一页"
            @click="changeKbPage(1)"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </section>
    </div>

    <!-- 2. 知识库详情与文档/FAQ管理视图 -->
    <div v-else class="kb-detail-view">
      <!-- 顶部返回导航与知识库信息 -->
      <div class="kb-detail-header">
        <button class="btn-secondary kb-back-btn" @click="backToList">
          <i class="fa-solid fa-arrow-left"></i> <span>返回知识库列表</span>
        </button>

        <div class="kb-detail-hero">
          <div class="kb-detail-avatar">{{ selectedKb?.avatar || '📚' }}</div>
          <div class="kb-detail-meta">
            <div class="kb-title-row">
              <h2>{{ selectedKb?.name }}</h2>
              <span class="provider-badge dify"><i class="fa-solid fa-link"></i> Dify: {{ selectedKb?.externalDatasetId ? selectedKb.externalDatasetId.substring(0, 14) + '...' : '未绑定' }}</span>
              <span class="search-method-badge" :class="selectedKb?.searchMethod || 'hybrid_search'">
                <i :class="getSearchMethodIcon(selectedKb?.searchMethod)"></i> {{ getSearchMethodLabel(selectedKb?.searchMethod, selectedKb) }} (Top {{ selectedKb?.topK || 3 }})
              </span>
              <span class="model-badge" title="Embedding 向量模型">
                <i class="fa-solid fa-cube"></i> {{ selectedKb?.embeddingModel || 'text-embedding-v3' }}
              </span>
              <span v-if="selectedKb?.rerankEnabled" class="indexing-badge" title="重排序已开启">
                <i class="fa-solid fa-arrows-spin"></i> Rerank 开启
              </span>
            </div>
            <p class="kb-desc-text">{{ selectedKb?.description || '暂无业务描述' }}</p>
          </div>
          <div class="kb-detail-top-actions">
            <button v-if="canManageKb(selectedKb)" class="btn-secondary" title="编辑知识库信息" @click="openEditKb(selectedKb)">
              <i class="fa-solid fa-pen-to-square"></i> <span>编辑信息</span>
            </button>
          </div>
        </div>

        <!-- 只读权限提示条 -->
        <div v-if="!canManageKb(selectedKb)" style="margin: 14px 0 0 0; padding: 10px 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; font-size: 13px; color: #60a5fa; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-shield-halved"></i>
          <span>您当前仅具备该知识库的只读使用权限（归属于: {{ selectedKb?.isSystem ? '系统公共' : (selectedKb?.ownerUsername || '其他开发者') }}），无法新增或修改文档与问答。</span>
        </div>
      </div>

      <!-- 内部子 Tab 切换（文档库 vs 问答FAQ） -->
      <div class="kb-subtabs-bar">
        <button
          class="kb-subtab-btn"
          :class="{ active: activeSubTab === 'documents' }"
          @click="activeSubTab = 'documents'"
        >
          <i class="fa-solid fa-folder-open"></i>
          <span>文件文档库 ({{ selectedKb?.documentCount || 0 }})</span>
        </button>
        <button
          class="kb-subtab-btn"
          :class="{ active: activeSubTab === 'faqs' }"
          @click="activeSubTab = 'faqs'"
        >
          <i class="fa-solid fa-comments-question-check"></i>
          <span>业务问答与 FAQ ({{ selectedKb?.faqCount || 0 }})</span>
        </button>
      </div>

      <!-- TAB 1: 文件文档库 -->
      <div v-show="activeSubTab === 'documents'" class="kb-tab-content">
        <!-- 上传区域 -->
        <div v-if="canManageKb(selectedKb)" class="kb-upload-card">
          <div class="upload-guide-header">
            <div>
              <h4 class="upload-guide-title"><i class="fa-solid fa-cloud-arrow-up text-blue"></i> 上传文档入库</h4>
              <p class="upload-guide-sub">
                支持 <strong>MARKDOWN、PDF、VTT、PROPERTIES、CSV、HTML、HTM、XLSX、XLS、MDX、DOCX、TXT、MD</strong> 等格式；单批最多 <strong>5</strong> 个文件，单个文件不超过 <strong>15 MB</strong>。
              </p>
            </div>
            <div class="upload-steps-indicator">
              <span class="step-badge active"><i class="fa-solid fa-1"></i> 选择文件</span>
              <span class="step-arrow">→</span>
              <span class="step-badge active"><i class="fa-solid fa-2"></i> Dify 自动清洗与切片</span>
              <span class="step-arrow">→</span>
              <span class="step-badge active"><i class="fa-solid fa-3"></i> 向量构建就绪</span>
            </div>
          </div>

          <!-- 拖拽上传框 -->
          <div
            class="kb-dropzone"
            :class="{ dragging: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept=".markdown,.pdf,.vtt,.properties,.csv,.html,.htm,.xlsx,.xls,.mdx,.docx,.txt,.md"
              style="display: none;"
              @change="handleFileSelect"
            >
            <div class="dropzone-inner">
              <div class="dropzone-icon">
                <i :class="uploading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-circle-plus'"></i>
              </div>
              <div class="dropzone-text">
                <div class="dropzone-primary">
                  {{ uploading ? '正在向 Dify 知识库切片上传中...' : '拖拽文档到此处，或点击浏览本地文件' }}
                </div>
                <div class="dropzone-hint">
                  已适配 Dify 1.16+ 标准处理规则，上传后自动启动后台语义向量嵌入
                </div>
              </div>
            </div>
          </div>

          <!-- 待上传文件队列展示 (如有) -->
          <div v-if="pendingFiles.length > 0" class="pending-upload-list">
            <div class="pending-list-header">
              <span>待上传队列 ({{ pendingFiles.length }}/5):</span>
              <button class="btn-text-danger" @click="pendingFiles = []">清空</button>
            </div>
            <div class="pending-tags-row">
              <span v-for="(f, i) in pendingFiles" :key="i" class="pending-file-pill">
                <i class="fa-solid fa-paperclip"></i>
                <span class="pending-filename">{{ f.name }}</span>
                <span class="pending-filesize">({{ formatFileSize(f.size) }})</span>
                <button type="button" class="btn-remove-pending" @click.stop="removePendingFile(i)">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </span>
            </div>
            <div class="pending-submit-row">
              <button class="btn-create-agent" :disabled="uploading" @click="executeUpload">
                <i :class="uploading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrow-up-from-bracket'"></i>
                <span>{{ uploading ? '上传处理中...' : '立即确认上传' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 文档列表卡片 -->
        <div class="table-view-card kb-docs-table-card">
          <div class="table-header-toolbar">
            <div class="doc-search-input">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input
                v-model="docSearchKeyword"
                placeholder="搜索文档名称..."
                @input="debounceDocSearch"
              >
            </div>
            <div class="doc-status-filter">
              <select v-model="docStatusFilter" class="status-select" @change="loadDocuments">
                <option value="">全部状态</option>
                <option value="completed">索引就绪 (Completed)</option>
                <option value="indexing">索引中 (Indexing)</option>
                <option value="waiting">排队中 (Waiting)</option>
                <option value="error">异常失败 (Error)</option>
              </select>
            </div>
          </div>

          <table class="agent-table">
            <thead>
              <tr>
                <th>文档名称</th>
                <th>格式</th>
                <th>文件大小</th>
                <th>字数统计</th>
                <th>预估 Tokens</th>
                <th>索引状态</th>
                <th>入库时间</th>
                <th style="text-align: right;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingDocs">
                <td colspan="8" style="text-align:center; padding: 30px;">
                  <i class="fa-solid fa-spinner fa-spin"></i> 正在加载文档数据...
                </td>
              </tr>
              <tr v-else-if="docList.length === 0">
                <td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">
                  知识库中暂无文档，请在上方上传文档
                </td>
              </tr>
              <tr v-for="doc in docList" :key="doc.id">
                <td>
                  <div class="doc-name-cell">
                    <i :class="getFileIconClass(doc.extension)"></i>
                    <span class="doc-filename" :title="doc.name">{{ doc.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="doc-ext-pill">{{ (doc.extension || 'txt').toUpperCase() }}</span>
                </td>
                <td>{{ formatFileSize(doc.fileSize) }}</td>
                <td>{{ doc.wordCount ? doc.wordCount.toLocaleString() : '-' }}</td>
                <td>{{ doc.tokenCount ? doc.tokenCount.toLocaleString() : '-' }}</td>
                <td>
                  <span class="badge-status" :class="getDocStatusBadge(doc.indexingStatus)">
                    <span class="status-dot"></span>
                    <span>{{ getDocStatusLabel(doc.indexingStatus) }}</span>
                  </span>
                </td>
                <td>{{ formatTime(doc.createdAt) }}</td>
                <td style="text-align: right; white-space: nowrap;">
                  <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
                    <button
                      type="button"
                      class="btn-card-action btn-action-icon"
                      title="刷新最新索引状态"
                      @click="refreshDocStatus(doc)"
                    >
                      <i class="fa-solid fa-rotate"></i>
                    </button>
                    <button
                      v-if="canManageKb(selectedKb)"
                      type="button"
                      class="btn-card-action btn-action-icon btn-action-danger"
                      title="删除文档"
                      @click="confirmDeleteDoc(doc)"
                    >
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 文档分页 -->
          <section v-if="docTotalCount > 0" class="pagination-container">
            <div class="page-summary">
              共 {{ docTotalCount }} 篇知识文档 · 第 {{ docPage }} / {{ docTotalPages }} 页
              <select
                v-model.number="docPageSize"
                class="status-select"
                style="margin-left: 12px; padding: 4px 8px; font-size: 12px;"
                @change="onDocPageSizeChange"
              >
                <option :value="10">10 条/页</option>
                <option :value="20">20 条/页</option>
                <option :value="50">50 条/页</option>
              </select>
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="btn-page"
                :disabled="docPage <= 1"
                title="上一页"
                @click="changeDocPage(-1)"
              >
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button
                v-for="n in docTotalPages"
                :key="n"
                type="button"
                class="btn-page"
                :class="{ active: n === docPage }"
                @click="goToDocPage(n)"
              >
                {{ n }}
              </button>
              <button
                type="button"
                class="btn-page"
                :disabled="docPage >= docTotalPages"
                title="下一页"
                @click="changeDocPage(1)"
              >
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </section>
        </div>
      </div>

      <!-- TAB 2: 业务问答与 FAQ -->
      <div v-show="activeSubTab === 'faqs'" class="kb-tab-content">
        <div class="kb-faq-toolbar">
          <div class="faq-categories-list">
            <button
              v-for="cat in faqCategories"
              :key="cat"
              type="button"
              class="category-pill-btn"
              :class="{ active: selectedFaqCategory === cat }"
              @click="selectFaqCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
          <div class="faq-toolbar-right">
            <div class="faq-search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input
                v-model="faqSearchKeyword"
                placeholder="搜索问题或回答内容..."
                @input="debounceFaqSearch"
              >
            </div>
            <button v-if="canManageKb(selectedKb)" class="btn-create-agent" @click="openCreateFaq">
              <i class="fa-solid fa-plus"></i> <span>新增问答 (FAQ)</span>
            </button>
          </div>
        </div>

        <div v-if="loadingFaqs" class="kb-loading-state">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>正在加载问答对...</span>
        </div>

        <div v-else-if="faqList.length === 0" class="kb-empty-state" style="padding: 40px;">
          <div class="empty-icon-wrap"><i class="fa-solid fa-comments"></i></div>
          <h3>暂无相关问答 (FAQ)</h3>
          <p>录入高频业务问答对，系统将自动向量化并同步到底层 Dify RAG 引擎，提升智能体应答精准度。</p>
          <button v-if="canManageKb(selectedKb)" class="btn-create-agent" @click="openCreateFaq">
            <i class="fa-solid fa-plus"></i><span>立即添加第一条问答</span>
          </button>
        </div>

        <div v-else class="faq-cards-list">
          <div v-for="faq in faqList" :key="faq.id" class="faq-card">
            <div class="faq-card-header">
              <div class="faq-q-line">
                <span class="badge-q">问</span>
                <h4 class="faq-q-text">{{ faq.question }}</h4>
              </div>
              <div class="faq-meta-badges">
                <span class="faq-category-pill">{{ faq.category || '通用问答' }}</span>
                <span class="faq-sync-pill" :title="faq.externalDocId ? '已成功向量化同步至 Dify' : '未同步'">
                  <i class="fa-solid fa-check-double"></i> Dify 向量就绪
                </span>
              </div>
            </div>

            <div class="faq-answer-block">
              <span class="badge-a">答</span>
              <div class="faq-answer-content">
                <div class="faq-text-body">{{ faq.answer }}</div>
                <!-- 图片预览区 -->
                <div v-if="getFaqImages(faq).length > 0" class="faq-images-gallery">
                  <div
                    v-for="(img, imgIdx) in getFaqImages(faq)"
                    :key="imgIdx"
                    class="faq-image-thumbnail"
                    @click="previewImage(img)"
                  >
                    <img :src="img" alt="FAQ 附件">
                    <span class="img-zoom-hint"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="faq-card-footer">
              <span class="faq-time"><i class="fa-regular fa-clock"></i> 创建于 {{ formatTime(faq.createdAt) }}</span>
              <div v-if="canManageKb(selectedKb)" class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap;">
                <button
                  type="button"
                  class="btn-card-action btn-action-icon"
                  title="编辑问答"
                  @click="openEditFaq(faq)"
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button
                  type="button"
                  class="btn-card-action btn-action-icon btn-action-danger"
                  title="删除问答"
                  @click="confirmDeleteFaq(faq)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- FAQ 分页 -->
        <section v-if="faqTotalCount > 0" class="pagination-container">
          <div class="page-summary">
            共 {{ faqTotalCount }} 条问答 FAQ · 第 {{ faqPage }} / {{ faqTotalPages }} 页
            <select
              v-model.number="faqPageSize"
              class="status-select"
              style="margin-left: 12px; padding: 4px 8px; font-size: 12px;"
              @change="onFaqPageSizeChange"
            >
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
            </select>
          </div>
          <div class="pagination-controls">
            <button
              type="button"
              class="btn-page"
              :disabled="faqPage <= 1"
              title="上一页"
              @click="changeFaqPage(-1)"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button
              v-for="n in faqTotalPages"
              :key="n"
              type="button"
              class="btn-page"
              :class="{ active: n === faqPage }"
              @click="goToFaqPage(n)"
            >
              {{ n }}
            </button>
            <button
              type="button"
              class="btn-page"
              :disabled="faqPage >= faqTotalPages"
              title="下一页"
              @click="changeFaqPage(1)"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </section>
      </div>
    </div>

    <!-- 模态框 1: 创建/编辑知识库 -->
    <div class="modal-backdrop" :class="{ open: kbModalOpen }">
      <div class="modal-dialog" style="max-width: 680px;">
        <div class="modal-header">
          <h3>{{ kbForm.id ? '编辑知识库配置' : '创建新知识库 (Dify RAG)' }}</h3>
          <button class="btn-modal-close" @click="kbModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form @submit.prevent="saveKnowledgeBase">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">知识库名称 *</label>
              <input v-model="kbForm.name" class="form-control-styled" placeholder="例如：产品知识库、售后排障手册..." required>
            </div>

            <div class="form-group">
              <label class="form-label">知识库头像 / 图标</label>
              <div class="emoji-selector-list">
                <button
                  v-for="em in emojiList"
                  :key="em"
                  type="button"
                  class="emoji-btn"
                  :class="{ active: kbForm.avatar === em }"
                  @click="kbForm.avatar = em"
                >
                  {{ em }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">底层 RAG 服务适配</label>
              <div class="provider-radio-cards">
                <div class="provider-radio-card active">
                  <div class="provider-radio-title">
                    <i class="fa-solid fa-link text-blue"></i> Dify 外挂 RAG 知识库
                  </div>
                  <div class="provider-radio-desc">
                    与后端配置好的 Dify 引擎双向 1:1 映射并自动创建数据集
                  </div>
                </div>
              </div>
            </div>

            <!-- Embedding 向量模型 -->
            <div class="form-group">
              <label class="form-label">Embedding 向量模型</label>
              <div class="embedding-model-box">
                <div class="embedding-model-item">
                  <div class="model-info-row">
                    <span class="model-name"><i class="fa-solid fa-cube text-blue"></i> text-embedding-v3</span>
                    <span class="tag-recommend">官方推荐</span>
                  </div>
                  <div class="model-desc">
                    通义千问高质量向量模型 (Provider: 通义千问)，适配 Dify 高精度语义切片与向量索引。
                  </div>
                </div>
                <div v-if="kbForm.id" class="input-hint text-amber" style="margin-top: 6px;">
                  <i class="fa-solid fa-circle-info"></i> Dify 规则：已建立知识库的 Embedding 模型在初始化后不可变更
                </div>
              </div>
            </div>

            <!-- 检索设置 (混合检索 / 向量检索 / 全文检索) -->
            <div class="form-group">
              <label class="form-label">检索设置 (Retrieval Setting) *</label>
              <div class="retrieval-method-grid">
                <div
                  class="retrieval-card"
                  :class="{ active: kbForm.searchMethod === 'hybrid_search' }"
                  @click="kbForm.searchMethod = 'hybrid_search'"
                >
                  <div class="retrieval-card-top">
                    <i class="fa-solid fa-layer-group" style="color: #6366f1;"></i>
                    <span class="retrieval-card-title">混合检索 (Hybrid)</span>
                    <span class="tag-recommend">推荐</span>
                  </div>
                  <p class="retrieval-card-desc">结合向量检索与全文检索双路召回，综合重排评分(Rerank)，精度与泛化能力最佳</p>
                </div>
                <div
                  class="retrieval-card"
                  :class="{ active: kbForm.searchMethod === 'semantic_search' }"
                  @click="kbForm.searchMethod = 'semantic_search'"
                >
                  <div class="retrieval-card-top">
                    <i class="fa-solid fa-brain" style="color: #0284c7;"></i>
                    <span class="retrieval-card-title">向量检索 (Semantic)</span>
                  </div>
                  <p class="retrieval-card-desc">生成查询向量并搜索最相似文本分段，擅长理解语义、意图和近义表达</p>
                </div>
                <div
                  class="retrieval-card"
                  :class="{ active: kbForm.searchMethod === 'full_text_search' }"
                  @click="kbForm.searchMethod = 'full_text_search'"
                >
                  <div class="retrieval-card-top">
                    <i class="fa-solid fa-font" style="color: #059669;"></i>
                    <span class="retrieval-card-title">全文检索 (Full-text)</span>
                  </div>
                  <p class="retrieval-card-desc">基于传统分词与倒排索引，擅长精准匹配专有名词、产品型号与特定编号</p>
                </div>
              </div>
            </div>

            <!-- 检索参数微调 -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Top K 召回条数: <strong>{{ kbForm.topK }}</strong> 条</label>
                <div class="slider-control-row">
                  <input
                    type="range"
                    v-model.number="kbForm.topK"
                    min="1"
                    max="10"
                    step="1"
                    class="form-range-styled"
                  >
                  <span class="slider-num-pill">{{ kbForm.topK }}</span>
                </div>
                <div class="input-hint">向智能体对话上下文注入的最佳匹配段落数（建议 3~5）</div>
              </div>

            </div>

            <!-- 混合检索重排与权重设置 -->
            <div v-if="kbForm.searchMethod === 'hybrid_search'" class="hybrid-rerank-container">
              <div class="rerank-mode-header">
                <label class="form-label" style="margin-bottom: 0;">
                  <i class="fa-solid fa-sliders text-blue"></i> 混合检索重排机制 (Reranking)
                </label>
                <div class="rerank-mode-tabs">
                  <button
                    type="button"
                    class="mode-tab-btn"
                    :class="{ active: kbForm.rerankMode === 'weighted_score' }"
                    @click="kbForm.rerankMode = 'weighted_score'"
                  >
                    <i class="fa-solid fa-scale-balanced"></i> 权重设置 (推荐)
                  </button>
                  <button
                    type="button"
                    class="mode-tab-btn"
                    :class="{ active: kbForm.rerankMode === 'reranking_model' }"
                    @click="kbForm.rerankMode = 'reranking_model'"
                  >
                    <i class="fa-solid fa-arrows-spin"></i> Rerank 模型
                  </button>
                </div>
              </div>

              <!-- 方案 1: 权重设置 (Weighted score) -->
              <div v-if="kbForm.rerankMode === 'weighted_score'" class="weights-control-card">
                <div class="weights-labels-row">
                  <div class="weight-label-item">
                    <span class="weight-title"><i class="fa-solid fa-brain" style="color: #3b82f6;"></i> 语义检索权重 (Vector)</span>
                    <span class="weight-value" style="color: #3b82f6;">{{ Math.round((kbForm.vectorWeight || 0.7) * 100) }}% ({{ kbForm.vectorWeight || 0.7 }})</span>
                  </div>
                  <div class="weight-label-item" style="text-align: right;">
                    <span class="weight-title"><i class="fa-solid fa-font" style="color: #10b981;"></i> 关键字检索权重 (Keyword)</span>
                    <span class="weight-value" style="color: #10b981;">{{ Math.round((kbForm.keywordWeight || 0.3) * 100) }}% ({{ kbForm.keywordWeight || 0.3 }})</span>
                  </div>
                </div>

                <div class="weight-slider-wrap">
                  <input
                    type="range"
                    v-model.number="kbForm.vectorWeight"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    class="form-range-styled weight-range"
                    @input="onVectorWeightChange"
                  >
                </div>

                <div class="weights-ratio-bar">
                  <div class="ratio-segment vector-segment" :style="{ width: ((kbForm.vectorWeight || 0.7) * 100) + '%' }">
                    语义 {{ Math.round((kbForm.vectorWeight || 0.7) * 100) }}%
                  </div>
                  <div class="ratio-segment keyword-segment" :style="{ width: ((kbForm.keywordWeight || 0.3) * 100) + '%' }">
                    关键词 {{ Math.round((kbForm.keywordWeight || 0.3) * 100) }}%
                  </div>
                </div>

                <div class="input-hint">
                  <i class="fa-solid fa-circle-info"></i> 默认 7:3 黄金权重：语义权重保障概念和上下文泛化召回，关键词权重保障专有名词与精确匹配。
                </div>
              </div>

              <!-- 方案 2: Rerank 模型 (Reranking model) -->
              <div v-else class="rerank-model-card">
                <div class="model-info-row">
                  <span class="model-name"><i class="fa-solid fa-arrows-spin" style="color: #6366f1;"></i> {{ kbForm.rerankModel || 'qwen3-rerank' }}</span>
                  <span class="tag-recommend">通义千问重排模型</span>
                </div>
                <div class="model-desc">
                  通义千问专有二次重排序模型 (Provider: 通义千问)，对混合召回候选切片进行交叉重排打分，大幅提升复杂长文的检索精度。
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">业务功能与描述</label>
              <textarea
                v-model="kbForm.description"
                class="form-control-styled"
                rows="3"
                placeholder="详细说明此知识库包含的资料范围及使用场景..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="kbModalOpen = false">取消</button>
            <button type="submit" class="btn-create-agent" :disabled="savingKb">
              <i :class="savingKb ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i>
              <span>{{ savingKb ? '正在提交 Dify 同步...' : (kbForm.id ? '保存配置修改' : '立即创建知识库') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 模态框 2: 新增/编辑 FAQ 问答 -->
    <div class="modal-backdrop" :class="{ open: faqModalOpen }">
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ faqForm.id ? '编辑问答 (FAQ)' : '新增高频问答 (FAQ)' }}</h3>
          <button class="btn-modal-close" @click="faqModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form @submit.prevent="saveFaq">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">用户常见问题 (Question) *</label>
              <input
                v-model="faqForm.question"
                class="form-control-styled"
                placeholder="例如：智能体 API 密钥丢失如何重置？"
                required
              >
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">业务分类标签 *</label>
                <input
                  v-model="faqForm.category"
                  class="form-control-styled"
                  placeholder="例如：产品功能、售后支持、账号管理..."
                  required
                >
              </div>
              <div class="form-group">
                <label class="form-label">常见分类快捷填入</label>
                <select class="form-control-styled" @change="$event.target.value && (faqForm.category = $event.target.value)">
                  <option value="">-- 选择预设分类 --</option>
                  <option value="产品功能">产品功能</option>
                  <option value="售后技术">售后技术</option>
                  <option value="业务咨询">业务咨询</option>
                  <option value="账号合规">账号合规</option>
                  <option value="常见故障">常见故障</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">权威回答内容 (Answer) *</label>
              <textarea
                v-model="faqForm.answer"
                class="form-control-styled"
                rows="5"
                placeholder="支持清晰文字、步骤列表及 Markdown 格式说明..."
                required
              ></textarea>
            </div>

            <!-- FAQ 图片附件上传与图文支持 -->
            <div class="form-group">
              <div class="faq-upload-label-row">
                <label class="form-label">回答附图 (支持多张图片 / 图文并茂)</label>
                <label class="btn-upload-faq-img" :class="{ disabled: uploadingFaqImg }">
                  <i :class="uploadingFaqImg ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-image'"></i>
                  <span>{{ uploadingFaqImg ? '上传中...' : '上传图片附件' }}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style="display: none;"
                    :disabled="uploadingFaqImg"
                    @change="handleFaqImageUpload"
                  >
                </label>
              </div>

              <div v-if="faqForm.imageUrls && faqForm.imageUrls.length > 0" class="faq-form-imgs-preview">
                <div v-for="(imgUrl, idx) in faqForm.imageUrls" :key="idx" class="faq-form-img-chip">
                  <img :src="imgUrl" alt="预览">
                  <button type="button" class="btn-del-chip" title="删除图片" @click="removeFaqImage(idx)">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
              <p class="section-hint" style="margin-top: 6px;">
                上传的图片将作为附件渲染在 FAQ 卡片中，并在语义检索时提供完整视觉参考。
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="faqModalOpen = false">取消</button>
            <button type="submit" class="btn-create-agent" :disabled="savingFaq">
              <i :class="savingFaq ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i>
              <span>{{ savingFaq ? '保存并同步中...' : (faqForm.id ? '保存修改' : '保存并向量化') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 模态框 3: 删除确认弹窗 -->
    <div class="modal-backdrop" :class="{ open: deleteModalOpen }">
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <h3>删除确认</h3>
          <button class="btn-modal-close" @click="deleteModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" style="padding: 20px 24px;">
          <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
            确定要彻底删除 <strong>{{ pendingDeleteTitle }}</strong> 吗？
            <br>
            <span style="color: var(--accent-rose); font-size: 12.5px;">此操作将同步清理 Dify 对应的外部数据集/文档切片，不可撤销！</span>
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="deleteModalOpen = false">取消</button>
          <button type="button" class="btn-danger-confirm" :disabled="deleting" @click="executeDelete">
            {{ deleting ? '删除中...' : '确认彻底删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 图片大图灯箱预览 -->
    <div v-if="previewImgUrl" class="image-lightbox-overlay" @click="previewImgUrl = null">
      <div class="image-lightbox-box" @click.stop>
        <img :src="previewImgUrl" alt="大图预览">
        <button class="btn-lightbox-close" @click="previewImgUrl = null">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { accountLabel } from '../composables/useAccountOptions'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  currentUser: {
    type: Object,
    default: () => ({})
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  }
})

const { showToast } = useToast()

const effectiveUser = computed(() => {
  if (props.user && Object.keys(props.user).length > 0) return props.user
  if (props.currentUser && Object.keys(props.currentUser).length > 0) return props.currentUser
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})

const isSuperAdmin = computed(() => {
  const u = effectiveUser.value
  if (!u || !u.role) return false
  if (u.role === 'DEVELOPER' || u.role === 'VIEWER') return false
  return props.isSuperAdmin === true || u.role === 'SUPER_ADMIN' || u.role === 'System Admin' || u.username === 'admin'
})

const canSyncDify = computed(() => {
  const u = effectiveUser.value
  if (!u || !u.role) return false
  if (u.role === 'DEVELOPER' || u.role === 'VIEWER') return false
  return props.isSuperAdmin === true || u.role === 'SUPER_ADMIN' || u.role === 'System Admin' || u.username === 'admin'
})

const KB_VIEW_LAYOUT_KEY = 'kbViewLayout'

// 视图与导航控制
const currentView = ref('list') // 'list' | 'detail'
const viewLayout = ref(localStorage.getItem(KB_VIEW_LAYOUT_KEY) === 'table' ? 'table' : 'card')
let persistLayoutReady = false
watch(viewLayout, async (mode) => {
  localStorage.setItem(KB_VIEW_LAYOUT_KEY, mode)
  if (!persistLayoutReady) return
  await http.put('/api/auth/preferences', { kbViewLayout: mode })
})
const activeSubTab = ref('documents') // 'documents' | 'faqs'
const selectedKb = ref(null)

// 知识库列表状态
const kbList = ref([])
const scopeFilter = ref('all') // 'all' | 'mine' | 'system'
const loadingKb = ref(false)
const syncing = ref(false)
const searchKeyword = ref('')
const difyEngineHost = ref('未配置')
const difyEngineConfigured = ref(false)
const kbPage = ref(1)
const kbPageSize = ref(12)
const kbTotalPages = ref(1)
const totalKbCount = ref(0)
let searchTimer = null

const allKbCount = computed(() => totalKbCount.value || kbList.value.length)
const myKbCount = computed(() => kbList.value.filter(k => !k.isSystem && (k.ownerId === effectiveUser.value?.id || k.ownerUsername === effectiveUser.value?.username)).length)
const systemKbCount = computed(() => kbList.value.filter(k => k.isSystem).length)

function canManageKb(kb) {
  if (!kb) return false
  if (isSuperAdmin.value) return true
  if (kb.isSystem) return false
  return isOwnKb(kb)
}

function isOwnKb(kb) {
  if (!kb) return false
  return kb.ownerId === effectiveUser.value?.id || kb.ownerUsername === effectiveUser.value?.username
}

const displayKbList = computed(() => {
  if (scopeFilter.value === 'mine') {
    return kbList.value.filter(k => !k.isSystem && (k.ownerId === effectiveUser.value?.id || k.ownerUsername === effectiveUser.value?.username))
  }
  if (scopeFilter.value === 'system') {
    return kbList.value.filter(k => k.isSystem)
  }
  return kbList.value
})

// 文档列表状态
const docList = ref([])
const loadingDocs = ref(false)
const docSearchKeyword = ref('')
const docStatusFilter = ref('')
const docPage = ref(1)
const docPageSize = ref(10)
const docTotalPages = ref(1)
const docTotalCount = ref(0)
let docSearchTimer = null

// 文件上传状态
const isDragging = ref(false)
const uploading = ref(false)
const pendingFiles = ref([])
const fileInputRef = ref(null)

// FAQ 列表状态
const faqList = ref([])
const loadingFaqs = ref(false)
const faqCategories = ref(['全部'])
const selectedFaqCategory = ref('全部')
const faqSearchKeyword = ref('')
const faqPage = ref(1)
const faqPageSize = ref(10)
const faqTotalPages = ref(1)
const faqTotalCount = ref(0)
let faqSearchTimer = null

// 模态框状态
const kbModalOpen = ref(false)
const savingKb = ref(false)
const kbForm = reactive({
  id: '',
  name: '',
  description: '',
  avatar: '📚',
  provider: 'DIFY',
  embeddingModel: 'text-embedding-v3',
  embeddingProvider: 'langgenius/tongyi/tongyi',
  searchMethod: 'hybrid_search',
  topK: 3,
  rerankEnabled: true,
  rerankMode: 'weighted_score',
  rerankModel: 'qwen3-rerank',
  rerankModelProvider: 'langgenius/tongyi/tongyi',
  vectorWeight: 0.7,
  keywordWeight: 0.3
})

const faqModalOpen = ref(false)
const savingFaq = ref(false)
const uploadingFaqImg = ref(false)
const faqForm = reactive({
  id: '',
  question: '',
  answer: '',
  category: '通用问答',
  contentType: 'TEXT',
  imageUrls: []
})

const deleteModalOpen = ref(false)
const deleting = ref(false)
const pendingDeleteType = ref('') // 'kb' | 'doc' | 'faq'
const pendingDeleteItem = ref(null)
const pendingDeleteTitle = ref('')

const previewImgUrl = ref(null)

const emojiList = ['📚', '💡', '📑', '🔬', '🤖', '⚖️', '💻', '🎧', '🚀', '📊', '🛡️', '🌐']

// 综合统计计算
const totalDocCount = computed(() => {
  return kbList.value.reduce((sum, item) => sum + Number(item.documentCount || 0), 0)
})
const totalFaqCount = computed(() => {
  return kbList.value.reduce((sum, item) => sum + Number(item.faqCount || 0), 0)
})

// ==================== 知识库相关逻辑 ====================

async function loadEngineInfo() {
  const res = await http.get('/api/knowledge-engine')
  if (res.success && res.data) {
    difyEngineConfigured.value = !!res.data.configured
    difyEngineHost.value = res.data.host || res.data.baseUrl || '未配置'
  } else {
    difyEngineConfigured.value = false
    difyEngineHost.value = '未配置'
  }
}

async function loadKnowledgeBases() {
  loadingKb.value = true
  const res = await http.get('/api/knowledge-bases', {
    keyword: searchKeyword.value,
    page: kbPage.value,
    size: kbPageSize.value
  })
  loadingKb.value = false
  if (res.success && res.data) {
    kbList.value = res.data.records || []
    totalKbCount.value = res.data.total || 0
    kbTotalPages.value = Math.max(1, Math.ceil(res.data.total / kbPageSize.value))
  }
}

function debounceSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    kbPage.value = 1
    loadKnowledgeBases()
  }, 300)
}

function changeKbPage(delta) {
  const target = kbPage.value + delta
  if (target >= 1 && target <= kbTotalPages.value) {
    kbPage.value = target
    loadKnowledgeBases()
  }
}

function onKbPageSizeChange() {
  kbPage.value = 1
  loadKnowledgeBases()
}

function goToKbPage(p) {
  if (p >= 1 && p <= kbTotalPages.value) {
    kbPage.value = p
    loadKnowledgeBases()
  }
}

async function syncFromDify() {
  syncing.value = true
  const res = await http.post('/api/knowledge-bases/sync-from-dify')
  syncing.value = false
  if (res.success) {
    const importedKb = res.data?.importedKnowledgeBases || 0
    const importedDocs = res.data?.importedDocuments || 0
    const staleCount = Number(res.data?.staleCount || 0)
    const staleNames = (res.data?.staleKnowledgeBases || [])
      .map(item => item.name)
      .filter(Boolean)
      .slice(0, 3)
      .join('、')
    if (staleCount > 0) {
      showToast(
        `已同步当前 Dify（${res.data?.engineHost || difyEngineHost.value}）：导入 ${importedKb} 个知识库、${importedDocs} 篇文档。另有 ${staleCount} 个本地知识库在当前引擎上已失效${staleNames ? '（' + staleNames + (staleCount > 3 ? ' 等' : '') + '）' : ''}，对话检索不会命中，请解绑智能体后删除或重新导入。`,
        'warning',
        6500
      )
    } else {
      showToast(`Dify 知识库同步成功: 导入 ${importedKb} 个知识库, ${importedDocs} 篇文档`, 'success')
    }
    await loadEngineInfo()
    loadKnowledgeBases()
  } else {
    showToast(res.message || '从 Dify 同步失败', 'error')
  }
}

function getSearchMethodLabel(method, kb) {
  switch (method) {
    case 'hybrid_search':
      if (kb && kb.rerankMode === 'reranking_model') {
        return '混合检索 (Rerank)'
      }
      if (kb && (kb.vectorWeight != null || kb.keywordWeight != null)) {
        const vw = Math.round((kb.vectorWeight ?? 0.7) * 10)
        const kw = Math.round((kb.keywordWeight ?? 0.3) * 10)
        return `混合检索 (权重 ${vw}:${kw})`
      }
      return '混合检索 (权重 7:3)'
    case 'semantic_search':
      return '向量检索'
    case 'full_text_search':
      return '全文检索'
    default:
      return '混合检索'
  }
}

function getSearchMethodIcon(method) {
  switch (method) {
    case 'hybrid_search':
      return 'fa-solid fa-layer-group'
    case 'semantic_search':
      return 'fa-solid fa-brain'
    case 'full_text_search':
      return 'fa-solid fa-font'
    default:
      return 'fa-solid fa-layer-group'
  }
}

function onVectorWeightChange() {
  kbForm.vectorWeight = Math.round(Number(kbForm.vectorWeight || 0.7) * 10) / 10
  kbForm.keywordWeight = Math.round((1.0 - kbForm.vectorWeight) * 10) / 10
}

function openCreateKb() {
  Object.assign(kbForm, {
    id: '',
    name: '',
    description: '',
    avatar: '📚',
    provider: 'DIFY',
    embeddingModel: 'text-embedding-v3',
    embeddingProvider: 'langgenius/tongyi/tongyi',
    searchMethod: 'hybrid_search',
    topK: 3,
    rerankEnabled: true,
    rerankMode: 'weighted_score',
    rerankModel: 'qwen3-rerank',
    rerankModelProvider: 'langgenius/tongyi/tongyi',
    vectorWeight: 0.7,
    keywordWeight: 0.3
  })
  kbModalOpen.value = true
}

function openEditKb(kb) {
  if (!kb) return
  Object.assign(kbForm, {
    id: kb.id,
    name: kb.name,
    description: kb.description || '',
    avatar: kb.avatar || '📚',
    provider: kb.provider || 'DIFY',
    embeddingModel: kb.embeddingModel || 'text-embedding-v3',
    embeddingProvider: kb.embeddingProvider || 'langgenius/tongyi/tongyi',
    searchMethod: kb.searchMethod || 'hybrid_search',
    topK: kb.topK !== undefined && kb.topK !== null ? kb.topK : 3,
    rerankEnabled: kb.rerankEnabled !== undefined && kb.rerankEnabled !== null ? kb.rerankEnabled : true,
    rerankMode: kb.rerankMode || 'weighted_score',
    rerankModel: kb.rerankModel || 'qwen3-rerank',
    rerankModelProvider: kb.rerankModelProvider || 'langgenius/tongyi/tongyi',
    vectorWeight: kb.vectorWeight !== undefined && kb.vectorWeight !== null ? kb.vectorWeight : 0.7,
    keywordWeight: kb.keywordWeight !== undefined && kb.keywordWeight !== null ? kb.keywordWeight : 0.3
  })
  kbModalOpen.value = true
}

async function saveKnowledgeBase() {
  if (!kbForm.name.trim()) {
    showToast('请输入知识库名称', 'warning')
    return
  }
  savingKb.value = true
  let res
  if (kbForm.id) {
    res = await http.put(`/api/knowledge-bases/${kbForm.id}`, {
      name: kbForm.name,
      description: kbForm.description,
      avatar: kbForm.avatar,
      searchMethod: kbForm.searchMethod,
      topK: kbForm.topK,
      rerankEnabled: kbForm.rerankEnabled,
      rerankMode: kbForm.rerankMode,
      rerankModel: kbForm.rerankModel,
      rerankModelProvider: kbForm.rerankModelProvider,
      vectorWeight: kbForm.vectorWeight,
      keywordWeight: kbForm.keywordWeight
    })
  } else {
    res = await http.post('/api/knowledge-bases', {
      name: kbForm.name,
      description: kbForm.description,
      avatar: kbForm.avatar,
      provider: kbForm.provider,
      embeddingModel: kbForm.embeddingModel,
      embeddingProvider: kbForm.embeddingProvider,
      searchMethod: kbForm.searchMethod,
      topK: kbForm.topK,
      rerankEnabled: kbForm.rerankEnabled,
      rerankMode: kbForm.rerankMode,
      rerankModel: kbForm.rerankModel,
      rerankModelProvider: kbForm.rerankModelProvider,
      vectorWeight: kbForm.vectorWeight,
      keywordWeight: kbForm.keywordWeight
    })
  }
  savingKb.value = false

  if (res.success) {
    showToast(kbForm.id ? '知识库信息更新成功' : '知识库创建成功并已映射至 Dify', 'success')
    kbModalOpen.value = false
    loadKnowledgeBases()
    if (selectedKb.value && selectedKb.value.id === kbForm.id) {
      selectedKb.value.name = kbForm.name
      selectedKb.value.description = kbForm.description
      selectedKb.value.avatar = kbForm.avatar
      selectedKb.value.searchMethod = kbForm.searchMethod
      selectedKb.value.topK = kbForm.topK
      selectedKb.value.rerankEnabled = kbForm.rerankEnabled
      selectedKb.value.rerankMode = kbForm.rerankMode
      selectedKb.value.rerankModel = kbForm.rerankModel
      selectedKb.value.rerankModelProvider = kbForm.rerankModelProvider
      selectedKb.value.vectorWeight = kbForm.vectorWeight
      selectedKb.value.keywordWeight = kbForm.keywordWeight
    }
  } else {
    showToast(res.message || '保存知识库失败', 'error')
  }
}

function openKbDetail(kb) {
  selectedKb.value = kb
  currentView.value = 'detail'
  activeSubTab.value = 'documents'
  docPage.value = 1
  faqPage.value = 1
  loadDocuments()
  loadFaqCategories()
  loadFaqs()
}

function backToList() {
  currentView.value = 'list'
  loadKnowledgeBases()
}

// ==================== 文档管理逻辑 ====================

async function loadDocuments() {
  if (!selectedKb.value) return
  loadingDocs.value = true
  const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/documents`, {
    keyword: docSearchKeyword.value,
    status: docStatusFilter.value,
    page: docPage.value,
    size: docPageSize.value
  })
  loadingDocs.value = false
  if (res.success && res.data) {
    docList.value = res.data.records || []
    docTotalCount.value = res.data.total || 0
    docTotalPages.value = Math.max(1, Math.ceil(res.data.total / docPageSize.value))
    if (selectedKb.value) {
      selectedKb.value.documentCount = res.data.total
    }
  }
}

function debounceDocSearch() {
  clearTimeout(docSearchTimer)
  docSearchTimer = setTimeout(() => {
    docPage.value = 1
    loadDocuments()
  }, 300)
}

function changeDocPage(delta) {
  const target = docPage.value + delta
  if (target >= 1 && target <= docTotalPages.value) {
    docPage.value = target
    loadDocuments()
  }
}

function onDocPageSizeChange() {
  docPage.value = 1
  loadDocuments()
}

function goToDocPage(p) {
  if (p >= 1 && p <= docTotalPages.value) {
    docPage.value = p
    loadDocuments()
  }
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  addFilesToPending(files)
  e.target.value = ''
}

function handleFileDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files || [])
  addFilesToPending(files)
}

function addFilesToPending(files) {
  const allowed = ['markdown', 'pdf', 'vtt', 'properties', 'csv', 'html', 'htm', 'xlsx', 'xls', 'mdx', 'docx', 'txt', 'md']
  for (const file of files) {
    if (pendingFiles.value.length >= 5) {
      showToast('单批最多只能添加 5 个文件', 'warning')
      break
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      showToast(`文件「${file.name}」格式不受支持，已跳过`, 'error')
      continue
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast(`文件「${file.name}」超过 15MB 限制，已跳过`, 'error')
      continue
    }
    pendingFiles.value.push(file)
  }
}

function removePendingFile(idx) {
  pendingFiles.value.splice(idx, 1)
}

async function executeUpload() {
  if (!selectedKb.value || pendingFiles.value.length === 0) return
  uploading.value = true

  const formData = new FormData()
  pendingFiles.value.forEach(f => {
    formData.append('files', f)
  })

  const res = await http.upload(`/api/knowledge-bases/${selectedKb.value.id}/documents/upload`, formData)
  uploading.value = false

  if (res.success) {
    showToast(`成功上传 ${pendingFiles.value.length} 个文件并启动 Dify 语义切片`, 'success')
    pendingFiles.value = []
    loadDocuments()
  } else {
    showToast(res.message || '文档上传失败', 'error')
  }
}

async function refreshDocStatus(doc) {
  if (!selectedKb.value || !doc) return
  const res = await http.post(`/api/knowledge-bases/${selectedKb.value.id}/documents/${doc.id}/refresh`)
  if (res.success) {
    showToast(`文档「${doc.name}」状态刷新成功`, 'info')
    loadDocuments()
  } else {
    showToast(res.message || '刷新状态失败', 'error')
  }
}

// ==================== FAQ 问答管理逻辑 ====================

async function loadFaqCategories() {
  if (!selectedKb.value) return
  const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/faqs/categories`)
  if (res.success && res.data) {
    faqCategories.value = res.data
  }
}

async function loadFaqs() {
  if (!selectedKb.value) return
  loadingFaqs.value = true
  const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/faqs`, {
    keyword: faqSearchKeyword.value,
    category: selectedFaqCategory.value,
    page: faqPage.value,
    size: faqPageSize.value
  })
  loadingFaqs.value = false
  if (res.success && res.data) {
    faqList.value = res.data.records || []
    faqTotalCount.value = res.data.total || 0
    faqTotalPages.value = Math.max(1, Math.ceil(res.data.total / faqPageSize.value))
    if (selectedKb.value) {
      selectedKb.value.faqCount = res.data.total
    }
  }
}

function selectFaqCategory(cat) {
  selectedFaqCategory.value = cat
  faqPage.value = 1
  loadFaqs()
}

function debounceFaqSearch() {
  clearTimeout(faqSearchTimer)
  faqSearchTimer = setTimeout(() => {
    faqPage.value = 1
    loadFaqs()
  }, 300)
}

function changeFaqPage(delta) {
  const target = faqPage.value + delta
  if (target >= 1 && target <= faqTotalPages.value) {
    faqPage.value = target
    loadFaqs()
  }
}

function onFaqPageSizeChange() {
  faqPage.value = 1
  loadFaqs()
}

function goToFaqPage(p) {
  if (p >= 1 && p <= faqTotalPages.value) {
    faqPage.value = p
    loadFaqs()
  }
}

function openCreateFaq() {
  Object.assign(faqForm, {
    id: '',
    question: '',
    answer: '',
    category: selectedFaqCategory.value !== '全部' ? selectedFaqCategory.value : '通用问答',
    contentType: 'TEXT',
    imageUrls: []
  })
  faqModalOpen.value = true
}

function openEditFaq(faq) {
  if (!faq) return
  let imgs = []
  if (faq.imageUrls) {
    try {
      imgs = typeof faq.imageUrls === 'string' ? JSON.parse(faq.imageUrls) : faq.imageUrls
    } catch {
      imgs = []
    }
  }
  Object.assign(faqForm, {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category || '通用问答',
    contentType: faq.contentType || 'TEXT',
    imageUrls: imgs || []
  })
  faqModalOpen.value = true
}

async function handleFaqImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingFaqImg.value = true
  const formData = new FormData()
  formData.append('file', file)

  const res = await http.upload('/api/knowledge-bases/upload-image', formData)
  uploadingFaqImg.value = false
  e.target.value = ''

  if (res.success && res.data?.url) {
    faqForm.imageUrls.push(res.data.url)
    showToast('图片上传成功', 'success')
  } else {
    showToast(res.message || '图片上传失败', 'error')
  }
}

function removeFaqImage(idx) {
  faqForm.imageUrls.splice(idx, 1)
}

function getFaqImages(faq) {
  if (!faq?.imageUrls) return []
  try {
    return typeof faq.imageUrls === 'string' ? JSON.parse(faq.imageUrls) : faq.imageUrls
  } catch {
    return []
  }
}

function previewImage(url) {
  previewImgUrl.value = url
}

async function saveFaq() {
  if (!faqForm.question.trim() || !faqForm.answer.trim()) {
    showToast('请完整填写 FAQ 问题与回答内容', 'warning')
    return
  }
  if (!selectedKb.value) return

  savingFaq.value = true
  let res
  const payload = {
    question: faqForm.question.trim(),
    answer: faqForm.answer.trim(),
    category: faqForm.category.trim() || '通用问答',
    contentType: faqForm.imageUrls.length > 0 ? 'MIXED' : 'TEXT',
    imageUrls: faqForm.imageUrls
  }

  if (faqForm.id) {
    res = await http.put(`/api/knowledge-bases/${selectedKb.value.id}/faqs/${faqForm.id}`, payload)
  } else {
    res = await http.post(`/api/knowledge-bases/${selectedKb.value.id}/faqs`, payload)
  }
  savingFaq.value = false

  if (res.success) {
    showToast(faqForm.id ? 'FAQ 问答更新成功' : 'FAQ 问答添加成功并已同步向量化', 'success')
    faqModalOpen.value = false
    loadFaqs()
    loadFaqCategories()
  } else {
    showToast(res.message || '保存 FAQ 失败', 'error')
  }
}

// ==================== 删除逻辑统一处理 ====================

function confirmDeleteKb(kb) {
  pendingDeleteType.value = 'kb'
  pendingDeleteItem.value = kb
  pendingDeleteTitle.value = `知识库「${kb.name}」`
  deleteModalOpen.value = true
}

function confirmDeleteDoc(doc) {
  pendingDeleteType.value = 'doc'
  pendingDeleteItem.value = doc
  pendingDeleteTitle.value = `文档「${doc.name}」`
  deleteModalOpen.value = true
}

function confirmDeleteFaq(faq) {
  pendingDeleteType.value = 'faq'
  pendingDeleteItem.value = faq
  pendingDeleteTitle.value = `问答「${faq.question}」`
  deleteModalOpen.value = true
}

async function executeDelete() {
  deleting.value = true
  let res

  if (pendingDeleteType.value === 'kb') {
    res = await http.del(`/api/knowledge-bases/${pendingDeleteItem.value.id}`)
    deleting.value = false
    if (res.success) {
      showToast('知识库已彻底删除', 'success')
      deleteModalOpen.value = false
      loadKnowledgeBases()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  } else if (pendingDeleteType.value === 'doc') {
    res = await http.del(`/api/knowledge-bases/${selectedKb.value.id}/documents/${pendingDeleteItem.value.id}`)
    deleting.value = false
    if (res.success) {
      showToast('文档已成功删除', 'success')
      deleteModalOpen.value = false
      loadDocuments()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  } else if (pendingDeleteType.value === 'faq') {
    res = await http.del(`/api/knowledge-bases/${selectedKb.value.id}/faqs/${pendingDeleteItem.value.id}`)
    deleting.value = false
    if (res.success) {
      showToast('FAQ 问答已删除', 'success')
      deleteModalOpen.value = false
      loadFaqs()
      loadFaqCategories()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  }
}

// ==================== 格式化辅助工具 ====================

function formatWordCount(val) {
  const n = Number(val || 0)
  if (n >= 10000) return (n / 10000).toFixed(1) + ' 万字'
  if (n >= 1000) return (n / 1000).toFixed(1) + ' 千字'
  return n + ' 字'
}

function formatFileSize(bytes) {
  const n = Number(bytes || 0)
  if (n === 0) return '0 B'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatTime(str) {
  if (!str) return '-'
  try {
    const d = new Date(str)
    if (isNaN(d.getTime())) return str
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return str
  }
}

function getFileIconClass(ext) {
  const e = (ext || '').toLowerCase()
  if (e === 'pdf') return 'fa-solid fa-file-pdf text-rose'
  if (e === 'docx' || e === 'doc') return 'fa-solid fa-file-word text-blue'
  if (e === 'xlsx' || e === 'xls' || e === 'csv') return 'fa-solid fa-file-excel text-emerald'
  if (e === 'md' || e === 'markdown' || e === 'mdx') return 'fa-brands fa-markdown text-purple'
  if (e === 'html' || e === 'htm') return 'fa-brands fa-html5 text-orange'
  return 'fa-solid fa-file-lines text-blue'
}

function getDocStatusBadge(status) {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return 'badge-success'
  if (s === 'indexing') return 'badge-info'
  if (s === 'waiting' || s === 'queuing') return 'badge-warning'
  return 'badge-danger'
}

function getDocStatusLabel(status) {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return '索引完成'
  if (s === 'indexing') return '正在切片'
  if (s === 'waiting' || s === 'queuing') return '排队中'
  if (s === 'paused') return '已暂停'
  return '处理异常'
}

async function loadViewLayoutPreference() {
  const res = await http.get('/api/auth/preferences')
  const layout = res.success ? res.data?.kbViewLayout : ''
  if (layout === 'table' || layout === 'card') {
    viewLayout.value = layout
    localStorage.setItem(KB_VIEW_LAYOUT_KEY, layout)
  }
  persistLayoutReady = true
}

onMounted(() => {
  loadEngineInfo()
  loadKnowledgeBases()
  loadViewLayoutPreference()
})
</script>
