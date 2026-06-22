<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">设备</h1>
          <p class="mt-1 text-sm text-nt-soft">在用的硬件。</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
          @click="openCreate">＋ 加一件</button>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">还没有设备。</div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li v-for="it in items" :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)">
          <img v-if="it.cover" :src="it.cover" class="h-12 w-12 shrink-0 rounded object-cover" alt="" />
          <div v-else class="h-12 w-12 shrink-0 rounded bg-nt-hover"></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-medium text-nt">{{ it.name }}</span>
              <span v-if="it.category" class="rounded bg-nt-hover px-1.5 py-0.5 text-[10px] text-nt-soft">{{ it.category }}</span>
            </div>
            <div v-if="it.brand || it.model" class="mt-0.5 truncate text-xs text-nt-soft">{{ [it.brand, it.model].filter(Boolean).join(' ') }}</div>
          </div>
          <span v-if="it.price > 0" class="shrink-0 text-xs text-nt-soft">¥{{ (it.price / 100).toFixed(2) }}</span>
        </li>
      </ul>
    </main>

    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑设备' : '加一件' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">名称</span>
            <input v-model="form.name" type="text" placeholder="工作 MacBook"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">类别</span>
              <input v-model="form.category" type="text" placeholder="笔记本 / 手机"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">品牌</span>
              <input v-model="form.brand" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">型号</span>
              <input v-model="form.model" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">序列号</span>
              <input v-model="form.serial" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent font-mono" />
            </label>
          </div>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">购入日期</span>
              <input v-model="form.purchased_at" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">价格 (元)</span>
              <input v-model.number="form.priceYuan" type="number" step="0.01"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="2"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">封面</span>
            <div class="mt-1 flex items-center gap-2">
              <img v-if="form.cover" :src="form.cover" class="h-16 w-16 rounded object-cover" alt="" />
              <div v-else class="flex h-16 w-16 items-center justify-center rounded border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
              <div class="flex flex-col gap-1">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickCover" />
                <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-nt-hover" @click="fileInput?.click()">
                  {{ form.cover ? '更换' : '选择图片' }}
                </button>
                <button v-if="form.cover" type="button" class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.cover = null">移除</button>
              </div>
            </div>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button" class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10" @click="onDelete">删除</button>
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
  list:   ()         => fetch('/api/devices').then(r => r.json()),
  create: (body)     => fetch('/api/devices', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/devices/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/devices/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const fileInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const blank = () => ({ name: '', category: '', brand: '', model: '', serial: '', purchased_at: '', priceYuan: 0, note: '', cover: null })
const form = ref(blank())

const canSave = computed(() => form.value.name.trim().length > 0)

async function refresh() {
  loading.value = true; error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() { editingId.value = ''; form.value = blank(); formOpen.value = true }
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name: it.name || '', category: it.category || '', brand: it.brand || '',
    model: it.model || '', serial: it.serial || '',
    purchased_at: it.purchased_at || '', priceYuan: (it.price ?? 0) / 100,
    note: it.note || '', cover: it.cover || null,
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPickCover(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try { const { url } = await uploadImage(file); form.value.cover = url }
  catch (err) { error.value = err?.message || '上传失败' }
  finally { e.target.value = '' }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    name: form.value.name.trim(),
    category: form.value.category.trim(),
    brand: form.value.brand.trim(),
    model: form.value.model.trim(),
    serial: form.value.serial.trim(),
    purchased_at: form.value.purchased_at || null,
    price: Math.round((Number(form.value.priceYuan) || 0) * 100),
    note: form.value.note.trim(),
    cover: form.value.cover,
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
  if (!window.confirm('删除这件?')) return
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
