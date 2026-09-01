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
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    return await res.json()
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
