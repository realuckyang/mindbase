// HTTP 原语 —— 跨应用共享。
// 各应用自己的 `apiXxx` 在 `apps/<name>/api.js`,不要再往这里堆。

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({ success: false, message: 'invalid_json' }))
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || `http_${res.status}`)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export const api = {
  get:    (p)    => request('GET',    p),
  post:   (p, b) => request('POST',   p, b),
  put:    (p, b) => request('PUT',    p, b),
  patch:  (p, b) => request('PATCH',  p, b),
  delete: (p)    => request('DELETE', p),
}
