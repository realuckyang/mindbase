<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">服务器</h1>
          <p class="mt-1 text-sm text-nt-soft">在用的主机、Worker、VPS。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一台</button>
      </div>

      <div class="mt-6 flex gap-1 border-b border-nt-divider text-sm">
        <button v-for="t in tabs" :key="t.value" type="button"
          class="-mb-px border-b-2 px-3 py-2"
          :class="filter === t.value ? 'border-nt text-nt font-medium' : 'border-transparent text-nt-soft hover:text-nt'"
          @click="setFilter(t.value)">{{ t.label }}</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">这个分类还是空的。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="dotClass(it.status)"></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
              <span v-if="it.provider" class="rounded bg-nt-hover px-1.5 py-0.5 text-[10px] text-nt-soft">{{ it.provider }}</span>
              <span v-if="it.host" class="truncate text-xs text-nt-soft font-mono">{{ it.host }}</span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-nt-soft">
              <span v-if="it.expire_at" :class="expiringSoon(it.expire_at) ? 'text-nt-danger font-medium' : ''">到期 {{ it.expire_at }}</span>
              <span v-if="it.cost > 0">¥{{ (it.cost / 100).toFixed(2) }} / {{ cycleLabel(it.cost_cycle) }}</span>
            </div>
          </div>
          <span class="shrink-0 text-xs text-nt-soft">{{ statusLabel(it.status) }}</span>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑服务器' : '加一台' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="Cloudflare Worker - mindbase"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">服务商</span>
              <input v-model="form.provider" type="text" placeholder="Cloudflare / AWS"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">状态</span>
              <select v-model="form.status"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="active">在用</option>
                <option value="expired">到期</option>
                <option value="retired">退役</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">主机 / IP</span>
            <input v-model="form.host" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
          </label>
          <div class="flex gap-2">
            <label class="block w-24">
              <span class="text-xs text-nt-soft">SSH 端口</span>
              <input v-model.number="form.ssh_port" type="number"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">SSH 用户</span>
              <input v-model="form.ssh_user" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">SSH 私钥备注</span>
            <input v-model="form.ssh_key_note" type="text" placeholder="用哪把私钥"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">费用 (元)</span>
              <input v-model.number="form.costYuan" type="number" step="0.01"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">周期</span>
              <select v-model="form.cost_cycle"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
                <option value="one-time">一次性</option>
              </select>
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">到期</span>
              <input v-model="form.expire_at" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10" @click="onDelete">删除</button>
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
  list:   (qs = '')  => fetch(`/api/servers${qs}`).then(r => r.json()),
  create: (body)     => fetch('/api/servers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/servers/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/servers/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: '',        label: '全部' },
  { value: 'active',  label: '在用' },
  { value: 'expired', label: '到期' },
  { value: 'retired', label: '退役' },
]

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const filter  = ref('')

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({
  name: '', provider: '', host: '', ssh_port: 22, ssh_user: '', ssh_key_note: '',
  costYuan: 0, cost_cycle: 'monthly', expire_at: '', status: 'active', note: '',
})
const form = ref(blank())

const canSave = computed(() => form.value.name.trim().length > 0)

function statusLabel(s) { return { active: '在用', expired: '到期', retired: '退役' }[s] || s }
function cycleLabel(c)  { return { monthly: '月', yearly: '年', 'one-time': '一次' }[c] || c }
function dotClass(s) {
  if (s === 'active')  return 'bg-emerald-500'
  if (s === 'expired') return 'bg-nt-danger'
  if (s === 'retired') return 'bg-nt-divider'
  return 'bg-nt-divider'
}
function expiringSoon(d) {
  if (!d) return false
  const t = Date.parse(d)
  if (!Number.isFinite(t)) return false
  const days = (t - Date.now()) / 86400000
  return days < 30
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const qs = filter.value ? `?status=${encodeURIComponent(filter.value)}` : ''
    const resp = await api.list(qs)
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}
function setFilter(v) { filter.value = v; refresh() }

function openCreate() { editingId.value = ''; form.value = blank(); formOpen.value = true }
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name: it.name || '', provider: it.provider || '', host: it.host || '',
    ssh_port: it.ssh_port ?? 22, ssh_user: it.ssh_user || '', ssh_key_note: it.ssh_key_note || '',
    costYuan: (it.cost ?? 0) / 100, cost_cycle: it.cost_cycle || 'monthly',
    expire_at: it.expire_at || '', status: it.status || 'active', note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    name: form.value.name.trim(),
    provider: form.value.provider.trim(),
    host: form.value.host.trim(),
    ssh_port: Number(form.value.ssh_port) || 22,
    ssh_user: form.value.ssh_user.trim(),
    ssh_key_note: form.value.ssh_key_note.trim(),
    cost: Math.round((Number(form.value.costYuan) || 0) * 100),
    cost_cycle: form.value.cost_cycle,
    expire_at: form.value.expire_at || null,
    status: form.value.status,
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
  if (!window.confirm('删除这台?')) return
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
