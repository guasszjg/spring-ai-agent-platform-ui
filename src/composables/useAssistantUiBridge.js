import { reactive } from 'vue'

/**
 * AI 助手实时界面联动桥（Co-pilot UI Bridge）：
 * 1. 接收后端 tool / action 返回的 uiEffect，或卡片点击「写入草稿试聊」的本地指令；
 * 2. 驱动全局悬浮 HUD 状态条（展示 AI 正在操作什么）；
 * 3. 提供逐字/分段打字动效（animateTextInput）与区块定位发光高亮（spotlightElement），
 *    让用户在当前界面直观看到 AI 正在搜索、改提示词、调参数、增删改列表。
 */

// Resolve by stable ID first. A label is usable only when it identifies a single row.
export function findAssistantResource(rows, ref, label = row => row.name) {
  if (!ref) return null
  const exact = rows.find(row => String(row.id) === String(ref))
  if (exact) return exact
  const normalized = String(ref).trim().toLowerCase()
  const matches = rows.filter(row => String(label(row) ?? '').trim().toLowerCase() === normalized)
  return matches.length === 1 ? matches[0] : null
}

export function fillAssistantDraft(form, fields, keys) {
  for (const key of keys) {
    const value = fields?.[key]
    if (typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value)) {
      if (typeof form[key] === typeof value || form[key] == null) form[key] = value
    }
  }
}

const listeners = new Set()
const pendingEffects = []
let navigationTail = Promise.resolve()
let cardActionHandler = null
export const assistantPreview = reactive({ actionId: null })

export function setAssistantCardActionHandler(handler) {
  cardActionHandler = handler
  return () => { if (cardActionHandler === handler) cardActionHandler = null }
}

export function submitAssistantCard(actionId, formData) {
  if (!cardActionHandler) return Promise.resolve({ ok: false, message: '请重新打开 AI 助手' })
  return cardActionHandler(actionId, formData)
}

export function enqueueAssistantNavigation(task) {
  const next = navigationTail.then(task)
  navigationTail = next.catch(() => {})
  return next
}

export function queuePendingUiEffect(effect, ttlMs = 20000) {
  let resolve
  const done = new Promise((settle) => { resolve = settle })
  const entry = { effect }
  const timer = setTimeout(() => entry.finish(false), ttlMs)
  entry.finish = (ok) => {
    clearTimeout(timer)
    const i = pendingEffects.indexOf(entry)
    if (i !== -1) pendingEffects.splice(i, 1)
    resolve(ok)
  }
  pendingEffects.push(entry)
  return { done, cancel: () => entry.finish(false) }
}

export async function applyPendingUiEffects(matcher, handler) {
  let index
  while ((index = pendingEffects.findIndex(({ effect }) => matcher(effect))) !== -1) {
    const [entry] = pendingEffects.splice(index, 1)
    try {
      const handled = await handler(entry.effect)
      entry.finish(handled !== false)
    } catch (error) {
      console.warn('Assistant UI navigation effect failed:', error)
      entry.finish(false)
    }
  }
}

export const copilotHud = reactive({
  visible: false,
  status: 'running', // 'running' | 'done' | 'error'
  label: ''
})

let hudTimer = null

export function showCopilotHud(label, status = 'running', autoHideMs = 0) {
  if (!label) return
  if (hudTimer) {
    clearTimeout(hudTimer)
    hudTimer = null
  }
  copilotHud.label = label
  copilotHud.status = status
  copilotHud.visible = true
  if (autoHideMs > 0) {
    hudTimer = setTimeout(() => {
      copilotHud.visible = false
      hudTimer = null
    }, autoHideMs)
  }
}

export function finishCopilotHud(label, hideDelayMs = 2200) {
  showCopilotHud(label || copilotHud.label || '操作已完成', 'done', hideDelayMs)
}

export async function dispatchAssistantUiEffect(effect) {
  if (!effect || typeof effect !== 'object') return false
  if (effect.label) showCopilotHud(effect.label, 'running', 6000)
  const results = await Promise.all([...listeners].map(async (fn) => {
    try {
      return await fn(effect)
    } catch (error) {
      console.warn('Assistant UI effect handler failed:', error)
      return false
    }
  }))
  return results.some(result => result === true)
}

