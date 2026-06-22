<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">待办</h1>
      <p class="mt-1 text-sm text-nt-soft">要做的事,一项一项完成。</p>

      <form
        class="mt-6 flex items-center gap-2 rounded-md border border-nt-divider bg-white px-3 py-2"
        @submit.prevent="onAdd"
      >
        <span class="text-nt-soft">＋</span>
        <input
          v-model="newTitle"
          type="text"
          placeholder="添加一个任务,回车保存"
          :disabled="busy"
          class="flex-1 bg-transparent text-[15px] text-nt outline-none placeholder:text-nt-hint"
        />
      </form>

      <div v-if="loading" class="mt-8 py-6 text-sm text-nt-soft">加载中…</div>
      <div v-else-if="error" class="mt-8 py-6 text-sm text-nt-danger">{{ error }}</div>
      <div v-else-if="!sorted.length" class="mt-12 py-8 text-center text-sm text-nt-soft">还没有任务,从上面写一条吧 ✨</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="t in sorted" :key="t.id" class="px-2 py-1 md:px-3">
          <div
            :class="[
              'group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-nt-hover',
              t.done ? 'text-nt-soft' : '',
            ]"
          >
            <button
              type="button"
              :class="[
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition',
                t.done ? 'border-nt bg-nt text-white' : 'border-nt-divider hover:border-nt-muted',
              ]"
              @click="onToggle(t)"
            >{{ t.done ? '✓' : '' }}</button>

            <input
              type="text"
              :value="t.title"
              :class="[
                'flex-1 min-w-0 bg-transparent text-[15px] outline-none',
                t.done ? 'line-through text-nt-soft' : 'text-nt',
              ]"
              @change="onSaveTitle(t, $event.target.value)"
              @keydown="onTitleKey($event, t)"
            />

            <button
              type="button"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-nt-soft hover:bg-nt-hover-strong hover:text-nt-danger"
              title="删除"
              @click="onDelete(t)"
            ><span class="text-base leading-none">✕</span></button>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'

const apiTodos = {
  list:   ()           => api.get('/api/todos'),
  create: ({ title })  => api.post('/api/todos', { title }),
  update: (id, patch)  => api.patch(`/api/todos/${id}`, patch),
  remove: (id)         => api.delete(`/api/todos/${id}`),
}

const todos   = ref([])
const loading = ref(true)
const error   = ref('')

async function load() {
  loading.value = true
  try {
    const { todos: list } = await apiTodos.list()
    todos.value = list
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const sorted = computed(() =>
  [...todos.value].sort((a, b) =>
    (a.done - b.done) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  )
)

const newTitle = ref('')
const busy     = ref(false)
async function onAdd() {
  const title = newTitle.value.trim()
  if (!title || busy.value) return
  busy.value = true
  try {
    const { todo } = await apiTodos.create({ title })
    todos.value.push(todo)
    newTitle.value = ''
  } catch (e) {
    alert(e?.message || '创建失败')
  } finally {
    busy.value = false
  }
}

async function onToggle(t) {
  const next = !t.done
  t.done = next
  try {
    const { todo } = await apiTodos.update(t.id, { done: next })
    const i = todos.value.findIndex(x => x.id === t.id)
    if (i >= 0) todos.value[i] = todo
  } catch (e) {
    t.done = !next
    alert(e?.message || '更新失败')
  }
}

async function onSaveTitle(t, val) {
  const title = String(val || '').trim()
  if (!title || title === t.title) return
  try {
    const { todo } = await apiTodos.update(t.id, { title })
    const i = todos.value.findIndex(x => x.id === t.id)
    if (i >= 0) todos.value[i] = todo
  } catch (e) {
    alert(e?.message || '更新失败')
  }
}

function onTitleKey(e, t) {
  if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
  if (e.key === 'Escape') { e.target.value = t.title; e.target.blur() }
}

async function onDelete(t) {
  if (!window.confirm('删除这个任务?')) return
  try {
    await apiTodos.remove(t.id)
    todos.value = todos.value.filter(x => x.id !== t.id)
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

onMounted(load)
</script>
