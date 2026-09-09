<template>
  <div class="roles-panel-page">
    <!-- Top Header -->
    <div class="roles-header-row">
      <div class="roles-title-group">
        <div class="roles-title-badge-row">
          <h2>角色与权限</h2>
          <span class="roles-title-pill">RBAC MATRIX</span>
        </div>
        <p class="roles-subtitle">固定角色职责边界与功能特权矩阵 · 采用最小特权原则保障企业资产安全</p>
      </div>
    </div>

    <!-- 3 Role Summary Cards -->
    <div class="roles-cards-grid">
      <div v-for="role in rolesList" :key="role.code" class="role-overview-card" :class="'card-' + role.code.toLowerCase()">
        <div class="role-card-top">
          <div class="role-avatar-icon">
            <i v-if="role.code === 'SUPER_ADMIN'" class="fa-solid fa-shield-halved"></i>
            <i v-else-if="role.code === 'DEVELOPER'" class="fa-solid fa-code"></i>
            <i v-else class="fa-solid fa-eye"></i>
          </div>
          <div class="role-tag-pill" :class="'tag-' + role.code.toLowerCase()">
            <span>系统预置</span>
          </div>
        </div>

        <div class="role-card-body">
          <h3 class="role-card-name">{{ role.name }}</h3>
          <span class="role-card-code">{{ role.code }}</span>
          <p class="role-card-desc">{{ role.description }}</p>
        </div>

        <div class="role-card-footer">
          <div class="role-member-count">
            <i class="fa-solid fa-users"></i>
            <span>{{ role.userCount || 0 }} 名成员</span>
          </div>
          <span class="role-rule-note">不可删除</span>
        </div>
      </div>
    </div>

    <!-- Matrix Table Card -->
    <div class="table-view-card matrix-table-card">
      <div class="matrix-card-header">
        <div class="matrix-header-title">
          <i class="fa-solid fa-table-list"></i>
          <span>角色功能特权对照矩阵</span>
        </div>
        <span class="matrix-header-tip">权限为后端强制拦截，操作边界与数据归属权严格挂钩</span>
      </div>

      <table class="agent-table matrix-table">
        <thead>
          <tr>
            <th style="width: 28%;">功能模块与操作项</th>
            <th style="width: 36%;">权限定义与数据安全范围</th>
            <th style="text-align: center; width: 12%;">超级管理员</th>
            <th style="text-align: center; width: 12%;">开发者</th>
            <th style="text-align: center; width: 12%;">只读观察员</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(group, gIdx) in permissionGroups" :key="gIdx">
            <!-- Group Section Header Row -->
            <tr class="matrix-group-row">
              <td colspan="5">
                <div class="group-header-content">
                  <i :class="group.icon"></i>
                  <span>{{ group.title }}</span>
                </div>
              </td>
            </tr>

            <!-- Group Permission Items -->
            <tr v-for="(item, iIdx) in group.items" :key="iIdx" class="matrix-item-row">
              <td>
                <span class="matrix-item-name">{{ item.name }}</span>
              </td>
              <td>
                <span class="matrix-item-desc">{{ item.desc }}</span>
              </td>
              <td style="text-align: center;">
                <i v-if="item.admin" class="fa-solid fa-circle-check perm-check-icon check-admin"></i>
                <i v-else class="fa-solid fa-minus perm-dash-icon"></i>
              </td>
              <td style="text-align: center;">
                <i v-if="item.dev" class="fa-solid fa-circle-check perm-check-icon check-dev"></i>
                <i v-else class="fa-solid fa-minus perm-dash-icon"></i>
              </td>
              <td style="text-align: center;">
                <i v-if="item.viewer" class="fa-solid fa-circle-check perm-check-icon check-viewer"></i>
                <i v-else class="fa-solid fa-minus perm-dash-icon"></i>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { http } from '../api/http'

const rolesList = ref([
  {
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '拥有全平台系统治理、模型网关、用户管理与资源调度最高权限。',
    userCount: 1
  },
  {
    code: 'DEVELOPER',
    name: '开发者',
    description: '可创建、调试并管理属于自己的智能体、知识库与场景模板。',
    userCount: 1
  },
  {
    code: 'VIEWER',
    name: '只读观察员',
    description: '仅可查看被授权智能体与知识库的元数据与监控指标，无编辑与调试权限。',
    userCount: 0
  }
])

