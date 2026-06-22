<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">网页</h1>
          <p class="mt-1 text-sm text-nt-soft">收藏 AI 写给你的小页面,随时再翻出来看。</p>
        </div>
        <button
          v-if="view === 'list'"
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black"
          @click="openCreate"
        >＋ 新建</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>

      <!-- 列表 -->
      <template v-if="view === 'list'">
        <div v-if="loading && !pages.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
        <div v-else-if="!pages.length" class="mt-10 text-center text-sm text-nt-soft">
          这里还空着 —— 让 AI 写一个小页面,粘进来留着。
        </div>
        <div v-else class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article
            v-for="p in pages"
            :key="p.id"
            class="flex flex-col rounded-md border border-nt-divider bg-white p-4"
          >
            <h3 class="truncate text-base font-semibold text-nt">{{ p.title || '未命名' }}</h3>
            <p v-if="p.description" class="mt-1 line-clamp-2 text-sm text-nt-soft">{{ p.description }}</p>
            <div class="mt-2 text-xs text-nt-hint">{{ formatDate(p.created_at) }}</div>
            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="rounded border border-nt-divider px-3 py-1 text-xs text-nt hover:bg-nt-hover"
                @click="openPreview(p)"
              >预览</button>
              <button
                type="button"
                class="rounded border border-nt-divider px-3 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                @click="openEdit(p)"
              >编辑</button>
              <button
                type="button"
                class="rounded px-3 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger"
                @click="onDelete(p)"
              >删除</button>
            </div>
          </article>
        </div>
      </template>

      <!-- 编辑表单 -->
      <template v-else-if="view === 'form'">
        <div class="mt-6 space-y-4">
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input
              v-model="form.title"
              type="text"
              placeholder="给这个页面起个名字"
              class="mt-1 block w-full rounded border border-nt-divider bg-white px-3 py-2 text-sm text-nt outline-none focus:border-nt-accent"
            />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">一句话简介</span>
            <input
              v-model="form.description"
              type="text"
              placeholder="一句话说说这是什么"
              class="mt-1 block w-full rounded border border-nt-divider bg-white px-3 py-2 text-sm text-nt outline-none focus:border-nt-accent"
            />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">HTML</span>
            <textarea
              v-model="form.html"
              rows="24"
              placeholder="完整的 HTML 文档,粘贴进来就行"
              class="mt-1 block min-h-[400px] w-full resize-y rounded border border-nt-divider bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-nt outline-none focus:border-nt-accent"
              style="tab-size: 2;"
            ></textarea>
          </label>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover"
              @click="cancelForm"
            >取消</button>
            <button
              type="button"
              :disabled="saving || !form.html.trim()"
              class="rounded-md bg-nt px-4 py-1.5 text-sm text-white hover:bg-black disabled:opacity-50"
              @click="onSave"
            >{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </template>
    </main>

    <!-- 预览 modal -->
    <div
      v-if="previewing"
      class="fixed inset-0 z-50 flex flex-col bg-black/70"
      @click.self="closePreview"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-2 text-white">
        <div class="min-w-0 truncate text-sm">{{ previewing.title || '未命名' }}</div>
        <button
          type="button"
          class="rounded px-3 py-1 text-sm hover:bg-white/10"
          @click="closePreview"
        >关闭 ✕</button>
      </div>
      <iframe
        :srcdoc="previewing.html"
        sandbox="allow-scripts allow-same-origin"
        class="flex-1 w-full border-0 bg-white"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

// === 局部 api helper ===
const api = {
  async request(path, opts = {}) {
    const resp = await fetch(`/api/webs${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok || data.success === false) {
      throw new Error(data.message || `HTTP ${resp.status}`)
    }
    return data
  },
  list()              { return this.request('') },
  create(body)        { return this.request('', { method: 'POST', body: JSON.stringify(body) }) },
  update(id, body)    { return this.request(`/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) },
  remove(id)          { return this.request(`/${id}`, { method: 'DELETE' }) },
}

const pages   = ref([])
const loading = ref(true)
const error   = ref('')
const view    = ref('list')   // 'list' | 'form'
const saving  = ref(false)
const previewing = ref(null)

const form = reactive({ id: '', title: '', description: '', html: '' })

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    pages.value = resp.pages || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = ''
  form.title = ''
  form.description = ''
  form.html = ''
  view.value = 'form'
}

function openEdit(p) {
  form.id = p.id
  form.title = p.title || ''
  form.description = p.description || ''
  form.html = p.html || ''
  view.value = 'form'
}

function cancelForm() {
  view.value = 'list'
}

async function onSave() {
  if (saving.value) return
  if (!form.html.trim()) return
  saving.value = true
  try {
    const body = {
      title: form.title,
      description: form.description,
      html: form.html,
    }
    if (form.id) {
      const resp = await api.update(form.id, body)
      const i = pages.value.findIndex(x => x.id === form.id)
      if (i >= 0 && resp.page) pages.value[i] = resp.page
    } else {
      const resp = await api.create(body)
      if (resp.page) pages.value.unshift(resp.page)
    }
    view.value = 'list'
  } catch (e) {
    alert(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete(p) {
  if (!window.confirm(`删除「${p.title || '未命名'}」?`)) return
  try {
    await api.remove(p.id)
    pages.value = pages.value.filter(x => x.id !== p.id)
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

function openPreview(p) { previewing.value = p }
function closePreview() { previewing.value = null }

function formatDate(ts) {
  if (!ts) return ''
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

refresh()
</script>
