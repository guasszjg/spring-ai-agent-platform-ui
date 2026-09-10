<template>
  <div class="users-panel-page">
    <!-- Top Header & Actions -->
    <div class="users-header-row">
      <div class="users-title-group">
        <div class="users-title-badge-row">
          <h2>用户管理</h2>
          <span class="users-title-pill">RBAC 2.0</span>
        </div>
        <p class="users-subtitle">统一管理平台账号、指派系统内置角色与控制账号生命周期安全状态</p>
      </div>
      <div class="users-header-actions">
        <button class="btn-create-user" @click="openCreateModal">
          <i class="fa-solid fa-user-plus"></i>
          <span>新建用户</span>
        </button>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="users-metrics-grid">
      <div class="user-metric-card">
        <div class="metric-icon-box metric-icon-total">
          <i class="fa-solid fa-users"></i>
        </div>
        <div class="metric-info">
          <span class="metric-label">平台总账号数</span>
          <span class="metric-value">{{ stats.total }}</span>
        </div>
      </div>
      <div class="user-metric-card">
        <div class="metric-icon-box metric-icon-admin">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <div class="metric-info">
          <span class="metric-label">超级管理员</span>
          <span class="metric-value">{{ stats.admins }}</span>
        </div>
      </div>
      <div class="user-metric-card">
        <div class="metric-icon-box metric-icon-dev">
          <i class="fa-solid fa-code"></i>
        </div>
        <div class="metric-info">
          <span class="metric-label">平台开发者</span>
          <span class="metric-value">{{ stats.devs }}</span>
        </div>
      </div>
      <div class="user-metric-card">
        <div class="metric-icon-box metric-icon-viewer">
          <i class="fa-solid fa-eye"></i>
        </div>
        <div class="metric-info">
          <span class="metric-label">只读观察员</span>
          <span class="metric-value">{{ stats.viewers }}</span>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="users-toolbar">
      <div class="users-search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索用户名、姓名昵称..."
          class="users-search-input"
          @keyup.enter="fetchUsers"
        >
        <button v-if="searchKeyword" class="btn-clear-search" title="清空搜索" @click="searchKeyword = ''; fetchUsers()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="users-filter-group">
        <select v-model="selectedRole" class="users-select-filter" @change="fetchUsers">
          <option value="">全部角色</option>
          <option value="SUPER_ADMIN">超级管理员</option>
          <option value="DEVELOPER">开发者</option>
          <option value="VIEWER">只读观察员</option>
        </select>

        <select v-model="selectedStatus" class="users-select-filter" @change="fetchUsers">
          <option value="">全部状态</option>
          <option value="ACTIVE">正常运行</option>
          <option value="PENDING_PASSWORD">待首次改密</option>
          <option value="DISABLED">已停用</option>
        </select>

        <button class="btn-users-refresh" title="刷新列表" :disabled="loading" @click="fetchUsers">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="table-view-card users-table-card">
      <div v-if="loading && !users.length" class="users-loading-state">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>加载用户列表中...</span>
      </div>

      <div v-else-if="!users.length" class="users-empty-state">
        <div class="empty-icon-wrap">
          <i class="fa-solid fa-user-slash"></i>
        </div>
        <h4>未找到匹配的用户账号</h4>
        <p>可尝试清除筛选关键词，或点击右上角创建新账号</p>
      </div>

      <table v-else class="agent-table">
        <thead>
          <tr>
            <th>用户身份</th>
            <th>系统角色</th>
            <th>运行状态</th>
            <th>安全凭据</th>
            <th>注册时间</th>
            <th style="text-align: right;">账号治理操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" :class="{ 'row-self': isSelf(u) }">
            <!-- User Identity -->
            <td>
              <div class="user-cell-meta">
                <img :src="u.avatar || (u.role === 'SUPER_ADMIN' ? '/avatar-admin.jpg' : '/avatar-dev.jpg')" class="user-table-avatar" alt="avatar">
                <div class="user-text-wrap">
                  <div class="user-nickname-row">
                    <span class="user-nickname-text">{{ u.nickname || u.username }}</span>
                    <span v-if="isSelf(u)" class="user-self-pill">当前操作者</span>
                  </div>
                  <span class="user-account-text">@{{ u.username }}</span>
                </div>
              </div>
            </td>

            <!-- Role Badge -->
            <td>
              <div class="role-badge-pill" :class="'role-' + (u.role || '').toLowerCase()">
                <i v-if="u.role === 'SUPER_ADMIN'" class="fa-solid fa-shield-halved"></i>
                <i v-else-if="u.role === 'DEVELOPER'" class="fa-solid fa-code"></i>
                <i v-else class="fa-solid fa-eye"></i>
                <span>{{ u.roleName || u.role }}</span>
              </div>
            </td>

            <!-- Status Pill -->
            <td>
              <div class="badge-status" :class="statusClass(u.status)">
                <span class="status-dot"></span>
                <span>{{ statusLabel(u.status) }}</span>
              </div>
            </td>

            <!-- Security & Password -->
            <td>
              <div v-if="u.mustChangePassword" class="pwd-flag-pill flag-pending" title="用户首次登录需强制修改密码">
                <i class="fa-solid fa-key"></i>
                <span>待首次改密</span>
              </div>
              <div v-else class="pwd-flag-pill flag-active" title="密码已完成初始化">
                <i class="fa-solid fa-circle-check"></i>
                <span>密码正常</span>
              </div>
            </td>

            <!-- Created At -->
            <td>
              <span class="user-date-text">{{ formatDate(u.createdAt) }}</span>
            </td>

            <!-- Actions -->
            <td style="text-align: right;">
              <div class="agent-actions" style="justify-content: flex-end;">
                <!-- Edit Profile -->
                <button class="btn-card-action" title="修改用户姓名与资料" @click="openEditModal(u)">
                  <i class="fa-regular fa-pen-to-square"></i>
                  <span>编辑</span>
                </button>

                <!-- Change Role -->
                <button
                  class="btn-card-action"
                  :title="isSelf(u) ? '不能修改自身角色' : '变更系统分配角色'"
                  :disabled="isSelf(u)"
                  @click="openRoleModal(u)"
                >
                  <i class="fa-solid fa-user-shield"></i>
                  <span>角色</span>
                </button>

                <!-- Change / Reset Password -->
                <button class="btn-card-action" title="修改或重置用户密码" @click="openPasswordModal(u)">
                  <i class="fa-solid fa-key"></i>
                  <span>改密</span>
                </button>

                <!-- Toggle Status (Disable / Enable) -->
                <button
                  v-if="u.status === 'DISABLED'"
                  class="btn-card-action btn-action-success"
                  title="恢复账号正常使用"
                  @click="openStatusModal(u, 'ACTIVE')"
                >
                  <i class="fa-solid fa-circle-play"></i>
                  <span>恢复</span>
                </button>
                <button
                  v-else
                  class="btn-card-action btn-action-danger"
                  :title="isSelf(u) ? '禁止禁用当前操作员账号' : '停用该账号并立即失效所有Session'"
                  :disabled="isSelf(u)"
                  @click="openStatusModal(u, 'DISABLED')"
                >
                  <i class="fa-solid fa-ban"></i>
                  <span>禁用</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== Modal 1: Create User ==================== -->
    <div v-if="showCreateModal" class="modal-backdrop open" @click.self="showCreateModal = false">
      <div class="modal-dialog user-modal-dialog">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge">
              <i class="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3>创建新平台账号</h3>
              <p class="modal-desc">为团队成员创建访问账号并指定初始安全职责</p>
            </div>
          </div>
          <button class="btn-modal-close" @click="showCreateModal = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form class="modal-body user-modal-body" @submit.prevent="handleCreateUser">
          <div class="form-item">
            <label class="form-label">
              <span>登录用户名 (唯一标识)</span>
              <span class="required-star">*</span>
            </label>
            <input
              v-model="createForm.username"
              type="text"
              class="modal-input"
              placeholder="例如: dev_zhangsan (3-32位字母、数字、下划线)"
              required
              pattern="^[a-zA-Z0-9_-]{3,32}$"
            >
          </div>

          <div class="form-item">
            <label class="form-label">
              <span>用户姓名 / 昵称</span>
              <span class="required-star">*</span>
            </label>
            <input
              v-model="createForm.nickname"
              type="text"
              class="modal-input"
              placeholder="例如: 张三 (AI工程部)"
              required
            >
          </div>

          <div class="form-item">
            <label class="form-label">
              <span>指派系统角色</span>
              <span class="required-star">*</span>
            </label>
            <div class="role-selector-radios">
              <label class="role-radio-card" :class="{ selected: createForm.role === 'DEVELOPER' }">
                <input v-model="createForm.role" type="radio" value="DEVELOPER">
                <div class="radio-card-content">
                  <div class="radio-title-row">
                    <span class="radio-title">开发者</span>
                    <span class="radio-tag tag-blue">常规开发</span>
                  </div>
                  <p class="radio-desc">可创建、调试和管理属于自己的智能体、私有知识库及场景模板。</p>
                </div>
              </label>

              <label class="role-radio-card" :class="{ selected: createForm.role === 'SUPER_ADMIN' }">
                <input v-model="createForm.role" type="radio" value="SUPER_ADMIN">
                <div class="radio-card-content">
                  <div class="radio-title-row">
                    <span class="radio-title">超级管理员</span>
                    <span class="radio-tag tag-purple">最高特权</span>
                  </div>
                  <p class="radio-desc">系统治理最高权限，负责大模型网关路由、全量用户管理与权限调度。</p>
                </div>
              </label>

              <label class="role-radio-card" :class="{ selected: createForm.role === 'VIEWER' }">
                <input v-model="createForm.role" type="radio" value="VIEWER">
                <div class="radio-card-content">
                  <div class="radio-title-row">
                    <span class="radio-title">只读观察员</span>
                    <span class="radio-tag tag-slate">仅查阅</span>
                  </div>
                  <p class="radio-desc">仅可查看被显式授权的智能体/知识库指标看板，无配置修改和调试权限。</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Password Setup Options -->
          <div class="form-item">
            <label class="form-label">
              <span>初始密码配置方式</span>
            </label>
            <div class="pwd-mode-segmented">
              <button
                type="button"
                class="seg-btn"
                :class="{ active: createPasswordMode === 'AUTO' }"
                @click="createPasswordMode = 'AUTO'"
              >
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>自动生成临时密码 (推荐)</span>
              </button>
              <button
                type="button"
                class="seg-btn"
                :class="{ active: createPasswordMode === 'CUSTOM' }"
                @click="createPasswordMode = 'CUSTOM'"
              >
                <i class="fa-solid fa-pen-to-square"></i>
                <span>手动指定初始密码</span>
              </button>
            </div>

            <!-- Custom Password Input (when chosen) -->
            <div v-if="createPasswordMode === 'CUSTOM'" class="password-input-wrap" style="margin-top: 8px;">
              <input
                v-model="createForm.password"
                :type="showCreatePwd ? 'text' : 'password'"
                class="modal-input"
                placeholder="请输入初始密码 (至少 6 位)"
                minlength="6"
                required
              >
              <button type="button" class="btn-toggle-eye" @click="showCreatePwd = !showCreatePwd">
                <i :class="showCreatePwd ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
              </button>
            </div>
          </div>

          <!-- Must Change Password Checkbox -->
          <div class="checkbox-form-item">
            <label class="custom-checkbox-row">
              <input v-model="createForm.mustChangePassword" type="checkbox">
              <span class="checkbox-text">首次登录强制修改密码 (保障账号交付安全)</span>
            </label>
          </div>

          <div v-if="createForm.role === 'DEVELOPER' && outboundProviders.length" class="form-item">
            <label class="form-label"><span>第三方账号对接（可选）</span></label>
            <p class="modal-desc" style="margin-bottom: 8px;">创建后按通道配置去对方开户或绑定，失败不阻断本地账号。</p>
            <label v-for="p in outboundProviders" :key="p.id" class="custom-checkbox-row">
              <input type="checkbox" :value="p.code" v-model="createForm.providerCodes">
              <span class="checkbox-text">{{ p.name }}（{{ p.onUserCreated === 'CREATE_REMOTE' ? '开户' : '绑定' }}）</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">取消</button>
            <button type="submit" class="btn-chat-primary" :disabled="submitting">
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '创建中...' : '确认创建账号' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== Modal 2: Change / Reset Password ==================== -->
    <div v-if="showPasswordModal" class="modal-backdrop open" @click.self="showPasswordModal = false">
      <div class="modal-dialog user-modal-dialog">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.25);">
              <i class="fa-solid fa-key"></i>
            </div>
            <div>
              <h3>修改用户登录密码</h3>
              <p class="modal-desc">为目标用户设定全新登录密码或重置安全凭据</p>
            </div>
          </div>
          <button class="btn-modal-close" @click="showPasswordModal = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form class="modal-body user-modal-body" @submit.prevent="handleSavePassword">
          <!-- Target User Profile Summary -->
          <div class="target-user-summary-card">
            <img :src="passwordTargetUser?.avatar || (passwordTargetUser?.role === 'SUPER_ADMIN' ? '/avatar-admin.jpg' : '/avatar-dev.jpg')" class="target-avatar" alt="avatar">
            <div class="target-user-info">
              <div class="target-name-row">
                <span class="target-nickname">{{ passwordTargetUser?.nickname || passwordTargetUser?.username }}</span>
                <span class="target-role-pill" :class="'role-' + (passwordTargetUser?.role || '').toLowerCase()">
                  {{ passwordTargetUser?.roleName || passwordTargetUser?.role }}
                </span>
              </div>
              <span class="target-username">@{{ passwordTargetUser?.username }}</span>
            </div>
          </div>

          <!-- Mode Selection -->
          <div class="form-item">
            <label class="form-label">
              <span>选择改密方式</span>
            </label>
            <div class="pwd-mode-segmented">
              <button
                type="button"
                class="seg-btn"
                :class="{ active: passwordMode === 'CUSTOM' }"
                @click="passwordMode = 'CUSTOM'"
              >
                <i class="fa-solid fa-pen-to-square"></i>
                <span>手动设置指定新密码</span>
              </button>
              <button
                type="button"
                class="seg-btn"
                :class="{ active: passwordMode === 'AUTO' }"
                @click="passwordMode = 'AUTO'"
              >
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>生成随机临时密码</span>
              </button>
            </div>
          </div>

          <!-- Custom Password Fields -->
          <div v-if="passwordMode === 'CUSTOM'" class="custom-pwd-group">
            <div class="form-item">
              <label class="form-label">
                <span>新密码</span>
                <span class="required-star">*</span>
              </label>
              <div class="password-input-wrap">
                <input
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="modal-input"
                  placeholder="请输入新密码 (至少 6 位)"
                  required
                  minlength="6"
                >
                <button type="button" class="btn-toggle-eye" @click="showNewPassword = !showNewPassword">
                  <i :class="showNewPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </div>
            </div>

            <div class="form-item">
              <label class="form-label">
                <span>确认新密码</span>
                <span class="required-star">*</span>
              </label>
              <div class="password-input-wrap">
                <input
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="modal-input"
                  placeholder="请再次输入新密码"
                  required
                  minlength="6"
                >
                <button type="button" class="btn-toggle-eye" @click="showConfirmPassword = !showConfirmPassword">
                  <i :class="showConfirmPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </div>
              <span v-if="passwordMismatch" class="field-error-hint">两次输入的密码不一致</span>
            </div>
          </div>

          <div v-else class="auto-pwd-desc-box">
            <i class="fa-solid fa-circle-info"></i>
            <span>系统将自动为用户生成高强度 12 位临时密码，并在提交后展示供复制交付。</span>
          </div>

          <!-- Force change checkbox -->
          <div class="checkbox-form-item">
            <label class="custom-checkbox-row">
              <input v-model="passwordForm.mustChangePassword" type="checkbox">
              <span class="checkbox-text">强制用户在下次登录时必须修改密码</span>
            </label>
          </div>

          <!-- Notice alert box -->
          <div class="modal-notice-banner">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>改密成功后，该用户现有所有登录会话将被立即注销，必须使用新密码重新登录。</span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showPasswordModal = false">取消</button>
            <button
              type="submit"
              class="btn-chat-primary"
              :disabled="submitting || (passwordMode === 'CUSTOM' && (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword))"
            >
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '正在修改...' : '确认修改密码' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== Modal 3: Temporary Password Display Alert ==================== -->
    <div v-if="showPasswordAlertModal" class="modal-backdrop open" @click.self="showPasswordAlertModal = false">
      <div class="modal-dialog alert-password-modal">
        <div class="alert-icon-circle">
          <i class="fa-solid fa-key"></i>
        </div>
        <h3>临时凭据已安全生成</h3>
        <p class="alert-subtext">该临时密码仅展示一次，请妥善复制并安全交付给对应用户。用户首次登录后系统将强制要求修改密码。</p>

        <div class="password-highlight-box">
          <div class="pwd-meta-item">
            <span class="pwd-meta-label">用户账号</span>
            <span class="pwd-meta-val">@{{ tempPasswordInfo.username }}</span>
          </div>
          <div class="pwd-meta-item">
            <span class="pwd-meta-label">一次性临时安全密码</span>
            <div class="pwd-val-row">
              <code class="pwd-code-val">{{ tempPasswordInfo.password }}</code>
              <button type="button" class="btn-copy-pwd" :class="{ copied: passwordCopied }" @click="copyPassword">
                <i :class="passwordCopied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
                <span>{{ passwordCopied ? '已复制' : '复制密码' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: center; margin-top: 24px; border-top: none; padding: 0;">
          <button type="button" class="btn-chat-primary" style="min-width: 150px;" @click="showPasswordAlertModal = false">
            我已安全记录
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== Modal 4: Edit Profile ==================== -->
    <div v-if="showEditModal" class="modal-backdrop open" @click.self="showEditModal = false">
      <div class="modal-dialog user-modal-dialog">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge">
              <i class="fa-solid fa-user-pen"></i>
            </div>
            <div>
              <h3>编辑用户资料</h3>
              <p class="modal-desc">修改用户姓名与基本显示信息</p>
            </div>
          </div>
          <button class="btn-modal-close" @click="showEditModal = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form class="modal-body user-modal-body" @submit.prevent="handleUpdateProfile">
          <div class="form-item">
            <label class="form-label">用户名 (系统登录唯一标识，不可变更)</label>
            <input type="text" class="modal-input" :value="editingUser?.username" disabled style="opacity: 0.6; cursor: not-allowed;">
          </div>
          <div class="form-item">
            <label class="form-label">
              <span>姓名 / 显示昵称</span>
              <span class="required-star">*</span>
            </label>
            <input v-model="editForm.nickname" type="text" class="modal-input" required placeholder="请输入用户昵称">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showEditModal = false">取消</button>
            <button type="submit" class="btn-chat-primary" :disabled="submitting">
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '保存中...' : '保存更改' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== Modal 5: Change Role ==================== -->
    <div v-if="showRoleModal" class="modal-backdrop open" @click.self="showRoleModal = false">
      <div class="modal-dialog user-modal-dialog role-change-modal">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge" style="background: rgba(139, 92, 246, 0.15); color: #c084fc; border-color: rgba(139, 92, 246, 0.25);">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h3>变更用户系统角色</h3>
              <p class="modal-desc">调整 @{{ roleUser?.username }} 的系统操作特权</p>
            </div>
          </div>
          <button class="btn-modal-close" @click="showRoleModal = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="modal-body user-modal-body">
          <div class="role-selector-radios">
            <label class="role-radio-card" :class="{ selected: targetRole === 'DEVELOPER' }">
              <input v-model="targetRole" type="radio" value="DEVELOPER">
              <div class="radio-card-content">
                <div class="radio-title-row">
                  <span class="radio-title">开发者</span>
                  <span class="radio-tag tag-blue">常规开发</span>
                </div>
                <p class="radio-desc">可创建、配置和调试属于自己的智能体、知识库与个人模板。</p>
              </div>
            </label>

            <label class="role-radio-card" :class="{ selected: targetRole === 'SUPER_ADMIN' }">
              <input v-model="targetRole" type="radio" value="SUPER_ADMIN">
              <div class="radio-card-content">
                <div class="radio-title-row">
                  <span class="radio-title">超级管理员</span>
                  <span class="radio-tag tag-purple">最高特权</span>
                </div>
                <p class="radio-desc">全平台系统治理、模型网关管理、账号增删与权限变更。</p>
              </div>
            </label>

            <label class="role-radio-card" :class="{ selected: targetRole === 'VIEWER' }">
              <input v-model="targetRole" type="radio" value="VIEWER">
              <div class="radio-card-content">
                <div class="radio-title-row">
                  <span class="radio-title">只读观察员</span>
                  <span class="radio-tag tag-slate">仅查阅</span>
                </div>
                <p class="radio-desc">仅可查阅被授权智能体的指标与监控概览，不可进行配置变更与调用。</p>
              </div>
            </label>
          </div>

          <div class="modal-notice-banner">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>变更角色后，该用户现有活跃 Session 将被立即注销，需重新登录以生效新权限。</span>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showRoleModal = false">取消</button>
            <button type="button" class="btn-chat-primary" :disabled="submitting || targetRole === roleUser?.role" @click="handleUpdateRole">
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ submitting ? '更新中...' : '确认更新角色' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Modal 6: Status Toggle Confirmation Modal ==================== -->
    <div v-if="showStatusModal" class="modal-backdrop open" @click.self="showStatusModal = false">
      <div class="modal-dialog status-confirm-modal">
        <div class="status-modal-header" :class="statusTargetAction === 'DISABLED' ? 'danger-theme' : 'success-theme'">
          <div class="status-icon-circle">
            <i :class="statusTargetAction === 'DISABLED' ? 'fa-solid fa-ban' : 'fa-solid fa-circle-play'"></i>
          </div>
          <h3>{{ statusTargetAction === 'DISABLED' ? '停用用户账号' : '恢复用户账号' }}</h3>
          <p class="status-modal-desc">
            目标账号：<strong>@{{ statusTargetUser?.username }}</strong> ({{ statusTargetUser?.nickname }})
          </p>
        </div>

        <div class="modal-body status-modal-body">
          <div class="status-notice-box" :class="statusTargetAction === 'DISABLED' ? 'danger-box' : 'success-box'">
            <i class="fa-solid" :class="statusTargetAction === 'DISABLED' ? 'fa-triangle-exclamation' : 'fa-circle-check'"></i>
            <div class="notice-text">
              <p v-if="statusTargetAction === 'DISABLED'">
                停用后，该账号的所有活跃会话将被<strong>即刻强制注销</strong>，且无法再次登录平台。其历史创建的智能体与知识库资产将被完整保留。
              </p>
              <p v-else>
                恢复后，该账号状态将恢复为正常，用户可以使用其现有的登录凭据重新进入系统使用所有授权功能。
              </p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showStatusModal = false">取消</button>
          <button
            type="button"
            :class="statusTargetAction === 'DISABLED' ? 'btn-danger' : 'btn-success'"
            :disabled="submitting"
            @click="executeToggleStatus"
          >
            <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
            <span>{{ submitting ? '处理中...' : (statusTargetAction === 'DISABLED' ? '确认停用账号' : '确认恢复账号') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const props = defineProps({
  currentUser: {
    type: Object,
    default: () => ({})
  }
})

const { showToast } = useToast()

const users = ref([])
const loading = ref(false)
const submitting = ref(false)

const searchKeyword = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')

// Modals
const showCreateModal = ref(false)
const showPasswordAlertModal = ref(false)
const showEditModal = ref(false)
const showRoleModal = ref(false)
const showPasswordModal = ref(false)
const showStatusModal = ref(false)

// Create Form State
const createPasswordMode = ref('AUTO') // 'AUTO' | 'CUSTOM'
const showCreatePwd = ref(false)
const createForm = reactive({
  username: '',
  nickname: '',
  role: 'DEVELOPER',
  password: '',
  mustChangePassword: true,
  providerCodes: []
})
const outboundProviders = ref([])

// Edit Form State
const editingUser = ref(null)
const editForm = reactive({
  nickname: ''
})

// Role Form State
const roleUser = ref(null)
const targetRole = ref('DEVELOPER')

// Password Form State
const passwordTargetUser = ref(null)
const passwordMode = ref('CUSTOM') // 'CUSTOM' | 'AUTO'
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
  mustChangePassword: true
})

const passwordMismatch = computed(() => {
  return passwordMode.value === 'CUSTOM' &&
    passwordForm.confirmPassword &&
    passwordForm.newPassword !== passwordForm.confirmPassword
})

// Status Action State
const statusTargetUser = ref(null)
const statusTargetAction = ref('DISABLED') // 'DISABLED' | 'ACTIVE'

// Temporary Password Dialog State
const tempPasswordInfo = reactive({
  username: '',
  password: ''
})
const passwordCopied = ref(false)

// Stats KPI
const stats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter(u => u.role === 'SUPER_ADMIN').length
  const devs = users.value.filter(u => u.role === 'DEVELOPER').length
  const viewers = users.value.filter(u => u.role === 'VIEWER').length
  return { total, admins, devs, viewers }
})

