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

  try {
    const res = await fetch(fullUrl, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    const contentType = res.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await res.json()
      : { success: false, message: `请求失败 (HTTP ${res.status})` }
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
  del: (url) => request('DELETE', url)
}
