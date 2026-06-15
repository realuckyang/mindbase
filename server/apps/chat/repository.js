// messages 表的 message 字段直接存大模型 message JSON。
// 用户消息也按相同格式: {role:"user", content:"..."}
// conversations 表是会话本身;messages.conversation_id FK 到 conversations.id。

// ---------- Conversations ----------
export const listConversations = async (db) => {
  const r = await db.prepare(
    `SELECT id, title, created_at, updated_at
       FROM conversations
      ORDER BY updated_at DESC`
  ).all()
  return r?.results || []
}

export const getConversation = (db, id) =>
  db.prepare(
    `SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?1`
  ).bind(id).first()

export const createConversation = async (db, { id, title = '' }) => {
  await db.prepare(
    `INSERT INTO conversations (id, title)
     VALUES (?1, ?2)`
  ).bind(id, String(title || '')).run()
  return getConversation(db, id)
}

export const updateConversationTitle = async (db, id, title) => {
  await db.prepare(
    `UPDATE conversations SET title = ?2, updated_at = datetime('now') WHERE id = ?1`
  ).bind(id, String(title || '')).run()
  return getConversation(db, id)
}

export const touchConversation = (db, id) =>
  db.prepare(
    `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?1`
  ).bind(id).run()

// 确保对话存在;不存在则用给定 id 建一条
export const ensureConversation = async (db, id, title = '') => {
  const existing = await getConversation(db, id)
  if (existing) return existing
  return createConversation(db, { id, title })
}

// ---------- Messages ----------
export const insertMessage = async (db, { conversationId, message, meta, usage }) => {
  const r = await db.prepare(
    `INSERT INTO messages (conversation_id, message, meta, usage)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING id, conversation_id, message, meta, usage, created_at`
  ).bind(
    conversationId,
    typeof message === 'string' ? message : JSON.stringify(message),
    meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null,
    usage ? (typeof usage === 'string' ? usage : JSON.stringify(usage)) : null,
  ).first()
  // 顺手把 conversation 的 updated_at 推一下,失败也不阻塞
  try { await touchConversation(db, conversationId) } catch {}
  return r
}

// 全量(给 chat 调用送上下文用)
export const listMessages = (db, conversationId) =>
  db.prepare(
    `SELECT id, conversation_id, message, meta, usage, created_at
       FROM messages
      WHERE conversation_id = ?1
      ORDER BY id ASC`
  ).bind(conversationId).all()

// 分页(给前端列表用):取 id < before 的最近 limit 条,DESC 后再反转得到 ASC
export const listMessagesPage = async (db, conversationId, { before, limit = 30 } = {}) => {
  const lim = Math.max(1, Math.min(200, Number(limit) || 30))
  const r = before
    ? await db.prepare(
        `SELECT id, conversation_id, message, meta, usage, created_at
           FROM messages
          WHERE conversation_id = ?1 AND id < ?2
          ORDER BY id DESC
          LIMIT ?3`
      ).bind(conversationId, before, lim).all()
    : await db.prepare(
        `SELECT id, conversation_id, message, meta, usage, created_at
           FROM messages
          WHERE conversation_id = ?1
          ORDER BY id DESC
          LIMIT ?2`
      ).bind(conversationId, lim).all()
  const rows = (r?.results || []).reverse()
  return rows
}

export const latestUsage = async (db, conversationId) => {
  const row = await db.prepare(`SELECT usage FROM messages WHERE conversation_id = ?1 AND usage IS NOT NULL ORDER BY id DESC LIMIT 1`).bind(conversationId).first()
  if (!row?.usage) return null
  try { return JSON.parse(row.usage) } catch { return null }
}

export const latestCompaction = (db, conversationId) =>
  db.prepare(`SELECT * FROM compactions WHERE conversation_id = ?1 ORDER BY end_message_id DESC, id DESC LIMIT 1`).bind(conversationId).first()

export const insertCompaction = async (db, { conversationId, startMessageId, endMessageId, summary, tokens = 0 }) => {
  const row = await db.prepare(`INSERT INTO compactions (conversation_id, start_message_id, end_message_id, summary, tokens) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id`)
    .bind(conversationId, startMessageId, endMessageId, summary, tokens).first()
  return Number(row?.id || 0)
}