function isSelf(user) {
  return props.currentUser && (props.currentUser.id === user.id || props.currentUser.username === user.username)
}

function statusClass(status) {
  if (status === 'ACTIVE') return 'status-ready'
  if (status === 'PENDING_PASSWORD') return 'status-pending'
  return 'status-failed'
}

function statusLabel(status) {
  if (status === 'ACTIVE') return '正常运行'
  if (status === 'PENDING_PASSWORD') return '待改密'
  if (status === 'DISABLED') return '已停用'
  return status || '未知'
}

function formatDate(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return val
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = {}
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    if (selectedRole.value) params.role = selectedRole.value
    if (selectedStatus.value) params.status = selectedStatus.value

    const res = await http.get('/api/users', params)
    if (res.success) {
      users.value = res.data || []
    } else {
      showToast(res.message || '加载用户列表失败', 'error')
    }
  } catch (e) {
    showToast('网络异常: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

// ================= Create User =================
function openCreateModal() {
  createForm.username = ''
  createForm.nickname = ''
  createForm.role = 'DEVELOPER'
  createForm.password = ''
  createForm.mustChangePassword = true
  createForm.providerCodes = []
  createPasswordMode.value = 'AUTO'
  showCreatePwd.value = false
  showCreateModal.value = true
  loadOutboundProviders()
}

async function loadOutboundProviders() {
  const res = await http.get('/api/security/identity-providers')
  outboundProviders.value = (res.success ? res.data : []).filter(p => p.enabled && p.onUserCreated && p.onUserCreated !== 'OFF')
}

async function handleCreateUser() {
  if (!createForm.username.trim() || !createForm.nickname.trim()) {
    showToast('用户名和姓名不能为空', 'error')
    return
  }
  if (createPasswordMode.value === 'CUSTOM') {
    if (!createForm.password || createForm.password.trim().length < 6) {
      showToast('初始密码长度不能少于 6 位', 'error')
      return
    }
  }
  submitting.value = true
  try {
    const payload = {
      username: createForm.username.trim(),
      nickname: createForm.nickname.trim(),
      role: createForm.role,
      password: createPasswordMode.value === 'CUSTOM' ? createForm.password.trim() : '',
      mustChangePassword: createForm.mustChangePassword,
      identities: (createForm.providerCodes || []).map(code => ({
        provider: code,
        mode: outboundProviders.value.find(p => p.code === code)?.onUserCreated || 'CREATE_REMOTE'
      }))
    }
    const res = await http.post('/api/users', payload)
    if (res.success) {
      showCreateModal.value = false
      showToast('用户创建成功', 'success')
      fetchUsers()

      if (createPasswordMode.value === 'AUTO' || res.data?.tempPassword) {
        tempPasswordInfo.username = res.data?.user?.username || createForm.username.trim()
        tempPasswordInfo.password = res.data?.tempPassword || createForm.password
        passwordCopied.value = false
        showPasswordAlertModal.value = true
      }
    } else {
      showToast(res.message || '创建失败', 'error')
    }
  } catch (e) {
    showToast('操作异常: ' + e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// ================= Edit Profile =================
function openEditModal(user) {
  editingUser.value = user
  editForm.nickname = user.nickname || ''
  showEditModal.value = true
}

async function handleUpdateProfile() {
  if (!editForm.nickname.trim()) {
    showToast('用户昵称不能为空', 'error')
    return
  }
  submitting.value = true
  try {
    const res = await http.put(`/api/users/${editingUser.value.id}/profile`, {
      nickname: editForm.nickname.trim()
    })
    if (res.success) {
      showToast('资料修改成功', 'success')
      showEditModal.value = false
      fetchUsers()
    } else {
      showToast(res.message || '修改失败', 'error')
    }
  } catch (e) {
    showToast('操作异常: ' + e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// ================= Change Role =================
function openRoleModal(user) {
  roleUser.value = user
  targetRole.value = user.role || 'DEVELOPER'
  showRoleModal.value = true
}

async function handleUpdateRole() {
  submitting.value = true
  try {
    const res = await http.put(`/api/users/${roleUser.value.id}/role`, {
      role: targetRole.value
    })
    if (res.success) {
      showToast(res.message || '角色变更成功', 'success')
      showRoleModal.value = false
      fetchUsers()
    } else {
      showToast(res.message || '角色变更失败', 'error')
    }
  } catch (e) {
    showToast('操作异常: ' + e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// ================= Change Password =================
function openPasswordModal(user) {
  passwordTargetUser.value = user
  passwordMode.value = 'CUSTOM'
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordForm.mustChangePassword = true
  showNewPassword.value = false
  showConfirmPassword.value = false
  showPasswordModal.value = true
}

async function handleSavePassword() {
  if (passwordMode.value === 'CUSTOM') {
    if (!passwordForm.newPassword || passwordForm.newPassword.trim().length < 6) {
      showToast('新密码长度不能少于 6 位', 'error')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('两次输入的密码不一致，请核对', 'error')
      return
    }
  }

  submitting.value = true
  try {
    const payload = {
      newPassword: passwordMode.value === 'CUSTOM' ? passwordForm.newPassword.trim() : null,
      mustChangePassword: passwordForm.mustChangePassword
    }
    const res = await http.post(`/api/users/${passwordTargetUser.value.id}/reset-password`, payload)
    if (res.success) {
      showPasswordModal.value = false
      fetchUsers()
      if (passwordMode.value === 'AUTO' || !payload.newPassword) {
        tempPasswordInfo.username = passwordTargetUser.value.username
        tempPasswordInfo.password = res.data?.tempPassword
        passwordCopied.value = false
        showPasswordAlertModal.value = true
        showToast('临时密码已生成', 'success')
      } else {
        showToast('用户密码已成功更新', 'success')
      }
    } else {
      showToast(res.message || '改密失败', 'error')
    }
  } catch (e) {
    showToast('操作异常: ' + e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// ================= Status Confirmation =================
function openStatusModal(user, action) {
  statusTargetUser.value = user
  statusTargetAction.value = action
  showStatusModal.value = true
}

async function executeToggleStatus() {
  if (!statusTargetUser.value) return
  submitting.value = true
  try {
    const res = await http.put(`/api/users/${statusTargetUser.value.id}/status`, {
      status: statusTargetAction.value
    })
    if (res.success) {
      showToast(res.message || '状态已更新', 'success')
      showStatusModal.value = false
      fetchUsers()
    } else {
      showToast(res.message || '操作失败', 'error')
    }
  } catch (e) {
    showToast('操作异常: ' + e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// Copy Password Utility
function copyPassword() {
  if (!tempPasswordInfo.password) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tempPasswordInfo.password)
    passwordCopied.value = true
    showToast('临时密码已复制到剪贴板', 'success')
    setTimeout(() => {
      passwordCopied.value = false
    }, 3000)
  } else {
    showToast('请手动复制密码文本', 'info')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-panel-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Header */
.users-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.users-title-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.users-title-badge-row h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.users-title-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25));
  color: #a78bfa;
  border: 1px solid rgba(139, 92, 246, 0.35);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.users-subtitle {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 6px 0 0 0;
}

.btn-create-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-hover));
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: all 0.2s ease;
}

.btn-create-user:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
}

/* KPI Cards */
.users-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.user-metric-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.user-metric-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.metric-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.metric-icon-total {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.metric-icon-admin {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.metric-icon-dev {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.25);
}

.metric-icon-viewer {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.25);
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Toolbar */
.users-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.users-search-box {
  display: flex;
  align-items: center;
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  font-size: 0.88rem;
  pointer-events: none;
}

.users-search-input {
  width: 100%;
  padding: 9px 36px 9px 38px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: all 0.2s ease;
}

.users-search-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.btn-clear-search {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.btn-clear-search:hover {
  color: var(--text-primary);
}

.users-filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.users-select-filter {
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.86rem;
  outline: none;
  cursor: pointer;
}

.btn-users-refresh {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-users-refresh:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

/* Table Card */
.users-table-card {
  padding: 0;
  overflow: hidden;
}

.users-loading-state,
.users-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  gap: 14px;
}

.users-loading-state i {
  font-size: 2rem;
  color: var(--accent-blue);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-muted);
}

.users-empty-state h4 {
  font-size: 1.05rem;
  color: var(--text-primary);
  margin: 0;
}

.users-empty-state p {
  font-size: 0.85rem;
  margin: 0;
}

/* Table Cells */
.user-cell-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-table-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  background: #1f2937;
}

.user-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-nickname-text {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.92rem;
}

.user-account-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-family: monospace;
}

.user-self-pill {
  font-size: 0.68rem;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-weight: 500;
}

.role-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
}

.role-badge-pill.role-super_admin {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.role-badge-pill.role-developer {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.role-badge-pill.role-viewer {
  background: rgba(156, 163, 175, 0.12);
  color: #cbd5e1;
  border: 1px solid rgba(156, 163, 175, 0.25);
}

.pwd-flag-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.pwd-flag-pill.flag-pending {
  color: var(--accent-amber);
}

.pwd-flag-pill.flag-active {
  color: var(--text-muted);
}

.user-date-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.btn-action-success {
  color: var(--accent-emerald) !important;
}

.btn-action-success:hover {
  background: rgba(16, 185, 129, 0.15) !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

/* Modals */
.user-modal-dialog {
  max-width: 540px;
}

.modal-title-with-icon {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon-badge {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.modal-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.user-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.required-star {
  color: var(--accent-rose);
}

.modal-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modal-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Password Input Wrap with Eye Toggle */
.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-input-wrap .modal-input {
  padding-right: 42px;
}

.btn-toggle-eye {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.btn-toggle-eye:hover {
  color: var(--text-primary);
}

.field-error-hint {
  font-size: 0.76rem;
  color: var(--accent-rose, #f43f5e);
  margin-top: 3px;
}

/* Segmented Mode Button */
.pwd-mode-segmented {
  display: flex;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.seg-btn:hover {
  color: var(--text-primary);
}

.seg-btn.active {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-weight: 600;
}

.auto-pwd-desc-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  border: 1px dashed rgba(59, 130, 246, 0.25);
  color: #60a5fa;
  font-size: 0.82rem;
  line-height: 1.4;
}

/* Target User Summary Card */
.target-user-summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
}

.target-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  background: #1f2937;
}

.target-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.target-nickname {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.target-username {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: monospace;
}

.target-role-pill {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.target-role-pill.role-super_admin {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
}

.target-role-pill.role-developer {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.target-role-pill.role-viewer {
  background: rgba(156, 163, 175, 0.12);
  color: #cbd5e1;
}

/* Checkbox Item */
.checkbox-form-item {
  display: flex;
  align-items: center;
}

.custom-checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.custom-checkbox-row input {
  cursor: pointer;
  accent-color: var(--accent-blue);
  width: 15px;
  height: 15px;
}

/* Radio Role Cards */
.role-selector-radios {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-radio-card:hover {
  border-color: var(--border-hover);
}

.role-radio-card.selected {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
}

.role-radio-card input {
  margin-top: 4px;
  cursor: pointer;
}

.radio-card-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.radio-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.radio-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.radio-tag {
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 600;
}

.radio-tag.tag-blue {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.radio-tag.tag-purple {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
}

.radio-tag.tag-slate {
  background: rgba(156, 163, 175, 0.15);
  color: #cbd5e1;
}

.radio-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

/* Notice Banners */
.modal-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--accent-amber);
  font-size: 0.8rem;
  line-height: 1.4;
}

/* Alert Password Modal */
.alert-password-modal {
  max-width: 480px;
  text-align: center;
  padding: 30px 24px;
}

.alert-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-amber);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin: 0 auto 16px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.alert-password-modal h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.alert-subtext {
  font-size: 0.84rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.password-highlight-box {
  background: var(--bg-input);
  border: 1px dashed var(--accent-amber);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.pwd-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pwd-meta-label {
  font-size: 0.76rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pwd-meta-val {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.pwd-val-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pwd-code-val {
  font-size: 1.15rem;
  font-family: monospace;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.05em;
}

.btn-copy-pwd {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-pwd.copied {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);
}

/* Status Confirmation Modal */
.status-confirm-modal {
  max-width: 480px;
}

.status-modal-header {
  padding: 24px 24px 16px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.status-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.status-modal-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.status-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.danger-theme .status-icon-circle {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-rose, #ef4444);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.success-theme .status-icon-circle {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald, #10b981);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-modal-body {
  padding: 0 24px 20px 24px;
}

.status-notice-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  line-height: 1.5;
}

.status-notice-box.danger-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.status-notice-box.danger-box i {
  color: #ef4444;
  margin-top: 3px;
}

.status-notice-box.success-box {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #a7f3d0;
}

.status-notice-box.success-box i {
  color: #10b981;
  margin-top: 3px;
}

.notice-text p {
  margin: 0;
}

.btn-danger {
  padding: 9px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-danger:hover {
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
  transform: translateY(-1px);
}

.btn-success {
  padding: 9px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-success:hover {
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .users-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
