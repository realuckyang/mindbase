<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">心愿单</h1>
          <p class="mt-1 text-sm text-nt-soft">想要的东西、买了就划掉。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加一条</button>
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
          @click="setFilter(t.value)"
        >{{ t.label }}</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        这个分类还是空的。
      </div>

      <ul v-else class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li
          v-for="it in items"
          :key="it.id"
          class="cursor-pointer rounded-md border border-nt-divider bg-white p-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div class="flex gap-3">
            <img v-if="it.cover" :src="it.cover" class="h-16 w-16 shrink-0 rounded object-cover" alt="" />
            <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-nt-hover text-xs text-nt-soft">无图</div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span
                  class="inline-block h-2 w-2 shrink-0 rounded-full"
                  :class="priorityDot(it.priority)"
                  :title="priorityLabel(it.priority)"
                ></span>
                <span class="truncate text-sm font-semibold text-nt">{{ it.name }}</span>
              </div>
              <div class="mt-0.5 text-xs text-nt-soft">
                <span v-if="it.price > 0">¥ {{ formatPrice(it.price) }}</span>
                <span v-else class="italic">未定价</span>
              </div>
              <div v-if="it.note" class="mt-1 line-clamp-2 text-xs text-nt-muted">{{ it.note }}</div>
              <a v-if="it.url" :href="it.url" target="_blank" rel="noreferrer noopener" @click.stop
                class="mt-1 inline-block truncate text-xs text-nt-accent hover:underline">{{ it.url }}</a>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑心愿' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="必填"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">链接</span>
            <input v-model="form.url" type="text" placeholder="https://..."
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">价格(元)</span>
              <input v-model.number="form.price" type="number" step="0.01" min="0" placeholder="0.00"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block w-28">
              <span class="text-xs text-nt-soft">优先级</span>
              <select v-model="form.priority"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="high">高</option>
                <option value="normal">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label class="block w-28">
              <span class="text-xs text-nt-soft">状态</span>
              <select v-model="form.status"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="want">想要</option>
                <option value="bought">已买</option>
                <option value="gave_up">放弃</option>
              </select>
            </label>
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
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10"
            @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button"
              :disabled="busy || !canSave"
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
  list:   (qs = '')  => fetch(`/api/wishlist${qs}`).then(r => r.json()),
  create: (body)     => fetch('/api/wishlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/wishlist/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/wishlist/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const tabs = [
  { value: '',        label: '全部' },
  { value: 'want',    label: '想要' },
  { value: 'bought',  label: '已买' },
  { value: 'gave_up', label: '放弃' },
]

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const filter  = ref('')
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ name: '', url: '', price: 0, priority: 'normal', status: 'want', note: '', cover: null })

const canSave = computed(() => form.value.name.trim().length > 0)

function priorityLabel(p) { return { high: '高', normal: '中', low: '低' }[p] || p }
function priorityDot(p) {
  return p === 'high'   ? 'bg-red-500'
       : p === 'low'    ? 'bg-gray-300'
       :                  'bg-gray-500'
}
function formatPrice(cents) {
  const yuan = (Number(cents) / 100)
  return yuan.toFixed(2).replace(/\.00$/, '')
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const qs = filter.value ? `?status=${encodeURIComponent(filter.value)}` : ''
    const resp = await api.list(qs)
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function setFilter(v) { filter.value = v; refresh() }

function openCreate() {
  editingId.value = ''
  form.value = { name: '', url: '', price: 0, priority: 'normal', status: 'want', note: '', cover: null }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name:     it.name || '',
    url:      it.url || '',
    price:    Number(it.price || 0) / 100,
    priority: it.priority || 'normal',
    status:   it.status || 'want',
    note:     it.note || '',
    cover:    it.cover || null,
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPickCover(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const { url } = await uploadImage(file)
    form.value.cover = url
  } catch (err) {
    error.value = err?.message || '上传失败'
  } finally {
    e.target.value = ''
  }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const price = Number(form.value.price)
  const body = {
    name:     form.value.name.trim(),
    url:      form.value.url.trim(),
    price:    Number.isFinite(price) && price > 0 ? price : 0,
    priority: form.value.priority,
    status:   form.value.status,
    note:     form.value.note.trim(),
    cover:    form.value.cover,
  }
  busy.value = true
  try {
    const resp = editingId.value
      ? await api.update(editingId.value, body)
      : await api.create(body)
    if (!resp?.success) throw new Error(resp?.message || '保存失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!window.confirm('删除这条?')) return
  busy.value = true
  try {
    const resp = await api.remove(editingId.value)
    if (!resp?.success) throw new Error(resp?.message || '删除失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e?.message || '删除失败')
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
