// 主页作者身份注册表。author 字段在 DB 是任意短串(a-z0-9-,<=32),
// 这里登记**已知身份**的展示元数据。未登记的 slug fallback 用通用风格。

export const AUTHORS = {
  user:           { label: '我',           emoji: '👤', color: null,        family: 'human' },
  ai:             { label: 'AI',           emoji: '🤖', color: '#2383e2',   family: 'ai'    },

  // 已知的 coding agent
  codex:          { label: 'Codex',        emoji: '🦾', color: '#10a37f',   family: 'agent' },
  'claude-code':  { label: 'Claude Code',  emoji: '🪶', color: '#cc785c',   family: 'agent' },
  opencode:       { label: 'OpenCode',     emoji: '🌊', color: '#7c3aed',   family: 'agent' },
  cursor:         { label: 'Cursor',       emoji: '➤',  color: '#0a0a0a',   family: 'agent' },
  'gemini-cli':   { label: 'Gemini CLI',   emoji: '✨', color: '#4285f4',   family: 'agent' },
  zed:            { label: 'Zed',          emoji: '⚡', color: '#0d4f8b',   family: 'agent' },
  cline:          { label: 'Cline',        emoji: '🧵', color: '#5e60ce',   family: 'agent' },

  // 系统级
  system:         { label: '系统',         emoji: '⚙️', color: '#6b7280',   family: 'system'},
}

// 未登记 slug 的 fallback —— 仍能展示,只是用通用 icon + 随机灰
export function authorMeta(slug) {
  const s = String(slug || 'user').toLowerCase()
  if (AUTHORS[s]) return AUTHORS[s]
  return { label: s, emoji: '🔌', color: '#9ca3af', family: 'other' }
}

// 给 compose 用的常用身份选项(下拉里展示)
export const COMPOSE_OPTIONS = [
  'user',
  'codex',
  'claude-code',
  'opencode',
  'cursor',
  'gemini-cli',
  'zed',
  'cline',
  'ai',
]
