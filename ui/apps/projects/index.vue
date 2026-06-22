<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">项目</h1>
          <p class="mt-1 text-sm text-nt-soft">在做的、搁置的、收尾的。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 新项目</button>
      </div>

      <div class="mt-6 flex gap-1 border-b border-nt-divider text-sm">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          class="-mb-px border-b-2 px-3 py-2"
          :class="filter === t.value
            ? 'border-nt text-nt font-medium'
            : 'border-transparent text-nt-soft hover:text-nt'"
          @click="filter = t.value"
        >{{ t.label }}</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!filteredItems.length" class="mt-10 text-center text-sm text-nt-soft">
        这里还空着 —— 点右上角「新项目」加一个。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in filteredItems"
          :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :class="dotClass(it.status)"></span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-nt">{{ it.title }}</div>
            <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.note }}</div>
          </div>
          <span class="shrink-0 text-xs text-nt-soft">{{ statusLabel(it.status) }}</span>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑项目' : '新项目' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text" placeholder="写博客"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">状态</span>
            <select v-model="form.status"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
              <option value="active">进行中</option>
              <option value="paused">暂停</option>
              <option value="done">完成</option>
              <option value="abandoned">放弃</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="4"
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
              :disabled="busy || !form.title.trim()"
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
  list:   ()         => fetch('/api/projects').then(r => r.json()),
  create: (body)     => fetch('/api/projects', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/projects/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/projects/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: 'all',       label: '全部' },
  { value: 'active',    label: '进行中' },
  { value: 'paused',    label: '暂停' },
  { value: 'done',      label: '完成' },
  { value: 'abandoned', label: '放弃' },
]

const filter  = ref('all')
const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ title: '', status: 'active', note: '' })

const filteredItems = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter(x => x.status === filter.value)
)

function statusLabel(s) { return { active: '进行中', paused: '暂停', done: '完成', abandoned: '放弃' }[s] || s }
function dotClass(s) {
  if (s === 'active')    return 'bg-emerald-500'
  if (s === 'paused')    return 'bg-amber-400'
  if (s === 'done')      return 'bg-nt-accent'
  if (s === 'abandoned') return 'bg-nt-divider'
  return 'bg-nt-divider'
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
  form.value = { title: '', status: 'active', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = { title: it.title, status: it.status, note: it.note || '' }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    title:  form.value.title.trim(),
    status: form.value.status,
    note:   form.value.note,
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
  if (!window.confirm('删除这个项目?')) return
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
