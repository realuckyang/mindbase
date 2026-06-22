<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">展览</h1>
          <p class="mt-1 text-sm text-nt-soft">看过的展。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一个</button>
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
              <span class="truncate text-sm font-medium text-nt">{{ it.title }}</span>
              <span v-if="it.rating > 0" class="shrink-0 text-xs text-amber-500">{{ '★'.repeat(it.rating) }}</span>
            </div>
            <div v-if="it.venue || it.city" class="mt-0.5 truncate text-xs text-nt-soft">{{ [it.venue, it.city].filter(Boolean).join(' · ') }}</div>
            <div v-if="it.visited_at" class="mt-0.5 text-xs text-nt-soft">{{ it.visited_at }}</div>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑' : '加一个' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">展览名</span>
            <input v-model="form.title" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">场馆</span>
              <input v-model="form.venue" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">城市</span>
              <input v-model="form.city" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">到访日期</span>
            <input v-model="form.visited_at" type="date"
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
                <button v-if="form.cover" type="button" class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.cover = null">移除</button>
              </div>
            </div>
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
import { uploadImage } from '@/system/lib/image'

const api = {
  list:   ()         => fetch('/api/exhibitions').then(r => r.json()),
  create: (body)     => fetch('/api/exhibitions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/exhibitions/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/exhibitions/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ title: '', venue: '', city: '', visited_at: '', rating: 0, note: '', cover: null })
const form = ref(blank())

const canSave = computed(() => form.value.title.trim().length > 0)

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
    title: it.title || '', venue: it.venue || '', city: it.city || '',
    visited_at: it.visited_at || '', rating: it.rating || 0,
    note: it.note || '', cover: it.cover || null,
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
    venue: form.value.venue.trim(),
    city: form.value.city.trim(),
    visited_at: form.value.visited_at || null,
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
  if (!window.confirm('删除这个?')) return
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
