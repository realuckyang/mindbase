// 应用元信息 —— 启动器读取的派生层。
//
// 用 import.meta.glob 直接扫 server/apps/*/manifest.js,装一个新包就有,
// 不需要手工注册。

const modules = import.meta.glob(
  '../../../server/apps/*/manifest.js',
  { eager: true, import: 'default' },
)

const MANIFESTS = Object.values(modules).filter((m) => m.kind !== 'infra')

// 启动器内的显示顺序。前面是按重要性排好的常用应用,后面的应用按 slug
// 字母序补齐 —— 新装一个包,扔进 apps/ 就自动出现在尾部。
const ORDER = [
  'home', 'todos', 'notes', 'projects', 'prompts', 'llms', 'apikeys',
]

const orderIndex = (name) => {
  const i = ORDER.indexOf(name)
  return i === -1 ? ORDER.length : i
}

// 底部 dock 固定显示的 3 个系统应用 —— 暂时硬编码,未来可以做成用户偏好。
export const DOCK = ['chat', 'collab', 'settings']

const SORTED = [...MANIFESTS].sort((a, b) => {
  const ia = orderIndex(a.name)
  const ib = orderIndex(b.name)
  if (ia !== ib) return ia - ib
  return a.name.localeCompare(b.name)
})

// 路由匹配规则:大部分应用 = path.startsWith('/<name>'),少数有特殊路径在这里覆写。
const MATCH_OVERRIDES = {
  home: (p) => p === '/' || p.startsWith('/home'),
}

const toMeta = (m) => ({
  name:  m.name,
  icon:  m.icon,
  label: m.label,
  to:    m.kind === 'placeholder' ? null : { name: m.name },
  match: MATCH_OVERRIDES[m.name] || ((p) => p === `/${m.name}` || p.startsWith(`/${m.name}/`)),
})

export const APPS_META = SORTED.map(toMeta)

// 启动器上半区:除 dock 外的全部应用
export const LAUNCHER_APPS = APPS_META.filter((a) => !DOCK.includes(a.name))

// 启动器下半区:dock 3 个,按 DOCK 顺序
export const DOCK_APPS = DOCK
  .map((name) => APPS_META.find((a) => a.name === name))
  .filter(Boolean)

const META_BY_NAME = Object.fromEntries(APPS_META.map((a) => [a.name, a]))

export const appMeta = (slug) => META_BY_NAME[slug] || null
export const iconOf  = (slug) => META_BY_NAME[slug]?.icon  || '🧩'
export const labelOf = (slug) => META_BY_NAME[slug]?.label || slug
