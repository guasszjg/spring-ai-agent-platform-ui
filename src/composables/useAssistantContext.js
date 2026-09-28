import { reactive, readonly } from 'vue'

// 平台 AI 助手的页面上下文：各页面登记"用户正在看什么"，助手发送消息时带给后端，
// 用户说"这个智能体""当前知识库"时助手就知道指的是哪一个。后端会重新校验资源权限，这里只是提示。
const state = reactive({
  page: null,          // overview / agents / knowledge / debug ...
  resourceType: null,  // AGENT / KNOWLEDGE_BASE
  resourceId: null,
  resourceName: null   // 仅用于在助手输入框上方展示
})

export function setAssistantPage(page) {
  state.page = page || null
  clearAssistantResource()
}

export function setAssistantResource(type, id, name) {
  state.resourceType = type || null
  state.resourceId = id || null
  state.resourceName = name || null
}

export function clearAssistantResource() {
  state.resourceType = null
  state.resourceId = null
  state.resourceName = null
}

export function useAssistantContext() {
  return readonly(state)
}
