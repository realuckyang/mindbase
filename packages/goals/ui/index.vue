<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">目标</h1>
          <p class="mt-1 text-sm text-nt-soft">你想做的事,打卡推进。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 立一个</button>
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

      <ul v-else class="mt-6 space-y-2">
        <li v-for="it in items" :key="it.id"
          class="flex cursor-pointer items-center gap-3 rounded-md border border-nt-divider bg-white px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-medium text-nt">{{ it.title }}</span>
              <span class="text-xs text-nt-soft">{{ statusLabel(it.status) }}</span>
            </div>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-nt-hover">
              <div class="h-full rounded-full transition-all"
                :class="it.status === 'done' ? 'bg-emerald-500' : 'bg-nt'"
                :style="{ width: progressPct(it) + '%' }"></div>
            </div>
            <div class="mt-1 text-xs text-nt-soft">{{ it.progress }} / {{ it.target }} {{ it.unit }}</div>
            <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-muted">{{ it.note }}</div>
          </div>
          <button v-if="it.status === 'active'" type="button"
            class="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-nt text-sm font-semibold text-white hover:bg-nt-strong disabled:opacity-50"
            :disabled="bumpingId === it.id"
            @click.stop="onBump(it)">+1</button>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑目标' : '立一个' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text" placeholder="今年读 12 本书"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">目标</span>
              <input v-model.number="form.target" type="number" min="0"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">已完成</span>
              <input v-model.number="form.progress" type="number" min="0"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">单位</span>
              <input v-model="form.unit" type="text" placeholder="本 / 次"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">状态</span>
            <select v-model="form.status"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
              <option value="active">进行中</option>
              <option value="done">完成</option>
              <option value="gave_up">放弃</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
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
  list:   (qs = '')  => fetch(`/api/goals${qs}`).then(r => r.json()),
  create: (body)     => fetch('/api/goals', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/goals/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/goals/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: '',        label: '全部' },
  { value: 'active',  label: '进行中' },
  { value: 'done',    label: '完成' },
  { value: 'gave_up', label: '放弃' },
]

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const filter  = ref('')
const bumpingId = ref('')

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ title: '', target: 0, progress: 0, unit: '', status: 'active', note: '' })
const form = ref(blank())

const canSave = computed(() => form.value.title.trim().length > 0)

function statusLabel(s) { return { active: '进行中', done: '完成', gave_up: '放弃' }[s] || s }
function progressPct(it) {
  if (!it.target || it.target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((it.progress / it.target) * 100)))
}

async function refresh() {
  loading.value = true; error.value = ''
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
    title: it.title || '',
    target: it.target ?? 0, progress: it.progress ?? 0,
    unit: it.unit || '', status: it.status || 'active',
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onBump(it) {
  if (bumpingId.value) return
  bumpingId.value = it.id
  try {
    const resp = await api.update(it.id, { progress: (it.progress ?? 0) + 1 })
    if (!resp?.success) throw new Error(resp?.message || '打卡失败')
    const updated = resp.item
    const idx = items.value.findIndex(x => x.id === it.id)
    if (idx !== -1 && updated) items.value[idx] = updated
  } catch (e) { alert(e?.message || '打卡失败') }
  finally { bumpingId.value = '' }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    title: form.value.title.trim(),
    target: Number(form.value.target) || 0,
    progress: Number(form.value.progress) || 0,
    unit: form.value.unit.trim(),
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
  if (!window.confirm('删除这个目标?')) return
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
