<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">银行卡</h1>
          <p class="mt-1 text-sm text-nt-soft">你的银行卡和信用卡。</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate"
        >＋ 加一张</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有卡 —— 点右上角「加一张」开始。
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
            <div class="mt-0.5 flex items-center gap-2 text-xs text-nt-soft">
              <span v-if="it.bank">{{ it.bank }}</span>
              <span class="font-mono text-nt-muted">{{ maskedNumber(it.card_number) }}</span>
            </div>
          </div>
          <span class="shrink-0 text-xs text-nt-soft">{{ typeLabel(it.type) }}</span>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑卡' : '加一张卡' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">备注名</span>
            <input v-model="form.name" type="text" placeholder="招商工资卡"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">银行</span>
            <input v-model="form.bank" type="text" placeholder="招商银行"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">卡号</span>
            <div class="mt-1 flex items-center gap-2">
              <input
                v-model="form.card_number"
                :type="showNumber ? 'text' : 'password'"
                inputmode="numeric"
                autocomplete="off"
                class="flex-1 rounded border border-nt-divider bg-white px-2 py-1.5 font-mono text-sm text-nt outline-none focus:border-nt-accent" />
              <button type="button"
                class="shrink-0 rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                @click="showNumber = !showNumber"
              >{{ showNumber ? '隐藏' : '显示' }}</button>
            </div>
          </label>
          <div>
            <span class="text-xs text-nt-soft">类型</span>
            <div class="mt-1 flex gap-4 text-sm">
              <label class="inline-flex items-center gap-1.5">
                <input type="radio" value="debit" v-model="form.type" /> 借记卡
              </label>
              <label class="inline-flex items-center gap-1.5">
                <input type="radio" value="credit" v-model="form.type" /> 信用卡
              </label>
            </div>
          </div>
          <label v-if="form.type === 'credit'" class="block">
            <span class="text-xs text-nt-soft">有效期 (MM/YY)</span>
            <input v-model="form.expire" type="text" placeholder="08/28" maxlength="5"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
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
  list:   ()         => fetch('/api/cards').then(r => r.json()),
  create: (body)     => fetch('/api/cards', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/cards/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/cards/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)

const formOpen   = ref(false)
const editingId  = ref('')
const showNumber = ref(false)
const form = ref({ name: '', bank: '', card_number: '', type: 'debit', expire: '', note: '' })

const typeLabel = (t) => (t === 'credit' ? '信用卡' : '借记卡')

function maskedNumber(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (!digits) return ''
  const last4 = digits.slice(-4)
  return `**** **** **** ${last4}`
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
  showNumber.value = false
  form.value = { name: '', bank: '', card_number: '', type: 'debit', expire: '', note: '' }
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  showNumber.value = false
  form.value = {
    name: it.name,
    bank: it.bank || '',
    card_number: it.card_number || '',
    type: it.type || 'debit',
    expire: it.expire || '',
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSave() {
  const body = {
    name:        form.value.name.trim(),
    bank:        form.value.bank.trim(),
    card_number: form.value.card_number.trim(),
    type:        form.value.type,
    expire:      form.value.type === 'credit' ? form.value.expire.trim() : '',
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
  if (!window.confirm('删除这张卡?')) return
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
