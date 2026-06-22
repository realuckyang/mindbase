<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">旅行</h1>
          <p class="mt-1 text-sm text-nt-soft">想去的、订好的、去过的。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 新计划</button>
      </div>

      <!-- 状态 tab -->
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
        这里还空着 —— 点右上角「新计划」加一个。
      </div>

      <div v-else class="mt-6 space-y-3">
        <article
          v-for="it in filteredItems"
          :key="it.id"
          class="cursor-pointer rounded-md border border-nt-divider bg-white px-4 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div class="flex items-start justify-between gap-2">
            <img v-if="it.cover" :src="it.cover" alt=""
              class="h-8 w-12 shrink-0 rounded object-cover" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-base font-medium text-nt">{{ it.destination }}</div>
              <div v-if="it.start_date || it.end_date" class="mt-0.5 text-xs text-nt-soft">
                {{ it.start_date || '?' }} — {{ it.end_date || '?' }}
              </div>
              <div v-if="it.note" class="mt-1 text-sm text-nt-soft">{{ it.note }}</div>
            </div>
            <span
              class="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
              :class="badgeClass(it.status)"
            >{{ statusLabel(it.status) }}</span>
          </div>
        </article>
      </div>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑计划' : '新计划' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">目的地</span>
            <input v-model="form.destination" type="text" placeholder="京都"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">出发</span>
              <input v-model="form.start_date" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">返程</span>
              <input v-model="form.end_date" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">状态</span>
            <select v-model="form.status"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
              <option value="planning">规划中</option>
              <option value="booked">已订</option>
              <option value="done">已完成</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">封面</span>
            <div class="mt-1 flex items-center gap-2">
              <div v-if="form.cover" class="relative">
                <img :src="form.cover" class="h-16 w-16 rounded object-cover" alt="" />
              </div>
              <div v-else class="flex h-16 w-16 items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
              <div class="flex flex-col gap-1">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickCover" />
                <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-nt-hover" @click="$refs.fileInput.click()">{{ form.cover ? '更换' : '选择图片' }}</button>
                <button v-if="form.cover" type="button" class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.cover = null">移除</button>
              </div>
            </div>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
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
              :disabled="busy || !form.destination.trim()"
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
import { uploadImage } from '@/system/lib/image'

const api = {
  list:   ()         => fetch('/api/travel').then(r => r.json()),
  create: (body)     => fetch('/api/travel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/travel/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/travel/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: 'all',      label: '全部' },
  { value: 'planning', label: '规划中' },
  { value: 'booked',   label: '已订' },
  { value: 'done',     label: '已完成' },
]

const filter  = ref('all')
const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ destination: '', start_date: '', end_date: '', status: 'planning', note: '', cover: null })

const filteredItems = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter(x => x.status === filter.value)
)

function statusLabel(s) { return { planning: '规划中', booked: '已订', done: '已完成' }[s] || s }
function badgeClass(s) {
  if (s === 'planning') return 'bg-nt-accent-bg text-nt-accent'
  if (s === 'booked')   return 'bg-amber-50 text-amber-700'
  return 'bg-emerald-50 text-emerald-700'
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
  form.value = { destination: '', start_date: '', end_date: '', status: 'planning', note: '', cover: null }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    destination: it.destination,
    start_date:  it.start_date || '',
    end_date:    it.end_date || '',
    status:      it.status,
    note:        it.note || '',
    cover:       it.cover || null,
  }
  formOpen.value = true
}

async function onPickCover(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const { url } = await uploadImage(file)
    form.value.cover = url
  } catch (err) {
    error.value = err.message || '上传失败'
  } finally {
    e.target.value = ''
  }
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    destination: form.value.destination.trim(),
    start_date:  form.value.start_date || null,
    end_date:    form.value.end_date || null,
    status:      form.value.status,
    note:        form.value.note,
    cover:       form.value.cover,
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
  if (!window.confirm('删除这个计划?')) return
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
