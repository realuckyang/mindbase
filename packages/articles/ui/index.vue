<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">文章</h1>
          <p class="mt-1 text-sm text-nt-soft">自己写过的、发表过的。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加文章</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有文章 —— 点右上角「加文章」记录第一篇。
      </div>

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="it in items"
          :key="it.id"
          class="flex cursor-pointer gap-3 rounded-md border border-nt-divider bg-white p-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div v-if="it.cover" class="shrink-0">
            <img :src="it.cover" alt="" class="block h-20 w-20 rounded object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-nt">{{ it.title }}</div>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span v-if="it.source" class="rounded-full bg-nt-hover px-2 py-0.5 text-nt">{{ it.source }}</span>
              <span v-if="it.published_at" class="text-nt-soft tabular-nums">{{ it.published_at }}</span>
            </div>
            <p v-if="it.summary" class="mt-1 line-clamp-2 text-xs text-nt-soft">{{ it.summary }}</p>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑文章' : '加文章' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">链接</span>
            <input v-model="form.url" type="text" placeholder="https://"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">来源</span>
            <input v-model="form.source" type="text" placeholder="woodchange.cn / 微信 / 知乎"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">发表日期</span>
            <input v-model="form.published_at" type="date"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">摘要</span>
            <textarea v-model="form.summary" rows="3"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
          <div>
            <span class="text-xs text-nt-soft">封面</span>
            <div class="mt-1 flex items-center gap-3">
              <img v-if="form.cover" :src="form.cover" alt="" class="block h-16 w-16 rounded border border-nt-divider object-cover" />
              <div v-else class="flex h-16 w-16 items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无</div>
              <div class="flex flex-col gap-1">
                <button type="button"
                  class="rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt disabled:opacity-50"
                  :disabled="uploading"
                  @click="pickFile">{{ uploading ? '上传中…' : (form.cover ? '更换' : '上传') }}</button>
                <button v-if="form.cover" type="button"
                  class="rounded px-2 py-1 text-xs text-nt-danger hover:bg-nt-danger/10"
                  @click="form.cover = ''">移除</button>
              </div>
              <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFilePicked" />
            </div>
          </div>
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
import { ref, onMounted } from 'vue'
import { uploadImage } from '@/system/lib/image'

const api = {
  list:   ()         => fetch('/api/articles').then(r => r.json()),
  create: (body)     => fetch('/api/articles', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/articles/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/articles/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const uploading = ref(false)
const fileInputEl = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ title: '', url: '', source: '', published_at: '', summary: '', cover: '' })

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
  form.value = { title: '', url: '', source: '', published_at: '', summary: '', cover: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    title: it.title, url: it.url || '', source: it.source || '',
    published_at: it.published_at || '', summary: it.summary || '', cover: it.cover || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

function pickFile() { fileInputEl.value?.click() }

async function onFilePicked(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const { url } = await uploadImage(file)
    form.value.cover = url
  } catch (err) {
    alert(`封面上传失败: ${err?.message || ''}`)
  } finally {
    uploading.value = false
  }
}

async function onSave() {
  const body = {
    title:        form.value.title.trim(),
    url:          form.value.url,
    source:       form.value.source,
    summary:      form.value.summary,
    published_at: form.value.published_at || null,
    cover:        form.value.cover || null,
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
  if (!window.confirm('删除这篇文章?')) return
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
