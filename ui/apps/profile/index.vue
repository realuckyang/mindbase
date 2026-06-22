<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">个人档</h1>
          <p class="mt-2 text-sm text-nt-soft">分块写给 AI 看的自我介绍。每一块都会注入对话的 system prompt。</p>
        </div>
        <button
          type="button"
          class="shrink-0 self-center rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black"
          @click="openCreate"
        >+ 新 block</button>
      </div>

      <div v-if="loading" class="mt-8 text-sm text-nt-soft">加载中…</div>
      <div v-else-if="error" class="mt-8 text-sm text-nt-danger">{{ error }}</div>
      <div v-else-if="blocks.length === 0" class="mt-10 rounded-md border border-dashed border-nt-divider px-4 py-10 text-center text-sm text-nt-soft">
        还没有 block —— 点「+ 新 block」开始写
      </div>

      <ul v-else class="mt-6 space-y-4">
        <li
          v-for="b in blocks"
          :key="b.id"
          class="group cursor-pointer rounded-md border border-nt-divider bg-white p-5 transition hover:border-nt"
          @click="openEdit(b)"
        >
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-lg font-bold text-nt">{{ b.title || '(无标题)' }}</h2>
            <button
              type="button"
              class="shrink-0 rounded px-2 py-1 text-xs text-nt-soft opacity-0 group-hover:opacity-100 hover:bg-nt-divider hover:text-nt"
              title="编辑"
              @click.stop="openEdit(b)"
            >编辑</button>
          </div>
          <hr class="my-3 border-nt-divider" />
          <div class="whitespace-pre-wrap text-sm leading-relaxed text-nt">{{ b.content || '' }}</div>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-xl rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑 block' : '新 block' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text" placeholder="例如:基本情况 / 工作偏好 / 长期目标"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">内容</span>
            <textarea v-model="form.content" rows="10"
              class="mt-1 w-full resize-y rounded border border-nt-divider bg-white px-2 py-1.5 font-mono text-sm leading-relaxed text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10"
            @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button"
              :disabled="busy"
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
  list:   ()         => fetch('/api/profile').then(r => r.json()),
  create: (body)     => fetch('/api/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/profile/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/profile/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const blocks  = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ title: '', content: '' })

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    blocks.value = resp.blocks || []
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = { title: '', content: '' }
  formOpen.value = true
}
function openEdit(b) {
  editingId.value = b.id
  form.value = { title: b.title || '', content: b.content || '' }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (busy.value) return
  const body = { title: form.value.title, content: form.value.content }
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
  if (!editingId.value || busy.value) return
  if (!confirm('删除这个 block?')) return
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
