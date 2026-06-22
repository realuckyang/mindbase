<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <header class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">协作</h1>
          <p class="mt-2 text-sm text-nt-soft">授权外部 AI 接入这台 MindBase,共享同一份事实。</p>
        </div>

        <div v-if="!loading" class="shrink-0 pt-2">
          <button
            v-if="!current"
            type="button"
            :disabled="busy"
            class="rounded-md bg-nt px-4 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
            @click="onEnable"
          >{{ busy ? '开启中…' : '开启协作' }}</button>
          <button
            v-else
            type="button"
            :disabled="busy"
            class="rounded-md border border-nt-divider px-3 py-1.5 text-xs text-nt-muted hover:bg-nt-danger-bg hover:text-nt-danger disabled:opacity-50"
            @click="onDisable"
          >{{ busy ? '关闭中…' : '关闭协作' }}</button>
        </div>
      </header>

      <section class="mt-6">
        <div v-if="loading" class="py-6 text-sm text-nt-soft">加载中…</div>

        <p v-else-if="!current" class="text-sm leading-relaxed text-nt-muted">
          开启协作后会生成一把访问凭证,用于授权外部 AI 读写本实例的数据。关闭后凭证立即作废;重新开启会生成新凭证,旧凭证同时失效。
        </p>

        <template v-else>
          <div class="rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
            <div class="flex items-start gap-1.5 font-medium">
              <span>⚠️</span>
              <span>提示</span>
            </div>
            <p class="mt-1.5 text-amber-900/85">
              下方三种接入方式都含访问凭证。请妥善保管,只授权信任的 AI 与工具。
            </p>
          </div>

          <!-- Tabs -->
          <div class="mt-5 flex gap-1 border-b border-nt-divider">
            <button
              v-for="t in tabs"
              :key="t.key"
              type="button"
              class="px-4 py-2 text-sm border-b-2 -mb-px transition-colors"
              :class="tab === t.key
                ? 'border-nt text-nt font-medium'
                : 'border-transparent text-nt-soft hover:text-nt'"
              @click="tab = t.key"
            >{{ t.label }}</button>
          </div>

          <!-- 指令 -->
          <section v-if="tab === 'message'" class="mt-4">
            <p class="text-xs leading-relaxed text-nt-muted">
              一段可直接粘贴的消息,内含 OpenAPI schema 链接与访问凭证。发给任意能联网的 AI,即可让它在对话中读写本实例。
            </p>
            <pre class="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-nt-hover p-3 font-mono text-xs leading-relaxed text-nt">{{ aiMessage }}</pre>
            <button
              type="button"
              class="mt-3 rounded-md bg-nt px-4 py-2 text-sm text-white hover:bg-black"
              @click="copy(aiMessage, 'message')"
            >{{ copied.message ? '✓ 已复制' : '复制' }}</button>
          </section>

          <!-- 技能 -->
          <section v-else-if="tab === 'skill'" class="mt-4">
            <p class="text-xs leading-relaxed text-nt-muted">
              一份遵循
              <a href="https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills" target="_blank" rel="noopener" class="underline hover:text-nt">Anthropic Skills 格式</a>
              的技能包。装进 AI 运行时一次,这个 AI 在所有后续对话中都掌握 MindBase 的用法,无需重复粘贴消息。
            </p>

            <div class="mt-3 rounded-md bg-nt-hover/60 px-3 py-2.5 text-xs leading-relaxed text-nt-muted">
              <div class="font-medium text-nt">安装位置</div>
              <ul class="mt-1 space-y-0.5">
                <li>· Claude Code:<code class="ml-1 rounded bg-white px-1 py-0.5 font-mono text-[11px]">~/.claude/skills/mindbase/</code></li>
                <li>· 其它支持 Skills 的运行时(Claude Desktop / Cursor 扩展 / Cline / 自建 agent 框架等):把整个 <code class="mx-0.5 rounded bg-white px-1 py-0.5 font-mono text-[11px]">mindbase/</code> 目录放进它的 skills 路径</li>
              </ul>
            </div>

            <a
              href="https://github.com/realuckyang/mindbase/raw/main/mindbase.zip"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 inline-flex items-center gap-2 rounded-md bg-nt px-4 py-2 text-sm text-white hover:bg-black"
            >⬇ 下载 mindbase.zip</a>

            <p class="mt-3 text-[11px] leading-relaxed text-nt-soft">
              技能包本身不含凭证,装好后在 AI 中配置上方"指令"页里的 token 与 Base URL 即可生效。
            </p>
          </section>

          <!-- MCP -->
          <section v-else-if="tab === 'mcp'" class="mt-4">
            <p class="text-xs leading-relaxed text-nt-muted">
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener" class="underline hover:text-nt">Model Context Protocol</a>
              的 HTTP / JSON-RPC 端点。把下方 URL 与 Bearer token 配进任意 MCP 客户端
              (Claude.ai Custom Connector / Cursor / Cline 等),AI 即可调用
              <code class="rounded bg-nt-hover px-1 py-0.5 font-mono">sql_query</code> 与
              <code class="rounded bg-nt-hover px-1 py-0.5 font-mono">apps_list</code> 两把工具读写本实例的数据。
            </p>

            <div class="mt-3 flex items-center gap-2">
              <pre class="flex-1 overflow-x-auto rounded-md bg-nt-hover p-2.5 font-mono text-xs leading-relaxed text-nt">{{ mcpUrl }}</pre>
              <button
                type="button"
                class="shrink-0 rounded-md border border-nt-divider px-3 py-2 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                @click="copy(mcpUrl, 'mcp')"
              >{{ copied.mcp ? '✓ 已复制' : '复制' }}</button>
            </div>

            <div class="mt-3 flex items-center gap-2">
              <pre class="flex-1 overflow-x-auto rounded-md bg-nt-hover p-2.5 font-mono text-xs leading-relaxed text-nt">Authorization: Bearer {{ current.token }}</pre>
              <button
                type="button"
                class="shrink-0 rounded-md border border-nt-divider px-3 py-2 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                @click="copy(`Bearer ${current.token}`, 'token')"
              >{{ copied.token ? '✓ 已复制' : '复制' }}</button>
            </div>

            <p class="mt-3 text-[11px] leading-relaxed text-nt-soft">
              工具集会随实例装的应用自动扩展。
            </p>
          </section>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { api } from '@/api'

