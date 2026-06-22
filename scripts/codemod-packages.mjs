// 一次性把 41 个包从旧仓库布局迁移到当前布局。
// 跑一次,改完就丢。

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.argv[2]
const names = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort()

// ----------------------------------------------------------------
// 服务端 import 路径迁移
// ----------------------------------------------------------------
const SERVER_REPLACES = [
  [`'../../lib/utils/json.js'`, `'../../system/utils/json.js'`],
  [`'../../lib/utils/body.js'`, `'../../system/utils/body.js'`],
  [`'../../lib/utils/id.js'`,   `'../../system/utils/id.js'`],
  [`'../../lib/auth/index.js'`, `'../../system/auth/index.js'`],
  [`'../../apps/image/refs.js'`,           `'../../system/image/refs.js'`],
  [`'../../apps/settings/repository.js'`,  `'../../system/apps/settings/repository.js'`],
]

// emitHomeEvent 局部 wrapper(顶层 helper,跨服务复用同样形态)
const EMIT_WRAPPER = `
// 主页事件流的本地 wrapper:写入失败不影响主操作。
const emitHomeEvent = async (db, ev) => {
  try {
    await insertEvent(db, {
      id:      crypto.randomUUID(),
      app:     ev.app,
      action:  ev.action,
      ref_id:  ev.ref_id || null,
      summary: ev.summary,
      icon:    ev.icon || null,
    })
  } catch (err) {
    console.error('[emitHomeEvent] failed:', err?.message)
  }
}
`

function fixServerService(src) {
  let s = src
  for (const [a, b] of SERVER_REPLACES) s = s.split(a).join(b)

  // emitHomeEvent: 换 import + 注入 wrapper
  if (s.includes(`from '../../lib/events.js'`) || s.includes(`emitHomeEvent`)) {
    s = s.replace(
      /import\s*\{\s*emitHomeEvent\s*\}\s*from\s*'[^']+'\n?/,
      `import { insertEvent } from '../home/repository.js'\n`,
    )
    // 在最后一条完整 import 语句之后插入 wrapper。
    // 用"最后一行匹配 `from '...'`"作为锚点,正确处理多行 import。
    const lines = s.split('\n')
    let lastFromLine = -1
    for (let i = 0; i < lines.length; i++) {
      if (/from\s+['"][^'"]+['"]/.test(lines[i])) lastFromLine = i
    }
    if (lastFromLine >= 0 && !s.includes('const emitHomeEvent =')) {
      lines.splice(lastFromLine + 1, 0, EMIT_WRAPPER)
      s = lines.join('\n')
    }
  }
  return s
}

// ----------------------------------------------------------------
// 服务端 image/refs 引用(notes 用,有 default 导入风格也兼容)
// ----------------------------------------------------------------
// 已经在 SERVER_REPLACES 里处理过

// ----------------------------------------------------------------
// manifest:删 private 字段
// ----------------------------------------------------------------
function fixManifest(src) {
  return src.replace(/^\s*private:\s*(true|false),?\s*\n/m, '')
}

// ----------------------------------------------------------------
// UI 路径迁移
// ----------------------------------------------------------------
const UI_PATH_REPLACES = [
  [`from '@/components/`,    `from '@/system/components/`],
  [`from '@/composables/`,   `from '@/system/composables/`],
  [`from '@/lib/`,           `from '@/system/lib/`],
]

