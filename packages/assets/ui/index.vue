<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">资产</h1>
          <p class="mt-1 text-sm text-nt-soft">手上有什么、欠着什么、净下来多少。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加一笔</button>
      </div>

      <div class="mt-6 grid grid-cols-3 gap-3">
        <div class="rounded-md border border-nt-divider bg-white p-3">
          <div class="text-xs text-nt-soft">总资产</div>
          <div class="mt-1 text-lg font-semibold tabular-nums text-emerald-600">¥ {{ fmt(totalAssets) }}</div>
        </div>
        <div class="rounded-md border border-nt-divider bg-white p-3">
          <div class="text-xs text-nt-soft">总负债</div>
          <div class="mt-1 text-lg font-semibold tabular-nums text-nt-danger">¥ {{ fmt(totalLiabilities) }}</div>
        </div>
        <div class="rounded-md border border-nt-divider bg-white p-3">
          <div class="text-xs text-nt-soft">净资产</div>
          <div class="mt-1 text-lg font-semibold tabular-nums"
            :class="netWorth >= 0 ? 'text-emerald-600' : 'text-nt-danger'">
            ¥ {{ fmt(netWorth) }}
          </div>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有记录 —— 点右上角「加一笔」开始。
      </div>

      <template v-else>
        <section v-if="assets.length" class="mt-6">
          <h2 class="mb-2 text-sm font-medium text-nt-soft">资产</h2>
          <ul class="divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
            <li
              v-for="it in assets"
              :key="it.id"
              class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
              @click="openEdit(it)"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
                  <span v-if="it.category" class="shrink-0 text-xs text-nt-soft">{{ it.category }}</span>
                </div>
                <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.note }}</div>
              </div>
              <span class="shrink-0 text-sm font-medium tabular-nums text-emerald-600">¥ {{ fmt(it.amount) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="liabilities.length" class="mt-6">
          <h2 class="mb-2 text-sm font-medium text-nt-soft">负债</h2>
          <ul class="divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
            <li
              v-for="it in liabilities"
              :key="it.id"
              class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
              @click="openEdit(it)"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
                  <span v-if="it.category" class="shrink-0 text-xs text-nt-soft">{{ it.category }}</span>
                </div>
                <div v-if="it.note" class="mt-0.5 truncate text-xs text-nt-soft">{{ it.note }}</div>
              </div>
              <span class="shrink-0 text-sm font-medium tabular-nums text-nt-danger">¥ {{ fmt(it.amount) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </main>

    <datalist id="assets-categories">
      <option value="现金"></option>
      <option value="储蓄"></option>
      <option value="投资"></option>
      <option value="房产"></option>
      <option value="车辆"></option>
      <option value="股票"></option>
      <option value="数字资产"></option>
      <option value="贷款"></option>
      <option value="信用卡欠款"></option>
      <option value="其它"></option>
    </datalist>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑' : '加一笔' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="招行储蓄 / 房贷"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div>
            <span class="text-xs text-nt-soft">类型</span>
            <div class="mt-1 flex gap-3">
              <label class="flex items-center gap-1.5 text-sm text-nt">
                <input v-model="form.kind" type="radio" value="asset" /> 资产
              </label>
              <label class="flex items-center gap-1.5 text-sm text-nt">
                <input v-model="form.kind" type="radio" value="liability" /> 负债
              </label>
            </div>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">分类</span>
            <input v-model="form.category" type="text" list="assets-categories" placeholder="储蓄 / 房产 / 贷款"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">金额(元)</span>
            <input v-model="form.amount" type="number" step="0.01" min="0" placeholder="0.00"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent tabular-nums" />
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
  list:   ()         => fetch('/api/assets').then(r => r.json()),
  create: (body)     => fetch('/api/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/assets/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/assets/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen  = ref(false)
const editingId = ref('')
const form = ref({ name: '', kind: 'asset', category: '', amount: '', note: '' })

const fmt = (cents) => (Number(cents || 0) / 100).toFixed(2)

const assets       = computed(() => items.value.filter(x => x.kind === 'asset'))
const liabilities  = computed(() => items.value.filter(x => x.kind === 'liability'))
const totalAssets      = computed(() => assets.value.reduce((s, x) => s + (x.amount || 0), 0))
const totalLiabilities = computed(() => liabilities.value.reduce((s, x) => s + (x.amount || 0), 0))
const netWorth         = computed(() => totalAssets.value - totalLiabilities.value)

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
  form.value = { name: '', kind: 'asset', category: '', amount: '', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name: it.name, kind: it.kind, category: it.category || '',
    amount: (Number(it.amount || 0) / 100).toFixed(2),
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    name:     form.value.name.trim(),
    kind:     form.value.kind,
    category: form.value.category,
    amount:   Number(form.value.amount || 0),
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
  if (!window.confirm('删除这一笔?')) return
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
