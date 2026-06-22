<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">足迹</h1>
          <p class="mt-1 text-sm text-nt-soft">去过的城市、国家、值得记住的角落。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一个</button>
      </div>

      <div v-if="items.length" class="mt-4">
        <span class="inline-flex items-center rounded-full bg-nt-hover px-3 py-1 text-xs text-nt-soft">
          去过 {{ cityCount }} 个城市,{{ countryCount }} 个国家
        </span>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有记录。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <img v-if="it.cover" :src="it.cover" class="h-14 w-14 shrink-0 rounded object-cover" alt="" />
          <div v-else class="h-14 w-14 shrink-0 rounded bg-nt-hover"></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
              <span v-if="it.country || it.city" class="text-xs text-nt-soft">{{ [it.country, it.city].filter(Boolean).join(' · ') }}</span>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-xs text-nt-soft">
              <span v-if="it.visited_at">{{ it.visited_at }}</span>
            </div>
            <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-muted">{{ it.note }}</div>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑' : '加一个' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">地名</span>
            <input v-model="form.name" type="text" placeholder="必填"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">国家</span>
              <input v-model="form.country" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">城市</span>
              <input v-model="form.city" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">到访日期 (YYYY-MM 或 YYYY-MM-DD)</span>
            <input v-model="form.visited_at" type="text" placeholder="2024-08 或 2024-08-15"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">代表照片</span>
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
  list:   ()         => fetch('/api/footprints').then(r => r.json()),
  create: (body)     => fetch('/api/footprints', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/footprints/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/footprints/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ name: '', country: '', city: '', visited_at: '', note: '', cover: null })
const form = ref(blank())

const canSave = computed(() => form.value.name.trim().length > 0)

const cityCount = computed(() => {
  const set = new Set()
  for (const it of items.value) {
    const key = (it.city || it.name || '').trim()
    if (key) set.add(key)
  }
  return set.size
})
const countryCount = computed(() => {
  const set = new Set()
  for (const it of items.value) {
    const c = (it.country || '').trim()
    if (c) set.add(c)
  }
  return set.size
})

async function refresh() {
  loading.value = true
  error.value = ''
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
    name: it.name || '',
    country: it.country || '',
    city: it.city || '',
    visited_at: it.visited_at || '',
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
    name: form.value.name.trim(),
    country: form.value.country.trim(),
    city: form.value.city.trim(),
    visited_at: form.value.visited_at.trim() || null,
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