const loading = ref(true)
const busy    = ref(false)
const current = ref(null)
const copied  = reactive({ message: false, mcp: false, token: false })

const tabs = [
  { key: 'message', label: '指令' },
  { key: 'skill',   label: '技能' },
  { key: 'mcp',     label: 'MCP' },
]
const tab = ref('message')

const schemaUrl = computed(() => `${window.location.origin}/api/ai/openapi.json`)
const mcpUrl    = computed(() => `${window.location.origin}/api/mcp`)
const aiMessage = computed(() => current.value
  ? `下面是我的 MindBase 接入信息,请用它作为长期记忆,在我们后续对话中读写我的数据。

Schema: ${schemaUrl.value}
Authorization: Bearer ${current.value.token}

请先 fetch 上述 schema 了解可用接口,再按需调用。`
  : ''
)

async function load() {
  loading.value = true
  try {
    const { tokens } = await api.get('/api/collab/tokens')
    current.value = tokens[0] || null
  } catch {} finally {
    loading.value = false
  }
}

async function onEnable() {
  busy.value = true
  try {
    const { token } = await api.post('/api/collab/tokens', { name: 'AI' })
    current.value = token
  } catch (e) { alert(e?.message || '开启失败') }
  finally { busy.value = false }
}

async function onDisable() {
  if (!current.value) return
  if (!window.confirm('关闭协作?当前 token 立即失效。')) return
  busy.value = true
  try {
    await api.delete(`/api/collab/tokens/${current.value.id}`)
    current.value = null
  } catch (e) { alert(e?.message || '关闭失败') }
  finally { busy.value = false }
}

async function copy(text, key) {
  try {
    await navigator.clipboard.writeText(text)
    copied[key] = true
    setTimeout(() => { copied[key] = false }, 1500)
  } catch {}
}

onMounted(load)
</script>
