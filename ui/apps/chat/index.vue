<template>
  <!-- 整页固定为 视口 - 顶栏(44px) 的高度,内部 flex-col,中间 flex-1 滚动 -->
  <div class="flex flex-col h-[calc(100dvh-44px)]">
    <!-- 未配置提示 -->
    <div
      v-if="!aiReady && !checkingSettings"
      class="mx-4 mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:mx-8"
    >
      助理还没接好大模型。请到
      <router-link :to="{ name: 'settings' }" class="font-medium underline">设置</router-link>
      里填上 Base URL / API Key / Model。
    </div>

    <!-- 消息列表 -->
    <div
      ref="scrollEl"
      class="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-6"
      @scroll.passive="onScroll"
    >
      <div class="mx-auto max-w-3xl space-y-4">
        <!-- 顶部 sentinel:上滑触发加载更早 -->
        <div ref="topSentinelEl" class="py-2 text-center text-xs text-nt-soft">
          <span v-if="loadingOlder">加载更早…</span>
          <span v-else-if="!hasMoreHistory && turns.length">— 已经是最早 —</span>
        </div>

        <div v-if="loadingHistory && !turns.length" class="py-12 text-center text-sm text-nt-soft">加载中…</div>

        <div v-else-if="!turns.length && !streaming" class="py-12 text-center">
          <div class="text-4xl mb-2">💬</div>
          <div class="text-sm text-nt-soft mb-4">有什么想问的?</div>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="s in suggestions"
              :key="s"
              type="button"
              class="rounded-full border border-nt-divider px-3 py-1 text-xs text-nt-muted hover:bg-nt-hover"
              @click="ask(s)"
            >{{ s }}</button>
          </div>
        </div>

        <template v-for="(item, i) in turns" :key="i">
          <!-- 用户气泡 -->
          <div v-if="item.kind === 'user'" class="flex justify-end">
            <div class="max-w-[85%] rounded-2xl rounded-br-sm bg-nt px-3.5 py-2.5 text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words">{{ item.content }}</div>
          </div>

          <div v-else-if="item.kind === 'compaction'" class="flex justify-start">
            <details class="max-w-[90%] flex-1 rounded-md border border-nt-divider bg-nt-hover/50 overflow-hidden">
              <summary class="cursor-pointer px-3 py-2 text-xs text-nt-muted">上下文压缩</summary>
              <pre class="border-t border-nt-divider bg-white px-3 py-2 text-[12px] leading-relaxed text-nt whitespace-pre-wrap break-words">{{ item.content }}</pre>
            </details>
          </div>

          <!-- 工具调用块 -->
          <div v-else-if="item.kind === 'tool'" class="flex justify-start">
            <details class="max-w-[90%] flex-1 rounded-md border border-nt-divider bg-nt-hover/50 overflow-hidden" :open="item.open ?? false">
              <summary class="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-nt-muted hover:bg-nt-hover">
                <span class="min-w-0 font-medium text-nt truncate">{{ item.reason || '查询' }}</span>
                <span v-if="item.status === 'running'" class="ml-auto shrink-0 inline-flex items-center gap-1 text-nt-soft">
                  <svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  执行中
                </span>
                <span v-else-if="item.status === 'error'" class="ml-auto shrink-0 text-nt-danger">失败</span>
                <span v-else class="ml-auto shrink-0 text-nt-soft">完成</span>
              </summary>
              <div class="border-t border-nt-divider bg-white px-3 py-2 space-y-2">
                <div v-if="item.args">
                  <div class="text-[11px] text-nt-soft mb-1">参数</div>
                  <pre class="overflow-x-auto rounded bg-nt-hover px-2 py-1.5 font-mono text-[12px] leading-relaxed text-nt whitespace-pre-wrap break-words">{{ item.args }}</pre>
                </div>
                <div v-if="item.result !== undefined">
                  <div class="text-[11px] text-nt-soft mb-1">结果</div>
                  <pre class="overflow-x-auto rounded bg-nt-hover px-2 py-1.5 font-mono text-[12px] leading-relaxed text-nt whitespace-pre-wrap break-words">{{ item.result }}</pre>
                </div>
              </div>
            </details>
          </div>

          <!-- 助手气泡(markdown 渲染) -->
          <div v-else-if="item.kind === 'assistant'" class="flex justify-start">
            <div class="md max-w-[85%] rounded-2xl rounded-bl-sm bg-nt-hover px-3.5 py-2.5 text-[15px] leading-relaxed text-nt break-words">
              <div v-html="renderMd(item.content)"></div><span v-if="item.streaming" class="ml-0.5 inline-block h-4 w-1.5 align-middle bg-nt-soft animate-pulse"></span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="shrink-0 border-t border-nt-divider bg-white px-3 py-3 md:px-8">
      <div class="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref="inputEl"
          v-model="draft"
          rows="1"
          :placeholder="aiReady ? '问点什么…  (Enter 发送,Shift+Enter 换行)' : '先去设置里配置大模型'"
          :disabled="!aiReady || streaming"
          class="max-h-32 flex-1 resize-none rounded-2xl bg-nt-hover px-3 py-2.5 text-[15px] text-nt outline-none placeholder:text-nt-hint disabled:opacity-60"
          @keydown="onKeydown"
          @input="autosize"
        ></textarea>
        <button
          type="button"
          :disabled="!aiReady || streaming || !draft.trim()"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nt text-white transition active:scale-95 disabled:bg-nt-hover-strong disabled:text-nt-soft"
          @click="ask()"
        >
          <svg v-if="!streaming" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          <svg v-else class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import { api } from '@/api'