// 每个 apiX 的内联实现(从我们之前删除的 ui/api.js 复刻)。
// 应用包 import { apiX } from '@/api' 后我们换成 import { api } + 这里的 const。
const API_INLINES = {
  apiTodos: `const apiTodos = {
  list:   ()           => api.get('/api/todos'),
  create: ({ title })  => api.post('/api/todos', { title }),
  update: (id, patch)  => api.patch(\`/api/todos/\${id}\`, patch),
  remove: (id)         => api.delete(\`/api/todos/\${id}\`),
}`,

  apiLedger: `const apiLedger = {
  list: ({ month = null, type = null, limit = 500 } = {}) => {
    const p = new URLSearchParams()
    if (month) p.set('month', month)
    if (type)  p.set('type',  type)
    p.set('limit', String(limit))
    return api.get(\`/api/ledger?\${p}\`)
  },
  stats:      (month = null) => api.get(\`/api/ledger/stats\${month ? \`?month=\${month}\` : ''}\`),
  categories: ()             => api.get('/api/ledger/categories'),
  get:        (id)           => api.get(\`/api/ledger/\${id}\`),
  create:     (patch)        => api.post('/api/ledger', patch),
  update:     (id, patch)    => api.patch(\`/api/ledger/\${id}\`, patch),
  remove:     (id)           => api.delete(\`/api/ledger/\${id}\`),
}`,

  apiProfile: `const apiProfile = {
  list:   ()         => api.get('/api/profile'),
  create: (body)     => api.post('/api/profile', body),
  update: (id, body) => api.patch(\`/api/profile/\${id}\`, body),
  remove: (id)       => api.delete(\`/api/profile/\${id}\`),
}`,

  apiRoot: `const apiRoot = {
  detail: ()      => api.get('/api/notes/root'),
  update: (patch) => api.patch('/api/notes/root', patch),
}`,

  apiNotebook: `const apiNotebook = {
  list:   (parentId = null) =>
    api.get(\`/api/notes/notebooks\${parentId ? \`?parent_id=\${encodeURIComponent(parentId)}\` : ''}\`),
  detail: (id)        => api.get(\`/api/notes/notebooks/\${id}\`),
  create: ({ name, parent_id = null, icon = null }) =>
    api.post('/api/notes/notebooks', { name, parent_id, icon }),
  update: (id, patch) => api.patch(\`/api/notes/notebooks/\${id}\`, patch),
  remove: (id)        => api.delete(\`/api/notes/notebooks/\${id}\`),
}`,

  apiNote: `const apiNote = {
  detail: (id) => api.get(\`/api/notes/pages/\${id}\`),
  create: ({ notebook_id, title = '', content = '' }) =>
    api.post('/api/notes/pages', { notebook_id, title, content }),
  update: (id, patch) => api.patch(\`/api/notes/pages/\${id}\`, patch),
  remove: (id)        => api.delete(\`/api/notes/pages/\${id}\`),
}`,

  apiItems: `const apiItems = {
  reorder: ({ parent_id = null, items }) =>
    api.post('/api/notes/items/reorder', { parent_id, items }),
}`,
}

function fixUi(src) {
  let s = src
  for (const [a, b] of UI_PATH_REPLACES) s = s.split(a).join(b)

  // apiX 引入:把命名 import 换成基础 import,然后把 inline const 推到所有 import 之后,
  // 避免插在 import 序列中间产生语法错。
  const m = s.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*'@\/api'\n?/)
  if (m && /api[A-Z]/.test(m[1])) {
    const names = m[1].split(',').map((x) => x.trim()).filter(Boolean)
    const apiNames = names.filter((n) => n.startsWith('api') && /[A-Z]/.test(n[3] || ''))
    if (apiNames.length) {
      s = s.replace(m[0], `import { api } from '@/api'\n`)
      const lines = s.split('\n')
      let lastFromLine = -1
      for (let i = 0; i < lines.length; i++) {
        if (/from\s+['"][^'"]+['"]/.test(lines[i])) lastFromLine = i
      }
      const inlines = apiNames.map((n) => API_INLINES[n]).filter(Boolean).join('\n\n')
      if (lastFromLine >= 0 && inlines) {
        lines.splice(lastFromLine + 1, 0, '', inlines)
        s = lines.join('\n')
      }
    }
  }
  return s
}

// ----------------------------------------------------------------
// 执行
// ----------------------------------------------------------------
let total = 0
let touched = 0
for (const name of names) {
  const dir = join(ROOT, name)

  const tryFix = (rel, fn) => {
    const p = join(dir, rel)
    if (!existsSync(p)) return
    total++
    const before = readFileSync(p, 'utf8')
    const after = fn(before)
    if (after !== before) {
      writeFileSync(p, after)
      touched++
    }
  }

  tryFix('server/manifest.js',   fixManifest)
  tryFix('server/service.js',    fixServerService)
  tryFix('server/repository.js', fixServerService)  // 防止 repo 里也用了 lib
  tryFix('server/api.js',        fixServerService)

  // ui/ 下所有 .vue / .js 递归(覆盖 index.vue 以外的拆分文件,如 notes 的 home/notebook/detail)
  const uiDir = join(dir, 'ui')
  if (existsSync(uiDir)) {
    const walk = (d) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, f.name)
        if (f.isDirectory()) walk(p)
        else if (f.name.endsWith('.vue') || f.name.endsWith('.js')) {
          total++
          const before = readFileSync(p, 'utf8')
          const after = fixUi(before)
          if (after !== before) {
            writeFileSync(p, after)
            touched++
          }
        }
      }
    }
    walk(uiDir)
  }
}
console.log(`scanned ${total} files, modified ${touched}`)
