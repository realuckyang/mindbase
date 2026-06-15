import { tools } from './tools.js'
import { runTools } from './runner.js'
import { callLlmStream } from '../llm/index.js'
import { normalizeAgentMessages, normalizeChatOptions } from './utils.js'

// Agent loop: 持续调模型,遇到 tool_calls 就跑工具回喂,直到出文本。
// 改动 vs AIOS:多了 toolContext 参数,会透传给 runner→functions(里面的 sql_query 要拿 env.DB)。
const chat = async (messages, {
  provider,
  apiUrl,
  apiKey,
  model,
  toolContext = {},
  send = (_message) => {},
  signal,
  enableToolResultTruncate = true,
  toolResultMaxChars = 12e3,
  beforeModelCall = null,
} = {}) => {
  const opts = normalizeChatOptions({ enableToolResultTruncate, toolResultMaxChars })
  const workMessages = normalizeAgentMessages(messages)
  let round = 0
  let lastUsage = null
  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    round += 1
    if (beforeModelCall) {
      const nextMessages = await beforeModelCall({ messages: workMessages, lastUsage, round })
      if (Array.isArray(nextMessages)) {
        workMessages.length = 0
        workMessages.push(...normalizeAgentMessages(nextMessages))
      }
    }
    const payload = { model, messages: workMessages, tools }
    const message = await callLlmStream(apiUrl, apiKey, payload, {
      provider,
      signal,
      onDelta: (delta) => {
        if (delta) send({ type: 'message', content: delta })
      },
    })
    const usage = message.usage || null
    if (usage) lastUsage = usage
    if (usage) send({ type: 'usage', usage })

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      const assistantMsg = {
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      }
      if (message.reasoning_content !== undefined) {
        assistantMsg.reasoning_content = message.reasoning_content ?? ''
      }
      workMessages.push(assistantMsg)
      send({ type: 'tool_calls', toolCalls: message.tool_calls })

      const toolMessages = await runTools(message.tool_calls, toolContext, {
        enableToolResultTruncate: opts.enableToolResultTruncate,
        toolResultMaxChars: opts.toolResultMaxChars,
      })
      for (const tm of toolMessages) {
        workMessages.push(tm)
      }
      send({ type: 'tool_results', results: toolMessages.map((message) => ({
        toolCallId: message.tool_call_id,
        content: message.content,
        message,
      })) })
      continue
    }

    const text = message.content ?? ''
    const replyMsg = { role: 'assistant', content: text }
    if (message.reasoning_content !== undefined) {
      replyMsg.reasoning_content = message.reasoning_content ?? ''
    }
    workMessages.push(replyMsg)
    send({ type: 'done' })
    return text
  }
}

export { chat }
