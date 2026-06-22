// 上传图片到 R2,返回 { url, key, size, type }
export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file, file.name || 'paste.png')

  const res = await fetch('/api/images', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data = await res.json().catch(() => ({ success: false, message: 'invalid_json' }))
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || `http_${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}