const permissionGroups = [
  {
    title: '平台治理与大模型网关',
    icon: 'fa-solid fa-network-wired',
    items: [
      { name: '管理模型通道与供应商', desc: '添加/编辑模型渠道、测试连通性、加密保管商业 Key', admin: true, dev: false, viewer: false },
      { name: '模型网关路由策略调度', desc: '配置主备模型切换、故障自愈与超时重试策略', admin: true, dev: false, viewer: false },
      { name: '选用已开放的商业模型', desc: '在创建或调试智能体时选择平台提供的模型进行推理', admin: true, dev: true, viewer: false }
    ]
  },
  {
    title: '用户管理与账号安全',
    icon: 'fa-solid fa-user-shield',
    items: [
      { name: '用户账号全生命周期管理', desc: '创建账号、重置临时密码、账号禁用与恢复', admin: true, dev: false, viewer: false },
      { name: '分配与变更系统角色', desc: '调整成员角色（含最后超管保护与并发锁）', admin: true, dev: false, viewer: false },
      { name: '修改本人昵称与个人密码', desc: '常规修改自身密码与首次登录强制改密', admin: true, dev: true, viewer: true }
    ]
  },
  {
    title: '智能体 (Agents) 编排与调试',
    icon: 'fa-solid fa-robot',
    items: [
      { name: '创建新智能体', desc: '设计系统提示词、温度系数与模型绑定', admin: true, dev: true, viewer: false },
      { name: '编辑/复制/删除智能体', desc: '超管全权，开发者仅限管理本人拥有的 Agent', admin: true, dev: true, viewer: false },
      { name: '调试运行智能体', desc: '超管与所有者，或被明确授予 RUN 权限的成员', admin: true, dev: true, viewer: false },
      { name: '查看提示词与核心人设', desc: '超管全权，开发者仅限本人；观察员与RUN受限用户隐藏', admin: true, dev: true, viewer: false },
      { name: '管理专属工具密钥', desc: '配置 Bocha 搜索等工具专属密钥（加密隔离存储）', admin: true, dev: true, viewer: false },
      { name: '签发与注销 API Key', desc: '生成对外集成 Key 并支持随时撤销', admin: true, dev: true, viewer: false }
    ]
  },
  {
    title: '企业知识库 (RAG)',
    icon: 'fa-solid fa-book-bookmark',
    items: [
      { name: '创建与管理知识库', desc: '新建知识库、配置向量检索与 Rerank 重排', admin: true, dev: true, viewer: false },
      { name: '上传切片文档与维护 FAQ', desc: '超管全权，开发者仅限操作本人知识库', admin: true, dev: true, viewer: false },
      { name: '挂载知识库至智能体', desc: '可挂载本人或被显式授予 USE 权限的知识库', admin: true, dev: true, viewer: false },
      { name: '查阅原始文档及附件下载', desc: '仅限知识库所有者与超管，防止内容随意泄漏', admin: true, dev: true, viewer: false },
      { name: '全量同步 Dify 外部数据集', desc: '发起平台级数据集全量拉取与同步', admin: true, dev: false, viewer: false }
    ]
  },
  {
    title: '场景行业模板',
    icon: 'fa-solid fa-shapes',
    items: [
      { name: '使用模板一键派生 Agent', desc: '选用内置或公共模板快速创建智能体', admin: true, dev: true, viewer: false },
      { name: '创建与编辑个人模板', desc: '将优秀配置封装为私有模板复用', admin: true, dev: true, viewer: false },
      { name: '发布平台公共内置模板', desc: '审核并发布面向所有开发者的预置场景', admin: true, dev: false, viewer: false }
    ]
  },
  {
    title: '数据大屏与操作审计',
    icon: 'fa-solid fa-chart-pie',
    items: [
      { name: '查看平台运行概览看板', desc: '调用量、延迟趋势、活跃 Agent 聚合分析', admin: true, dev: true, viewer: true },
      { name: '查阅本人调试会话历史', desc: '查看本人在工作台发起的调试与消息记录', admin: true, dev: true, viewer: false },
      { name: '查阅生产全量调用会话', desc: '安全回溯与审计（仅限超管与 Agent 所有者）', admin: true, dev: true, viewer: false }
    ]
  }
]

async function loadRoles() {
  try {
    const res = await http.get('/api/roles')
    if (res.success && res.data && res.data.length) {
      rolesList.value = res.data
    }
  } catch (e) {
    // fallback to static list
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.roles-panel-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Header */
.roles-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.roles-title-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.roles-title-badge-row h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.roles-title-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.25));
  color: #a78bfa;
  border: 1px solid rgba(139, 92, 246, 0.35);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.roles-subtitle {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 6px 0 0 0;
}

/* Role Cards Grid */
.roles-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.role-overview-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.role-overview-card:hover {
  transform: translateY(-2px);
}

.role-overview-card.card-super_admin {
  border-top: 3px solid #a855f7;
}

.role-overview-card.card-developer {
  border-top: 3px solid #06b6d4;
}

.role-overview-card.card-viewer {
  border-top: 3px solid #94a3b8;
}

.role-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-avatar-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.card-super_admin .role-avatar-icon {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.card-developer .role-avatar-icon {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.card-viewer .role-avatar-icon {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.role-tag-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-super_admin {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.tag-developer {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.tag-viewer {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.role-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-card-name {
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.role-card-code {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-muted);
  text-transform: uppercase;
}

.role-card-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 8px 0 0 0;
}

.role-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  font-size: 0.78rem;
}

.role-member-count {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}

.role-rule-note {
  color: var(--text-muted);
  font-size: 0.72rem;
}

/* Matrix Table Card */
.matrix-table-card {
  padding: 0;
  overflow: hidden;
}

.matrix-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.matrix-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.matrix-header-tip {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.matrix-table {
  width: 100%;
}

.matrix-group-row td {
  background: rgba(255, 255, 255, 0.02);
  padding: 10px 18px !important;
  border-bottom: 1px solid var(--border-color);
}

.group-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.matrix-item-row td {
  padding: 14px 18px !important;
}

.matrix-item-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}

.matrix-item-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.perm-check-icon {
  font-size: 1.15rem;
}

.perm-check-icon.check-admin {
  color: #c084fc;
}

.perm-check-icon.check-dev {
  color: #22d3ee;
}

.perm-check-icon.check-viewer {
  color: #94a3b8;
}

.perm-dash-icon {
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .roles-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