export function onAssistantUiEffect(handler) {
  if (typeof handler !== 'function') return () => {}
  listeners.add(handler)
  return () => listeners.delete(handler)
}

/**
 * 流畅文本打字机写入（用于搜索框关键词，支持新动画自动取消旧动画）
 */
const activeAnimTokens = new Map()

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function animateTextInput(channelKey, setter, targetText, { durationMs = 450, onDone } = {}) {
  const token = Symbol(channelKey)
  activeAnimTokens.set(channelKey, token)
  const text = String(targetText ?? '')
  if (!text) {
    setter('')
    onDone?.()
    return
  }
  const totalFrames = Math.max(4, Math.min(36, Math.round(durationMs / 24)))
  let frame = 0
  const step = () => {
    if (activeAnimTokens.get(channelKey) !== token) return
    frame++
    const progress = Math.min(1, frame / totalFrames)
    const chars = Math.max(1, Math.round(text.length * progress))
    setter(text.slice(0, chars))
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      setter(text)
      onDone?.()
    }
  }
  requestAnimationFrame(step)
}

/**
 * 电影级文本替换演播（用于系统提示词编辑）：
 * 阶段 1：聚焦并全选旧内容（蓝色选区高亮）
 * 阶段 2：从末尾平滑清除旧内容（光标回退）
 * 阶段 3：带真实移动光标逐段流畅写入新内容，实时汇报百分比进度
 */
export async function animateReplaceText(channelKey, {
  getCurrent,
  setValue,
  getEl,
  targetText,
  onPhase,
  onProgress
}) {
  const token = Symbol(channelKey)
  activeAnimTokens.set(channelKey, token)
  const isAlive = () => activeAnimTokens.get(channelKey) === token
  const nextText = String(targetText ?? '')
  const oldText = String(getCurrent?.() ?? '')

  const focusAndPlaceCaret = (el, start, end = start, scrollMode = 'bottom') => {
    if (!el || !(el instanceof HTMLElement)) return
    try {
      el.focus({ preventScroll: true })
      if (typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(start, end)
      }
      if (scrollMode === 'top') el.scrollTop = 0
      else if (scrollMode === 'bottom') el.scrollTop = el.scrollHeight
    } catch { /* ignore */ }
  }

  const el = getEl?.()
  if (el) el.classList.add('ai-copilot-caret-active')

  try {
    // 阶段 1：全选旧提示词
    if (oldText.length > 0) {
      onPhase?.('select')
      focusAndPlaceCaret(getEl?.(), 0, oldText.length, 'top')
      await sleep(520)
      if (!isAlive()) return false

      // 阶段 2：平滑清除旧提示词
      onPhase?.('clear')
      const clearDuration = Math.min(580, Math.max(320, oldText.length * 0.35))
      const clearStart = performance.now()
      await new Promise((resolve) => {
        const tick = (now) => {
          if (!isAlive()) { resolve(); return }
          const t = Math.min(1, (now - clearStart) / clearDuration)
          const eased = t * t
          const remain = Math.max(0, Math.round(oldText.length * (1 - eased)))
          setValue(oldText.slice(0, remain))
          focusAndPlaceCaret(getEl?.(), remain, remain, 'top')
          if (t < 1) requestAnimationFrame(tick)
          else {
            setValue('')
            resolve()
          }
        }
        requestAnimationFrame(tick)
      })
      if (!isAlive()) return false
      await sleep(160)
      if (!isAlive()) return false
    }

    // 阶段 3：光标逐字流畅写入新提示词
    onPhase?.('type')
    onProgress?.(0)
    if (nextText.length > 0) {
      const typeDuration = Math.min(2400, Math.max(1350, nextText.length * 1.35))
      const typeStart = performance.now()
      await new Promise((resolve) => {
        const tick = (now) => {
          if (!isAlive()) { resolve(); return }
          const t = Math.min(1, (now - typeStart) / typeDuration)
          const eased = 1 - Math.pow(1 - t, 1.3)
          const chars = Math.max(1, Math.round(nextText.length * eased))
          setValue(nextText.slice(0, chars))
          onProgress?.(Math.min(100, Math.round(t * 100)))
          focusAndPlaceCaret(getEl?.(), chars, chars, 'bottom')
          if (t < 1) requestAnimationFrame(tick)
          else {
            setValue(nextText)
            onProgress?.(100)
            resolve()
          }
        }
        requestAnimationFrame(tick)
      })
    } else {
      setValue('')
      onProgress?.(100)
    }
    if (!isAlive()) return false

    // 阶段 4：滚回顶部便于查看新提示词开头
    await sleep(220)
    if (!isAlive()) return false
    focusAndPlaceCaret(getEl?.(), 0, 0, 'top')
    onPhase?.('done')
    return true
  } finally {
    const finalEl = getEl?.()
    if (finalEl) finalEl.classList.remove('ai-copilot-caret-active')
  }
}

