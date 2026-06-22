<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">指令集</h1>
          <p class="mt-1 text-sm text-nt-soft">常用 prompt 模板,一键复制使用。</p>
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
        还没有指令 —— 点右上角「加一条」收一份。
      </div>

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="it in items"
          :key="it.id"
          class="cursor-pointer rounded-md border border-nt-divider bg-white p-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="truncate text-sm font-semibold text-nt">{{ it.title }}</span>
                <span
                  v-for="t in tagList(it.tags)"
                  :key="t"
                  class="inline-block rounded-full bg-nt-hover px-2 py-0.5 text-[11px] text-nt-soft"
                >{{ t }}</span>
                <span
                  v-if="it.model"
                  class="inline-block rounded-full bg-nt/5 px-2 py-0.5 text-[11px] text-nt"
                >{{ it.model }}</span>
              </div>
              <div v-if="it.content" class="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-nt-muted line-clamp-3">{{ it.content }}</div>
            </div>
            <button
              type="button"
              class="shrink-0 rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-white"
              @click.stop="copyContent(it)"
            >
              {{ copiedId === it.id ? '已复制' : '复制' }}
            </button>
          </div>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑指令' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text" placeholder="必填"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">正文</span>
            <textarea v-model="form.content" rows="10"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 font-mono text-sm text-nt outline-none focus:border-nt-accent"
              placeholder="prompt 内容,会原样复制到剪贴板"></textarea>
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">标签(逗号分隔)</span>
              <input v-model="form.tags" type="text" placeholder="代码, review"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block w-44">
              <span class="text-xs text-nt-soft">建议模型</span>
              <input v-model="form.model" type="text" placeholder="claude-opus-4.7"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="2"
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
  list:   ()         => fetch('/api/prompts').then(r => r.json()),
  create: (body)     => fetch('/api/prompts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/prompts/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/prompts/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items    = ref([])
const loading  = ref(true)
const error    = ref('')
const busy     = ref(false)
const copiedId = ref('')

const formOpen  = ref(false)
const editingId = ref('')
const empty = () => ({ title: '', content: '', tags: '', model: '', note: '' })
const form = ref(empty())

const canSave = computed(() => form.value.title.trim().length > 0)

function tagList(tags) {
  return String(tags || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

async function copyContent(it) {
  try {
    await navigator.clipboard.writeText(it.content || '')
    copiedId.value = it.id
    setTimeout(() => { if (copiedId.value === it.id) copiedId.value = '' }, 1500)
  } catch {
    alert('复制失败')
  }
}

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
  form.value = empty()
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    title:   it.title || '',
    content: it.content || '',
    tags:    it.tags || '',
    model:   it.model || '',
    note:    it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    title:   form.value.title.trim(),
    content: form.value.content,
    tags:    form.value.tags.trim(),
    model:   form.value.model.trim(),
    note:    form.value.note.trim(),
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
