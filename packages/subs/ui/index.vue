<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">订阅</h1>
          <p class="mt-1 text-sm text-nt-soft">在用的订阅服务和下次扣款日。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加一条</button>
      </div>

      <!-- 月度支出统计 -->
      <div class="mt-6 grid grid-cols-2 gap-3 text-center">
        <div class="rounded-md border border-nt-divider bg-white px-3 py-3">
          <div class="text-[11px] text-nt-soft">每月总支出</div>
          <div class="mt-0.5 text-lg font-semibold tabular-nums text-nt">¥ {{ fmt(monthlyTotal) }}</div>
        </div>
        <div class="rounded-md border border-nt-divider bg-white px-3 py-3">
          <div class="text-[11px] text-nt-soft">每年总支出</div>
          <div class="mt-0.5 text-lg font-semibold tabular-nums text-nt">¥ {{ fmt(monthlyTotal * 12) }}</div>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有订阅 —— 点右上角「加一条」开始记录。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in items"
          :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-nt">{{ it.name }}</div>
            <div class="mt-0.5 text-xs text-nt-soft">
              <span class="tabular-nums">¥ {{ fmt(it.amount) }}</span>
              <span class="mx-1">·</span>
              <span>{{ it.cycle === 'yearly' ? '年付' : '月付' }}</span>
              <template v-if="it.next_charge">
                <span class="mx-1">·</span>
                <span>下次 {{ it.next_charge }}</span>
              </template>
            </div>
            <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-hint">{{ it.note }}</div>
          </div>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑订阅' : '加一条订阅' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">服务名</span>
            <input v-model="form.name" type="text" placeholder="Netflix"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">金额(元)</span>
              <input v-model="form.amount" type="number" step="0.01" min="0" placeholder="0.00"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block w-28">
              <span class="text-xs text-nt-soft">周期</span>
              <select v-model="form.cycle"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent">
                <option value="monthly">月付</option>
                <option value="yearly">年付</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">下次扣款日</span>
            <input v-model="form.next_charge" type="date"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
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
import { ref, computed, onMounted } from 'vue'

const api = {
  list:   ()         => fetch('/api/subs').then(r => r.json()),
  create: (body)     => fetch('/api/subs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/subs/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/subs/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ name: '', amount: '', cycle: 'monthly', next_charge: '', note: '' })

const fmt = (cents) => (Number(cents || 0) / 100).toFixed(2)

const monthlyTotal = computed(() => {
  // 单位"分"
  return items.value.reduce((sum, it) => {
    return sum + (it.cycle === 'yearly' ? Math.round(it.amount / 12) : it.amount)
  }, 0)
})

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
  form.value = { name: '', amount: '', cycle: 'monthly', next_charge: '', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name: it.name,
    amount: (Number(it.amount || 0) / 100).toFixed(2),
    cycle: it.cycle,
    next_charge: it.next_charge || '',
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    name:        form.value.name.trim(),
    amount:      Number(form.value.amount || 0),
    cycle:       form.value.cycle,
    next_charge: form.value.next_charge || null,
    note:        form.value.note,
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
  if (!window.confirm('删除这条订阅?')) return
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
