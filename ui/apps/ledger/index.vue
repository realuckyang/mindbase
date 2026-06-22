<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">记账</h1>
          <p class="mt-1 text-sm text-nt-soft">逐笔记录的收支,助理可以查询统计。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 记一笔</button>
      </div>

      <!-- 月份选择 + 三块统计 -->
      <div class="mt-6 flex items-center gap-3 text-sm">
        <input
          v-model="month"
          type="month"
          class="rounded border border-nt-divider bg-white px-2 py-1 text-sm text-nt outline-none focus:border-nt-accent"
        />
        <span class="text-xs text-nt-soft">月度统计</span>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-3 text-center">
        <div class="rounded-md border border-nt-divider bg-white px-3 py-3">
          <div class="text-[11px] text-nt-soft">支出</div>
          <div class="mt-0.5 text-lg font-semibold tabular-nums text-nt-danger">¥ {{ fmt(stats.expense) }}</div>
        </div>
        <div class="rounded-md border border-nt-divider bg-white px-3 py-3">
          <div class="text-[11px] text-nt-soft">收入</div>
          <div class="mt-0.5 text-lg font-semibold tabular-nums text-emerald-700">¥ {{ fmt(stats.income) }}</div>
        </div>
        <div class="rounded-md border border-nt-divider bg-white px-3 py-3">
          <div class="text-[11px] text-nt-soft">结余</div>
          <div class="mt-0.5 text-lg font-semibold tabular-nums" :class="stats.balance >= 0 ? 'text-nt' : 'text-nt-danger'">
            {{ stats.balance >= 0 ? '+' : '−' }}¥ {{ fmt(Math.abs(stats.balance)) }}
          </div>
        </div>
      </div>

      <!-- 列表 -->
      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>

      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>

      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        本月还没有记录 —— 点右上角「记一笔」加一条。
      </div>

      <div v-else class="mt-6 space-y-5">
        <section v-for="group in groupedItems" :key="group.date">
          <div class="mb-2 flex items-baseline justify-between text-xs text-nt-soft">
            <span>{{ group.date }}</span>
            <span class="tabular-nums">
              <span v-if="group.income" class="text-emerald-700">+¥{{ fmt(group.income) }}</span>
              <span v-if="group.income && group.expense" class="text-nt-hint mx-1">·</span>
              <span v-if="group.expense" class="text-nt-danger">−¥{{ fmt(group.expense) }}</span>
            </span>
          </div>
          <ul class="divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
            <li
              v-for="it in group.items"
              :key="it.id"
              class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-nt-hover"
              @click="openEdit(it)"
            >
              <span class="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-base"
                :class="it.type === 'expense' ? 'bg-nt-danger/10 text-nt-danger' : 'bg-emerald-50 text-emerald-700'"
              >{{ it.type === 'expense' ? '−' : '+' }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="truncate text-sm font-medium text-nt">{{ it.category || '未分类' }}</span>
                </div>
                <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.note }}</div>
              </div>
              <span class="shrink-0 text-base font-semibold tabular-nums"
                :class="it.type === 'expense' ? 'text-nt-danger' : 'text-emerald-700'"
              >¥ {{ fmt(it.amount) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑' : '记一笔' }}</h2>
        <div class="mt-4">
          <LedgerEditor
            :model-value="form"
            :is-edit="!!editingId"
            :category-options="categoryOptions"
            @save="onSave"
            @cancel="closeForm"
            @delete="onDelete"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '@/api'
import LedgerEditor from '@/apps/ledger/components/LedgerEditor.vue'

const apiLedger = {
  list: ({ month = null, type = null, limit = 500 } = {}) => {
    const p = new URLSearchParams()
    if (month) p.set('month', month)
    if (type)  p.set('type',  type)
    p.set('limit', String(limit))
    return api.get(`/api/ledger?${p}`)
  },
  stats:      (month = null) => api.get(`/api/ledger/stats${month ? `?month=${month}` : ''}`),
  categories: ()             => api.get('/api/ledger/categories'),
  get:        (id)           => api.get(`/api/ledger/${id}`),
  create:     (patch)        => api.post('/api/ledger', patch),
  update:     (id, patch)    => api.patch(`/api/ledger/${id}`, patch),
  remove:     (id)           => api.delete(`/api/ledger/${id}`),
}

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const month   = ref(currentMonth)
const items   = ref([])
const stats   = ref({ expense: 0, income: 0, balance: 0 })
const loading = ref(true)
const error   = ref('')

const formOpen        = ref(false)
const editingId       = ref(null)
const form            = ref({ type: 'expense', amount: '', category: '', note: '', happened_at: todayIso() })
const categoryOptions = ref([])

const fmt = (cents) => (Number(cents || 0) / 100).toFixed(2)

const groupedItems = computed(() => {
  const map = new Map()
  for (const it of items.value) {
    const d = it.happened_at
    if (!map.has(d)) map.set(d, { date: d, items: [], expense: 0, income: 0 })
    const g = map.get(d)
    g.items.push(it)
    if (it.type === 'expense') g.expense += it.amount
    else                       g.income  += it.amount
  }
  return [...map.values()].sort((a, b) => a.date < b.date ? 1 : -1)
})

const refresh = async () => {
  loading.value = true
  error.value = ''
  try {
    const [listRes, statsRes] = await Promise.all([
      apiLedger.list({ month: month.value }),
      apiLedger.stats(month.value),
    ])
    items.value = listRes.items || []
    stats.value = { expense: statsRes.expense, income: statsRes.income, balance: statsRes.balance }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const { categories } = await apiLedger.categories()
    categoryOptions.value = categories || []
  } catch {}
}

function openCreate() {
  editingId.value = null
  form.value = { type: 'expense', amount: '', category: '', note: '', happened_at: todayIso() }
  formOpen.value = true
}

function openEdit(it) {
  editingId.value = it.id
  form.value = {
    type:        it.type,
    amount:      (it.amount / 100).toFixed(2),
    category:    it.category || '',
    note:        it.note || '',
    happened_at: it.happened_at,
  }
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

async function onSave(patch) {
  try {
    if (editingId.value) await apiLedger.update(editingId.value, patch)
    else                 await apiLedger.create(patch)
    closeForm()
    await Promise.all([refresh(), loadCategories()])
  } catch (e) {
    alert(e.message)
  }
}

async function onDelete() {
  if (!editingId.value) return
  if (!confirm('删除这条记录?')) return
  try {
    await apiLedger.remove(editingId.value)
    closeForm()
    await refresh()
  } catch (e) {
    alert(e.message)
  }
}

watch(month, refresh)
onMounted(() => { refresh(); loadCategories() })
</script>