marked.setOptions({ breaks: true, gfm: true })
const renderMd = (text) => marked.parse(String(text || ''))

const suggestions = [
  '上个月在外卖上花了多少?',
  '还有几件待办没完成?',
  '把今天的想法整理成一篇笔记。',
]

// turns 是面向 UI 的渲染数组(扁平):
// { kind: 'user', content }
// { kind: 'assistant', content, streaming? }
// { kind: 'tool', id, name, args, reason, result, status: 'running'|'done'|'error', open }
const turns = ref([])
const toolMap = new Map() // tool_call_id → turn object 引用(prepend 时引用不变)

const draft     = ref('')
const streaming = ref(false)
const loadingHistory = ref(true)

const checkingSettings = ref(true)
const aiReady = ref(false)

const scrollEl      = ref(null)
const topSentinelEl = ref(null)
const inputEl       = ref(null)

// 回车发送;Shift+Enter 换行;中文输入法上屏时(isComposing / keyCode 229)放行,不触发发送
function onKeydown(e) {
  if (e.key !== 'Enter') return
  if (e.shiftKey) return
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  ask()
}

function autosize(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

// 智能跟随:
// scrollSignature(条数 + 末条内容长度)变化 → 下一帧把 scrollTop 推到底。
// scrollTop = scrollHeight 强制一次同步 layout,把 Vue 渲染队列冲掉,
// 否则 token 流密集时浏览器会合并多帧 paint,表现成"几个字一卡"。
// stick:用户上滑离开底部就翻 false,接近底部再回 true。
const SCROLL_THRESHOLD = 80
const stick = ref(true)
let topObserver = null

const lastTurnLen = () => {
  const t = turns.value[turns.value.length - 1]
  if (!t) return 0
  return String((t.kind === 'tool' ? t.result : t.content) || '').length
}
const scrollSignature = computed(() => `${turns.value.length}:${lastTurnLen()}`)

const isNearBottom = () => {
  const el = scrollEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
}
const scrollToBottom = () => {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}
const onScroll = () => { stick.value = isNearBottom() }

watch(scrollSignature, () => {
  if (stick.value) nextTick(scrollToBottom)
})

async function checkAi() {
  checkingSettings.value = true
  try {
    const { settings } = await api.get('/api/settings')
    aiReady.value = !!(settings.ai_base_url && settings.ai_model && settings.ai_api_key)
  } catch {
    aiReady.value = false
  } finally {
    checkingSettings.value = false
  }
}

// 从历史 messages 表回放;dest 用于决定推到 turns 末尾还是临时数组(prepend 时)
function pushFromMessage(msg, dest) {
  const out = dest || turns.value
  if (!msg || !msg.role) return
  if (msg.role === 'user') {
    out.push({ kind: msg._meta?.kind === 'compaction' ? 'compaction' : 'user', content: String(msg.content || '') })
  } else if (msg.role === 'assistant') {
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      if (msg.content) out.push({ kind: 'assistant', content: String(msg.content) })
      for (const tc of msg.tool_calls) {
        let argsObj = {}
        try { argsObj = JSON.parse(tc.function?.arguments || '{}') } catch {}
        const turn = reactive({
          kind: 'tool',
          id: tc.id,
          name: tc.function?.name || 'tool',
          args: formatArgs(argsObj),
          reason: argsObj.reason || '',
          result: undefined,
          status: 'done',
          open: false,
        })
        out.push(turn)
        toolMap.set(tc.id, turn)
      }
    } else {
      out.push({ kind: 'assistant', content: String(msg.content || '') })
    }
  } else if (msg.role === 'tool') {
    const turn = toolMap.get(msg.tool_call_id)
    if (turn) {
      turn.result = msg.content
      turn.status = 'done'
    }
  }
}

function formatArgs(obj) {
  // sql_query 的话直接显示 sql,其它工具显示 JSON
  if (obj?.sql) return String(obj.sql)
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}

// 分页加载历史:初次拿最新 30 条;上滑触发更早 30 条
const PAGE_SIZE = 30
const oldestId       = ref(0)
const hasMoreHistory = ref(true)
const loadingOlder   = ref(false)

async function loadInitial() {
  loadingHistory.value = true
  try {
    const { messages: rows } = await api.get(`/api/chat/messages?limit=${PAGE_SIZE}`)
    if (rows.length) {
      oldestId.value = rows[0].id
      for (const r of rows) pushFromMessage({ ...r.message, _meta: r.meta })
    }
    if (rows.length < PAGE_SIZE) hasMoreHistory.value = false
    stick.value = true
    await nextTick()
    scrollToBottom()
  } catch {} finally {
    loadingHistory.value = false
  }
}

