// R2 key 形如 /i/u/<uuid>.<ext>
const R2_KEY_RE = /\/i\/(u\/[A-Za-z0-9-]+\.[A-Za-z0-9]+)/g

export function extractR2Keys(content) {
  if (!content) return []
  const out = new Set()
  for (const m of content.matchAll(R2_KEY_RE)) out.add(m[1])
  return [...out]
}

// 删除一组 R2 key。R2 binding 的 delete() 支持数组。
export async function deleteR2Keys(env, keys) {
  if (!env?.R2 || !keys || keys.length === 0) return
  try {
    await env.R2.delete(keys)
  } catch (err) {
    console.error('r2 delete failed:', err?.message, keys.length, 'keys')
  }
}

export function diffRemovedKeys(oldContent, newContent) {
  const oldKeys = new Set(extractR2Keys(oldContent))
  const newKeys = new Set(extractR2Keys(newContent))
  return [...oldKeys].filter(k => !newKeys.has(k))
}
