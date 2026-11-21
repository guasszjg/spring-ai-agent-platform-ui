/**
 * 控制台左侧导航菜单与模型网关子页面的单一结构定义（纯数据，无 Vue/图标依赖）。
 * DashboardView.vue、sections.js 与 vite.config.js（构建时导出 frontend-menus.json 供后端单测校验）共用此文件。
 */
export const GATEWAY_SECTION_META = [
  { key: 'llm', title: '大语言模型' },
  { key: 'embedding', title: '向量模型' },
  { key: 'rerank', title: 'Rerank 模型' },
  { key: 'ocr', title: 'OCR 识别' },
  { key: 'dify', title: 'Dify 知识引擎' }
]

export const GATEWAY_TAB_PREFIX = 'gateway-'

export const NAV_MENU_SCHEMA = [
  {
    id: 'metrics',
    title: '监控',
    enTitle: 'METRICS',
    icon: 'fa-solid fa-chart-line',
    items: [
      {
        id: 'overview',
        name: '概览',
        title: '概览分析 (Token消耗与指标)',
        icon: 'fa-solid fa-chart-pie',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      }
    ]
  },
  {
    id: 'studio',
    title: '构建',
    enTitle: 'AGENT STUDIO',
    icon: 'fa-solid fa-wand-magic-sparkles',
    items: [
      {
        id: 'agents',
        name: '智能体',
        title: 'Agents 智能体资产管理',
        icon: 'fa-solid fa-robot',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      },
      {
        id: 'templates',
        name: '场景模板',
        title: '场景模版中心 (预置行业智能体)',
        icon: 'fa-solid fa-layer-group',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      },
      {
        id: 'tools',
        name: '工具',
        title: '平台工具管理 (全智能体共用)',
        icon: 'fa-solid fa-screwdriver-wrench',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      },
      {
        id: 'skills',
        name: '技能库',
        title: '技能库：把处理流程写成技能，智能体按需加载',
        icon: 'fa-solid fa-wand-magic-sparkles',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      }
    ]
  },
  {
    id: 'knowledge',
    title: '数据',
    enTitle: 'DATA & RAG',
    icon: 'fa-solid fa-database',
    items: [
      {
        id: 'knowledge',
        name: '自建知识库',
        title: '平台内置引擎：本地切片、向量化与混合检索',
        icon: 'fa-solid fa-book-bookmark',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      },
      {
        id: 'knowledge-dify',
        name: 'Dify 知识库',
        title: '对接外部 Dify：在平台内管理 Dify 知识库',
        icon: 'fa-solid fa-link',
        conditional: 'difyVisible',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      }
    ]
  },
  {
    id: 'governance',
    title: '管理',
    nonAdminTitle: '规则与安全',
    enTitle: 'GOVERNANCE',
    nonAdminEnTitle: 'SECURITY',
    icon: 'fa-solid fa-sliders',
    nonAdminIcon: 'fa-solid fa-shield-cat',
    items: [
      {
        id: 'gateway',
        name: '模型网关',
        title: '模型网关：大语言模型、向量模型、Rerank 模型、OCR 与 Dify 引擎',
        icon: 'fa-solid fa-server',
        superAdminOnly: true,
        roles: ['SUPER_ADMIN'],
        children: GATEWAY_SECTION_META.map((s) => ({
          id: GATEWAY_TAB_PREFIX + s.key,
          key: s.key,
          name: s.title,
          roles: ['SUPER_ADMIN']
        }))
      },
      {
        id: 'users',
        name: '用户',
        title: '企业租户用户管理 (RBAC)',
        icon: 'fa-solid fa-users-gear',
        superAdminOnly: true,
        roles: ['SUPER_ADMIN']
      },
      {
        id: 'roles',
        name: '角色与权限',
        title: '系统固定角色与权限对照矩阵',
        icon: 'fa-solid fa-shield-halved',
        superAdminOnly: true,
        roles: ['SUPER_ADMIN']
      },
      {
        id: 'assistant-eval',
        name: '助手评测',
        title: 'AI 助手评测：回归工具选择、参数与越权拒绝',
        icon: 'fa-solid fa-vial-circle-check',
        superAdminOnly: true,
        roles: ['SUPER_ADMIN']
      },
      {
        id: 'security',
        name: '开放与安全',
        title: '开放凭证、接入终端、护栏策略与审计',
        icon: 'fa-solid fa-fingerprint',
        roles: ['SUPER_ADMIN', 'DEVELOPER', 'VIEWER']
      }
    ]
  }
]

/** 导出给后端测试校验用的纯 JSON 结构 */
export function serializeNavMenuSchema() {
  return NAV_MENU_SCHEMA.map((group) => ({
    id: group.id,
    title: group.title,
    ...(group.nonAdminTitle ? { nonAdminTitle: group.nonAdminTitle } : {}),
    items: group.items.map((item) => ({
      id: item.id,
      name: item.name,
      superAdminOnly: !!item.superAdminOnly,
      roles: item.roles,
      ...(item.children
        ? {
            children: item.children.map((child) => ({
              id: child.id,
              name: child.name,
              roles: child.roles
            }))
          }
        : {})
    }))
  }))
}
