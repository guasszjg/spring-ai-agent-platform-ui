// 分享链接访客接口（免登录）：访客令牌放在 X-Share-Token 请求头，不带平台的登录 Cookie。
// 所有方法都不抛异常，失败时返回 { success: false, code, message, status }。

const BASE = '/share/v1/links/'

function linkUrl(code, path = '') {
  return BASE + encodeURIComponent(code) + path
}

function headers(token, extra) {
  const h = { 'Content-Type': 'application/json', ...(extra || {}) }
  if (token) h['X-Share-Token'] = token
  return h
}

async function parse(res) {
  const type = res.headers.get('content-type') || ''
  const body = type.includes('application/json') ? await res.json().catch(() => null) : null
  if (res.ok && body && body.success !== false) return { success: true, data: body.data }
  return {
    success: false,
    status: res.status,
    code: body?.data?.code || (res.status === 401 ? 'session_expired' : 'error'),
    retryAfter: body?.data?.retryAfter,
    message: body?.message || `请求失败 (HTTP ${res.status})`
  }
}

async function call(method, url, { token, body } = {}) {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'omit',
      headers: headers(token),
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    return await parse(res)
  } catch (err) {
    return { success: false, code: 'network', message: '网络连接失败，请检查网络后重试' }
  }
}

export const shareApi = {
  entry: (code) => call('GET', linkUrl(code)),
  session: (code, visitorId, accessCode) => call('POST', linkUrl(code, '/session'), { body: { visitorId, accessCode } }),
  config: (code, token) => call('GET', linkUrl(code, '/config'), { token }),
  conversations: (code, token) => call('GET', linkUrl(code, '/conversations'), { token }),
  messages: (code, token, conversationId) =>
    call('GET', linkUrl(code, '/conversations/' + encodeURIComponent(conversationId) + '/messages'), { token }),

  /**
   * 发消息并读取流式回答。onEvent(event, data)：message（data.answer 是一段文字）、message_end、guardrail、error。
   * 中止（停止生成）时返回 { success: false, aborted: true }。
   */
  async send(code, token, message, conversationId, { signal, onEvent } = {}) {
    let res
    try {
      res = await fetch(linkUrl(code, '/messages'), {
        method: 'POST',
        credentials: 'omit',
        headers: headers(token, { Accept: 'text/event-stream' }),
        body: JSON.stringify({ message, conversationId: conversationId || undefined }),
        signal
      })
    } catch (err) {
      if (err.name === 'AbortError') return { success: false, aborted: true }
      return { success: false, code: 'network', message: '网络连接失败，请检查网络后重试' }
    }
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.includes('text/event-stream')) return parse(res)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const dispatch = (block) => {
      let event = 'message'
      const data = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (!data.length) return
      let payload = data.join('\n')
      try { payload = JSON.parse(payload) } catch { /* 非 JSON 原样传 */ }
      onEvent?.(event, payload)
    }
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          dispatch(buffer.slice(0, idx))
          buffer = buffer.slice(idx + 2)
        }
      }
      if (buffer.trim()) dispatch(buffer)
    } catch (err) {
      if (err.name === 'AbortError') return { success: false, aborted: true }
      return { success: false, code: 'network', message: '连接中断，请重试' }
    }
    return { success: true }
  }
}

// 每个链接在浏览器里单独记访客 ID 和令牌
function storeKey(code, name) {
  return `share:${code}:${name}`
}

export const shareStore = {
  visitorId(code) {
    try { return localStorage.getItem(storeKey(code, 'visitor')) || '' } catch { return '' }
  },
  token(code) {
    try {
      const raw = localStorage.getItem(storeKey(code, 'token'))
      if (!raw) return ''
      const { token, expiresAt } = JSON.parse(raw)
      if (!token || (expiresAt && new Date(expiresAt).getTime() <= Date.now())) return ''
      return token
    } catch { return '' }
  },
  save(code, { visitorId, token, expiresAt }) {
    try {
      if (visitorId) localStorage.setItem(storeKey(code, 'visitor'), visitorId)
      localStorage.setItem(storeKey(code, 'token'), JSON.stringify({ token, expiresAt }))
    } catch { /* 无痕模式下存不了，只影响刷新后需要重新输入 */ }
  },
  clearToken(code) {
    try { localStorage.removeItem(storeKey(code, 'token')) } catch { /* ignore */ }
  }
}
