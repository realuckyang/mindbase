<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">域名</h1>
          <p class="mt-1 text-sm text-nt-soft">持有的域名、注册商、到期日。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加域名</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有域名 —— 点右上角「加域名」记一个。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in items"
          :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :class="dotClass(it.status)"></span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-nt">{{ it.domain }}</div>
            <div v-if="it.registrar" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.registrar }}</div>
          </div>
          <span v-if="it.expire_date" class="shrink-0 text-xs tabular-nums"
            :class="isExpiring(it.expire_date) ? 'text-nt-danger font-medium' : 'text-nt-soft'">
            {{ it.expire_date }}
          </span>
          <span v-else class="shrink-0 text-xs text-nt-soft">—</span>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑域名' : '加域名' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">域名</span>
            <input v-model="form.domain" type="text" placeholder="woodchange.cn"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">注册商</span>
            <input v-model="form.registrar" type="text" placeholder="Cloudflare"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">到期日</span>
            <input v-model="form.expire_date" type="date"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">状态</span>
            <select v-model="form.status"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
              <option value="active">使用中</option>
              <option value="expiring">即将到期</option>
              <option value="expired">已过期</option>
              <option value="parked">闲置</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="2"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10"
            @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button"
              :disabled="busy || !form.domain.trim()"
              class="rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black disabled:opacity-50"
              @click="onSave">{{ busy ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const api = {
  list:   ()         => fetch('/api/domains').then(r => r.json()),
  create: (body)     => fetch('/api/domains', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/domains/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/domains/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ domain: '', registrar: '', expire_date: '', status: 'active', note: '' })

function dotClass(s) {
  if (s === 'active')   return 'bg-emerald-500'
  if (s === 'expiring') return 'bg-amber-400'
  if (s === 'expired')  return 'bg-nt-danger'
  if (s === 'parked')   return 'bg-nt-divider'
  return 'bg-nt-divider'
}

function isExpiring(date) {
  if (!date) return false
  const ms = new Date(date + 'T00:00:00').getTime() - Date.now()
  return ms < 30 * 24 * 60 * 60 * 1000
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    if (!resp.success) throw new Error(resp.message || '加载失败')
    items.value = resp.items || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = { domain: '', registrar: '', expire_date: '', status: 'active', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    domain: it.domain, registrar: it.registrar || '',
    expire_date: it.expire_date || '', status: it.status, note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    domain:      form.value.domain.trim(),
    registrar:   form.value.registrar,
    expire_date: form.value.expire_date || null,
    status:      form.value.status,
    note:        form.value.note,
  }
  busy.value = true
  try {
    const resp = editingId.value
      ? await api.update(editingId.value, body)
      : await api.create(body)
    if (!resp.success) throw new Error(resp.message || '保存失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e.message)
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!window.confirm('删除这个域名?')) return
  busy.value = true
  try {
    const resp = await api.remove(editingId.value)
    if (!resp.success) throw new Error(resp.message || '删除失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e.message)
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
