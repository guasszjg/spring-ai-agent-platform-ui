import { ArrowUpDown, Binary, BookOpen, MessagesSquare, ScanText } from 'lucide-vue-next'

// 模型网关的子页面：侧边栏子菜单、页头与地址（?tab=gateway-<key>）共用这一份定义
export const GATEWAY_SECTIONS = [
  {
    key: 'llm',
    title: '大语言模型',
    icon: MessagesSquare,
    desc: '智能体对话使用的模型通道。在这里设置默认通道、降级备用和 AI 助手专用模型，密钥加密存储。'
  },
  {
    key: 'embedding',
    title: '向量模型',
    icon: Binary,
    desc: '自建知识库切片向量化与语义检索使用的 Embedding 模型。全平台同时只生效一个，更换后已入库的文档需要重新索引。'
  },
  {
    key: 'rerank',
    title: 'Rerank 模型',
    icon: ArrowUpDown,
    desc: '自建知识库选择「Rerank 模型」排序时调用，对候选切片做二次排序。可选，按用量计费；用哪个模型由这里生效的配置决定，不配置时知识库只能使用权重设置。'
  },
  {
    key: 'ocr',
    title: 'OCR 识别',
    icon: ScanText,
    desc: '识别扫描版 PDF 和图片里的文字。不配置时扫描件会标记为待识别，不影响其他文档入库。'
  },
  {
    key: 'dify',
    title: 'Dify 知识引擎',
    icon: BookOpen,
    desc: '对接外部 Dify 实例，在平台内管理 Dify 知识库。不使用 Dify 可以不配置。'
  }
]

export const GATEWAY_TAB_PREFIX = 'gateway-'
export const GATEWAY_TABS = GATEWAY_SECTIONS.map((s) => GATEWAY_TAB_PREFIX + s.key)

const LAST_SECTION_KEY = 'gatewaySection'

/** 上次停留的子页面；从「模型网关」入口或旧地址 ?tab=gateway 进入时回到这里 */
export function lastGatewayTab() {
  let key = null
  try {
    key = localStorage.getItem(LAST_SECTION_KEY)
  } catch {
    key = null
  }
  return GATEWAY_TABS.includes(GATEWAY_TAB_PREFIX + key) ? GATEWAY_TAB_PREFIX + key : GATEWAY_TABS[0]
}

export function rememberGatewayTab(tab) {
  if (!GATEWAY_TABS.includes(tab)) return
  try {
    localStorage.setItem(LAST_SECTION_KEY, tab.slice(GATEWAY_TAB_PREFIX.length))
  } catch {
    // 无痕模式等场景写入失败时忽略，只是不记住上次位置
  }
}
