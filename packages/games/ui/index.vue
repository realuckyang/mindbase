<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">游戏</h1>
          <p class="mt-1 text-sm text-nt-soft">想玩、在玩、玩过的。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一条</button>
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
          <img v-if="it.cover" :src="it.cover" class="h-12 w-9 shrink-0 rounded object-cover" alt="" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-medium text-nt">{{ it.title }}</span>
              <span v-if="it.platform" class="rounded bg-nt-hover px-1.5 py-0.5 text-[10px] text-nt-soft">{{ it.platform }}</span>
              <span v-if="it.rating > 0" class="text-xs text-amber-500">{{ '★'.repeat(it.rating) }}</span>
              <span v-if="it.hours_played > 0" class="text-xs text-nt-muted">{{ it.hours_played }} 小时</span>
            </div>
            <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-muted">{{ it.note }}</div>
          </div>
          <span class="shrink-0 text-xs text-nt-soft">{{ statusLabel(it.status) }}</span>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑游戏' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.title" type="text" placeholder="必填"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">平台</span>
              <input v-model="form.platform" type="text" placeholder="PC / PS5 / Switch …"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block w-32">
              <span class="text-xs text-nt-soft">状态</span>
              <select v-model="form.status"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="want">想玩</option>
                <option value="playing">在玩</option>
                <option value="finished">通关</option>
                <option value="dropped">弃坑</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">游戏时数(小时)</span>
            <input v-model.number="form.hours_played" type="number" min="0"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex items-center gap-2 text-sm text-nt-soft">
            <span class="text-xs">评分</span>
            <button v-for="n in 5" :key="n" type="button"
              class="px-0.5 text-base leading-none"
              :class="n <= form.rating ? 'text-amber-500' : 'text-nt-divider hover:text-amber-300'"
              @click="form.rating = (form.rating === n ? 0 : n)">★</button>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">封面</span>
            <div class="mt-1 flex items-center gap-2">
              <img v-if="form.cover" :src="form.cover" class="h-16 w-16 rounded object-cover" alt="" />
              <div v-else class="flex h-16 w-16 items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
              <div class="flex flex-col gap-1">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickCover" />
                <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-nt-hover" @click="fileInput?.click()">
                  {{ form.cover ? '更换' : '选择图片' }}
                </button>
                <button v-if="form.cover" type="button" class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.cover = null">
                  移除
                </button>
              </div>
            </div>
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
import { uploadImage } from '@/system/lib/image'

const api = {
  list:   (qs = '')  => fetch(`/api/games${qs}`).then(r => r.json()),
  create: (body)     => fetch('/api/games', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/games/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/games/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: '',         label: '全部' },
  { value: 'want',     label: '想玩' },
  { value: 'playing',  label: '在玩' },
  { value: 'finished', label: '通关' },
  { value: 'dropped',  label: '弃坑' },
]

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const filter  = ref('')
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ title: '', platform: '', status: 'want', hours_played: 0, rating: 0, note: '', cover: null })
const form = ref(blank())

const canSave = computed(() => form.value.title.trim().length > 0)

function statusLabel(s) { return { want: '想玩', playing: '在玩', finished: '通关', dropped: '弃坑' }[s] || s }

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
    title: it.title || '',
    platform: it.platform || '',
    status: it.status || 'want',
    hours_played: it.hours_played || 0,
    rating: it.rating || 0,
    note: it.note || '',
    cover: it.cover || null,
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPickCover(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try { const { url } = await uploadImage(file); form.value.cover = url }
  catch (err) { error.value = err?.message || '上传失败' }
  finally { e.target.value = '' }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    title: form.value.title.trim(),
    platform: form.value.platform.trim(),
    status: form.value.status,
    hours_played: Number.isFinite(form.value.hours_played) ? form.value.hours_played : 0,
    rating: form.value.rating,
    note: form.value.note.trim(),
    cover: form.value.cover,
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
