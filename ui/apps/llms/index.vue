<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">大模型</h1>
          <p class="mt-1 text-sm text-nt-soft">在用的大模型 API 配置。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一个</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有配置。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id" class="px-3 py-3 hover:bg-nt-hover">
          <div class="flex items-start gap-3">
            <!-- 厂商 icon -->
            <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-nt-divider bg-white">
              <img
                v-if="providerIcon(it.provider)"
                :src="providerIcon(it.provider)"
                :alt="it.provider"
                class="h-5 w-5 object-contain"
                referrerpolicy="no-referrer"
                @error="onIconError"
              />
              <span v-else class="text-xs font-semibold text-nt-soft">{{ providerInitial(it.provider, it.name) }}</span>
            </div>

            <div class="min-w-0 flex-1 cursor-pointer" @click="openEdit(it)">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
                <span v-if="it.provider" class="rounded bg-nt-hover px-1.5 py-0.5 text-[10px] text-nt-soft">{{ it.provider }}</span>
                <span v-if="it.default_model" class="text-xs text-nt-soft font-mono">{{ it.default_model }}</span>
              </div>
              <div v-if="it.quota_note" class="mt-0.5 truncate text-xs text-nt-muted">{{ it.quota_note }}</div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <template v-if="revealed.has(it.id)">
                <code class="max-w-[200px] truncate rounded bg-nt-hover px-1.5 py-0.5 font-mono text-xs text-nt">{{ it.api_key || '—' }}</code>
                <button type="button" class="rounded px-1.5 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt" @click="toggleReveal(it.id)">隐藏</button>
                <button type="button" class="rounded px-1.5 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt" @click="copyKey(it)">{{ copiedId === it.id ? '已复制' : '复制' }}</button>
              </template>
              <template v-else>
                <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt" @click="toggleReveal(it.id)">显示 key</button>
              </template>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑大模型' : '加一个' }}</h2>
        <div class="mt-4 space-y-3">
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">标签</span>
              <input v-model="form.name" type="text" placeholder="Anthropic primary"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">服务商</span>
              <input v-model="form.provider" type="text" placeholder="OpenAI / Anthropic"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">API key</span>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="form.api_key" :type="formReveal ? 'text' : 'password'"
                class="flex-1 rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
              <button type="button" class="rounded px-2 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
                @click="formReveal = !formReveal">{{ formReveal ? '隐藏' : '显示' }}</button>
            </div>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">Base URL</span>
            <input v-model="form.base_url" type="text" placeholder="https://api.anthropic.com"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">默认模型</span>
            <input v-model="form.default_model" type="text" placeholder="claude-opus-4"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">额度备注</span>
            <input v-model="form.quota_note" type="text" placeholder="100 USD/month"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="2"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button" class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10" @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button" :disabled="busy || !canSave"
              class="rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black disabled:opacity-50"
              @click="onSave">{{ busy ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const api = {
  list:   ()         => fetch('/api/llms').then(r => r.json()),
  create: (body)     => fetch('/api/llms', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/llms/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/llms/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const revealed = ref(new Set())
const copiedId = ref('')

// provider 别名 → 官网域名(用 Google s2 favicon 自动取 logo)
const PROVIDER_DOMAIN = {
  openai:    'openai.com',
  anthropic: 'anthropic.com',
  deepseek:  'deepseek.com',
  moonshot:  'moonshot.cn',
  kimi:      'moonshot.cn',
  google:    'google.com',
  gemini:    'google.com',
  xai:       'x.ai',
  grok:      'x.ai',
  aliyun:    'aliyun.com',
  qwen:      'aliyun.com',
  ollama:    'ollama.com',
  meta:      'meta.com',
  llama:     'meta.com',
  zhipu:     'zhipuai.cn',
  glm:       'zhipuai.cn',
  doubao:    'doubao.com',
  bytedance: 'bytedance.com',
  mistral:   'mistral.ai',
  perplexity:'perplexity.ai',
  cohere:    'cohere.com',
}

const failedIcons = ref(new Set())
function providerIcon(provider) {
  if (!provider) return null
  const key = String(provider).toLowerCase().trim()
  const domain = PROVIDER_DOMAIN[key]
  if (!domain) return null
  if (failedIcons.value.has(domain)) return null
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
}
function providerInitial(provider, name) {
  const s = (provider || name || '?').trim()
  return s.charAt(0).toUpperCase()
}
function onIconError(e) {
  const url = e?.target?.src || ''
  const m = url.match(/domain=([^&]+)/)
  if (m) {
    const s = new Set(failedIcons.value)
    s.add(m[1])
    failedIcons.value = s
  }
}

const formOpen   = ref(false)
const formReveal = ref(false)
const editingId  = ref('')
const blank = () => ({ provider: '', name: '', api_key: '', base_url: '', default_model: '', quota_note: '', note: '' })
const form = ref(blank())

const canSave = computed(() => form.value.name.trim().length > 0)

function toggleReveal(id) {
  const s = new Set(revealed.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  revealed.value = s
}
async function copyKey(it) {
  try {
    await navigator.clipboard.writeText(it.api_key || '')
    copiedId.value = it.id
    setTimeout(() => { if (copiedId.value === it.id) copiedId.value = '' }, 1500)
  } catch { alert('复制失败') }
}

async function refresh() {
  loading.value = true; error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() { editingId.value = ''; form.value = blank(); formReveal.value = false; formOpen.value = true }
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    provider: it.provider || '', name: it.name || '', api_key: it.api_key || '',
    base_url: it.base_url || '', default_model: it.default_model || '',
    quota_note: it.quota_note || '', note: it.note || '',
  }
  formReveal.value = false
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    provider: form.value.provider.trim(),
    name: form.value.name.trim(),
    api_key: form.value.api_key,
    base_url: form.value.base_url.trim(),
    default_model: form.value.default_model.trim(),
    quota_note: form.value.quota_note.trim(),
    note: form.value.note.trim(),
  }
  busy.value = true
  try {
    const resp = editingId.value ? await api.update(editingId.value, body) : await api.create(body)
    if (!resp?.success) throw new Error(resp?.message || '保存失败')
    closeForm(); await refresh()
  } catch (e) { alert(e?.message || '保存失败') }
  finally { busy.value = false }
}

async function onDelete() {
  if (!window.confirm('删除这条?')) return
  busy.value = true
  try {
    const resp = await api.remove(editingId.value)
    if (!resp?.success) throw new Error(resp?.message || '删除失败')
    closeForm(); await refresh()
  } catch (e) { alert(e?.message || '删除失败') }
  finally { busy.value = false }
}

onMounted(refresh)
</script>
