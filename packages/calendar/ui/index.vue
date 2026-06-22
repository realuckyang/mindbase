<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">日程</h1>
          <p class="mt-1 text-sm text-nt-soft">什么时候要做什么,先记下。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black"
          @click="openCreate"
        >＋ 加一条</button>
      </div>

      <div class="mt-6 flex items-center gap-3 text-sm">
        <input
          v-model="month"
          type="month"
          class="rounded border border-nt-divider bg-white px-2 py-1 text-sm text-nt outline-none focus:border-nt-accent"
        />
        <button
          type="button"
          class="rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
          @click="goToday"
        >今天</button>
        <span class="text-xs text-nt-soft">查看月份</span>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>

      <!-- 列表 -->
      <div v-if="loading && !events.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!events.length" class="mt-10 text-center text-sm text-nt-soft">
        这个月还没有安排。
      </div>
      <div v-else class="mt-6 space-y-5">
        <section v-for="group in grouped" :key="group.date">
          <div class="mb-2 text-xs text-nt-soft">{{ formatDateLabel(group.date) }}</div>
          <ul class="divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
            <li
              v-for="ev in group.items"
              :key="ev.id"
              class="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-nt-hover"
              @click="openEdit(ev)"
            >
              <span class="mt-0.5 w-12 shrink-0 text-xs tabular-nums text-nt-soft">{{ ev.time || '—' }}</span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-nt">{{ ev.title }}</div>
                <div v-if="ev.note" class="mt-0.5 truncate text-xs text-nt-soft">{{ ev.note }}</div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </main>

    <!-- 新增 / 编辑表单 modal -->
    <div v-if="editing" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="cancelForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ form.id ? '编辑事项' : '新事项' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">事项</span>
            <input
              v-model="form.title"
              type="text"
              placeholder="要做什么"
              class="mt-1 block w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"
            />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">日期</span>
              <input
                v-model="form.date"
                type="date"
                class="mt-1 block w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"
              />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">时间(可空)</span>
              <input
                v-model="form.time"
                type="time"
                class="mt-1 block w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"
              />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea
              v-model="form.note"
              rows="3"
              placeholder="额外要记的内容"
              class="mt-1 block w-full resize-y rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"
            ></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="form.id" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10"
            @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="cancelForm">取消</button>
            <button type="button"
              :disabled="saving || !form.title.trim() || !form.date"
              class="rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-black disabled:opacity-50"
              @click="onSave">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

// === 局部 api helper ===
const api = {
  async request(path, opts = {}) {
    const resp = await fetch(`/api/calendar${path}`, {
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
  list(month)       { return this.request(month ? `?month=${encodeURIComponent(month)}` : '') },
  create(body)      { return this.request('', { method: 'POST', body: JSON.stringify(body) }) },
  update(id, body)  { return this.request(`/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) },
  remove(id)        { return this.request(`/${id}`, { method: 'DELETE' }) },
}

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const todayStr     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const month   = ref(currentMonth)
const events  = ref([])
const loading = ref(true)
const error   = ref('')
const editing = ref(false)
const saving  = ref(false)

const form = reactive({ id: '', title: '', date: todayStr, time: '', note: '' })

const grouped = computed(() => {
  const map = new Map()
  for (const ev of events.value) {
    if (!map.has(ev.date)) map.set(ev.date, { date: ev.date, items: [] })
    map.get(ev.date).items.push(ev)
  }
  return [...map.values()].sort((a, b) => a.date < b.date ? -1 : 1)
})

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list(month.value)
    events.value = resp.events || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function defaultDateForMonth() {
  // 在当前月份选择器对应的月份里默认选第一天(若是当前月份则用今天)
  if (month.value === currentMonth) return todayStr
  return `${month.value}-01`
}

function openCreate() {
  form.id = ''
  form.title = ''
  form.date = defaultDateForMonth()
  form.time = ''
  form.note = ''
  editing.value = true
}

function openEdit(ev) {
  form.id = ev.id
  form.title = ev.title
  form.date = ev.date
  form.time = ev.time || ''
  form.note = ev.note || ''
  editing.value = true
}

function cancelForm() {
  editing.value = false
}

async function onSave() {
  if (saving.value) return
  if (!form.title.trim() || !form.date) return
  saving.value = true
  try {
    const body = {
      title: form.title.trim(),
      date:  form.date,
      time:  form.time || null,
      note:  form.note,
    }
    if (form.id) {
      const resp = await api.update(form.id, body)
      const i = events.value.findIndex(x => x.id === form.id)
      if (i >= 0 && resp.event) {
        events.value[i] = resp.event
        // 如果改了日期出当月,重拉
        if (!resp.event.date.startsWith(month.value)) await refresh()
      }
    } else {
      const resp = await api.create(body)
      if (resp.event && resp.event.date.startsWith(month.value)) {
        events.value.push(resp.event)
      }
    }
    editing.value = false
  } catch (e) {
    alert(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!form.id) return
  if (!window.confirm(`删除「${form.title}」?`)) return
  try {
    await api.remove(form.id)
    events.value = events.value.filter(x => x.id !== form.id)
    editing.value = false
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

function goToday() {
  const d = new Date()
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateLabel(d) {
  if (!d) return ''
  const dt = new Date(`${d}T00:00:00`)
  if (isNaN(dt.getTime())) return d
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const wd = weekdays[dt.getDay()]
  const todayLocal = new Date()
  const isToday = dt.getFullYear() === todayLocal.getFullYear()
    && dt.getMonth() === todayLocal.getMonth()
    && dt.getDate() === todayLocal.getDate()
  return `${d} · ${wd}${isToday ? ' · 今天' : ''}`
}

watch(month, refresh)
refresh()
</script>
