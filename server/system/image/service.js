import { ok, fail } from "../utils/json.js"
import { isAuthenticated } from "../auth/index.js"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
const EXT_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

// 不走 api/utils 的 ok() 因为这里要返回裸 body + 各种 header 由 R2 决定
const bytesStreamOrBuffer = async (file) => {
  // 在 Workers 里,File.stream() 更省内存,直接用
  return file.stream()
}

export const uploadImageAction = async (request, env) => {
  if (!(await isAuthenticated(request, env))) return fail('unauthorized', 401)
  if (!env.R2) return fail('r2_not_configured', 500)

  let formData
  try {
    formData = await request.formData()
  } catch {
    return fail('invalid_multipart', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return fail('file_required', 400)
  if (file.size === 0) return fail('file_empty', 400)
  if (file.size > MAX_SIZE) return fail(`file_too_large:max_${MAX_SIZE}`, 400)

  const type = (file.type || '').toLowerCase()
  if (!ALLOWED.has(type)) return fail(`unsupported_type:${type || 'unknown'}`, 400)

  const ext = EXT_MAP[type] || 'bin'
  // 单机:key 不再带 user_id 路径,但保留 u/ 前缀和老 key 兼容
  const key = `u/${crypto.randomUUID()}.${ext}`

  await env.R2.put(key, await bytesStreamOrBuffer(file), {
    httpMetadata: { contentType: type },
  })

  return ok({
    url: `/i/${key}`,
    key,
    size: file.size,
    type,
  }, 201)
}

// GET /i/<key>  — key 是多段(u/<uuid>.<ext>;老 key 形如 u/<userId>/<uuid>.<ext>)
export const serveImageAction = async (request, env, key) => {
  if (!env.R2) return new Response('r2_not_configured', { status: 500 })
  if (!key || key.length > 256) return new Response('bad_key', { status: 400 })

  // If-None-Match 优先走条件请求,节省带宽
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch) {
    const head = await env.R2.head(key)
    if (head && head.httpEtag === ifNoneMatch) {
      return new Response(null, { status: 304, headers: { etag: head.httpEtag } })
    }
  }

  const object = await env.R2.get(key)
  if (!object) return new Response('not_found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
}
