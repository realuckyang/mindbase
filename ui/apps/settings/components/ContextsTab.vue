<template>
  <section class="mt-6 space-y-4">
    <p class="text-sm text-nt-soft">所有 AI 协作首先读取的内容。写下你希望 AI 第一时间了解的事。</p>

    <form class="flex gap-2" @submit.prevent="onAdd">
      <textarea
        v-model="newContent"
        placeholder="写一条上下文，Enter 保存，Shift+Enter 换行"
        rows="2"
        class="flex-1 rounded-md border border-nt-divider bg-white px-3 py-2 text-sm text-nt outline-none placeholder:text-nt-hint focus:border-nt-muted resize-none"
        @keydown.enter.exact.prevent="onAdd"
        @keydown.enter.shift.exact="newContent += '\n'"
      />
      <button
        type="submit"
        :disabled="!newContent.trim() || busy"
        class="self-end px-4 py-2 rounded-md bg-nt text-white text-sm hover:bg-nt/90 disabled:opacity-40 transition"
      >添加</button>
    </form>

    <div v-if="loading" class="py-4 text-sm text-nt-soft">加载中…</div>
    <div v-else-if="!items.length" class="py-6 text-center text-sm text-nt-soft">
      还没有上下文，写一条让 AI 了解你吧 📌
    </div>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="group relative rounded-md border border-nt-divider bg-white px-4 py-3"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <textarea
              :value="item.content"
              rows="2"
              class="w-full bg-transparent text-sm text-nt outline-none resize-none"
              @change="onSave(item, $event.target.value)"
              @keydown.enter.exact.prevent="$event.target.blur()"
              @keydown.escape="$event.target.value = item.content; $event.target.blur()"
            />
            <div v-if="item.source_app" class="mt-0.5 text-xs text-nt-hint">
              来自 {{ item.source_app }}
            </div>
          </div>
          <button
            type="button"
            class="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 p-1 rounded text-nt-soft hover:text-nt-danger hover:bg-nt-hover-strong transition"
            @click="onDelete(item)"
          >✕</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'

const items      = ref([])
const loading    = ref(true)
const newContent = ref('')
const busy       = ref(false)

async function load() {
  loading.value = true
  try {
    const { contexts } = await api.get('/api/contexts')
    items.value = contexts || []
  } catch {} finally {
    loading.value = false
  }
}

async function onAdd() {
  const content = newContent.value.trim()
  if (!content || busy.value) return
  busy.value = true
  try {
    const { context } = await api.post('/api/contexts', { content })
    items.value.push(context)
    newContent.value = ''
  } catch (e) {
    alert(e?.message || '创建失败')
  } finally {
    busy.value = false
  }
}

async function onSave(item, val) {
  const content = val.trim()
  if (!content || content === item.content) return
  try {
    const { context } = await api.patch(`/api/contexts/${item.id}`, { content })
    const i = items.value.findIndex(x => x.id === item.id)
    if (i >= 0) items.value[i] = context
  } catch (e) {
    alert(e?.message || '更新失败')
  }
}

async function onDelete(item) {
  if (!window.confirm('删除这条上下文？')) return
  try {
    await api.delete(`/api/contexts/${item.id}`)
    items.value = items.value.filter(x => x.id !== item.id)
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

onMounted(load)
</script>