async function loadOlder() {
  if (loadingOlder.value || !hasMoreHistory.value || !oldestId.value) return
  loadingOlder.value = true
  const el = scrollEl.value
  const prevHeight = el?.scrollHeight || 0
  const prevTop    = el?.scrollTop || 0
  try {
    const { messages: rows } = await api.get(`/api/chat/messages?before=${oldestId.value}&limit=${PAGE_SIZE}`)
    if (rows.length) {
      oldestId.value = rows[0].id
      const prepend = []
      for (const r of rows) pushFromMessage({ ...r.message, _meta: r.meta }, prepend)
      turns.value = [...prepend, ...turns.value]
    }
    if (rows.length < PAGE_SIZE) hasMoreHistory.value = false
    // 上方 prepend 时保持可视位置:scrollTop += (新高 - 旧高)。
    // 此时用户在顶部,stick 已经是 false,watch 不会自动滚到底。
    await nextTick()
    if (el) el.scrollTop = prevTop + (el.scrollHeight - prevHeight)
  } catch {} finally {
    loadingOlder.value = false
  }
}

async function ask(preset) {
  const content = (preset ?? draft.value).trim()
  if (!content || streaming.value || !aiReady.value) return

  draft.value = ''
  if (inputEl.value) inputEl.value.style.height = 'auto'

  // 当前正在 streaming 的 assistant bubble(如果存在)
  let currentAssistant = null
  const ensureAssistant = () => {
    if (currentAssistant && turns.value.includes(currentAssistant)) return currentAssistant
    currentAssistant = reactive({ kind: 'assistant', content: '', streaming: true })
    turns.value.push(currentAssistant)
    return currentAssistant
  }

  streaming.value = true
  stick.value = true

  try {
    const resp = await fetch('/api/chat/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!resp.ok || !resp.body) {
      let msg = `http_${resp.status}`
      try { const j = await resp.json(); if (j?.message) msg = j.message } catch {}
      const a = ensureAssistant()
      a.content = `[错误] ${msg}`
      a.streaming = false
      streaming.value = false
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          let evt
          try { evt = JSON.parse(payload) } catch { continue }

          if (evt.type === 'message' && typeof evt.content === 'string') {
            const a = ensureAssistant()
            a.content += evt.content
          } else if (evt.type === 'input' && evt.message?.role === 'user') {
            turns.value.push({ kind: evt.kind === 'compaction' ? 'compaction' : 'user', content: String(evt.message.content || '') })
          } else if (evt.type === 'tool_calls' && Array.isArray(evt.toolCalls)) {
            // 收到这条意味着该 assistant 文本段结束(模型转去调工具),
            // 给所有 tool_calls 创建占位卡片
            if (currentAssistant) currentAssistant.streaming = false
            currentAssistant = null
            for (const tc of evt.toolCalls) {
              let argsObj = {}
              try { argsObj = JSON.parse(tc.function?.arguments || '{}') } catch {}
              const turn = reactive({
                kind: 'tool',
                id: tc.id,
                name: tc.function?.name || 'tool',
                args: formatArgs(argsObj),
                reason: argsObj.reason || '',
                result: undefined,
                status: 'running',
                open: false,
              })
              turns.value.push(turn)
              toolMap.set(tc.id, turn)
            }
          } else if (evt.type === 'tool_results' && Array.isArray(evt.results)) {
            for (const result of evt.results) {
              const toolCallId = result.toolCallId || result.id || result.message?.tool_call_id
              const content = result.content ?? result.message?.content ?? ''
              const turn = toolMap.get(toolCallId)
              if (turn) {
                turn.result = content
                const isError = /^tool error:|^\[?error\]?:/i.test(String(content || '').trim())
                turn.status = isError ? 'error' : 'done'
              }
            }
          } else if (evt.type === 'done') {
            if (currentAssistant) currentAssistant.streaming = false
          } else if (evt.type === 'error') {
            const a = ensureAssistant()
            a.content += `\n[错误] ${evt.message}`
            a.streaming = false
          }
        }
      }
    }
  } catch (e) {
    const a = ensureAssistant()
    a.content += `\n[网络错误] ${e?.message || ''}`
  } finally {
    if (currentAssistant) currentAssistant.streaming = false
    streaming.value = false
  }
}

onMounted(async () => {
  await checkAi()
  await loadInitial()
  // 注意先加载完初始内容、scroll 到底之后,再装顶部 sentinel 观察器,
  // 避免初次渲染时 sentinel 就在视口里立刻触发分页
  await nextTick()
  if (topSentinelEl.value && typeof IntersectionObserver !== 'undefined') {
    topObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadOlder()
    }, { root: scrollEl.value, rootMargin: '120px 0px 0px 0px' })
    topObserver.observe(topSentinelEl.value)
  }
})

onUnmounted(() => {
  topObserver?.disconnect(); topObserver = null
})
</script>
