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
                <span v-if="kb.provider === 'SPRING_AI'" class="provider-badge spring-ai">
                  <i class="fa-solid fa-brain"></i> Spring AI 自研
                </span>
                <span v-else class="provider-badge dify">
                  <i class="fa-solid fa-link"></i> Dify 外挂
                </span>
                <span class="search-method-badge" :class="kb.searchMethod || 'hybrid_search'">
                  <i :class="getSearchMethodIcon(kb.searchMethod)"></i> {{ getSearchMethodLabel(kb.searchMethod, kb) }}
                </span>
                <span class="model-badge" title="Embedding 向量模型">
                  <i class="fa-solid fa-cube"></i> {{ getEmbeddingModelLabel(kb) }}
                </span>
              </div>
            </div>
          </div>

          <p class="kb-card-desc" :title="kb.description || '暂无业务描述'">
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
      <div v-else class="table-view-card kb-table-wrap">
        <table class="agent-table kb-agent-table">
          <thead>
            <tr>
              <th class="col-kb-name">知识库名称与描述</th>
              <th class="col-kb-owner">所属账号</th>
              <th class="col-kb-provider">引擎提供方</th>
              <th class="col-kb-retrieval">检索模式与向量模型</th>
              <th class="col-kb-docs" style="text-align: center;">文档数</th>
              <th class="col-kb-faqs" style="text-align: center;">问答 FAQ</th>
              <th class="col-kb-words" style="text-align: center;">预估字符</th>
              <th class="col-kb-time">更新时间</th>
              <th class="col-kb-actions" style="text-align: right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="kb in displayKbList" :key="kb.id" class="table-row-hover" @click="openKbDetail(kb)">
              <td class="col-kb-name">
                <div class="kb-table-title-cell">
                  <span class="kb-table-avatar">{{ kb.avatar || '📚' }}</span>
                  <div class="kb-table-info">
                    <div class="kb-table-name-row">
                      <span class="kb-table-name" :title="kb.name">{{ kb.name }}</span>
                      <span v-if="kb.isSystem" class="kb-pill-badge system">
                        <i class="fa-solid fa-earth-americas"></i> 公共
                      </span>
                      <span v-else class="kb-pill-badge" :class="isOwnKb(kb) ? 'mine' : 'other'" :title="accountLabel(kb)">
                        <i class="fa-solid fa-user"></i> {{ accountLabel(kb) }}
                      </span>
                    </div>
                    <div class="kb-table-desc" :title="kb.description || '暂无业务描述'">
                      {{ kb.description || '暂无业务描述，点击进入可上传文档与维护问答对。' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="col-kb-owner">
                <span class="kb-cell-text" :title="kb.isSystem ? '系统公共' : accountLabel(kb)">
                  <i :class="kb.isSystem ? 'fa-solid fa-earth-americas' : 'fa-solid fa-user'" style="font-size: 11px; opacity: 0.7; margin-right: 4px;"></i>
                  <span>{{ kb.isSystem ? '系统公共' : accountLabel(kb) }}</span>
                </span>
              </td>
              <td class="col-kb-provider">
                <span v-if="kb.provider === 'SPRING_AI'" class="provider-badge spring-ai">
                  <i class="fa-solid fa-brain"></i> Spring AI
                </span>
                <span v-else class="provider-badge dify">
                  <i class="fa-solid fa-link"></i> Dify RAG
                </span>
              </td>
              <td class="col-kb-retrieval">
                <div class="kb-retrieval-cell">
                  <span class="search-method-badge" :class="kb.searchMethod || 'hybrid_search'">
                    <i :class="getSearchMethodIcon(kb.searchMethod)"></i> {{ getSearchMethodLabel(kb.searchMethod, kb) }}
                  </span>
                  <span class="model-badge-sub" :title="getEmbeddingModelLabel(kb)">
                    <i class="fa-solid fa-cube"></i>
                    <span class="kb-model-truncate">{{ getEmbeddingModelLabel(kb) }}</span>
                  </span>
                </div>
              </td>
              <td class="col-kb-docs" style="text-align: center;">
                <span class="kb-stat-pill blue">{{ kb.documentCount || 0 }} 篇</span>
              </td>
              <td class="col-kb-faqs" style="text-align: center;">
                <span class="kb-stat-pill emerald">{{ kb.faqCount || 0 }} 条</span>
              </td>
              <td class="col-kb-words" style="text-align: center;">
                <span class="kb-stat-pill purple">{{ formatWordCount(kb.wordCount) }}</span>
              </td>
              <td class="col-kb-time">
                <span class="kb-time-label" :title="kb.updatedAt">
                  <i class="fa-regular fa-clock" style="font-size: 11px; opacity: 0.65; margin-right: 4px;"></i>
                  {{ formatTime(kb.updatedAt) }}
                </span>
              </td>
              <td class="col-kb-actions" style="text-align: right; white-space: nowrap;" @click.stop>
                <div class="agent-actions" style="justify-content: flex-end; flex-wrap: nowrap; gap: 6px;">
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
              <span v-if="selectedKb?.provider === 'SPRING_AI'" class="provider-badge spring-ai"><i class="fa-solid fa-brain"></i> Spring AI 自研引擎</span>
              <span v-else class="provider-badge dify"><i class="fa-solid fa-link"></i> Dify: {{ selectedKb?.externalDatasetId ? selectedKb.externalDatasetId.substring(0, 14) + '...' : '未绑定' }}</span>
              <span class="search-method-badge" :class="selectedKb?.searchMethod || 'hybrid_search'">
                <i :class="getSearchMethodIcon(selectedKb?.searchMethod)"></i> {{ getSearchMethodLabel(selectedKb?.searchMethod, selectedKb) }} (Top {{ selectedKb?.topK || 3 }})
              </span>
              <span class="model-badge" title="Embedding 向量模型">
                <i class="fa-solid fa-cube"></i> {{ getEmbeddingModelLabel(selectedKb) }}
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

      <!-- 内部子 Tab 切换（文档库 vs 问答FAQ vs 召回测试） -->
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
        <button
          class="kb-subtab-btn"
          :class="{ active: activeSubTab === 'retrieval-test' }"
          @click="openRetrievalTestTab"
        >
          <i class="fa-solid fa-crosshairs"></i>
          <span>召回测试与调试</span>
        </button>
        <button
          class="kb-subtab-btn"
          :class="{ active: activeSubTab === 'cost-governance' }"
          @click="openCostGovernanceTab"
        >
          <i class="fa-solid fa-chart-line"></i>
          <span>成本看板与治理</span>
          <span class="badge-subtab-p3">P3</span>
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

      <!-- TAB 3: 召回测试与调试 (Phase P1) -->
      <div v-show="activeSubTab === 'retrieval-test'" class="kb-tab-content retrieval-test-tab">
        <!-- 调试提示条与测试说明 -->
        <div class="retrieval-test-header-card">
          <div class="retrieval-header-info">
            <div class="retrieval-title-row">
              <span class="badge-recall-test"><i class="fa-solid fa-crosshairs"></i> 召回调试控制台</span>
              <span class="badge-recall-engine">
                <i class="fa-solid fa-cube"></i> 当前物理引擎: <strong>{{ testParams.engineOverride || selectedKb?.provider || 'DIFY' }}</strong>
              </span>
              <span v-if="activeIndexVersion" class="badge-recall-version">
                <i class="fa-solid fa-code-branch"></i> 索引快照: <strong>V{{ activeIndexVersion.versionNo }} ({{ activeIndexVersion.status }})</strong>
              </span>
              <button type="button" class="badge-recall-version btn-offline-badge" title="查看 100% 私有化离线闭环自检报告" @click="openOfflineReadinessModal()">
                <i class="fa-solid fa-shield-halved" style="color: #10b981;"></i> 离线闭环: <strong style="color: #34d399;">就绪</strong>
              </button>
            </div>
            <p class="retrieval-header-desc">
              在不修改知识库线上持久配置的前提下，快速输入业务提问，验证切片召回质量、相似度得分分布、多路重排效果与端到端检索延迟。
            </p>

            <!-- P3 模式切换: 单引擎标准调试 vs 双引擎影子评测 -->
            <div class="retrieval-mode-switcher">
              <button
                type="button"
                class="mode-switch-btn"
                :class="{ active: retrievalMode === 'single' }"
                @click="retrievalMode = 'single'"
              >
                <i class="fa-solid fa-bullseye"></i>
                <span>标准单引擎调试</span>
              </button>
              <button
                type="button"
                class="mode-switch-btn"
                :class="{ active: retrievalMode === 'shadow' }"
                @click="retrievalMode = 'shadow'"
              >
                <i class="fa-solid fa-code-compare"></i>
                <span>双引擎影子 A/B 评测</span>
                <span class="badge-mode-p3">P3 推荐</span>
              </button>
            </div>
          </div>
          <button type="button" class="btn-toggle-params" @click="showParamDrawer = !showParamDrawer">
            <i class="fa-solid fa-sliders"></i>
            <span>{{ showParamDrawer ? '收起调试参数' : '展开调试参数' }}</span>
            <i class="fa-solid" :class="showParamDrawer ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>
        </div>

        <!-- 临时调试参数微调面板 -->
        <div v-show="showParamDrawer" class="retrieval-params-card">
          <div class="params-card-title">
            <i class="fa-solid fa-flask-vial text-blue"></i>
            <span>本次测试临时覆盖参数（仅对本次调试生效，不写入知识库配置）</span>
          </div>
          <div class="params-grid">
            <!-- 检索方式 -->
            <div class="param-item">
              <label class="param-label">检索策略 (Search Method)</label>
              <div class="method-pills">
                <button
                  type="button"
                  class="method-pill"
                  :class="{ active: testParams.searchMethod === 'hybrid_search' }"
                  @click="testParams.searchMethod = 'hybrid_search'"
                >
                  <i class="fa-solid fa-layer-group"></i> 混合检索
                </button>
                <button
                  type="button"
                  class="method-pill"
                  :class="{ active: testParams.searchMethod === 'semantic_search' }"
                  @click="testParams.searchMethod = 'semantic_search'"
                >
                  <i class="fa-solid fa-brain"></i> 向量检索
                </button>
                <button
                  type="button"
                  class="method-pill"
                  :class="{ active: testParams.searchMethod === 'full_text_search' }"
                  @click="testParams.searchMethod = 'full_text_search'"
                >
                  <i class="fa-solid fa-font"></i> 全文检索
                </button>
              </div>
            </div>

            <!-- Top K -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">Top K 召回条数</label>
                <span class="param-val-badge">{{ testParams.topK }} 条</span>
              </div>
              <input
                type="range"
                v-model.number="testParams.topK"
                min="1"
                max="20"
                step="1"
                class="form-range-styled"
              >
            </div>

            <!-- 相似度阈值 Score Threshold -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">相似度得分阈值 (Score Threshold)</label>
                <span class="param-val-badge">{{ Number(testParams.scoreThreshold).toFixed(2) }}</span>
              </div>
              <input
                type="range"
                v-model.number="testParams.scoreThreshold"
                min="0.0"
                max="1.0"
                step="0.05"
                class="form-range-styled"
              >
              <div class="param-hint">低于该得分的切片将被过滤（设为 0.0 表示不过滤）</div>
            </div>

            <!-- Rerank 开关 -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">Rerank 二次重排</label>
                <span class="param-val-badge" :style="{ color: testParams.rerankEnabled ? '#10b981' : '#94a3b8' }">
                  {{ testParams.rerankEnabled ? '已启用' : '已关闭' }}
                </span>
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.rerankEnabled }"
                  @click="testParams.rerankEnabled = !testParams.rerankEnabled"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.rerankEnabled ? '对候选切片计算交叉相关度重排序' : '仅使用初筛综合得分' }}</span>
              </div>
            </div>

            <!-- 权重配置（仅在混合检索时显示） -->
            <div v-if="testParams.searchMethod === 'hybrid_search'" class="param-item param-item-span2">
              <div class="param-label-row">
                <label class="param-label">混合检索双路权重配比</label>
                <span class="param-val-badge">语义 {{ Math.round(testParams.vectorWeight * 100) }}% : 关键词 {{ Math.round(testParams.keywordWeight * 100) }}%</span>
              </div>
              <div class="weights-slider-box">
                <input
                  type="range"
                  :value="testParams.vectorWeight"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  class="form-range-styled"
                  @input="onWeightSliderChange($event.target.value)"
                >
                <div class="weights-scale-labels">
                  <span>偏向语义意图 (0.9 : 0.1)</span>
                  <span>7:3 黄金配比</span>
                  <span>偏向精准关键词 (0.1 : 0.9)</span>
                </div>
              </div>
            </div>

            <!-- 父子分块展开 (P2 增强) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">父子分块展开 (Parent-Child)</label>
                <span class="param-val-badge" :style="{ color: testParams.expandParent ? '#c084fc' : '#94a3b8' }">
                  {{ testParams.expandParent ? '已开启 (推荐)' : '已关闭' }}
                </span>
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.expandParent, 'switch-purple': testParams.expandParent }"
                  @click="testParams.expandParent = !testParams.expandParent"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.expandParent ? '命中子块后自动回溯展开父块大段落并跨段去重' : '仅返回命中的原始子切片' }}</span>
              </div>
            </div>

            <!-- Query 智能改写与降噪 (P2 增强) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">Query 意图改写与降噪</label>
                <span class="param-val-badge" :style="{ color: testParams.rewriteEnabled ? '#60a5fa' : '#94a3b8' }">
                  {{ testParams.rewriteEnabled ? '已开启' : '已关闭' }}
                </span>
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.rewriteEnabled, 'switch-blue': testParams.rewriteEnabled }"
                  @click="testParams.rewriteEnabled = !testParams.rewriteEnabled"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.rewriteEnabled ? '自动滤除前缀客套词与杂质标点，提炼核心主干' : '使用原始输入直接检索' }}</span>
              </div>
            </div>

            <!-- Token 上下文预算上限 (P2 增强 - 修复 F4 缺陷) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">上下文 Token 预算上限 (Budget Pruning)</label>
                <span class="param-val-badge" style="color: #818cf8;">{{ testParams.maxContextTokens }} Tokens</span>
              </div>
              <input
                type="range"
                v-model.number="testParams.maxContextTokens"
                min="1000"
                max="6000"
                step="200"
                class="form-range-styled"
              >
              <div class="param-hint">动态计算并按大模型上下文窗口精准装填，废除硬编码截断</div>
            </div>

            <!-- 引擎覆盖 (L3 调试覆盖) -->
            <div class="param-item">
              <label class="param-label">物理引擎覆盖 (L3 Debug Override)</label>
              <select v-model="testParams.engineOverride" class="form-control-styled">
                <option value="">跟随知识库配置 ({{ selectedKb?.provider || 'DIFY' }})</option>
                <option value="DIFY">强制 DIFY 外挂引擎</option>
                <option value="SPRING_AI">Spring AI 原生自研引擎 (P4 增强)</option>
              </select>
            </div>

            <!-- P4 语义缓存 (Semantic Cache) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">语义缓存加速 (Semantic Cache)</label>
                <span class="param-val-badge" :style="{ color: testParams.cacheEnabled ? '#10b981' : '#94a3b8' }">
                  {{ testParams.cacheEnabled ? '已启用 (< 5ms 响应)' : '已旁路' }}
                </span>
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.cacheEnabled, 'switch-green': testParams.cacheEnabled }"
                  @click="testParams.cacheEnabled = !testParams.cacheEnabled"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.cacheEnabled ? '余弦相似度 ≥ 0.95 判定同语义复用结果' : '强制穿透缓存发起完整检索与重排' }}</span>
                <button
                  type="button"
                  class="btn-clear-cache-small"
                  title="清空当前知识库已缓存的所有检索结果"
                  :disabled="clearingCache"
                  @click="clearSemanticCache()"
                >
                  <i :class="clearingCache ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-trash-can'"></i>
                  <span>清空缓存</span>
                </button>
              </div>
            </div>

            <!-- P4 图文跨模态多模态检索 (Chapter 18) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">图文跨模态检索 (Multimodal RAG)</label>
                <span class="param-val-badge" style="color: #c084fc;">
                  {{ testParams.queryType === 'IMAGE' ? '以图搜图' : '以文搜图 / 混合检索' }}
                </span>
              </div>
              <div class="method-pills" style="margin-bottom: 8px;">
                <button
                  type="button"
                  class="method-pill"
                  :class="{ active: testParams.queryType === 'TEXT' }"
                  @click="testParams.queryType = 'TEXT'"
                >
                  <i class="fa-solid fa-font"></i> 以文搜图 / 文本
                </button>
                <button
                  type="button"
                  class="method-pill"
                  :class="{ active: testParams.queryType === 'IMAGE' }"
                  @click="testParams.queryType = 'IMAGE'"
                >
                  <i class="fa-solid fa-image"></i> 以图搜图
                </button>
              </div>
              <div v-if="testParams.queryType === 'IMAGE'" class="image-query-box" style="margin-bottom: 8px;">
                <input
                  type="text"
                  v-model="testParams.queryImageUrl"
                  class="form-control-styled"
                  placeholder="输入检索目标图片的 URL 或受控地址..."
                />
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.injectImagesToLlm, 'switch-purple': testParams.injectImagesToLlm }"
                  @click="testParams.injectImagesToLlm = !testParams.injectImagesToLlm"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.injectImagesToLlm ? '原图注入 LLM 上下文（消耗图片 Token）' : '默认仅返回引用卡片（第 18 章节约 67% Token）' }}</span>
                <button
                  type="button"
                  class="btn-clear-cache-small"
                  title="重新计算历史所有图片的 1024 维多模态视觉向量"
                  :disabled="reembedding"
                  @click="reembedImages()"
                >
                  <i :class="reembedding ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrows-rotate'"></i>
                  <span>图片向量回填</span>
                </button>
              </div>
            </div>

            <!-- P4 GraphRAG 实体多跳图谱检索 (Pilot) -->
            <div class="param-item">
              <div class="param-label-row">
                <label class="param-label">GraphRAG 实体多跳图谱检索 (Pilot)</label>
                <span class="param-val-badge" :style="{ color: testParams.graphSearchEnabled ? '#06b6d4' : '#94a3b8' }">
                  {{ testParams.graphSearchEnabled ? '已开启' : '已关闭' }}
                </span>
              </div>
              <div class="rerank-toggle-row">
                <button
                  type="button"
                  class="toggle-switch-btn"
                  :class="{ active: testParams.graphSearchEnabled, 'switch-cyan': testParams.graphSearchEnabled }"
                  @click="testParams.graphSearchEnabled = !testParams.graphSearchEnabled"
                >
                  <span class="switch-ball"></span>
                </button>
                <span class="toggle-switch-text">{{ testParams.graphSearchEnabled ? '提取 Query 核心实体并沿知识图谱 1-hop / 2-hop 关系拓扑推导' : '仅使用常规分块检索' }}</span>
                <button
                  type="button"
                  class="btn-clear-cache-small"
                  style="border-color: rgba(6, 182, 212, 0.4); color: #06b6d4;"
                  title="查看知识库已构建的实体拓扑关系网络"
                  @click="openKnowledgeGraphModal()"
                >
                  <i class="fa-solid fa-circle-nodes"></i>
                  <span>查看知识图谱</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 提问输入框与执行操作 -->
        <div class="retrieval-query-box">
          <div class="query-input-wrap">
            <i class="fa-solid fa-magnifying-glass query-icon"></i>
            <input
              type="text"
              v-model="retrievalQuery"
              class="query-input"
              placeholder="输入用于召回测试的查询语句，按回车或点击“执行检索”..."
              @keyup.enter="executeRetrievalTest()"
            >
            <button
              v-if="retrievalQuery"
              type="button"
              class="btn-clear-query"
              title="清空输入"
              @click="retrievalQuery = ''"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button
              type="button"
              class="btn-execute-test"
              :class="{ 'btn-shadow-mode': retrievalMode === 'shadow' }"
              :disabled="(testingRetrieval || testingShadow) || !retrievalQuery.trim()"
              @click="executeRetrievalTest()"
            >
              <i :class="(testingRetrieval || testingShadow) ? 'fa-solid fa-spinner fa-spin' : (retrievalMode === 'shadow' ? 'fa-solid fa-bolt' : 'fa-solid fa-paper-plane')"></i>
              <span>{{ (testingRetrieval || testingShadow) ? '正在执行评测...' : (retrievalMode === 'shadow' ? '执行双引擎影子评测' : '执行检索') }}</span>
            </button>
          </div>

          <!-- 推荐提问 Chips -->
          <div class="sample-queries-row">
            <span class="sample-label"><i class="fa-regular fa-lightbulb"></i> 快速测试建议：</span>
            <button
              v-for="(q, idx) in sampleQueries"
              :key="idx"
              type="button"
              class="query-chip"
              @click="executeRetrievalTest(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <!-- 检索结果状态汇总栏 -->
        <!-- 模式 1: 单引擎标准调试结果展示 -->
        <template v-if="retrievalMode === 'single'">
          <!-- 检索结果状态汇总栏 -->
          <div v-if="retrievalResult" class="retrieval-result-banner">
            <div class="result-banner-left">
              <span class="result-stat-chip hit-count">
                <i class="fa-solid fa-bullseye"></i>
                命中 <strong>{{ retrievalResult.chunks?.length || 0 }}</strong> 个分块
              </span>
              <span class="result-stat-chip latency">
                <i class="fa-solid fa-bolt"></i>
                端到端耗时: <strong>{{ retrievalResult.latencyMs }} ms</strong>
              </span>
              <span class="result-stat-chip engine">
                <i class="fa-solid fa-microchip"></i>
                生效引擎: <strong>{{ retrievalResult.engineResolution?.effectiveEngine || 'DIFY' }}</strong>
                <span class="engine-src-tag">({{ formatEngineSource(retrievalResult.engineResolution?.source) }})</span>
              </span>
              <span v-if="retrievalResult.metrics?.totalTokens" class="result-stat-chip" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">
                <i class="fa-solid fa-coins"></i>
                Token 消耗: <strong>{{ retrievalResult.metrics.totalTokens }}</strong> / {{ retrievalResult.metrics.maxContextTokens || 3000 }}
              </span>
              <span v-if="retrievalResult.metrics?.rewrittenQuery && retrievalResult.metrics.rewrittenQuery !== retrievalResult.query" class="result-stat-chip" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                改写后 Query: <strong>"{{ retrievalResult.metrics.rewrittenQuery }}"</strong>
              </span>
              <span v-if="retrievalResult.metrics?.semanticCacheHit" class="result-stat-chip cache-hit-chip">
                <i class="fa-solid fa-bolt text-emerald"></i>
                ⚡ 命中语义缓存 (响应 <strong>{{ retrievalResult.latencyMs }} ms</strong>, 节省 100% 检索与重排)
                <span v-if="retrievalResult.metrics?.cacheSimilarity" style="opacity: 0.85; font-size: 11px;">
                  (相似度: {{ (retrievalResult.metrics.cacheSimilarity * 100).toFixed(1) }}%)
                </span>
              </span>
            </div>
            <div class="result-banner-right">
              <span class="result-query-tag" :title="retrievalResult.query">
                Query: "{{ retrievalResult.query }}"
              </span>
            </div>
          </div>

          <!-- 结果切片列表 -->
          <div v-if="retrievalResult && retrievalResult.chunks && retrievalResult.chunks.length > 0" class="retrieval-chunks-grid">
            <div
              v-for="(chunk, cIdx) in retrievalResult.chunks"
              :key="cIdx"
              class="retrieval-chunk-card"
              :class="{ 'card-image-chunk': chunk.imageUrl || chunk.metadata?.isImage || chunk.chunkType === 'IMAGE', 'card-graph-chunk': chunk.chunkType === 'GRAPH' }"
            >
              <div class="chunk-card-header">
                <div class="chunk-rank-box">
                  <span class="chunk-rank-badge" :class="'rank-' + Math.min(cIdx + 1, 3)">#{{ cIdx + 1 }}</span>
                  <span class="chunk-doc-name" :title="chunk.sourceName">
                    <i :class="chunk.chunkType === 'GRAPH' ? 'fa-solid fa-circle-nodes text-cyan' : ((chunk.imageUrl || chunk.metadata?.isImage || chunk.chunkType === 'IMAGE') ? 'fa-solid fa-image text-purple' : 'fa-solid fa-file-lines')"></i>
                    {{ chunk.sourceName || '未命名文档' }}
                  </span>
                  <span v-if="chunk.metadata?.parentExpanded" class="tag-parent-expanded" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-diagram-project"></i> 已展开父块
                  </span>
                  <span v-if="chunk.metadata?.semanticCacheHit" class="tag-cache-hit">
                    <i class="fa-solid fa-bolt"></i> 缓存命中
                  </span>
                  <span v-if="chunk.matchedBy" class="badge-matched-by" :class="'matched-' + chunk.matchedBy.toLowerCase()">
                    <i class="fa-solid" :class="chunk.matchedBy === 'IMAGE_VECTOR' ? 'fa-image' : (chunk.matchedBy === 'CAPTION' ? 'fa-quote-left' : 'fa-font')"></i>
                    {{ chunk.matchedBy === 'IMAGE_VECTOR' ? '视觉向量命中' : (chunk.matchedBy === 'CAPTION' ? '描述文本命中' : '文本命中') }}
                  </span>
                  <span v-if="chunk.chunkType === 'GRAPH'" class="tag-graph-hit">
                    <i class="fa-solid fa-circle-nodes"></i> GraphRAG
                  </span>
                  <span v-if="chunk.segmentIndex !== null && chunk.segmentIndex !== undefined" class="chunk-seg-index">
                    分段 #{{ chunk.segmentIndex }}
                  </span>
                  <span v-if="chunk.tokenCount" class="chunk-tokens">
                    {{ chunk.tokenCount }} Tokens
                  </span>
                </div>
                <div class="chunk-score-group">
                  <span class="chunk-score-pill score-fused" :class="getScoreClass(chunk.score)">
                    <i class="fa-solid fa-chart-simple"></i> 得分: {{ formatScore(chunk.score) }}
                  </span>
                  <span v-if="chunk.vectorScore" class="chunk-score-pill score-sub">
                    向量: {{ formatScore(chunk.vectorScore) }}
                  </span>
                  <span v-if="chunk.keywordScore" class="chunk-score-pill score-sub">
                    关键词: {{ formatScore(chunk.keywordScore) }}
                  </span>
                  <span v-if="chunk.rerankScore" class="chunk-score-pill score-sub score-rerank">
                    重排: {{ formatScore(chunk.rerankScore) }}
                  </span>
                </div>
              </div>

              <!-- 切片主体内容 -->
              <div class="chunk-card-body">
                <!-- P4 多模态图片预览卡片 (Chapter 18) -->
                <div v-if="chunk.imageUrl || chunk.metadata?.isImage || chunk.chunkType === 'IMAGE'" class="chunk-image-card">
                  <div class="image-thumb-wrap" @click="previewImgUrl = chunk.imageUrl">
                    <img :src="chunk.imageUrl" alt="切片图片" class="chunk-img-thumb" @error="$event.target.style.display='none'" />
                    <div class="thumb-zoom-overlay"><i class="fa-solid fa-magnifying-glass-plus"></i> 点击放大</div>
                  </div>
                  <div class="image-meta-info">
                    <div class="image-matched-row">
                      <span class="badge-matched-by" :class="chunk.matchedBy === 'IMAGE_VECTOR' ? 'match-vector' : 'match-caption'">
                        <i class="fa-solid fa-image"></i>
                        {{ chunk.matchedBy === 'IMAGE_VECTOR' ? '多模态视觉向量命中' : (chunk.matchedBy === 'CAPTION' ? 'VLM 描述文本命中' : '图文关联命中') }}
                      </span>
                      <span v-if="chunk.imageUrl" class="image-url-link" :title="chunk.imageUrl">
                        <i class="fa-solid fa-link"></i> {{ chunk.imageUrl }}
                      </span>
                    </div>
                    <div v-if="chunk.imageCaption" class="image-caption-text">
                      <i class="fa-solid fa-quote-left"></i> {{ chunk.imageCaption }}
                    </div>
                  </div>
                </div>

                <div
                  class="chunk-content-text"
                  :class="{ collapsed: !expandedChunks.has(cIdx) }"
                >
                  {{ chunk.content }}
                </div>
                <div v-if="chunk.metadata?.parentExpanded && chunk.metadata?.originalChildContent" class="original-child-expand-box" style="margin-top: 8px;">
                  <button type="button" class="btn-toggle-orig-child" style="background: none; border: none; font-size: 11px; color: #a78bfa; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 4px;" @click="toggleOriginalChild(cIdx)">
                    <i :class="showOriginalChildMap.has(cIdx) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                    <span>{{ showOriginalChildMap.has(cIdx) ? '收起高精度命中子切片' : '查看高精度命中子切片（展开前原文）' }}</span>
                  </button>
                  <div v-if="showOriginalChildMap.has(cIdx)" style="margin-top: 6px; padding: 8px 12px; background: rgba(147, 51, 234, 0.08); border-left: 3px solid #a855f7; border-radius: 4px; font-size: 12px; color: #e2e8f0; line-height: 1.5;">
                    {{ chunk.metadata.originalChildContent }}
                  </div>
                </div>
                <button
                  v-if="chunk.content && chunk.content.length > 200"
                  type="button"
                  class="btn-expand-chunk"
                  @click="toggleChunkExpand(cIdx)"
                >
                  <span>{{ expandedChunks.has(cIdx) ? '收起内容' : '展开全文' }}</span>
                  <i class="fa-solid" :class="expandedChunks.has(cIdx) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
              </div>

              <!-- 卡片底部操作 -->
              <div class="chunk-card-footer">
                <div class="chunk-id-text" :title="chunk.chunkId">
                  <span v-if="chunk.chunkId">Chunk ID: {{ chunk.chunkId }}</span>
                </div>
                <button
                  type="button"
                  class="btn-copy-chunk"
                  title="复制此切片文本"
                  @click="copyChunkText(chunk.content)"
                >
                  <i class="fa-regular fa-clone"></i> <span>复制内容</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 智能诊断与空状态 -->
          <div
            v-else-if="retrievalResult && (!retrievalResult.chunks || retrievalResult.chunks.length === 0)"
            class="retrieval-empty-state"
          >
            <div class="empty-icon-wrap diagnostic-icon">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>未召回任何匹配分块</h3>
            <div class="diagnostic-box">
              <div class="diagnostic-reason">
                <i class="fa-solid fa-stethoscope"></i>
                <span>
                  <strong>诊断分析：</strong>当前相似度阈值设置为 <strong>{{ Number(testParams.scoreThreshold).toFixed(2) }}</strong>，
                  {{ testParams.scoreThreshold >= 0.6 ? '阈值设置偏高，导致相关性稍弱的候选分块被严格过滤；' : '库内文档中可能缺少与该查询语义相近的段落内容；' }}
                  检索策略当前为 <strong>{{ getSearchMethodLabel(testParams.searchMethod) }}</strong>。
                </span>
              </div>
              <div class="diagnostic-actions">
                <button type="button" class="btn-diag-action" @click="retryWithLowerThreshold">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  <span>一键调优：阈值降至 0.3 并采用混合检索重试</span>
                </button>
                <button type="button" class="btn-diag-action secondary" @click="retryWithZeroThreshold">
                  <i class="fa-solid fa-filter-circle-xmark"></i>
                  <span>解除阈值过滤 (0.0) 查看原始候选段落</span>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- 模式 2: 双引擎影子 A/B 对比评测结果展示 (Phase P3) -->
        <template v-else-if="retrievalMode === 'shadow' && shadowResult">
          <div class="shadow-evaluation-container">
            <!-- 影子评测对比看板 -->
            <div class="shadow-summary-banner">
              <div class="shadow-banner-top">
                <div class="shadow-badge-row">
                  <span class="shadow-badge-main"><i class="fa-solid fa-code-compare"></i> 双引擎影子流量评测报告</span>
                  <span class="shadow-query-pill" :title="shadowResult.query">提问: "{{ shadowResult.query }}"</span>
                </div>
                <div class="shadow-overlap-box">
                  <div class="overlap-title">
                    <span>Jaccard 召回交集重叠率:</span>
                    <strong class="overlap-val text-emerald">{{ (shadowResult.overlapRatio * 100).toFixed(0) }}%</strong>
                  </div>
                  <div class="shadow-track">
                    <div class="shadow-bar-fill" :style="{ width: Math.min(100, Math.max(0, shadowResult.overlapRatio * 100)) + '%' }"></div>
                  </div>
                </div>
              </div>

              <!-- 3 核心对比指标 -->
              <div class="shadow-metrics-grid">
                <div class="shadow-metric-card">
                  <div class="metric-card-header">
                    <i class="fa-solid fa-stopwatch text-blue"></i>
                    <span>端到端延迟对比</span>
                  </div>
                  <div class="metric-card-body">
                    <div class="metric-versus-row">
                      <span>自研: <strong class="text-blue">{{ shadowResult.primaryLatencyMs }} ms</strong></span>
                      <span class="versus-dot">vs</span>
                      <span>Dify: <strong>{{ shadowResult.secondaryLatencyMs }} ms</strong></span>
                    </div>
                    <span class="shadow-delta-tag" :class="shadowResult.latencyDiffMs <= 0 ? 'faster' : 'slower'">
                      <i :class="shadowResult.latencyDiffMs <= 0 ? 'fa-solid fa-gauge-high' : 'fa-solid fa-gauge-simple'"></i>
                      {{ shadowResult.latencyDiffMs <= 0 ? '自研引擎快 ' + Math.abs(shadowResult.latencyDiffMs) + ' ms' : '自研引擎慢 ' + shadowResult.latencyDiffMs + ' ms' }}
                    </span>
                  </div>
                </div>

                <div class="shadow-metric-card">
                  <div class="metric-card-header">
                    <i class="fa-solid fa-coins text-purple"></i>
                    <span>上下文 Token 装填</span>
                  </div>
                  <div class="metric-card-body">
                    <div class="metric-versus-row">
                      <span>自研: <strong class="text-purple">{{ shadowResult.primaryTokens }}</strong></span>
                      <span class="versus-dot">vs</span>
                      <span>Dify: <strong>{{ shadowResult.secondaryTokens }}</strong></span>
                    </div>
                    <span class="shadow-delta-tag info">
                      <i class="fa-solid fa-shield-halved"></i>
                      {{ shadowResult.primaryTokens <= shadowResult.secondaryTokens ? '预算裁剪节省 ' + Math.max(0, shadowResult.secondaryTokens - shadowResult.primaryTokens) + ' Tokens' : '召回上下文更充实' }}
                    </span>
                  </div>
                </div>

                <div class="shadow-metric-card">
                  <div class="metric-card-header">
                    <i class="fa-solid fa-chart-pie text-emerald"></i>
                    <span>独有召回分布</span>
                  </div>
                  <div class="metric-card-body">
                    <div class="metric-versus-row">
                      <span>自研独有: <strong>{{ shadowResult.primaryOnlyCount }}</strong> 块</span>
                      <span class="versus-dot">|</span>
                      <span>Dify独有: <strong>{{ shadowResult.secondaryOnlyCount }}</strong> 块</span>
                    </div>
                    <span class="shadow-delta-tag neutral">
                      共评测 {{ (shadowResult.primaryChunks?.length || 0) + (shadowResult.secondaryChunks?.length || 0) }} 候选切片
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 左右双栏并排切片对比 (Side-by-Side Comparison) -->
            <div class="shadow-compare-grid">
              <!-- 左栏: Spring AI 自研引擎 -->
              <div class="shadow-col col-primary">
                <div class="shadow-col-header">
                  <div class="col-title-wrap">
                    <i class="fa-solid fa-brain text-blue"></i>
                    <h4>Spring AI 原生自研引擎</h4>
                    <span class="col-count-tag">{{ shadowResult.primaryChunks?.length || 0 }} 命中切片</span>
                  </div>
                  <span class="engine-indicator-pill spring-ai">主评测路径</span>
                </div>

                <div v-if="!shadowResult.primaryChunks || shadowResult.primaryChunks.length === 0" class="col-empty-card">
                  <i class="fa-solid fa-inbox"></i>
                  <span>自研引擎暂无匹配切片</span>
                </div>

                <div v-else class="col-chunks-list">
                  <div
                    v-for="(chunk, idx) in shadowResult.primaryChunks"
                    :key="'prim-' + idx"
                    class="shadow-chunk-item"
                  >
                    <div class="chunk-item-top">
                      <div class="chunk-item-meta">
                        <span class="chunk-rank-badge rank-1">#{{ idx + 1 }}</span>
                        <span class="chunk-doc-title" :title="chunk.sourceName">
                          <i class="fa-solid fa-file-lines"></i> {{ chunk.sourceName || '未命名文档' }}
                        </span>
                        <span v-if="chunk.metadata?.parentExpanded" class="tag-parent-expanded" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 11px; padding: 1px 6px; border-radius: 4px;">
                          <i class="fa-solid fa-diagram-project"></i> 父块展开
                        </span>
                      </div>
                      <div class="chunk-item-stats">
                        <span class="chunk-score-tag">得分: {{ formatScore(chunk.score) }}</span>
                        <span v-if="chunk.tokenCount" class="chunk-tokens-tag">{{ chunk.tokenCount }} T</span>
                        <button type="button" class="btn-copy-small" title="复制文本" @click="copyChunkText(chunk.content)">
                          <i class="fa-regular fa-clone"></i>
                        </button>
                      </div>
                    </div>
                    <div class="chunk-item-text">
                      {{ chunk.content }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右栏: Dify 托管引擎 -->
              <div class="shadow-col col-secondary">
                <div class="shadow-col-header">
                  <div class="col-title-wrap">
                    <i class="fa-solid fa-link text-purple"></i>
                    <h4>Dify 托管外部引擎</h4>
                    <span class="col-count-tag">{{ shadowResult.secondaryChunks?.length || 0 }} 命中切片</span>
                  </div>
                  <span class="engine-indicator-pill dify">对照基准路径</span>
                </div>

                <div v-if="!shadowResult.secondaryChunks || shadowResult.secondaryChunks.length === 0" class="col-empty-card">
                  <i class="fa-solid fa-inbox"></i>
                  <span>Dify 引擎暂无匹配切片</span>
                </div>

                <div v-else class="col-chunks-list">
                  <div
                    v-for="(chunk, idx) in shadowResult.secondaryChunks"
                    :key="'sec-' + idx"
                    class="shadow-chunk-item"
                  >
                    <div class="chunk-item-top">
                      <div class="chunk-item-meta">
                        <span class="chunk-rank-badge" :class="'rank-' + Math.min(idx + 1, 3)">#{{ idx + 1 }}</span>
                        <span class="chunk-doc-title" :title="chunk.sourceName">
                          <i class="fa-solid fa-file-lines"></i> {{ chunk.sourceName || 'Dify 远端文档' }}
                        </span>
                      </div>
                      <div class="chunk-item-stats">
                        <span class="chunk-score-tag">得分: {{ formatScore(chunk.score) }}</span>
                        <span v-if="chunk.tokenCount" class="chunk-tokens-tag">{{ chunk.tokenCount }} T</span>
                        <button type="button" class="btn-copy-small" title="复制文本" @click="copyChunkText(chunk.content)">
                          <i class="fa-regular fa-clone"></i>
                        </button>
                      </div>
                    </div>
                    <div class="chunk-item-text">
                      {{ chunk.content }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 初始空白引导 -->
        <div v-if="(retrievalMode === 'single' && !retrievalResult) || (retrievalMode === 'shadow' && !shadowResult)" class="retrieval-placeholder-state">
          <div class="placeholder-icon">
            <i class="fa-solid fa-radar"></i>
          </div>
          <h3>{{ retrievalMode === 'shadow' ? '准备就绪，输入问题开始双引擎影子 A/B 评测' : '准备就绪，输入问题开始召回测试' }}</h3>
          <p>
            {{ retrievalMode === 'shadow'
              ? '系统将同时把 Query 分发至 Spring AI 自研引擎与 Dify 托管引擎，毫秒级比对 Jaccard 召回重叠率、端到端延迟与 Token 上下文装填。'
              : '输入您关心的业务问题，点击“执行检索”即可实时查看分块召回效果、得分详情与耗时指标。'
            }}
          </p>
        </div>
      </div>

      <!-- TAB 4: 知识库成本与治理看板 (Phase P3) -->
      <div v-show="activeSubTab === 'cost-governance'" class="kb-tab-content cost-governance-tab">
        <div class="cost-header-banner">
          <div class="cost-banner-info">
            <h3><i class="fa-solid fa-coins text-amber"></i> 知识库成本看板与多格式治理模型</h3>
            <p>
              遵循《Spring-AI自研RAG双引擎设计》第 10 章成本治理模型：向量嵌入按 ￥0.5 / 1M Tokens 计量，重新排序按 ￥0.003 / 次计量。动态 Token 预算制有效阻断超长上下文对大模型造成的冗余开销。
            </p>
          </div>
          <button type="button" class="btn-cost-refresh" :disabled="loadingCostStats" title="刷新成本与治理指标" @click="loadCostStats">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loadingCostStats }"></i>
            <span>刷新指标</span>
          </button>
        </div>

        <div v-if="costStats" class="cost-stats-cards-grid">
          <!-- 卡片 1: 嵌入消耗 -->
          <div class="cost-card card-blue">
            <div class="cost-card-icon"><i class="fa-solid fa-layer-group"></i></div>
            <div class="cost-card-content">
              <span class="cost-label">累计入库 Embedding Tokens</span>
              <span class="cost-val">{{ (costStats.embeddingTokens || 0).toLocaleString() }}</span>
              <span class="cost-sub">预估嵌入费用: ￥{{ (costStats.embeddingCostYuan || 0).toFixed(4) }} 元</span>
            </div>
          </div>
          <!-- 卡片 2: 检索消耗与节省 -->
          <div class="cost-card card-emerald">
            <div class="cost-card-icon"><i class="fa-solid fa-bolt"></i></div>
            <div class="cost-card-content">
              <span class="cost-label">累计检索 Retrieval Tokens</span>
              <span class="cost-val">{{ (costStats.retrievalTokens || 0).toLocaleString() }}</span>
              <span class="cost-sub text-emerald">预算机制预估已节省 ~{{ (costStats.budgetSavedTokens || 0).toLocaleString() }} Tokens</span>
            </div>
          </div>
          <!-- 卡片 3: 重排调用 -->
          <div class="cost-card card-purple">
            <div class="cost-card-icon"><i class="fa-solid fa-arrows-split-up-and-left"></i></div>
            <div class="cost-card-content">
              <span class="cost-label">累计 Rerank 重新排序调用</span>
              <span class="cost-val">{{ (costStats.rerankCalls || 0).toLocaleString() }} <small>次</small></span>
              <span class="cost-sub">重排调用费用: ￥{{ (costStats.rerankCostYuan || 0).toFixed(4) }} 元</span>
            </div>
          </div>
          <!-- 卡片 4: 综合治理预估费用 -->
          <div class="cost-card card-amber">
            <div class="cost-card-icon"><i class="fa-solid fa-receipt"></i></div>
            <div class="cost-card-content">
              <span class="cost-label">知识库累计治理总费用</span>
              <span class="cost-val text-amber">￥{{ (costStats.estimatedCostYuan || 0).toFixed(4) }} <small>元</small></span>
              <span class="cost-sub">嵌入 + 重排序综合账单</span>
            </div>
          </div>
        </div>

        <!-- 多格式解析与 OCR 治理状态 -->
        <div class="governance-details-grid">
          <div class="gov-card">
            <div class="gov-card-header">
              <i class="fa-solid fa-file-shield text-blue"></i>
              <h4>多格式文档解析与结构化提取能力 (Phase P3)</h4>
            </div>
            <div class="gov-card-body">
              <div class="format-chips-list">
                <span class="format-chip active"><i class="fa-solid fa-table"></i> CSV / TSV 表头自动透传</span>
                <span class="format-chip active"><i class="fa-solid fa-file-word"></i> Word DOCX (OOXML 结构化解析)</span>
                <span class="format-chip active"><i class="fa-solid fa-file-pdf"></i> PDF (原生字符流提取 + 扫描件判定)</span>
                <span class="format-chip active"><i class="fa-solid fa-code"></i> JSON / TXT / Markdown (智能编码探测)</span>
              </div>
              <p class="gov-card-tip">
                <i class="fa-solid fa-circle-check text-emerald"></i>
                表格表头透传算法确保每一行切片均包含完整列头语义，杜绝传统分块后数据行上下文丢失的缺陷。
              </p>
            </div>
          </div>

          <div class="gov-card">
            <div class="gov-card-header">
              <i class="fa-solid fa-eye text-purple"></i>
              <h4>可插拔 OCR 引擎适配状态 (本地部署 PaddleOCR / 在线云端 API 双模)</h4>
            </div>
            <div class="gov-card-body">
              <div class="ocr-status-row">
                <span class="ocr-status-badge" :class="costStats?.ocrStatus?.enabled ? 'enabled' : 'disabled'">
                  <i :class="costStats?.ocrStatus?.enabled ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-pause'"></i>
                  {{ costStats?.ocrStatus?.enabled ? 'OCR 服务就绪 (' + (costStats?.ocrStatus?.provider || 'LOCAL_PADDLE') + ')' : 'OCR 插件处于休眠/降级模式' }}
                </span>
                <span class="ocr-feature-tag">双模灵活选择：本地部署 PaddleOCR (数据不出网) / 在线云端 API (零运维)</span>
                <span class="ocr-feature-tag">扫描件自动判定 (页均字符 &lt; 50)</span>
              </div>
              <p class="gov-card-tip">
                支持【选项 1：本地部署 PaddleOCR 容器】（100% 离线内网）与【选项 2：在线云端 API / 通义千问-VL】（开箱即用免安装环境）双模自由配置。当检测到影印扫描件 PDF 或图片时智能路由执行文字转写；未启用时自动平滑降级并保留原始元数据。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模态框 1: 创建/编辑知识库 -->
    <div class="modal-backdrop" :class="{ open: kbModalOpen }">
      <div class="modal-dialog" style="max-width: 680px;">
        <div class="modal-header">
          <h3>{{ kbForm.id ? '编辑知识库配置' : (kbForm.provider === 'SPRING_AI' ? '创建新知识库 (Spring AI 原生自研)' : '创建新知识库 (Dify RAG)') }}</h3>
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
              <label class="form-label">底层 RAG 服务适配 *</label>
              <div class="provider-radio-cards" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div
                  class="provider-radio-card"
                  :class="{ active: kbForm.provider === 'SPRING_AI', disabled: !!kbForm.id }"
                  :style="kbForm.provider === 'SPRING_AI' ? 'border-color: #a855f7; background: rgba(168, 85, 247, 0.08);' : ''"
                  @click="!kbForm.id && onProviderSelect('SPRING_AI')"
                >
                  <div class="provider-radio-title" style="display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-brain" style="color: #a855f7;"></i> Spring AI 原生自研</span>
                    <span class="tag-recommend" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">自研原生</span>
                  </div>
                  <div class="provider-radio-desc" style="font-size: 12px; margin-top: 6px; color: #94a3b8; line-height: 1.5;">
                    本地智能切片管线 + 1024 维密集向量化 + 双路混合检索，全流程自主可控。
                  </div>
                </div>

                <div
                  class="provider-radio-card"
                  :class="{ active: kbForm.provider === 'DIFY', disabled: !!kbForm.id }"
                  :style="kbForm.provider === 'DIFY' ? 'border-color: #3b82f6; background: rgba(59, 130, 246, 0.08);' : ''"
                  @click="!kbForm.id && onProviderSelect('DIFY')"
                >
                  <div class="provider-radio-title" style="display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-link text-blue"></i> Dify 外挂 RAG</span>
                    <span style="font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60a5fa;">外挂</span>
                  </div>
                  <div class="provider-radio-desc" style="font-size: 12px; margin-top: 6px; color: #94a3b8; line-height: 1.5;">
                    与配置好的 Dify 引擎双向 1:1 映射，由 Dify 远程 API 托管切片与向量索引。
                  </div>
                </div>
              </div>
              <div v-if="kbForm.id" class="input-hint text-amber" style="margin-top: 6px;">
                <i class="fa-solid fa-circle-info"></i> 知识库底层引擎类型在创建后不可变更
              </div>
            </div>

            <!-- Embedding 向量模型 -->
            <div class="form-group">
              <label class="form-label">Embedding 向量模型</label>
              <div class="embedding-model-box">
                <!-- 自研引擎展示原生向量模型 -->
                <div v-if="kbForm.provider === 'SPRING_AI'" class="embedding-model-item">
                  <div class="model-info-row">
                    <span class="model-name"><i class="fa-solid fa-cube" style="color: #a855f7;"></i> 平台原生向量管线 (1024 维)</span>
                    <span class="tag-recommend" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">自研原生</span>
                  </div>
                  <div class="model-desc">
                    由 Spring AI 平台本地服务生成 1024 维密集特征向量并落库于 PostgreSQL。未配置外部商业 Key 时自动启用平台内置高维特征投影，零依赖且高可用。
                  </div>
                </div>

                <!-- Dify 引擎展示 Dify 通义模型 -->
                <div v-else class="embedding-model-item">
                  <div class="model-info-row">
                    <span class="model-name"><i class="fa-solid fa-cube text-blue"></i> text-embedding-v3</span>
                    <span class="tag-recommend">Dify 官方推荐</span>
                  </div>
                  <div class="model-desc">
                    通义千问高质量向量模型 (Provider: 通义千问)，适配 Dify 高精度语义切片与向量索引。
                  </div>
                </div>

                <div v-if="kbForm.id" class="input-hint text-amber" style="margin-top: 6px;">
                  <i class="fa-solid fa-circle-info"></i> {{ kbForm.provider === 'SPRING_AI' ? '提示：已建立知识库的向量维度已锁定为 1024 维' : 'Dify 规则：已建立知识库的 Embedding 模型在初始化后不可变更' }}
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

    <!-- 模态框 4: GraphRAG 实体拓扑知识图谱 -->
    <div class="modal-backdrop" :class="{ open: showGraphModal }">
      <div class="modal-dialog modal-graph-dialog">
        <div class="modal-header">
          <div class="graph-modal-title">
            <i class="fa-solid fa-circle-nodes text-cyan"></i>
            <div>
              <h3>GraphRAG 实体关系拓扑网络</h3>
              <span class="graph-modal-subtitle">从知识库分块自动抽取的实体-谓词-实体三元组 (Subject-Predicate-Object)</span>
            </div>
          </div>
          <button class="btn-modal-close" @click="showGraphModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body graph-modal-body">
          <div v-if="loadingGraph" class="graph-loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x text-cyan"></i>
            <p>正在装载实体关系拓扑与图谱索引...</p>
          </div>
          <div v-else class="graph-content-layout">
            <!-- 统计指标条与搜索过滤 -->
            <div class="graph-toolbar">
              <div class="graph-stats-pills">
                <span class="graph-stat-pill">
                  <i class="fa-solid fa-dice-d20 text-cyan"></i>
                  实体节点 (Entities): <strong>{{ knowledgeGraphData.nodes?.length || 0 }}</strong>
                </span>
                <span class="graph-stat-pill">
                  <i class="fa-solid fa-share-nodes text-purple"></i>
                  关系三元组 (Triplets): <strong>{{ knowledgeGraphData.edges?.length || 0 }}</strong>
                </span>
              </div>
              <div class="graph-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  v-model="graphSearchQuery"
                  class="form-control-styled graph-search-input"
                  placeholder="搜索实体或关系，如：智能体、模型、PostgreSQL..."
                />
                <button v-if="graphSearchQuery" class="btn-clear-graph-search" @click="graphSearchQuery = ''">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <!-- 三元组列表 -->
            <div class="triplets-list-scroll">
              <div v-if="filteredGraphEdges.length === 0" class="graph-empty-state">
                <i class="fa-solid fa-circle-nodes fa-2x" style="opacity: 0.3; margin-bottom: 8px;"></i>
                <p>{{ (knowledgeGraphData.edges?.length || 0) === 0 ? '当前知识库暂无抽取的实体三元组。文档切片入库时将自动提取实体与语义关系。' : '未找到匹配的实体或关系' }}</p>
              </div>
              <div
                v-for="(edge, eIdx) in filteredGraphEdges"
                :key="eIdx"
                class="graph-triplet-card"
              >
                <div class="triplet-main-row">
                  <span class="node-badge source-node">
                    <i class="fa-solid fa-cube"></i> {{ edge.source }}
                  </span>
                  <div class="predicate-arrow">
                    <span class="predicate-line"></span>
                    <span class="predicate-label">{{ edge.predicate }}</span>
                    <i class="fa-solid fa-chevron-right arrow-head"></i>
                  </div>
                  <span class="node-badge target-node">
                    <i class="fa-solid fa-circle-dot"></i> {{ edge.target }}
                  </span>
                </div>
                <div v-if="edge.sourceChunk" class="triplet-source-chunk">
                  <i class="fa-solid fa-quote-left"></i>
                  <span>{{ edge.sourceChunk }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showGraphModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 模态框 5: 100% 私有化离线闭环自检报告 -->
    <div class="modal-backdrop" :class="{ open: showOfflineModal }">
      <div class="modal-dialog modal-offline-dialog">
        <div class="modal-header">
          <div class="offline-modal-title">
            <i class="fa-solid fa-shield-halved text-emerald"></i>
            <div>
              <h3>100% 私有化全离线闭环模式自检报告</h3>
              <span class="offline-modal-subtitle">验证所有检索、向量化、重排与解析算子完全运行于本地局域网，无任何外部公网依赖</span>
            </div>
          </div>
          <button class="btn-modal-close" @click="showOfflineModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body offline-modal-body">
          <div v-if="loadingOfflineReport" class="graph-loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x text-emerald"></i>
            <p>正在诊断本地向量库、算子与离线服务状态...</p>
          </div>
          <div v-else-if="offlineReport" class="offline-content-layout">
            <!-- 总览卡片 -->
            <div class="offline-overview-banner" :class="{ 'banner-ready': offlineReport.airGappedReady }">
              <div class="overview-left">
                <i class="fa-solid" :class="offlineReport.airGappedReady ? 'fa-circle-check text-emerald fa-2x' : 'fa-triangle-exclamation text-amber fa-2x'"></i>
                <div>
                  <h4>{{ offlineReport.airGappedReady ? '全链路离线就绪 (100% Air-Gapped Ready)' : '离线配置待优化' }}</h4>
                  <p>{{ offlineReport.summary }}</p>
                </div>
              </div>
              <div class="overview-badges">
                <span class="badge-air-gapped">
                  <i class="fa-solid fa-network-wired"></i>
                  局域网/内网纯净
                </span>
                <span class="badge-air-gapped">
                  <i class="fa-solid fa-lock"></i>
                  数据零出境
                </span>
              </div>
            </div>

            <!-- 6 大组件诊断卡片网格 -->
            <div class="offline-components-grid">
              <div
                v-for="comp in offlineReport.components"
                :key="comp.componentName"
                class="offline-component-card"
                :class="{ 'card-ready': comp.ready, 'card-warn': !comp.ready }"
              >
                <div class="comp-header">
                  <div class="comp-name-box">
                    <span class="comp-status-dot" :class="comp.ready ? 'dot-green' : 'dot-red'"></span>
                    <strong class="comp-name">{{ comp.componentName }}</strong>
                  </div>
                  <span class="comp-tag" :class="comp.ready ? 'tag-local' : 'tag-warn'">
                    {{ comp.ready ? '本地就绪' : '检查警告' }}
                  </span>
                </div>
                <div class="comp-type-label">
                  <i class="fa-solid fa-microchip"></i> {{ comp.implementationType }}
                </div>
                <p class="comp-desc">{{ comp.description }}</p>
              </div>
            </div>
          </div>
          <div v-else class="graph-empty-state">
            <p>暂无离线自检数据</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showOfflineModal = false">关闭报告</button>
        </div>
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
  active: {
    type: Boolean,
    default: false
  },
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
const activeSubTab = ref('documents') // 'documents' | 'faqs' | 'retrieval-test' | 'cost-governance'
const selectedKb = ref(null)

function resetToList(forceReload = true) {
  currentView.value = 'list'
  selectedKb.value = null
  if (forceReload) {
    loadEngineInfo()
    loadKnowledgeBases()
  }
}

watch(() => props.active, (val) => {
  if (val) {
    resetToList(true)
  }
})

defineExpose({
  resetToList,
  loadKnowledgeBases
})

// ==================== 召回测试与调试状态 (Phase P1 & P2 & P3) ====================
const retrievalMode = ref('single') // 'single' | 'shadow'
const showParamDrawer = ref(true)
const retrievalQuery = ref('')
const testingRetrieval = ref(false)
const testingShadow = ref(false)
const retrievalResult = ref(null)
const shadowResult = ref(null)
const costStats = ref(null)
const loadingCostStats = ref(false)
const retrievalVersions = ref([])
const activeIndexVersion = ref(null)
const expandedChunks = ref(new Set())
const showOriginalChildMap = ref(new Set())

// P4 新增状态: 语义缓存、多模态、图谱与离线
const clearingCache = ref(false)
const reembedding = ref(false)
const showGraphModal = ref(false)
const loadingGraph = ref(false)
const graphSearchQuery = ref('')
const knowledgeGraphData = ref({ nodes: [], edges: [] })
const showOfflineModal = ref(false)
const loadingOfflineReport = ref(false)
const offlineReport = ref(null)

const testParams = reactive({
  topK: 5,
  scoreThreshold: 0.5,
  searchMethod: 'hybrid_search',
  rerankEnabled: true,
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  engineOverride: '',
  indexVersionId: '',
  expandParent: true,
  rewriteEnabled: false,
  maxContextTokens: 3000,
  cacheEnabled: true,
  queryType: 'TEXT',
  queryImageUrl: '',
  injectImagesToLlm: false,
  graphSearchEnabled: false
})

const filteredGraphEdges = computed(() => {
  const edges = knowledgeGraphData.value?.edges || []
  const q = (graphSearchQuery.value || '').trim().toLowerCase()
  if (!q) return edges
  return edges.filter(e =>
    (e.source || '').toLowerCase().includes(q) ||
    (e.target || '').toLowerCase().includes(q) ||
    (e.predicate || '').toLowerCase().includes(q) ||
    (e.sourceChunk || '').toLowerCase().includes(q)
  )
})

function toggleOriginalChild(cIdx) {
  const s = new Set(showOriginalChildMap.value)
  if (s.has(cIdx)) {
    s.delete(cIdx)
  } else {
    s.add(cIdx)
  }
  showOriginalChildMap.value = s
}

const sampleQueries = [
  '退款流程是怎样的？',
  '支持哪些文档格式上传？',
  '系统配置参数说明',
  '故障排查与应急指南',
  '服务协议与违约条款'
]

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
  try {
    const res = await http.get('/api/knowledge-bases', {
      keyword: searchKeyword.value,
      page: kbPage.value,
      size: kbPageSize.value
    })
    if (res && res.success && res.data) {
      kbList.value = res.data.records || []
      totalKbCount.value = res.data.total || 0
      kbTotalPages.value = Math.max(1, Math.ceil((res.data.total || 0) / kbPageSize.value))
    } else if (res && !res.success) {
      console.warn('获取知识库列表未返回成功状态:', res.message)
    }
  } catch (err) {
    console.error('loadKnowledgeBases error:', err)
  } finally {
    loadingKb.value = false
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

function onProviderSelect(type) {
  kbForm.provider = type
  if (type === 'SPRING_AI') {
    kbForm.embeddingModel = 'spring-ai-native-1024'
    kbForm.embeddingProvider = 'spring_ai'
  } else {
    kbForm.embeddingModel = 'text-embedding-v3'
    kbForm.embeddingProvider = 'langgenius/tongyi/tongyi'
  }
}

function getEmbeddingModelLabel(kb) {
  if (!kb) return '自研原生 (1024维)'
  if (kb.provider === 'SPRING_AI') {
    if (!kb.embeddingModel || kb.embeddingModel === 'text-embedding-v3' || kb.embeddingModel === 'spring-ai-native-1024') {
      return '自研原生 (1024维)'
    }
    return kb.embeddingModel
  }
  return kb.embeddingModel || 'text-embedding-v3'
}

function openCreateKb() {
  Object.assign(kbForm, {
    id: '',
    name: '',
    description: '',
    avatar: '📚',
    provider: 'SPRING_AI',
    embeddingModel: 'spring-ai-native-1024',
    embeddingProvider: 'spring_ai',
    searchMethod: 'hybrid_search',
    topK: 3,
    rerankEnabled: true,
    rerankMode: 'weighted_score',
    rerankModel: 'qwen3-rerank',
    rerankModelProvider: 'spring_ai',
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
    const successMsg = kbForm.id
      ? '知识库信息更新成功'
      : (kbForm.provider === 'SPRING_AI' ? 'Spring AI 原生自研知识库创建成功' : '知识库创建成功并已映射至 Dify')
    showToast(successMsg, 'success')
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
  retrievalResult.value = null
  shadowResult.value = null
  costStats.value = null
  retrievalQuery.value = ''
  loadDocuments()
  loadFaqCategories()
  loadFaqs()
}

function backToList() {
  resetToList(true)
}

// ==================== 召回测试与调试逻辑 (Phase P1 & P2 & P3) ====================

function openRetrievalTestTab() {
  activeSubTab.value = 'retrieval-test'
  if (selectedKb.value) {
    testParams.topK = (selectedKb.value.topK !== null && selectedKb.value.topK !== undefined) ? selectedKb.value.topK : 5
    testParams.scoreThreshold = (selectedKb.value.scoreThreshold !== null && selectedKb.value.scoreThreshold !== undefined) ? selectedKb.value.scoreThreshold : 0.5
    testParams.searchMethod = selectedKb.value.searchMethod || 'hybrid_search'
    testParams.rerankEnabled = selectedKb.value.rerankEnabled !== undefined ? selectedKb.value.rerankEnabled : true
    testParams.vectorWeight = (selectedKb.value.vectorWeight !== null && selectedKb.value.vectorWeight !== undefined) ? selectedKb.value.vectorWeight : 0.7
    testParams.keywordWeight = (selectedKb.value.keywordWeight !== null && selectedKb.value.keywordWeight !== undefined) ? selectedKb.value.keywordWeight : 0.3
    testParams.engineOverride = ''
    testParams.expandParent = true
    testParams.rewriteEnabled = false
    testParams.maxContextTokens = 3000
    testParams.cacheEnabled = true
    testParams.queryType = 'TEXT'
    testParams.queryImageUrl = ''
    testParams.injectImagesToLlm = false
    testParams.graphSearchEnabled = false
    showOriginalChildMap.value = new Set()
    loadIndexVersions()
  }
}

function openCostGovernanceTab() {
  activeSubTab.value = 'cost-governance'
  loadCostStats()
}

async function loadCostStats() {
  if (!selectedKb.value) return
  loadingCostStats.value = true
  const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/cost-stats`)
  loadingCostStats.value = false
  if (res.success && res.data) {
    costStats.value = res.data
  } else {
    showToast(res.message || '获取成本与治理指标失败', 'error')
  }
}

async function loadIndexVersions() {
  if (!selectedKb.value) return
  const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/index-versions`)
  if (res.success && res.data) {
    retrievalVersions.value = res.data
    if (res.data.length > 0) {
      activeIndexVersion.value = res.data[0]
      testParams.indexVersionId = res.data[0].id
    }
  }
}

function onWeightSliderChange(val) {
  const v = Number(val) || 0.7
  testParams.vectorWeight = v
  testParams.keywordWeight = Number((1.0 - v).toFixed(2))
}

async function executeRetrievalTest(queryText) {
  const q = (queryText !== undefined && queryText !== null ? queryText : retrievalQuery.value || '').trim()
  if (!q) {
    showToast('请输入查询语句', 'warning')
    return
  }
  retrievalQuery.value = q

  // P3: 若当前处于影子对比模式，路由至双引擎对比接口
  if (retrievalMode.value === 'shadow') {
    return executeShadowTest(q)
  }

  if (!selectedKb.value) return

  showOriginalChildMap.value = new Set()
  testingRetrieval.value = true
  const payload = {
    query: q,
    topK: Number(testParams.topK) || 5,
    scoreThreshold: Number(testParams.scoreThreshold) || 0.0,
    searchMethod: testParams.searchMethod,
    rerankEnabled: testParams.rerankEnabled,
    vectorWeight: Number(testParams.vectorWeight) || 0.7,
    keywordWeight: Number(testParams.keywordWeight) || 0.3,
    engineOverride: testParams.engineOverride || undefined,
    indexVersionId: testParams.indexVersionId || undefined,
    expandParent: testParams.expandParent !== false,
    rewriteEnabled: Boolean(testParams.rewriteEnabled),
    maxContextTokens: Number(testParams.maxContextTokens) || 3000,
    cacheEnabled: testParams.cacheEnabled !== false,
    queryType: testParams.queryType || 'TEXT',
    queryImageUrl: testParams.queryImageUrl || undefined,
    injectImagesToLlm: Boolean(testParams.injectImagesToLlm),
    graphSearchEnabled: Boolean(testParams.graphSearchEnabled)
  }

  const res = await http.post(`/api/knowledge-bases/${selectedKb.value.id}/retrieval-test`, payload)
  testingRetrieval.value = false

  if (res.success && res.data) {
    retrievalResult.value = res.data
    const hitCount = res.data.chunks?.length || 0
    if (hitCount > 0) {
      showToast(`检索完成：成功召回 ${hitCount} 个匹配分块（耗时 ${res.data.latencyMs} ms）`, 'success')
    }
  } else {
    showToast(res.message || '召回测试失败', 'error')
  }
}

async function executeShadowTest(queryText) {
  const q = (queryText !== undefined && queryText !== null ? queryText : retrievalQuery.value || '').trim()
  if (!q) {
    showToast('请输入用于双引擎影子评测的查询语句', 'warning')
    return
  }
  retrievalQuery.value = q
  if (!selectedKb.value) return

  testingShadow.value = true
  const payload = {
    query: q,
    topK: Number(testParams.topK) || 5,
    scoreThreshold: Number(testParams.scoreThreshold) || 0.0,
    searchMethod: testParams.searchMethod,
    rerankEnabled: testParams.rerankEnabled,
    vectorWeight: Number(testParams.vectorWeight) || 0.7,
    keywordWeight: Number(testParams.keywordWeight) || 0.3,
    engineOverride: testParams.engineOverride || undefined,
    expandParent: testParams.expandParent !== false,
    rewriteEnabled: Boolean(testParams.rewriteEnabled),
    maxContextTokens: Number(testParams.maxContextTokens) || 3000,
    cacheEnabled: testParams.cacheEnabled !== false,
    queryType: testParams.queryType || 'TEXT',
    queryImageUrl: testParams.queryImageUrl || undefined,
    injectImagesToLlm: Boolean(testParams.injectImagesToLlm),
    graphSearchEnabled: Boolean(testParams.graphSearchEnabled)
  }

  const res = await http.post(`/api/knowledge-bases/${selectedKb.value.id}/shadow-test`, payload)
  testingShadow.value = false

  if (res.success && res.data) {
    shadowResult.value = res.data
    const overlap = Math.round((res.data.overlapRatio || 0) * 100)
    const diff = res.data.latencyDiffMs || 0
    showToast(`双引擎影子评测完成: Jaccard 重叠率 ${overlap}%, 延迟差 ${diff} ms`, 'success')
  } else {
    showToast(res.message || '双引擎影子评测执行失败', 'error')
  }
}

async function clearSemanticCache() {
  if (!selectedKb.value) return
  clearingCache.value = true
  try {
    const res = await http.delete(`/api/knowledge-bases/${selectedKb.value.id}/cache/clear`)
    if (res.success) {
      showToast('语义缓存已成功清空', 'success')
    } else {
      showToast(res.message || '清空缓存失败', 'error')
    }
  } catch (err) {
    showToast('清空缓存请求出错', 'error')
  } finally {
    clearingCache.value = false
  }
}

async function reembedImages() {
  if (!selectedKb.value) return
  reembedding.value = true
  try {
    const res = await http.post(`/api/knowledge-bases/${selectedKb.value.id}/images/reembed`)
    if (res.success) {
      const updatedCount = res.data?.updatedCount || 0
      showToast(`图片向量重算回填完成，共处理 ${updatedCount} 个图片切片`, 'success')
    } else {
      showToast(res.message || '图片重算失败', 'error')
    }
  } catch (err) {
    showToast('图片重算请求出错', 'error')
  } finally {
    reembedding.value = false
  }
}

async function openKnowledgeGraphModal() {
  if (!selectedKb.value) return
  showGraphModal.value = true
  loadingGraph.value = true
  try {
    const res = await http.get(`/api/knowledge-bases/${selectedKb.value.id}/graph`)
    if (res.success && res.data) {
      knowledgeGraphData.value = res.data
    } else {
      knowledgeGraphData.value = { nodes: [], edges: [] }
    }
  } catch (err) {
    knowledgeGraphData.value = { nodes: [], edges: [] }
  } finally {
    loadingGraph.value = false
  }
}

async function openOfflineReadinessModal() {
  showOfflineModal.value = true
  loadingOfflineReport.value = true
  try {
    const kbId = selectedKb.value?.id
    const url = kbId ? `/api/knowledge-bases/${kbId}/offline-status` : `/api/knowledge-bases/offline-status`
    const res = await http.get(url)
    if (res.success && res.data) {
      offlineReport.value = res.data
    } else {
      offlineReport.value = null
    }
  } catch (err) {
    offlineReport.value = null
  } finally {
    loadingOfflineReport.value = false
  }
}

function retryWithLowerThreshold() {
  testParams.scoreThreshold = 0.3
  testParams.searchMethod = 'hybrid_search'
  executeRetrievalTest()
}

function retryWithZeroThreshold() {
  testParams.scoreThreshold = 0.0
  executeRetrievalTest()
}

function toggleChunkExpand(cIdx) {
  const s = new Set(expandedChunks.value)
  if (s.has(cIdx)) {
    s.delete(cIdx)
  } else {
    s.add(cIdx)
  }
  expandedChunks.value = s
}

function copyChunkText(content) {
  if (!content) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(content).then(() => {
      showToast('分块内容已复制到剪贴板', 'success')
    }).catch(() => {
      showToast('复制失败，请手动选择文字复制', 'error')
    })
  } else {
    const el = document.createElement('textarea')
    el.value = content
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    showToast('分块内容已复制到剪贴板', 'success')
  }
}

function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return Number(score).toFixed(3)
}

function getScoreClass(score) {
  const n = Number(score || 0)
  if (n >= 0.8) return 'score-high'
  if (n >= 0.6) return 'score-mid'
  return 'score-low'
}

function formatEngineSource(source) {
  if (!source) return '默认'
  if (source === 'L1_SYSTEM_DEFAULT') return '系统默认 L1'
  if (source === 'L2_KB_BINDING') return '知识库绑定 L2'
  if (source === 'L3_DEBUG_OVERRIDE') return '调试临时覆盖 L3'
  return source
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

<style scoped>
.retrieval-test-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.retrieval-test-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 26px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
  gap: 20px;
  flex-wrap: wrap;
}

.retrieval-header-info {
  flex: 1;
  min-width: 280px;
}

.retrieval-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.badge-recall-test {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: var(--accent-purple, #8b5cf6);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.badge-recall-engine, .badge-recall-version {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.badge-recall-engine strong,
.badge-recall-version strong {
  color: var(--text-primary);
}

.retrieval-header-desc {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.btn-toggle-params {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-sm, 8px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-toggle-params:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-1px);
}

.retrieval-params-card {
  padding: 22px 26px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
}

.params-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s ease;
}

.param-item:hover {
  border-color: var(--border-hover);
}

.param-item-span2 {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .param-item-span2 {
    grid-column: span 1;
  }
}

.param-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.param-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-val-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.param-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.45;
}

.method-pills {
  display: flex;
  gap: 6px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.method-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
}

.method-pill:hover {
  color: var(--text-primary);
}

.method-pill.active {
  background: var(--accent-blue);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
}

.rerank-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.toggle-switch-btn {
  width: 42px;
  height: 24px;
  background: var(--border-hover, #cbd5e1);
  border: none;
  border-radius: 12px;
  padding: 2px;
  cursor: pointer;
  position: relative;
  transition: background 0.25s ease;
  flex-shrink: 0;
}

.toggle-switch-btn.active {
  background: var(--accent-emerald, #10b981);
}

.toggle-switch-btn.active.switch-purple {
  background: var(--accent-purple, #a855f7);
}

.toggle-switch-btn.active.switch-blue {
  background: var(--accent-blue, #3b82f6);
}

.child-toggle-bar {
  padding: 6px 10px;
  background: rgba(168, 85, 247, 0.08);
  border: 1px dashed rgba(168, 85, 247, 0.25);
  border-radius: 6px;
}

.btn-toggle-child {
  transition: all 0.2s ease;
}

.btn-toggle-child:hover {
  background: rgba(168, 85, 247, 0.2) !important;
  border-color: rgba(168, 85, 247, 0.6) !important;
}

.tag-parent-expanded {
  animation: fadeIn 0.3s ease;
}

.switch-ball {
  display: block;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.25s ease;
}

.toggle-switch-btn.active .switch-ball {
  transform: translateX(18px);
}

.toggle-switch-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.weights-slider-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weights-scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--text-muted);
}

.retrieval-query-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  padding: 22px 26px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-input-wrap {
  display: flex;
  align-items: center;
  position: relative;
  background: var(--bg-input);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 8px 6px 16px;
  min-height: 52px;
  transition: all 0.2s ease;
}

.query-input-wrap:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.15);
}

.query-icon {
  color: var(--text-muted);
  margin-right: 12px;
  font-size: 16px;
}

.query-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14.5px;
  outline: none;
  line-height: 1.5;
}

.query-input::placeholder {
  color: var(--text-muted);
  opacity: 0.8;
}

.btn-clear-query {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  margin-right: 8px;
  transition: color 0.2s;
}

.btn-clear-query:hover {
  color: var(--text-primary);
}

.btn-execute-test {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 22px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  color: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-execute-test:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transform: translateY(-1px);
}

.btn-execute-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.sample-queries-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sample-label {
  font-size: 12.5px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.query-chip {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 5px 13px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.query-chip:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-1px);
}

.retrieval-result-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  gap: 14px;
}

