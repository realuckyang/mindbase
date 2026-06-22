<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">密码箱</h1>
          <p class="mt-1 text-sm text-nt-soft">网站和应用的账号密码。</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="rounded-md border border-nt-divider bg-white px-3 py-1.5 text-sm text-nt hover:bg-nt-hover"
            @click="csvInput?.click()"
          >导入 CSV</button>
          <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" @change="onPickCSV" />
          <button
            type="button"
            class="rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
            @click="openCreate"
          >＋ 加一条</button>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有条目 —— 点右上角「加一条」开始记录。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in items"
          :key="it.id"
          class="px-3 py-3 hover:bg-nt-hover"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1 cursor-pointer" @click="openEdit(it)">
              <div class="truncate text-sm font-medium text-nt">{{ it.name }}</div>
              <div v-if="it.username" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.username }}</div>
              <a v-if="it.url" :href="it.url" target="_blank" rel="noreferrer noopener" @click.stop
                class="mt-0.5 inline-block truncate text-xs text-nt-accent hover:underline">{{ it.url }}</a>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <template v-if="revealed.has(it.id)">
                <code class="rounded bg-nt-hover px-1.5 py-0.5 font-mono text-xs text-nt">{{ it.password || '—' }}</code>
                <button type="button"
                  class="rounded px-1.5 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
                  @click="toggleReveal(it.id)"
                >隐藏</button>
                <button type="button"
                  class="rounded px-1.5 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
                  @click="copyPwd(it)"
                >{{ copiedId === it.id ? '已复制' : '复制' }}</button>
              </template>
              <template v-else>
                <button type="button"
                  class="rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                  @click="toggleReveal(it.id)"
                >显示密码</button>
              </template>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑条目' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="GitHub"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">网址</span>
            <input v-model="form.url" type="text" placeholder="https://github.com"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">用户名</span>
            <input v-model="form.username" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">密码</span>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="form.password" :type="formReveal ? 'text' : 'password'"
                class="flex-1 rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
              <button type="button" class="rounded px-2 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
                @click="formReveal = !formReveal">{{ formReveal ? '隐藏' : '显示' }}</button>
            </div>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="2"
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
              :disabled="busy || !form.name.trim()"
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
  list:   ()         => fetch('/api/vault').then(r => r.json()),
  create: (body)     => fetch('/api/vault', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/vault/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/vault/${id}`, { method:'DELETE' }).then(r => r.json()),
  importCSV: (text)  => fetch('/api/vault/import', { method:'POST', headers:{'Content-Type':'text/plain'}, body: text }).then(r => r.json()),
}

const items    = ref([])
const loading  = ref(true)
const error    = ref('')
const busy     = ref(false)
const revealed = ref(new Set())
const copiedId = ref('')
const csvInput = ref(null)

async function onPickCSV(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const resp = await api.importCSV(text)
    if (!resp?.success) throw new Error(resp?.message || '导入失败')
    const parts = []
    if (resp.inserted) parts.push(`新增 ${resp.inserted}`)
    if (resp.updated)  parts.push(`更新 ${resp.updated}`)
    if (resp.skipped)  parts.push(`跳过重复 ${resp.skipped}`)
    alert(parts.length ? parts.join(' · ') : '没有变化')
    await refresh()
  } catch (err) {
    alert(err?.message || '导入失败')
  } finally {
    e.target.value = ''
  }
}

const formOpen   = ref(false)
const formReveal = ref(false)
const editingId  = ref('')
const form = ref({ name: '', url: '', username: '', password: '', note: '' })

function toggleReveal(id) {
  const s = new Set(revealed.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  revealed.value = s
}

async function copyPwd(it) {
  try {
    await navigator.clipboard.writeText(it.password || '')
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
  form.value = { name: '', url: '', username: '', password: '', note: '' }
  formReveal.value = false
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name: it.name, url: it.url || '', username: it.username || '',
    password: it.password || '', note: it.note || '',
  }
  formReveal.value = false
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    name:     form.value.name.trim(),
    url:      form.value.url,
    username: form.value.username,
    password: form.value.password,
    note:     form.value.note,
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
  if (!window.confirm('删除这条?')) return
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
