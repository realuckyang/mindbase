<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">收藏</h1>
          <p class="mt-1 text-sm text-nt-soft">把值得回看的链接放在这里。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加一条</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有收藏 —— 点右上角「加一条」开始。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in items"
          :key="it.id"
          class="group flex items-start gap-3 px-3 py-3 hover:bg-nt-hover"
        >
          <img v-if="it.cover" :src="it.cover" class="h-10 w-10 shrink-0 rounded object-cover" alt="" />
          <a
            :href="it.url"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0 flex-1"
          >
            <div class="truncate text-sm font-medium text-nt">{{ it.title || it.url }}</div>
            <div class="truncate text-xs text-nt-soft">{{ it.url }}</div>
            <div v-if="it.description" class="mt-0.5 truncate text-xs text-nt-muted">{{ it.description }}</div>
          </a>
          <button
            type="button"
            class="shrink-0 self-center rounded px-2 py-1 text-xs text-nt-soft opacity-0 group-hover:opacity-100 hover:bg-nt-divider hover:text-nt"
            title="编辑"
            @click.stop="openEdit(it)"
          >编辑</button>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑收藏' : '加一条' }}</h2>
          <a
            v-if="editingId && form.url"
            :href="form.url"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded px-2 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
          >↗ 打开链接</a>
        </div>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">链接</span>
            <input v-model="form.url" type="url" placeholder="https://…"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">标题(可选)</span>
            <input v-model="form.title" type="text" placeholder="留空则用 URL"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注(可选)</span>
            <textarea v-model="form.description" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
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

const api = {
  list:   ()         => fetch('/api/bookmarks').then(r => r.json()),
  create: (body)     => fetch('/api/bookmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/bookmarks/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/bookmarks/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ url: '', title: '', description: '', cover: null })

const canSave = computed(() => form.value.url.trim().length > 0)

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = { url: '', title: '', description: '', cover: null }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    url:         it.url || '',
    title:       it.title || '',
    description: it.description || '',
    cover:       it.cover || null,
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    url:         form.value.url.trim(),
    title:       form.value.title.trim() || null,
    description: form.value.description.trim() || null,
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
  if (!window.confirm('删除这条收藏?')) return
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
