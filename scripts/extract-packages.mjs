#!/usr/bin/env node
// 把所有非核心应用从 server/apps/ 和 ui/apps/ 抽成 zip 包,放进 ../mindbase-site/public/packages/。
// 每个 zip 含:server/{manifest,schema,repository,service,api}.js + ui/index.vue + README.md
//
// 核心应用(不抽)= home + chat + collab + settings + create + layout
// 基础设施(不算应用)= user / image / search / openapi
// 占位(不打包)= outline / mindmap

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const SERVER_APPS = join(ROOT, 'server/apps')
const UI_APPS    = join(ROOT, 'ui/apps')
const OUT_DIR     = join(ROOT, '..', 'mindbase-site/public/packages')
const INDEX_FILE  = join(ROOT, '..', 'mindbase-site/public/packages.json')

const CORE          = new Set(['home', 'chat', 'collab', 'settings', 'create', 'layout'])
const INFRASTRUCTURE = new Set(['user', 'image', 'search', 'openapi'])
const PLACEHOLDERS  = new Set(['outline', 'mindmap'])
const SKIP_FILES    = new Set(['registry.js', 'router.js'])

const allServerApps = readdirSync(SERVER_APPS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const packageNames = allServerApps.filter(
  (name) => !CORE.has(name) && !INFRASTRUCTURE.has(name) && !PLACEHOLDERS.has(name)
)

mkdirSync(OUT_DIR, { recursive: true })

const index = []

const readManifest = (name) => {
  const file = join(SERVER_APPS, name, 'manifest.js')
  if (!existsSync(file)) return null
  const src = readFileSync(file, 'utf8')
  // 取 default export 的对象字面量
  const m = src.match(/export\s+default\s+(\{[\s\S]*\})\s*$/m)
  if (!m) return null
  // 不 eval,粗暴解析关键字段
  const text = m[1]
  const pick = (key) => {
    const re = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`)
    return text.match(re)?.[1] ?? null
  }
  const pickBool = (key) => {
    const re = new RegExp(`${key}\\s*:\\s*(true|false)`)
    return text.match(re)?.[1] === 'true'
  }
  const pickArr = (key) => {
    const re = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`)
    const m2 = text.match(re)
    if (!m2) return []
    return [...m2[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1])
  }
  return {
    name:     pick('name'),
    label:    pick('label'),
    icon:     pick('icon'),
    category: pick('category'),
    kind:     pick('kind'),
    summary:  pick('summary'),
    private:  pickBool('private'),
    tables:   pickArr('tables'),
    subpaths: pickArr('subpaths'),
  }
}

const generateReadme = (m) => `# ${m.icon} ${m.label}(${m.name})

${m.summary}

— ${m.category} 分类${m.private ? '・🔐 隐私应用' : ''}

## 这个包做什么

${m.summary}

涉及的表:
${(m.tables || []).map((t) => `- \`${t}\``).join('\n') || '(无 — 仅用系统表)'}

${(m.subpaths || []).length > 0 ? `专属子路径:\n${m.subpaths.map((s) => `- \`/api/${m.name}${s}\``).join('\n')}\n` : ''}

## 安装

把本包装进你的 mindbase。给 Claude Code / Codex 发这一句即可:

\`\`\`
按 https://mindbase.me/apps/${m.name} 的 README,把 ${m.name} 应用装进我本地的 mindbase 仓库,然后部署。
\`\`\`

AI 会读 \`AGENTS.md\` 的契约 + 这个包的文件,自动:

1. 把 \`server/\` 下 5 个文件 copy 到 \`server/apps/${m.name}/\`
2. 把 \`ui/index.vue\` copy 到 \`ui/apps/${m.name}/index.vue\`
3. 在 \`server/router.js\`、\`server/apps/registry.js\`、\`ui/router.js\`、\`ui/lib/apps.js\` 加上注册
4. 对 D1 跑这个包的 \`schema.sql\`(CREATE TABLE)
5. \`npm run deploy\`

## 卸载

反向操作 + \`DROP TABLE\`。AI 也能帮你做,跟 README 反着说一遍就行。

## 元信息

\`\`\`json
${JSON.stringify({ name: m.name, icon: m.icon, label: m.label, category: m.category, kind: m.kind, tables: m.tables, subpaths: m.subpaths, private: m.private }, null, 2)}
\`\`\`
`

for (const name of packageNames) {
  const serverDir = join(SERVER_APPS, name)
  const uiFile   = join(UI_APPS, name, 'index.vue')

  const manifest = readManifest(name)
  if (!manifest) {
    console.warn(`[skip] ${name} — no parseable manifest`)
    continue
  }

  const zip = new JSZip()

  // server 文件全部 nested 在 server/<name>/
  const serverFiles = readdirSync(serverDir)
  for (const fname of serverFiles) {
    if (SKIP_FILES.has(fname)) continue
    const full = join(serverDir, fname)
    if (statSync(full).isFile()) {
      zip.file(`server/${fname}`, readFileSync(full))
    }
  }

  // ui 文件 — 抽 ui/<name>/ 下的所有 .vue 文件 + components/ 子目录
  const uiDir = join(UI_APPS, name)
  if (existsSync(uiDir)) {
    for (const f of readdirSync(uiDir)) {
      const full = join(uiDir, f)
      if (statSync(full).isFile() && f.endsWith('.vue')) {
        zip.file(`ui/${f}`, readFileSync(full))
      }
    }
    if (existsSync(join(uiDir, 'components'))) {
      for (const f of readdirSync(join(uiDir, 'components'))) {
        zip.file(`ui/components/${f}`, readFileSync(join(uiDir, 'components', f)))
      }
    }
  } else {
    console.warn(`[warn] ${name} — no ui/ dir`)
  }

  // README
  zip.file('README.md', generateReadme(manifest))

  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  writeFileSync(join(OUT_DIR, `${name}.zip`), buf)
  // 同时把 README 单独输出一份,给 mindbase-site 的 AppDetail 页面直接 fetch 渲染
  writeFileSync(join(OUT_DIR, `${name}.README.md`), generateReadme(manifest))
  index.push({
    name:     manifest.name,
    label:    manifest.label,
    icon:     manifest.icon,
    category: manifest.category,
    kind:     manifest.kind,
    summary:  manifest.summary,
    private:  manifest.private,
    tables:   manifest.tables,
    subpaths: manifest.subpaths,
    size:     buf.length,
    file:     `/packages/${name}.zip`,
  })
  console.log(`✓ ${name}.zip (${(buf.length / 1024).toFixed(1)} KB)`)
}

// 索引 JSON 给市场首页用
writeFileSync(INDEX_FILE, JSON.stringify({
  count: index.length,
  updated_at: new Date().toISOString(),
  packages: index.sort((a, b) => a.name.localeCompare(b.name)),
}, null, 2))

console.log(`\n✓ ${index.length} packages built → ${OUT_DIR}`)
console.log(`✓ index → ${INDEX_FILE}`)
