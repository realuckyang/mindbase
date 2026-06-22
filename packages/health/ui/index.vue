<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">健康</h1>
          <p class="mt-1 text-sm text-nt-soft">每天的身体状态。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 今日打卡</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有记录 —— 点右上角打第一卡。</div>

      <ul v-else class="mt-6 space-y-2">
        <li v-for="it in items" :key="it.id"
          class="cursor-pointer rounded-md border border-nt-divider bg-white px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-nt">{{ it.date }}</span>
            <span v-if="it.weight_g != null" class="text-xs text-nt-soft">{{ formatWeight(it.weight_g) }} kg</span>
            <span v-if="it.sleep_min != null" class="text-xs text-nt-soft">睡眠 {{ formatSleep(it.sleep_min) }}</span>
            <span v-if="it.mood" class="rounded-full bg-nt-hover px-2 py-0.5 text-[10px] text-nt-soft">{{ it.mood }}</span>
          </div>
          <div v-if="it.exercise" class="mt-0.5 text-xs text-nt-soft">运动:{{ it.exercise }}</div>
          <div v-if="it.note" class="mt-0.5 text-xs text-nt-muted">{{ it.note }}</div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑打卡' : '今日打卡' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">日期</span>
            <input v-model="form.date" type="date"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">体重 (kg)</span>
              <input v-model="form.weight_kg" type="number" step="0.01" placeholder="70.50"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">睡眠 (小时)</span>
              <input v-model="form.sleep_hours" type="number" step="0.1" placeholder="7.5"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">心情</span>
            <input v-model="form.mood" type="text" placeholder="平静 / 低落 / 兴奋"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">运动</span>
            <input v-model="form.exercise" type="text" placeholder="跑步 5km"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
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
  list:   ()         => fetch('/api/health').then(r => r.json()),
  create: (body)     => fetch('/api/health', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/health/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/health/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const todayStr = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ date: todayStr(), weight_kg: '', sleep_hours: '', mood: '', exercise: '', note: '' })
const form = ref(blank())

const canSave = computed(() => /^\d{4}-\d{2}-\d{2}$/.test(form.value.date))

function formatWeight(g) { return (g / 1000).toFixed(2) }
function formatSleep(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
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

function openCreate() { editingId.value = ''; form.value = blank(); formOpen.value = true }
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    date: it.date || todayStr(),
    weight_kg: it.weight_g != null ? (it.weight_g / 1000).toFixed(2) : '',
    sleep_hours: it.sleep_min != null ? (it.sleep_min / 60).toFixed(1) : '',
    mood: it.mood || '',
    exercise: it.exercise || '',
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const w = form.value.weight_kg === '' ? null : Number(form.value.weight_kg)
  const s = form.value.sleep_hours === '' ? null : Number(form.value.sleep_hours)
  const body = {
    date: form.value.date,
    weight_g: (w == null || !Number.isFinite(w)) ? null : Math.round(w * 1000),
    sleep_min: (s == null || !Number.isFinite(s)) ? null : Math.round(s * 60),
    mood: form.value.mood.trim(),
    exercise: form.value.exercise.trim(),
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
  if (!window.confirm('删除这天的打卡?')) return
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
