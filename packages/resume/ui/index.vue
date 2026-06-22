<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">简历</h1>
          <p class="mt-1 text-sm text-nt-soft">工作、教育、项目、技能。</p>
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
        还没有内容 —— 点「+ 加一条」加第一条经历。
      </div>

      <template v-else>
        <section v-for="g in groupedItems" :key="g.kind" class="mt-8">
          <h2 class="text-xs font-medium uppercase tracking-wider text-nt-soft">{{ kindLabel(g.kind) }}</h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="it in g.items"
              :key="it.id"
              class="cursor-pointer rounded-md border border-nt-divider bg-white px-3 py-3 hover:bg-nt-hover"
              @click="openEdit(it)"
            >
              <div class="flex items-baseline justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-nt">{{ it.title }}</div>
                  <div v-if="it.org" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.org }}</div>
                </div>
                <div class="shrink-0 text-xs text-nt-soft">{{ dateRange(it) }}</div>
              </div>
              <p v-if="it.description" class="mt-2 text-xs text-nt-muted line-clamp-3 whitespace-pre-wrap">{{ it.description }}</p>
            </li>
          </ul>
        </section>
      </template>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑条目' : '加一条' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">类型</span>
            <select v-model="form.kind"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
              <option value="work">工作</option>
              <option value="edu">教育</option>
              <option value="project">项目</option>
              <option value="skill">技能</option>
              <option value="other">其它</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">标题</span>
            <input v-model="form.title" type="text" :placeholder="titlePlaceholder"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">{{ orgLabel }}</span>
            <input v-model="form.org" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs text-nt-soft">开始</span>
              <input v-model="form.start_date" type="month"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block">
              <span class="text-xs text-nt-soft">结束(空 = 至今)</span>
              <input v-model="form.end_date" type="month"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">描述</span>
            <textarea v-model="form.description" rows="4"
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
import { ref, computed, onMounted } from 'vue'

const api = {
  list:   ()         => fetch('/api/resume').then(r => r.json()),
  create: (body)     => fetch('/api/resume', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/resume/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/resume/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const KIND_ORDER = ['work', 'edu', 'project', 'skill', 'other']
const KIND_LABELS = { work: '工作', edu: '教育', project: '项目', skill: '技能', other: '其它' }

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ kind: 'work', title: '', org: '', start_date: '', end_date: '', description: '' })

const kindLabel = (k) => KIND_LABELS[k] || k
const orgLabel = computed(() => ({
  work: '公司',
  edu: '学校',
  project: '所属',
  skill: '分类',
  other: '所属',
}[form.value.kind] || '所属'))
const titlePlaceholder = computed(() => ({
  work: '产品经理',
  edu: '本科 / 计算机科学',
  project: '个人博客',
  skill: 'TypeScript',
  other: '',
}[form.value.kind] || ''))

const groupedItems = computed(() => {
  const buckets = new Map(KIND_ORDER.map(k => [k, []]))
  for (const it of items.value) {
    if (!buckets.has(it.kind)) buckets.set(it.kind, [])
    buckets.get(it.kind).push(it)
  }
  return KIND_ORDER
    .map(k => ({ kind: k, items: buckets.get(k) || [] }))
    .filter(g => g.items.length)
})

function dateRange(it) {
  if (!it.start_date && !it.end_date) return ''
  const s = it.start_date || ''
  const e = it.end_date || '至今'
  if (!s) return e
  return `${s} — ${e}`
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
  form.value = { kind: 'work', title: '', org: '', start_date: '', end_date: '', description: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    kind: it.kind,
    title: it.title,
    org: it.org || '',
    start_date: it.start_date || '',
    end_date: it.end_date || '',
    description: it.description || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    kind:        form.value.kind,
    title:       form.value.title.trim(),
    org:         form.value.org.trim(),
    start_date:  form.value.start_date || null,
    end_date:    form.value.end_date || null,
    description: form.value.description,
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
  if (!window.confirm('删除这条经历?')) return
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
