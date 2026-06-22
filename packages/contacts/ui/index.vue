<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">通讯录</h1>
          <p class="mt-1 text-sm text-nt-soft">联系人和他们的方式。</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="rounded-md border border-nt-divider bg-white px-3 py-1.5 text-sm text-nt hover:bg-nt-hover"
            @click="vcardInput?.click()"
          >导入 vCard</button>
          <input ref="vcardInput" type="file" accept=".vcf,text/vcard,text/plain" class="hidden" @change="onPickVCard" />
          <button
            type="button"
            class="rounded-md bg-nt px-3 py-1.5 text-sm text-white hover:bg-nt-strong"
            @click="openCreate"
          >＋ 新建</button>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded border border-nt-danger/30 bg-nt-danger/5 px-3 py-2 text-sm text-nt-danger">{{ error }}</div>
      <div v-if="loading && !items.length" class="mt-10 text-center text-sm text-nt-soft">加载中…</div>
      <div v-else-if="!items.length" class="mt-10 text-center text-sm text-nt-soft">
        还没有联系人 —— 新建一条或导入 vCard。
      </div>

      <ul v-else class="mt-6 divide-y divide-nt-divider rounded-md border border-nt-divider bg-white">
        <li
          v-for="it in items"
          :key="it.id"
          class="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-nt-hover"
          @click="openEdit(it)"
        >
          <img v-if="it.avatar" :src="it.avatar" class="h-10 w-10 shrink-0 rounded-full object-cover" alt="" />
          <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nt-hover text-sm font-medium text-nt-soft">
            {{ initial(it.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-nt">
              {{ it.name }}<span v-if="it.nickname" class="text-nt-soft font-normal"> · {{ it.nickname }}</span>
            </div>
            <div v-if="it.company || it.title" class="mt-0.5 truncate text-xs text-nt-muted">
              {{ [it.company, it.title].filter(Boolean).join(' / ') }}
            </div>
          </div>
          <span v-if="it.phone" class="shrink-0 text-xs text-nt-soft">{{ it.phone }}</span>
        </li>
      </ul>
    </main>

    <!-- 表单 modal -->
    <div v-if="formOpen" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" @click.self="closeForm">
      <div class="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-md bg-white p-4 shadow-lg">
        <h2 class="text-lg font-semibold text-nt">{{ editingId ? '编辑联系人' : '新建联系人' }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs text-nt-soft">姓名</span>
            <input v-model="form.name" type="text" placeholder="必填"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">昵称</span>
              <input v-model="form.nickname" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">生日</span>
              <input v-model="form.birthday" type="date"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">电话</span>
            <input v-model="form.phone" type="tel"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">邮箱</span>
            <input v-model="form.email" type="email"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <div class="flex gap-2">
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">公司</span>
              <input v-model="form.company" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
            <label class="block flex-1">
              <span class="text-xs text-nt-soft">职位</span>
              <input v-model="form.title" type="text"
                class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-nt-soft">地址</span>
            <input v-model="form.address" type="text"
              class="mt-1 w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent" />
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">备注</span>
            <textarea v-model="form.note" rows="3"
              class="mt-1 w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none focus:border-nt-accent"></textarea>
          </label>
          <label class="block">
            <span class="text-xs text-nt-soft">头像</span>
            <div class="mt-1 flex items-center gap-2">
              <img v-if="form.avatar" :src="form.avatar" class="h-16 w-16 rounded-full object-cover" alt="" />
              <div v-else class="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-nt-divider text-xs text-nt-soft">无图</div>
              <div class="flex flex-col gap-1">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickAvatar" />
                <button type="button" class="rounded border border-nt-divider px-2 py-1 text-xs text-nt hover:bg-nt-hover" @click="fileInput?.click()">
                  {{ form.avatar ? '更换' : '选择图片' }}
                </button>
                <button v-if="form.avatar" type="button" class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt-danger" @click="form.avatar = null">
                  移除
                </button>
              </div>
            </div>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <button v-if="editingId" type="button"
            class="rounded px-2 py-1 text-sm text-nt-danger hover:bg-nt-danger/10"
            @click="onDelete">删除</button>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded px-3 py-1.5 text-sm text-nt-muted hover:bg-nt-hover" @click="closeForm">取消</button>
            <button type="button"
              :disabled="busy || !canSave"
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
  list:   ()         => fetch('/api/contacts').then(r => r.json()),
  create: (body)     => fetch('/api/contacts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  update: (id, body) => fetch(`/api/contacts/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  remove: (id)       => fetch(`/api/contacts/${id}`, { method:'DELETE' }).then(r => r.json()),
  importVCard: (text) => fetch('/api/contacts/import', { method:'POST', headers:{'Content-Type':'text/plain'}, body: text }).then(r => r.json()),
}

const items   = ref([])
const loading = ref(true)
const error   = ref('')
const busy    = ref(false)
const fileInput  = ref(null)
const vcardInput = ref(null)

const formOpen  = ref(false)
const editingId = ref('')
const empty = () => ({ name: '', nickname: '', phone: '', email: '', company: '', title: '', address: '', birthday: '', note: '', avatar: null })
const form  = ref(empty())

const canSave = computed(() => form.value.name.trim().length > 0)

function initial(name) {
  const s = String(name || '').trim()
  return s ? s.charAt(0).toUpperCase() : '?'
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const resp = await api.list()
    if (!resp?.success) throw new Error(resp?.message || '加载失败')
    items.value = resp.items || []
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = empty()
  formOpen.value = true
}
function openEdit(it) {
  editingId.value = it.id
  form.value = {
    name:     it.name || '',
    nickname: it.nickname || '',
    phone:    it.phone || '',
    email:    it.email || '',
    company:  it.company || '',
    title:    it.title || '',
    address:  it.address || '',
    birthday: it.birthday || '',
    note:     it.note || '',
    avatar:   it.avatar || null,
  }
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onPickAvatar(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const { url } = await uploadImage(file)
    form.value.avatar = url
  } catch (err) {
    error.value = err?.message || '上传失败'
  } finally {
    e.target.value = ''
  }
}

async function onPickVCard(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const resp = await api.importVCard(text)
    if (!resp?.success) throw new Error(resp?.message || '导入失败')
    {
      const parts = []
      if (resp.inserted) parts.push(`新增 ${resp.inserted}`)
      if (resp.updated)  parts.push(`更新 ${resp.updated}`)
      if (resp.skipped)  parts.push(`跳过重复 ${resp.skipped}`)
      alert(parts.length ? parts.join(' · ') : '没有变化')
    }
    await refresh()
  } catch (err) {
    alert(err?.message || '导入失败')
  } finally {
    e.target.value = ''
  }
}

async function onSave() {
  if (!canSave.value || busy.value) return
  const body = {
    name:     form.value.name.trim(),
    nickname: form.value.nickname.trim(),
    phone:    form.value.phone.trim(),
    email:    form.value.email.trim(),
    company:  form.value.company.trim(),
    title:    form.value.title.trim(),
    address:  form.value.address.trim(),
    birthday: form.value.birthday ? form.value.birthday : null,
    note:     form.value.note.trim(),
    avatar:   form.value.avatar,
  }
  busy.value = true
  try {
    const resp = editingId.value
      ? await api.update(editingId.value, body)
      : await api.create(body)
    if (!resp?.success) throw new Error(resp?.message || '保存失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!window.confirm('删除这条?')) return
  busy.value = true
  try {
    const resp = await api.remove(editingId.value)
    if (!resp?.success) throw new Error(resp?.message || '删除失败')
    closeForm()
    await refresh()
  } catch (e) {
    alert(e?.message || '删除失败')
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
