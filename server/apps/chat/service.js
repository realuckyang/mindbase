import { ok, fail } from "../../system/utils/json.js"
import { readJsonBody } from "../../system/utils/body.js"
import { isAuthenticated } from "../../system/auth/index.js"
import { getAllSettings } from '../settings/repository.js'
import {
  insertMessage,
  insertCompaction,
  latestCompaction,
  latestUsage,
  listMessages,
  listMessagesPage,
  listConversations,
  createConversation,
  ensureConversation,
} from './repository.js'
import { chat } from '../../system/ai/handler.js'
import { callLlmRegular } from '../../system/llm/index.js'
import { buildSystemPrompt } from '../../system/prompt/index.js'

// 单一全局对话(向后兼容旧的 'main' 标识)。
const CONVERSATION_ID = 'main'

const safeParse = (s, fallback = null) => {
  if (s == null) return fallback
  try { return JSON.parse(s) } catch { return fallback }
}

const serialize = (row) => ({
  id:              row.id,
  conversation_id: row.conversation_id,
  message:         safeParse(row.message, { role: 'assistant', content: row.message }),
  meta:            safeParse(row.meta, null),
  usage:           safeParse(row.usage, null),
  created_at:      row.created_at,
})

const totalTokensOf = (usage = {}) => Number(usage.total_tokens || usage.totalTokens || 0) || 0
const keepSuffixStart = (rows = []) => {
  if (!rows.length) return 0
  const last = rows[rows.length - 1]?.message || {}
  if (last.role === 'tool') {
    for (let i = rows.length - 1; i >= 0; i--) {
      const m = rows[i]?.message || {}
      if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) return i
    }
  }
  return Math.max(0, rows.length - 1)
}
const serializeRows = (rows = []) => rows.map((row) => {
  const m = row.message || {}
  const role = m.role || 'unknown'
  const content = role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length
    ? [m.content || '', `tool_calls: ${JSON.stringify(m.tool_calls)}`].filter(Boolean).join('\n')
    : role === 'tool'
      ? `tool_call_id: ${m.tool_call_id || ''}\n${m.content || ''}`
      : m.content || ''
  return `#${row.id} ${role}\n${content}`
}).join('\n\n---\n\n')

const maybeCompactBeforeRun = async ({ env, settings, conversationId, usage, sse }) => {
  const threshold = Number(settings.compressThreshold || 12000)
  const totalTokens = totalTokensOf(usage)
  if (!threshold || !totalTokens || totalTokens < threshold) return null
  const latest = await latestCompaction(env.DB, conversationId)
  const latestEnd = Number(latest?.end_message_id || 0)
  const all = await listMessages(env.DB, conversationId)
  const rows = (all?.results || [])
    .map(serialize)
    .map((row) => ({ id: row.id, message: row.message, meta: row.meta, usage: row.usage }))
    .filter((row) => Number(row.id) > latestEnd)
    .filter((row) => row?.meta?.kind !== 'compaction')
  const suffixStart = keepSuffixStart(rows)
  if (suffixStart <= 2) return null
  const candidates = rows.slice(0, suffixStart)
  const startMessageId = candidates[0]?.id
  const endMessageId = candidates[candidates.length - 1]?.id
  if (!startMessageId || !endMessageId) return null
  sse?.({ type: 'compact_start', meta: { startMessageId, endMessageId, totalTokens, threshold } })
  try {
    const result = await callLlmRegular(settings.ai_base_url, settings.ai_api_key, {
      model: settings.ai_model,
      messages: [
        { role: 'system', content: settings.compactPrompt || '你负责压缩聊天上下文。请保留目标、关键事实、工具结果、已做决定和未完成事项。不要加入新事实。用中文,结构清晰。' },
        { role: 'user', content: `请压缩以下聊天消息：\n\n${serializeRows(candidates)}` },
      ],
    })
    const summary = String(result.content || '').trim()
    if (!summary) return null
    const id = await insertCompaction(env.DB, { conversationId, startMessageId, endMessageId, summary, tokens: totalTokensOf(result.usage) })
    const message = { role: 'user', content: `以下是历史上下文压缩摘要：\n\n${summary}` }
    await insertMessage(env.DB, { conversationId, message, meta: { kind: 'compaction', compactionId: id, startMessageId, endMessageId } })
    sse?.({ type: 'input', kind: 'compaction', message, meta: { kind: 'compaction', compactionId: id, startMessageId, endMessageId } })
    return { id, end_message_id: endMessageId }
  } finally {
    sse?.({ type: 'compact_done', meta: { startMessageId, endMessageId } })
  }
}

export const listConversationsAction = async (request, env) => {
  if (!(await isAuthenticated(request, env))) return fail('unauthorized', 401)
  const items = await listConversations(env.DB)
  return ok({ conversations: items })
}

export const createConversationAction = async (request, env) => {
  if (!(await isAuthenticated(request, env))) return fail('unauthorized', 401)
  const body = await readJsonBody(request)
  const id    = String(body?.id    || '').trim() || crypto.randomUUID()
  const title = String(body?.title || '').trim()
  const row = await createConversation(env.DB, { id, title })
  return ok({ conversation: row }, 201)
}