.result-banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
}

.result-stat-chip.hit-count {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--accent-emerald, #10b981);
}

.result-stat-chip.latency {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--accent-amber, #f59e0b);
}

.result-stat-chip.engine {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--accent-blue, #3b82f6);
}

.engine-src-tag {
  font-size: 11.5px;
  color: var(--text-muted);
}

.result-query-tag {
  font-size: 12.5px;
  color: var(--text-muted);
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.retrieval-chunks-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.retrieval-chunk-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: all 0.25s ease;
}

.retrieval-chunk-card:hover {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.chunk-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--bg-card-hover);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 10px;
}

.chunk-rank-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chunk-rank-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--border-hover, #475569);
  color: #fff;
}

.chunk-rank-badge.rank-1 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
}

.chunk-rank-badge.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: #fff;
}

.chunk-rank-badge.rank-3 {
  background: linear-gradient(135deg, #b45309, #78350f);
  color: #fff;
}

.chunk-doc-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.chunk-seg-index, .chunk-tokens {
  font-size: 11.5px;
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  border-radius: 4px;
}

.chunk-score-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chunk-score-pill {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.chunk-score-pill.score-fused {
  border-width: 1px;
  border-style: solid;
}

.chunk-score-pill.score-high {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: var(--accent-emerald, #10b981);
}

.chunk-score-pill.score-mid {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: var(--accent-blue, #3b82f6);
}

.chunk-score-pill.score-low {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: var(--accent-amber, #f59e0b);
}

.chunk-score-pill.score-sub {
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: normal;
}

.chunk-score-pill.score-rerank {
  color: var(--accent-purple, #8b5cf6);
}

.chunk-card-body {
  padding: 18px 20px;
}

.chunk-content-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.chunk-content-text.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-expand-chunk {
  background: transparent;
  border: none;
  color: var(--accent-blue);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 0 0 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-expand-chunk:hover {
  text-decoration: underline;
}

.chunk-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: var(--bg-input);
  border-top: 1px solid var(--border-color);
}

.chunk-id-text {
  font-size: 11.5px;
  color: var(--text-muted);
  font-family: monospace;
}

.btn-copy-chunk {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-chunk:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.retrieval-empty-state, .retrieval-placeholder-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 28px;
  background: var(--bg-card);
  border: 1.5px dashed var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
}

.diagnostic-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 18px;
}

.placeholder-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-purple, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 18px;
}

.retrieval-empty-state h3, .retrieval-placeholder-state h3 {
  margin: 0 0 8px 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.retrieval-placeholder-state p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.65;
  max-width: 520px;
}

.diagnostic-box {
  max-width: 600px;
  width: 100%;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diagnostic-reason {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  font-size: 13.5px;
  color: var(--text-primary);
  text-align: left;
  line-height: 1.6;
}

.diagnostic-reason i {
  color: var(--accent-amber);
  margin-top: 3px;
  font-size: 16px;
}

.diagnostic-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-diag-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-diag-action:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
  transform: translateY(-1px);
}

.btn-diag-action.secondary {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-diag-action.secondary:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
  box-shadow: none;
}

/* ==================== P3 样式增强: 模式切换、双引擎影子评测与成本看板 ==================== */

.badge-subtab-p3 {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  margin-left: 5px;
}

.retrieval-mode-switcher {
  display: inline-flex;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 4px;
  gap: 6px;
  margin-top: 14px;
}

.mode-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-switch-btn:hover {
  color: var(--text-primary);
}

.mode-switch-btn.active {
  background: var(--bg-card);
  color: var(--accent-blue);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.badge-mode-p3 {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.btn-execute-test.btn-shadow-mode {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

.btn-execute-test.btn-shadow-mode:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
}

/* 影子评测对比容器 */
.shadow-evaluation-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shadow-summary-banner {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shadow-banner-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.shadow-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.shadow-badge-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: var(--accent-purple, #8b5cf6);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.shadow-query-pill {
  font-size: 12.5px;
  color: var(--text-secondary);
  background: var(--bg-input);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.shadow-overlap-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 220px;
}

.overlap-title {
  font-size: 12.5px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.overlap-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.shadow-track {
  width: 100%;
  height: 6px;
  background: var(--bg-input);
  border-radius: 3px;
  overflow: hidden;
}

.shadow-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.shadow-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.shadow-metric-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  font-weight: 500;
}

.metric-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-versus-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-primary);
}

.versus-dot {
  font-size: 11px;
  color: var(--text-muted);
}

.shadow-delta-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.shadow-delta-tag.faster {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald, #10b981);
}

.shadow-delta-tag.slower {
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber, #f59e0b);
}

.shadow-delta-tag.info {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-purple, #8b5cf6);
}

.shadow-delta-tag.neutral {
  background: var(--bg-input);
  color: var(--text-muted);
}

/* 双栏对比网格 */
.shadow-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .shadow-compare-grid {
    grid-template-columns: 1fr;
  }
}

.shadow-col {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shadow-col.col-primary {
  border-color: rgba(99, 102, 241, 0.35);
}

.shadow-col.col-secondary {
  border-color: rgba(168, 85, 247, 0.3);
}

.shadow-col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--bg-card-hover);
  border-bottom: 1px solid var(--border-color);
}

.col-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-title-wrap h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.col-count-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.engine-indicator-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.engine-indicator-pill.spring-ai {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-purple, #8b5cf6);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.engine-indicator-pill.dify {
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.col-empty-card {
  padding: 48px 20px;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
}

.col-chunks-list {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 650px;
  overflow-y: auto;
}

.shadow-chunk-item {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}

.shadow-chunk-item:hover {
  border-color: rgba(99, 102, 241, 0.4);
  background: var(--bg-card-hover);
}

.chunk-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.chunk-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.chunk-doc-title {
  font-size: 12.5px;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.chunk-item-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.chunk-score-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-emerald, #10b981);
  background: rgba(16, 185, 129, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.chunk-tokens-tag {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-copy-small {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
  transition: color 0.2s;
}

.btn-copy-small:hover {
  color: var(--accent-blue);
}

.chunk-item-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow-y: auto;
}

/* ==================== 成本与治理看板 (Cost & Governance Tab) ==================== */
.cost-governance-tab {
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: fadeIn 0.25s ease;
}

.cost-header-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 28px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  gap: 20px;
  flex-wrap: wrap;
}

.cost-banner-info {
  flex: 1;
  min-width: 280px;
}

.cost-banner-info h3 {
  margin: 0 0 8px 0;
  font-size: 17px;
  color: var(--text-primary);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cost-banner-info p {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.65;
  max-width: 900px;
}

/* 刷新指标按钮（解决图标重叠问题） */
.btn-cost-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  height: 38px;
  min-width: 110px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-sm, 8px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-cost-refresh:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--accent-amber);
  color: var(--accent-amber);
  transform: translateY(-1px);
}

.btn-cost-refresh:disabled {
  opacity: 0.55;
  cursor: wait;
}

.cost-stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.cost-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.cost-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.cost-card.card-blue { border-color: rgba(59, 130, 246, 0.3); }
.cost-card.card-emerald { border-color: rgba(16, 185, 129, 0.3); }
.cost-card.card-purple { border-color: rgba(168, 85, 247, 0.3); }
.cost-card.card-amber { border-color: rgba(245, 158, 11, 0.35); }

.cost-card-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.card-blue .cost-card-icon { background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); }
.card-emerald .cost-card-icon { background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); }
.card-purple .cost-card-icon { background: rgba(168, 85, 247, 0.12); color: var(--accent-purple, #8b5cf6); }
.card-amber .cost-card-icon { background: rgba(245, 158, 11, 0.12); color: var(--accent-amber); }

.cost-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.cost-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.cost-val {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin: 4px 0 2px;
}

.cost-val small {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.cost-sub {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}

.governance-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 860px) {
  .governance-details-grid {
    grid-template-columns: 1fr;
  }
}

.gov-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 22px 26px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gov-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gov-card-header h4 {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.gov-card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.format-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.format-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  font-weight: 500;
  transition: all 0.2s ease;
}

.format-chip.active {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
}

.gov-card-tip {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
}

.ocr-status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ocr-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.ocr-status-badge.enabled {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald, #10b981);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.ocr-status-badge.disabled {
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.ocr-feature-tag {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

/* ==================== P4 差异化超越与多模态样式 (Phase P4) ==================== */
.btn-offline-badge {
  background: rgba(16, 185, 129, 0.12) !important;
  color: #10b981 !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-offline-badge:hover {
  background: rgba(16, 185, 129, 0.2) !important;
  border-color: rgba(16, 185, 129, 0.5) !important;
}

.switch-green.active {
  background: #10b981 !important;
}

.switch-cyan.active {
  background: #06b6d4 !important;
}

.switch-purple.active {
  background: #8b5cf6 !important;
}

.btn-clear-cache-small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 11.5px;
  border-radius: 4px;
  background: var(--bg-input);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-left: auto;
}

.btn-clear-cache-small:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  border-color: #ef4444;
}

.cache-hit-chip {
  background: rgba(16, 185, 129, 0.15) !important;
  border-color: rgba(16, 185, 129, 0.4) !important;
  color: #10b981 !important;
}

.tag-cache-hit {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag-graph-hit {
  background: rgba(6, 182, 212, 0.12);
  color: #0891b2;
  border: 1px solid rgba(6, 182, 212, 0.3);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.badge-matched-by {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.badge-matched-by.match-vector,
.badge-matched-by.matched-image_vector {
  background: rgba(168, 85, 247, 0.15);
  color: #9333ea;
  border-color: rgba(168, 85, 247, 0.3);
}

.badge-matched-by.match-caption,
.badge-matched-by.matched-caption {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.3);
}

.badge-matched-by.matched-text_only {
  background: var(--bg-input);
  color: var(--text-muted);
  border-color: var(--border-color);
}

.card-image-chunk {
  border-left: 3px solid #a855f7 !important;
}

.card-graph-chunk {
  border-left: 3px solid #06b6d4 !important;
}

/* 多模态图文切片展示卡片 (Chapter 18) */
.chunk-image-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: var(--bg-input);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 10px;
}

.image-thumb-wrap {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
}

.chunk-img-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.thumb-zoom-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: #f1f5f9;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-thumb-wrap:hover .thumb-zoom-overlay {
  opacity: 1;
}

.image-thumb-wrap:hover .chunk-img-thumb {
  transform: scale(1.05);
}

.image-meta-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-matched-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.image-url-link {
  font-size: 11px;
  color: var(--text-muted);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-caption-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
  background: var(--bg-card);
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 3px solid #8b5cf6;
}

/* GraphRAG 弹窗样式 */
.modal-graph-dialog {
  max-width: 780px !important;
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.graph-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.graph-modal-title i {
  font-size: 24px;
}

.graph-modal-title h3 {
  margin: 0 0 2px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.graph-modal-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.graph-modal-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 18px 22px !important;
}

.graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.graph-stats-pills {
  display: flex;
  gap: 8px;
}

.graph-stat-pill {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.graph-search-wrap {
  position: relative;
  min-width: 260px;
}

.graph-search-wrap i.fa-magnifying-glass {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 12px;
}

.graph-search-input {
  padding-left: 30px !important;
  padding-right: 28px !important;
  font-size: 12px !important;
  background: var(--bg-input) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.btn-clear-graph-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
}

.triplets-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.graph-triplet-card {
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.graph-triplet-card:hover {
  border-color: rgba(6, 182, 212, 0.5);
}

.triplet-main-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.node-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.source-node {
  background: rgba(6, 182, 212, 0.12);
  color: #0891b2;
  border: 1px solid rgba(6, 182, 212, 0.35);
}

.target-node {
  background: rgba(168, 85, 247, 0.12);
  color: var(--accent-purple, #8b5cf6);
  border: 1px solid rgba(168, 85, 247, 0.35);
}

.predicate-arrow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.predicate-label {
  font-size: 11.5px;
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.arrow-head {
  font-size: 10px;
  color: var(--text-muted);
}

.triplet-source-chunk {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
  padding: 6px 10px;
  background: var(--bg-input);
  border-radius: 4px;
  display: flex;
  gap: 6px;
}

.graph-empty-state,
.graph-loading-state {
  text-align: center;
  padding: 36px 16px;
  color: var(--text-muted);
  font-size: 13px;
}

/* 100% 私有化离线报告弹窗样式 */
.modal-offline-dialog {
  max-width: 820px !important;
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.offline-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.offline-modal-title h3 {
  margin: 0 0 2px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.offline-modal-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.offline-modal-body {
  max-height: 65vh;
  overflow-y: auto;
  padding: 18px 22px !important;
}

.offline-overview-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 10px;
  margin-bottom: 16px;
}

.overview-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.overview-left h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.overview-left p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.overview-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badge-air-gapped {
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.offline-components-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.offline-component-card {
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.offline-component-card.card-ready {
  border-left: 3px solid #10b981;
}

.offline-component-card.card-warn {
  border-left: 3px solid #f59e0b;
}

.comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comp-name-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comp-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-green {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.dot-red {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.comp-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

.comp-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
}

.tag-local {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.tag-warn {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.comp-type-label {
  font-size: 11.5px;
  color: var(--accent-blue);
  margin-bottom: 6px;
}

.comp-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* ==================== 白天模式专属优化 (Light Theme Enhancements) ==================== */
[data-theme="light"] .retrieval-test-header-card,
[data-theme="light"] .retrieval-params-card,
[data-theme="light"] .retrieval-query-box,
[data-theme="light"] .retrieval-result-banner,
[data-theme="light"] .retrieval-chunk-card,
[data-theme="light"] .cost-header-banner,
[data-theme="light"] .cost-card,
[data-theme="light"] .gov-card,
[data-theme="light"] .shadow-summary-banner,
[data-theme="light"] .shadow-col,
[data-theme="light"] .modal-graph-dialog,
[data-theme="light"] .modal-offline-dialog {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04) !important;
}

[data-theme="light"] .query-input-wrap,
[data-theme="light"] .method-pills,
[data-theme="light"] .param-item,
[data-theme="light"] .chunk-card-footer,
[data-theme="light"] .shadow-chunk-item,
[data-theme="light"] .shadow-metric-card,
[data-theme="light"] .offline-component-card,
[data-theme="light"] .graph-triplet-card,
[data-theme="light"] .chunk-image-card,
[data-theme="light"] .triplet-source-chunk,
[data-theme="light"] .retrieval-mode-switcher {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
}

[data-theme="light"] .chunk-card-header,
[data-theme="light"] .shadow-col-header {
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
}

[data-theme="light"] .retrieval-empty-state,
[data-theme="light"] .retrieval-placeholder-state {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
}

[data-theme="light"] .query-chip,
[data-theme="light"] .btn-cost-refresh,
[data-theme="light"] .btn-toggle-params,
[data-theme="light"] .btn-copy-chunk,
[data-theme="light"] .format-chip,
[data-theme="light"] .badge-recall-engine,
[data-theme="light"] .badge-recall-version,
[data-theme="light"] .ocr-feature-tag,
[data-theme="light"] .shadow-query-pill,
[data-theme="light"] .graph-stat-pill {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
  color: #475569 !important;
}

[data-theme="light"] .btn-cost-refresh:hover,
[data-theme="light"] .btn-toggle-params:hover,
[data-theme="light"] .query-chip:hover,
[data-theme="light"] .btn-copy-chunk:hover {
  background: #f1f5f9 !important;
}

[data-theme="light"] .query-input {
  color: #0f172a !important;
}

[data-theme="light"] .query-input::placeholder {
  color: #94a3b8 !important;
}

[data-theme="light"] .chunk-content-text {
  color: #1e293b !important;
}

[data-theme="light"] .chunk-doc-name,
[data-theme="light"] .comp-name,
[data-theme="light"] .cost-val,
[data-theme="light"] .cost-banner-info h3,
[data-theme="light"] .gov-card-header h4,
[data-theme="light"] .params-card-title,
[data-theme="light"] .col-title-wrap h4,
[data-theme="light"] .graph-modal-title h3,
[data-theme="light"] .offline-modal-title h3,
[data-theme="light"] .overview-left h4 {
  color: #0f172a !important;
}

[data-theme="light"] .cost-label,
[data-theme="light"] .retrieval-header-desc,
[data-theme="light"] .cost-banner-info p,
[data-theme="light"] .comp-desc,
[data-theme="light"] .chunk-item-text,
[data-theme="light"] .overview-left p,
[data-theme="light"] .param-label,
[data-theme="light"] .param-hint,
[data-theme="light"] .toggle-switch-text {
  color: #475569 !important;
}

[data-theme="light"] .cost-sub,
[data-theme="light"] .chunk-id-text,
[data-theme="light"] .weights-scale-labels,
[data-theme="light"] .sample-label,
[data-theme="light"] .overlap-title,
[data-theme="light"] .chunk-tokens-tag,
[data-theme="light"] .graph-modal-subtitle,
[data-theme="light"] .offline-modal-subtitle {
  color: #94a3b8 !important;
}

[data-theme="light"] .gov-card-tip {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
  color: #065f46 !important;
}

[data-theme="light"] .diagnostic-reason {
  background: #fffbeb !important;
  border-color: #fde68a !important;
  color: #92400e !important;
}

[data-theme="light"] .offline-overview-banner {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
}

/* ==================== 知识库资产列表精细化排版 ==================== */
.kb-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.kb-agent-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 1100px;
}

.kb-agent-table th {
  background: var(--bg-input);
  padding: 13px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  letter-spacing: 0.3px;
  white-space: nowrap;
  user-select: none;
}

.kb-agent-table td {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.kb-agent-table tr:last-child td {
  border-bottom: none;
}

.kb-agent-table tr:hover td {
  background: var(--bg-card-hover);
}

/* 列宽度配置 */
.col-kb-name {
  width: 320px;
  min-width: 280px;
}
.col-kb-owner {
  width: 120px;
}
.col-kb-provider {
  width: 130px;
}
.col-kb-retrieval {
  width: 190px;
}
.col-kb-docs {
  width: 90px;
}
.col-kb-faqs {
  width: 95px;
}
.col-kb-words {
  width: 100px;
}
.col-kb-time {
  width: 135px;
}
.col-kb-actions {
  width: 175px;
}

/* 知识库名称与描述单元格 */
.kb-table-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 2px 0;
}

.kb-table-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.kb-table-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
  justify-content: center;
}

.kb-table-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.kb-table-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  letter-spacing: -0.2px;
}

.kb-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 1.5px 7px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.35;
}

.kb-pill-badge.system {
  background: rgba(99, 102, 241, 0.12);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.28);
}

.kb-pill-badge.mine {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.28);
}

.kb-pill-badge.other {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.kb-table-desc {
  font-size: 12px;
  color: var(--text-muted);
  max-width: 255px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

/* 所属账号单元格 */
.kb-cell-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 检索模式与向量模型单元格 */
.kb-retrieval-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
  min-width: 0;
}

.kb-model-truncate {
  max-width: 155px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

/* 统计标签胶囊 */
.kb-stat-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.kb-stat-pill.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.kb-stat-pill.emerald {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.kb-stat-pill.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

/* 更新时间 */
.kb-time-label {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
