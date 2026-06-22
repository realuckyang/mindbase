<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">证件库</h1>
          <p class="mt-1 text-sm text-nt-soft">身份证、护照、驾照等。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一个</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有证件。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <img v-if="it.image_front" :src="it.image_front" class="h-12 w-16 shrink-0 rounded object-cover" alt="" />
          <div v-else class="h-12 w-16 shrink-0 rounded bg-nt-hover"></div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-nt">{{ it.name }}</div>
            <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-nt-soft">
              <span v-if="it.number" class="font-mono text-nt-muted">{{ maskedNumber(it.number) }}</span>
              <span v-if="it.expire_at" :class="expireClass(it.expire_at)">至 {{ it.expire_at }}</span>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-lg rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑证件' : '加一个证件' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="身份证 / 中国护照 / C1 驾照"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">证件号</span>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="form.number"
                :type="showNumber ? 'text' : 'password'"
                autocomplete="off"
                class="flex-1 rounded border border-nt-divider bg-white px-2 py-1.5 font-mono text-sm text-nt outline-none focus:border-nt-accent" />
              <button type="button"
                class="shrink-0 rounded border border-nt-divider px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt"
                @click="showNumber = !showNumber"
              >{{ showNumber ? '隐藏' : '显示' }}</button>
            </div>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">发证机关</span>
            <input v-model="form.issuer" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">发证日期</span>
              <input v-model="form.issued_at" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">失效日期</span>
              <input v-model="form.expire_at" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-xs text-nt-soft">正面</span>
              <div class="mt-1">
                <img v-if="form.image_front" :src="form.image_front" class="aspect-[3/2] w-full rounded object-cover" alt="" />
                <div v-else class="flex aspect-[3/2] w-full items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
                <div class="mt-1 flex gap-1">
                  <input ref="frontInput" type="file" accept="image/*" class="hidden" @change="onPick($event, 'image_front')" />
                  <button type="button" class="rounded border border-nt-divider px-2 py-0.5 text-xs text-nt hover:bg-nt-hover" @click="frontInput?.click()">
                    {{ form.image_front ? '更换' : '上传' }}
                  </button>
                  <button v-if="form.image_front" type="button" class="rounded px-2 py-0.5 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.image_front = null">移除</button>
                </div>
              </div>
            </div>
            <div>
              <span class="text-xs text-nt-soft">反面</span>
              <div class="mt-1">
                <img v-if="form.image_back" :src="form.image_back" class="aspect-[3/2] w-full rounded object-cover" alt="" />
                <div v-else class="flex aspect-[3/2] w-full items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
                <div class="mt-1 flex gap-1">
                  <input ref="backInput" type="file" accept="image/*" class="hidden" @change="onPick($event, 'image_back')" />
                  <button type="button" class="rounded border border-nt-divider px-2 py-0.5 text-xs text-nt hover:bg-nt-hover" @click="backInput?.click()">
                    {{ form.image_back ? '更换' : '上传' }}
                  </button>
                  <button v-if="form.image_back" type="button" class="rounded px-2 py-0.5 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.image_back = null">移除</button>
                </div>
              </div>
            </div>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10" @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button" :disabled="busy || !canSave"
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
import { uploadImage } from '@/system/lib/image'

const api = {
  list:   ()         => fetch('/api/docs').then(r => r.json()),
  create: (body)     => fetch('/api/docs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/docs/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/docs/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const showNumber = ref(false)
const frontInput = ref(null)
const backInput  = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ name: '', number: '', issuer: '', issued_at: '', expire_at: '', image_front: null, image_back: null, note: '' })
const form = ref(blank())

const canSave = computed(() => form.value.name.trim().length > 0)

function maskedNumber(n) {
  const s = String(n || '')
  if (!s) return ''
  const last4 = s.slice(-4)
  const groups = Math.max(0, Math.ceil((s.length - 4) / 4))
  return '**** '.repeat(groups).trim() + ' ' + last4
}

function expireClass(d) {
  if (!d) return ''
  const ms = new Date(d + 'T00:00:00').getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  return (ms / 86400000) < 60 ? 'text-nt-danger' : ''
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  showNumber.value = false
  form.value = blank()
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  showNumber.value = false
  form.value = {
    name: it.name || '',
    number: it.number || '',
    issuer: it.issuer || '',
    issued_at: it.issued_at || '',
    expire_at: it.expire_at || '',
    image_front: it.image_front || null,
    image_back: it.image_back || null,
    note: it.note || '',
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPick(e, field) {
  const file = e.target.files?.[0]
  if (!file) return
  try { const { url } = await uploadImage(file); form.value[field] = url }
  catch (err) { error.value = err?.message || '上传失败' }
  finally { e.target.value = '' }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    name: form.value.name.trim(),
    number: form.value.number.trim(),
    issuer: form.value.issuer.trim(),
    issued_at: form.value.issued_at || null,
    expire_at: form.value.expire_at || null,
    image_front: form.value.image_front,
    image_back: form.value.image_back,
    note: form.value.note.trim(),
  }
  busy.value = true
  try {
    const resp = editingId.value ? await api.update(editingId.value, body) : await api.create(body)
    if (!resp?.success) throw new Error(resp?.message || '保存失败')
    closeForm(); await refresh()
  } catch (e) { alert(e?.message || '保存失败') }
  finally { busy.value = false }
}

async function onDelete() {
  if (!window.confirm('删除这个证件?')) return
  busy.value = true
  try {
    const resp = await api.remove(editingId.value)
    if (!resp?.success) throw new Error(resp?.message || '删除失败')
    closeForm(); await refresh()
  } catch (e) { alert(e?.message || '删除失败') }
  finally { busy.value = false }
}

onMounted(refresh)
</script>