/**
 * 弹窗表单项逐字填入（带字段发光框 + 真实光标移动，返回 Promise 便于按步骤编排）
 */
export async function animateFieldType(channelKey, setter, el, targetText, durationMs = 420) {
  const token = Symbol(channelKey)
  activeAnimTokens.set(channelKey, token)
  const isAlive = () => activeAnimTokens.get(channelKey) === token
  const text = String(targetText ?? '')

  if (el && el instanceof HTMLElement) {
    el.classList.add('ai-copilot-field-active')
    try { el.focus({ preventScroll: true }) } catch { /* ignore */ }
  }
  try {
    setter('')
    if (!text) {
      await sleep(140)
      return isAlive()
    }
    const start = performance.now()
    await new Promise((resolve) => {
      const tick = (now) => {
        if (!isAlive()) { resolve(); return }
        const t = Math.min(1, (now - start) / Math.max(180, durationMs))
        const chars = Math.max(1, Math.round(text.length * t))
        setter(text.slice(0, chars))
        if (el && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(chars, chars) } catch { /* ignore */ }
        }
        if (t < 1) requestAnimationFrame(tick)
        else {
          setter(text)
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })
    if (!isAlive()) return false
    await sleep(160)
    return isAlive()
  } finally {
    if (el && el instanceof HTMLElement) {
      el.classList.remove('ai-copilot-field-active')
    }
  }
}

/**
 * 模拟鼠标点击按钮的轻按压动效（用于「新建 / 添加 / 保存」按钮）
 */
export async function pressElement(target, durationMs = 360) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el || !(el instanceof HTMLElement)) {
    await sleep(Math.min(durationMs, 180))
    return
  }
  try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } catch { /* ignore */ }
  el.classList.add('ai-copilot-btn-press')
  await sleep(durationMs)
  el.classList.remove('ai-copilot-btn-press')
}

/**
 * 选中/切换型表单项（select / checkbox / range / 选项卡片）高亮并执行变更
 */
export async function highlightFieldStep(target, applyFn, { beforeMs = 180, afterMs = 240 } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el && el instanceof HTMLElement) {
    el.classList.add('ai-copilot-field-active')
  }
  await sleep(beforeMs)
  try { applyFn?.() } catch { /* ignore */ }
  await sleep(afterMs)
  if (el && el instanceof HTMLElement) {
    el.classList.remove('ai-copilot-field-active')
  }
}

/**
 * 平滑滚动定位并对目标 DOM 施加 AI 操作呼吸发光框（带可选操作完成绿闪）
 */
export function spotlightElement(target, { durationMs = 2600, scroll = true, variant = 'pulse' } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el || !(el instanceof Element)) return null
  if (scroll) {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch { /* ignore */ }
  }
  const cls = variant === 'flash' ? 'ai-copilot-item-flash' : 'ai-copilot-pulse'
  el.classList.remove('ai-copilot-pulse', 'ai-copilot-item-flash')
  // 强制重排以重启 CSS 动画
  void el.offsetWidth
  el.classList.add(cls)
  if (durationMs > 0) {
    setTimeout(() => {
      el.classList.remove(cls)
    }, durationMs)
  }
  return el
}
