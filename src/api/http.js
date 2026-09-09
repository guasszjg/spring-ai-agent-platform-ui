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

export const http = {
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