export const listMessagesAction = async (request, env, url) => {
  if (!(await isAuthenticated(request, env))) return fail('unauthorized', 401)
  const before = url.searchParams.get('before')
  const limit  = url.searchParams.get('limit')
  const rows = await listMessagesPage(env.DB, CONVERSATION_ID, {
    before: before ? Number(before) : undefined,
    limit:  limit  ? Number(limit)  : 30,
  })
  return ok({ messages: rows.map(serialize) })
}

export const sendChatAction = async (request, env) => {
  if (!(await isAuthenticated(request, env))) return new Response('unauthorized', { status: 401 })

  const body = await readJsonBody(request)
  const content = String(body?.content || '').trim()
  if (!content) return new Response('content_required', { status: 400 })

  const settings = await getAllSettings(env.DB)
  const apiUrl = settings.ai_base_url
  const apiKey = settings.ai_api_key
  const model  = settings.ai_model
  if (!apiUrl || !apiKey || !model) {
    return new Response(
      JSON.stringify({ success: false, message: 'ai_not_configured' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // 确保单一全局对话存在,后续 insertMessage 才不会违反 FK
  await ensureConversation(env.DB, CONVERSATION_ID, 'Main')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sse = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      const close = () => {
        try { controller.enqueue(encoder.encode(`data: [DONE]\n\n`)) } catch {}
        try { controller.close() } catch {}
      }

      // 收集所有副作用 DB 写入,close 前 awaitAll,确保 Worker 不在写完前退出
      const pending = []
      let assistantText = ''
      let lastUsage = null

      const send = (evt) => {
        sse(evt)
        if (evt.type === 'message' && typeof evt.content === 'string') {
          assistantText += evt.content
        } else if (evt.type === 'usage' && evt.usage) {
          lastUsage = evt.usage
        } else if (evt.type === 'tool_calls' && Array.isArray(evt.toolCalls) && evt.toolCalls.length) {
          const message = { role: 'assistant', content: assistantText || null, tool_calls: evt.toolCalls }
          pending.push(insertMessage(env.DB, {
            conversationId: CONVERSATION_ID,
            message,
            usage: lastUsage,
          }))
          assistantText = ''
        } else if (evt.type === 'tool_results' && Array.isArray(evt.results)) {
          for (const result of evt.results) {
            const message = result.message || { role: 'tool', tool_call_id: result.toolCallId, content: result.content || '' }
            pending.push(insertMessage(env.DB, { conversationId: CONVERSATION_ID, message }))
          }
        } else if (evt.type === 'done') {
          const content = assistantText.trim()
          if (!content) return
          pending.push(insertMessage(env.DB, {
            conversationId: CONVERSATION_ID,
            message: { role: 'assistant', content: assistantText },
            meta: { model },
            usage: lastUsage,
          }))
          assistantText = ''
        }
      }

      try {
        await maybeCompactBeforeRun({
          env,
          settings,
          conversationId: CONVERSATION_ID,
          usage: await latestUsage(env.DB, CONVERSATION_ID),
          sse,
        })

        const userMsg = { role: 'user', content }
        await insertMessage(env.DB, { conversationId: CONVERSATION_ID, message: userMsg, meta: { kind: 'message' } })
        sse({ type: 'input', kind: 'message', message: userMsg, meta: { kind: 'message' } })

        const histR = await listMessages(env.DB, CONVERSATION_ID)
        const latest = await latestCompaction(env.DB, CONVERSATION_ID)
        const latestEnd = Number(latest?.end_message_id || 0)
        const messages = [
          { role: 'system', content: await buildSystemPrompt(env, settings) },
          ...(histR?.results || [])
            .map(serialize)
            .filter(row => Number(row.id) > latestEnd)
            .map(row => row.message)
            .filter(Boolean),
        ]

        await chat(messages, {
          apiUrl,
          apiKey,
          model,
          toolContext: { env },
          toolResultMaxChars: Number(settings.toolResultMaxChars || 12000),
          beforeModelCall: async ({ lastUsage, round }) => {
            if (!lastUsage || round <= 1) return null
            const compacted = await maybeCompactBeforeRun({ env, settings, conversationId: CONVERSATION_ID, usage: lastUsage, sse })
            if (!compacted) return null
            const latestEnd = Number(compacted.end_message_id || 0)
            const rows = await listMessages(env.DB, CONVERSATION_ID)
            return [
              { role: 'system', content: await buildSystemPrompt(env, settings) },
              ...(rows?.results || []).map(serialize).filter(row => Number(row.id) > latestEnd).map(row => row.message),
            ]
          },
          send,
        })
      } catch (err) {
        sse({ type: 'error', message: err?.message || 'chat_failed' })
      } finally {
        const results = await Promise.allSettled(pending)
        for (const r of results) {
          if (r.status === 'rejected') console.error('insert failed', r.reason?.message || r.reason)
        }
        close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
