<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">影集</h1>
          <p class="mt-1 text-sm text-nt-soft">值得留下的瞬间。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 上传照片</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有照片。</div>

      <div v-else class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div v-for="it in items" :key="it.id"
          class="group cursor-pointer overflow-hidden rounded-md border border-nt-divider bg-white hover:border-nt-accent"
          @click="openEdit(it)">
          <div class="aspect-square w-full overflow-hidden bg-nt-hover">
            <img :src="it.image_url" class="h-full w-full object-cover transition group-hover:scale-105" alt="" />
          </div>
          <div class="px-2 py-1.5">
            <div v-if="it.caption" class="line-clamp-1 text-xs text-nt">{{ it.caption }}</div>
            <div class="mt-0.5 flex items-center gap-1.5 text-[10px] text-nt-soft">
              <span v-if="it.taken_at">{{ it.taken_at }}</span>
              <span v-if="it.location" class="truncate">· {{ it.location }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-lg rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑照片' : '上传照片' }}</h2>
        <div class="mt-4 space-y-3">
          <div>
            <span class="text-xs text-nt-soft">照片 <span class="text-nt-danger">*</span></span>
            <div class="mt-1">
              <div v-if="form.image_url" class="relative">
                <img :src="form.image_url" class="max-h-80 w-full rounded object-contain bg-nt-hover" alt="" />
                <div class="mt-2 flex gap-2">
                  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickImage" />
                  <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-nt-hover" @click="fileInput?.click()">更换</button>
                </div>
              </div>
              <div v-else
                class="flex aspect-video w-full cursor-pointer items-center justify-center rounded border border-dashed border-nt-divider text-sm text-nt-soft hover:bg-nt-hover"
                @click="fileInput?.click()">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickImage" />
                <span v-if="uploading">上传中…</span>
                <span v-else>点击选择照片</span>
              </div>
            </div>
          </div>
          <label class="block" :class="form.image_url ? '' : 'opacity-50 pointer-events-none'">
            <span class="text-xs text-nt-soft">一句话描述</span>
            <input v-model="form.caption" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2" :class="form.image_url ? '' : 'opacity-50 pointer-events-none'">
            <label class="block w-44">
              <span class="text-xs text-nt-soft">拍摄日期</span>
              <input v-model="form.taken_at" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">地点</span>
              <input v-model="form.location" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
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
  list:   ()         => fetch('/api/photos').then(r => r.json()),
  create: (body)     => fetch('/api/photos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/photos/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/photos/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const uploading = ref(false)
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ image_url: '', caption: '', taken_at: '', location: '' })
const form = ref(blank())

const canSave = computed(() => !!form.value.image_url)

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
    image_url: it.image_url || '',
    caption: it.caption || '',
    taken_at: it.taken_at || '',
    location: it.location || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPickImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try { const { url } = await uploadImage(file); form.value.image_url = url }
  catch (err) { alert(err?.message || '上传失败') }
  finally { uploading.value = false; e.target.value = '' }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    image_url: form.value.image_url,
    caption: form.value.caption.trim(),
    taken_at: form.value.taken_at || null,
    location: form.value.location.trim(),
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
  if (!window.confirm('删除这张照片?')) return
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
