<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">API</h1>
          <p class="mt-1 text-sm text-nt-soft">各种服务的 API key。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一条</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有条目。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id" class="px-3 py-3 hover:bg-nt-hover">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1 cursor-pointer" @click="openEdit(it)">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate text-sm font-medium text-nt">{{ it.service }}</span>
                <span v-if="it.name" class="text-xs text-nt-soft">{{ it.name }}</span>
                <span v-if="it.scope" class="rounded bg-nt-hover px-1.5 py-0.5 text-[10px] text-nt-soft">{{ it.scope }}</span>
              </div>
              <div v-if="it.expire_at" class="mt-0.5 text-xs"
                :class="expiringSoon(it.expire_at) ? 'text-nt-danger font-medium' : 'text-nt-soft'">到期 {{ it.expire_at }}</div>
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
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑 key' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">服务</span>
            <input v-model="form.service" type="text" placeholder="Stripe / Pinecone"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">标签</span>
            <input v-model="form.name" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
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
            <span class="text-xs text-nt-soft">权限范围 / 环境</span>
            <input v-model="form.scope" type="text" placeholder="production read-only"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">到期</span>
            <input v-model="form.expire_at" type="date"
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
  list:   ()         => fetch('/api/apikeys').then(r => r.json()),
  create: (body)     => fetch('/api/apikeys', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/apikeys/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/apikeys/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const revealed = ref(new Set())
const copiedId = ref('')

const formOpen   = ref(false)
const formReveal = ref(false)
const editingId  = ref('')
const blank = () => ({ service: '', name: '', api_key: '', scope: '', expire_at: '', note: '' })
const form = ref(blank())

const canSave = computed(() => form.value.service.trim().length > 0)

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
function expiringSoon(d) {
  if (!d) return false
  const t = Date.parse(d)
  if (!Number.isFinite(t)) return false
  const days = (t - Date.now()) / 86400000
  return days < 30
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
    service: it.service || '', name: it.name || '', api_key: it.api_key || '',
    scope: it.scope || '', expire_at: it.expire_at || '', note: it.note || '',
  }
  formReveal.value = false
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    service: form.value.service.trim(),
    name: form.value.name.trim(),
    api_key: form.value.api_key,
    scope: form.value.scope.trim(),
    expire_at: form.value.expire_at || null,
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
