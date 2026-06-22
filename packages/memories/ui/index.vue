<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">回忆</h1>
          <p class="mt-1 text-sm text-nt-soft">记下哪一天在哪儿、天气、心情、发生的事。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 记一天</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有记录 —— 点右上角「记一天」开始。
      </div>

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="it in items"
          :key="it.id"
          class="flex cursor-pointer gap-4 rounded-md border border-nt-divider bg-white px-4 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div class="shrink-0 w-20 md:w-24">
            <div class="text-2xl md:text-3xl font-bold leading-none text-nt tabular-nums">{{ dayOf(it.date) }}</div>
            <div class="mt-1 text-xs text-nt-soft tabular-nums">{{ yearMonthOf(it.date) }}</div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span v-if="it.location" class="rounded-full bg-nt-hover px-2 py-0.5 text-xs text-nt">{{ it.location }}</span>
              <span v-if="it.weather"  class="rounded-full bg-nt-hover px-2 py-0.5 text-xs text-nt">{{ it.weather }}</span>
              <span v-if="it.mood"     class="rounded-full bg-nt-hover px-2 py-0.5 text-xs text-nt">{{ it.mood }}</span>
            </div>
            <div v-if="it.note" class="mt-2 whitespace-pre-wrap text-sm text-nt">{{ it.note }}</div>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑这一天' : '记一天' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">日期</span>
            <input v-model="form.date" type="date"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">地点</span>
            <input v-model="form.location" type="text" placeholder="上海 / 家"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">天气</span>
            <input v-model="form.weather" type="text" placeholder="晴 28°C"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">心情</span>
            <input v-model="form.mood" type="text" placeholder="平静"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">这一天</span>
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
              :disabled="busy || !form.date"
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
  list:   ()         => fetch('/api/memories').then(r => r.json()),
  create: (body)     => fetch('/api/memories', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/memories/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/memories/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ date: '', location: '', weather: '', mood: '', note: '' })

function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function dayOf(s)       { return s ? s.slice(8, 10) : '' }
function yearMonthOf(s) { return s ? s.slice(0, 7) : '' }

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
  form.value = { date: today(), location: '', weather: '', mood: '', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    date: it.date, location: it.location || '',
    weather: it.weather || '', mood: it.mood || '', note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    date:     form.value.date,
    location: form.value.location,
    weather:  form.value.weather,
    mood:     form.value.mood,
    note:     form.value.note,
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
  if (!window.confirm('删除这一天?')) return
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
