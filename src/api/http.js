function getCsrfToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user && user.csrfToken) return user.csrfToken
  } catch {}
  return localStorage.getItem('csrf_token') || ''
}

async function request(method, url, { params, body } = {}) {
  let fullUrl = url
  if (params) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value)
      }
    })
    const qs = query.toString()
    if (qs) fullUrl += `?${qs}`
  }

  const headers = {
    'Content-Type': 'application/json'
  }
  const token = getCsrfToken()
  if (token && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    headers['X-CSRF-TOKEN'] = token
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    const contentType = res.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await res.json()
      : { success: false, message: `请求失败 (HTTP ${res.status})` }
    if (payload?.data?.csrfToken) {
      localStorage.setItem('csrf_token', payload.data.csrfToken)
    }
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('csrf_token')
    }
    return payload
  } catch (err) {
    return { success: false, message: '网络请求失败: ' + err.message }
  }
}

// 解析一个 SSE 事件块（"event:" / "data:" 行），data 按 JSON 解析
function dispatchSseBlock(block, onEvent) {
  let event = 'message'
  const data = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (!data.length) return
  let payload = data.join('\n')
  try { payload = JSON.parse(payload) } catch { /* 非 JSON 数据按原文传递 */ }
  onEvent(event, payload)
}

/**
 * POST 并以 SSE 读取响应。服务端在建立流之前拒绝（参数错误、限流、未登录）时返回普通 JSON，
 * 此时直接返回 { success: false, status, message }。用户中止时返回 { aborted: true }。
 */
async function stream(url, body, { signal, onEvent } = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' }
  const token = getCsrfToken()
  if (token) headers['X-CSRF-TOKEN'] = token

  let res
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(body), signal })
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, aborted: true }
    return { success: false, message: '网络请求失败: ' + err.message }
  }

  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || !contentType.includes('text/event-stream')) {
    const payload = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {}
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('csrf_token')
    }
    return { success: false, status: res.status, message: payload.message || `请求失败 (HTTP ${res.status})` }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let idx
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        dispatchSseBlock(buffer.slice(0, idx), onEvent)
        buffer = buffer.slice(idx + 2)
      }
    }
    if (buffer.trim()) dispatchSseBlock(buffer, onEvent)
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, aborted: true }
    return { success: false, message: '连接中断: ' + err.message }
  }
  return { success: true }
}

export const http = {
  stream,
  get: (url, params) => request('GET', url, { params }),
  post: (url, body) => request('POST', url, { body }),
  put: (url, body) => request('PUT', url, { body }),
  patch: (url, body) => request('PATCH', url, { body }),
  del: (url) => request('DELETE', url),
  upload: async (url, formData) => {
    try {
      const headers = {}
      const token = getCsrfToken()
      if (token) {
        headers['X-CSRF-TOKEN'] = token
      }
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      })
      const contentType = res.headers.get('content-type') || ''
      return contentType.includes('application/json')
        ? await res.json()
        : { success: false, message: `请求失败 (HTTP ${res.status})` }
    } catch (err) {
      return { success: false, message: '网络请求失败: ' + err.message }
    }
  }
}
