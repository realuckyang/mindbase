<template>
  <div>
    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 md:px-12 md:pt-10">
      <h1 class="text-3xl md:text-[40px] font-bold leading-tight tracking-tight text-nt">主页</h1>
      <p class="mt-1 text-sm text-nt-soft">日常记下来的,加上应用里发生的事都会出现在这里。</p>

      <!-- 输入卡 -->
      <div
        class="mt-6 rounded-md border border-nt-divider bg-white p-3 md:p-4"
        :class="dropping ? 'border-nt-accent bg-nt-accent-bg' : ''"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <textarea
          ref="inputEl"
          v-model="draft"
          rows="3"
          placeholder="此刻在想什么…  (⌘/Ctrl + Enter 记下)"
          :disabled="busy"
          class="w-full resize-none bg-transparent text-[15px] leading-relaxed text-nt outline-none placeholder:text-nt-hint"
          @paste="onPaste"
          @keydown.meta.enter.prevent="onSubmit"
          @keydown.ctrl.enter.prevent="onSubmit"
        ></textarea>

        <!-- 待发送图片预览 -->
        <div v-if="pendingImages.length" class="mt-2 flex flex-wrap gap-2">
          <div
            v-for="(img, idx) in pendingImages"
            :key="img.url"
            class="group relative overflow-hidden rounded border border-nt-divider"
          >
            <img :src="img.url" class="block h-20 w-20 object-cover" alt="" />
            <button
              type="button"
              class="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-bl bg-black/60 text-xs text-white group-hover:flex"
              @click="removePending(idx)"
            >✕</button>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="uploading"
              class="rounded px-2 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt disabled:opacity-50"
              title="添加图片"
              @click="triggerPick"
            >🖼️ {{ uploading ? '上传中…' : '图片' }}</button>
            <input
              ref="fileInputEl"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="onFilePicked"
            />
          </div>
          <button
            type="button"
            :disabled="busy || (!draft.trim() && !pendingImages.length)"
            class="rounded-md bg-nt px-4 py-1.5 text-sm text-white hover:bg-black disabled:opacity-50"
            @click="onSubmit"
          >{{ busy ? '记下中…' : '记下' }}</button>
        </div>
      </div>

      <!-- 时间轴 -->
      <div v-if="loading && !timeline.length" class="mt-6 py-10 text-sm text-nt-soft">加载中…</div>
      <div v-else-if="error" class="mt-6 py-10 text-sm text-nt-danger">{{ error }}</div>
      <div v-else-if="!timeline.length" class="mt-6 py-16 text-center text-sm text-nt-soft">
        还没有内容。试着写下第一条 ✨
      </div>

      <div v-else class="mt-6">
        <div v-for="group in grouped" :key="group.label" class="mb-6">
          <div class="sticky top-11 z-10 -mx-4 md:-mx-12 px-4 md:px-12 py-1.5 bg-white/95 backdrop-blur text-xs font-medium text-nt-soft">
            {{ group.label }}
          </div>
          <div class="mt-2">
            <template v-for="entry in group.items" :key="entry.kind + ':' + entry.id">
              <!-- 用户 post -->
              <article v-if="entry.kind === 'post'" class="group">
                <div class="-mx-3 border-b border-nt-divider px-3 py-3 md:py-4">
                  <div class="mb-1 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-nt-soft">{{ formatTime(entry.created_at) }}</span>
                      <span
                        v-if="entry.author && entry.author !== 'user'"
                        class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
                        :style="{
                          color: authorMeta(entry.author).color,
                          background: authorMeta(entry.author).color ? authorMeta(entry.author).color + '14' : 'transparent',
                        }"
                      >{{ authorMeta(entry.author).emoji }} {{ authorMeta(entry.author).label }}</span>
                    </div>
                    <button
                      v-if="editingId !== entry.id"
                      type="button"
                      class="flex h-6 w-6 items-center justify-center rounded text-nt-soft hover:bg-nt-hover hover:text-nt"
                      title="更多"
                      @click="openMenu(entry.id, $event)"
                    ><span class="text-base leading-none">⋯</span></button>
                  </div>

                  <!-- 编辑态 -->
                  <template v-if="editingId === entry.id">
                    <textarea
                      v-model="editDraft"
                      rows="3"
                      class="w-full resize-none rounded border border-nt-divider bg-white px-2 py-1.5 text-[15px] leading-relaxed text-nt outline-none focus:border-nt-accent"
                      @keydown.meta.enter.prevent="onEditSave(entry)"
                      @keydown.ctrl.enter.prevent="onEditSave(entry)"
                      @keydown.esc.prevent="onEditCancel"
                      @paste="onEditPaste"
                    ></textarea>
                    <div class="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="rounded px-3 py-1 text-xs text-nt-muted hover:bg-nt-hover"
                        @click="onEditCancel"
                      >取消</button>
                      <button
                        type="button"
                        :disabled="editBusy || !editDraft.trim()"
                        class="rounded-md bg-nt px-3 py-1 text-xs text-white hover:bg-black disabled:opacity-50"
                        @click="onEditSave(entry)"
                      >{{ editBusy ? '保存中…' : '保存' }}</button>
                    </div>
                  </template>

                  <!-- 显示态 -->
                  <template v-else>
                    <div :class="{ 'post-clamp': isLong(entry) && !expandedIds.has(entry.id) }">
                      <PostItem :content="entry.content" />
                    </div>
                    <button
                      v-if="isLong(entry)"
                      type="button"
                      class="mt-1 text-xs text-nt-soft hover:text-nt"
                      @click="toggleExpand(entry.id)"
                    >{{ expandedIds.has(entry.id) ? '收起' : '展开' }}</button>
                  </template>
                </div>
              </article>

              <!-- 事件 -->
              <div v-else class="border-b border-nt-divider">
                <EventItem :ev="entry" />
              </div>
            </template>
          </div>
        </div>

        <!-- 分页 sentinel -->
        <div ref="sentinelEl" class="py-6 text-center text-xs text-nt-soft">
          <span v-if="loadingMore">加载中…</span>
          <span v-else-if="!hasMore && timeline.length">— 到底了 —</span>
        </div>
      </div>
    </main>

    <!-- post 卡片的更多菜单 -->
    <Popover :open="!!menuOpenId" :anchor="menuAnchor" :width="120" @close="closeMenu">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-nt hover:bg-nt-hover"
        @click="onMenuEdit"
      ><span>✏️</span> 编辑</button>
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-nt-muted hover:bg-nt-hover hover:text-nt-danger"
        @click="onMenuDelete"
      ><span>🗑️</span> 删除</button>
    </Popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import PostItem from '@/apps/home/components/PostItem.vue'
import EventItem from '@/apps/home/components/EventItem.vue'
import Popover from '@/system/components/Popover.vue'
import { api } from '@/api'
import { uploadImage } from '@/system/lib/image'
import { authorMeta } from '@/system/lib/authors'

// 时间轴 = 用户 posts + 应用事件,按 created_at 倒序混排。
// posts 用 offset 分页,events 一次性拉(默认 200 条上限够用)。
const PAGE_SIZE = 30

const posts       = ref([])
const events      = ref([])
const offset      = ref(0)
const loading     = ref(true)
const loadingMore = ref(false)
const hasMore     = ref(true)
const error       = ref('')
const sentinelEl  = ref(null)
let observer = null

async function loadInitial() {
  loading.value = true
  error.value = ''
  try {
    const [postResp, eventResp] = await Promise.all([
      api.get(`/api/home?offset=0&limit=${PAGE_SIZE}`),
      api.get('/api/home/events'),
    ])
    posts.value  = postResp.items || []
    events.value = eventResp.items || []
    offset.value = posts.value.length
    if (posts.value.length < PAGE_SIZE) hasMore.value = false
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMorePosts() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const resp = await api.get(`/api/home?offset=${offset.value}&limit=${PAGE_SIZE}`)
    const list = resp.items || []
    posts.value.push(...list)
    offset.value += list.length
    if (list.length < PAGE_SIZE) hasMore.value = false
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loadingMore.value = false
  }
}

const timeline = computed(() => {
  const arr = []
  for (const p of posts.value)  arr.push({ ...p, kind: 'post' })
  for (const e of events.value) arr.push({ ...e, kind: 'event' })
  arr.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return arr
})

function ensureObserver() {
  if (observer || !sentinelEl.value) return
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMorePosts()
  }, { rootMargin: '300px 0px' })
  observer.observe(sentinelEl.value)
}

// === 新增 post ===
const draft = ref('')
const busy  = ref(false)
const inputEl = ref(null)
const fileInputEl = ref(null)
const pendingImages = ref([])
const uploading = ref(false)
const dropping  = ref(false)

function triggerPick() { fileInputEl.value?.click() }
function removePending(idx) { pendingImages.value.splice(idx, 1) }

async function handleFiles(files) {
  if (!files || !files.length) return
  uploading.value = true
  try {
    for (const file of files) {
      if (!file || !file.type?.startsWith('image/')) continue
      try {
        const { url } = await uploadImage(file)
        pendingImages.value.push({ url })
      } catch (e) {
        alert(`图片上传失败: ${e?.message || ''}`)
      }
    }
  } finally {
    uploading.value = false
  }
}

function onFilePicked(e) {
  const files = Array.from(e.target.files || [])
  handleFiles(files)
  e.target.value = ''
}

async function onPaste(e) {
  const files = []
  for (const item of e.clipboardData?.items || []) {
    if (item.kind === 'file') {
      const f = item.getAsFile()
      if (f && f.type?.startsWith('image/')) files.push(f)
    }
  }
  if (files.length) {
    e.preventDefault()
    await handleFiles(files)
  }
}

function onDragEnter() { dropping.value = true }
function onDragOver()  { dropping.value = true }
function onDragLeave() { dropping.value = false }
async function onDrop(e) {
  dropping.value = false
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type?.startsWith('image/'))
  if (files.length) await handleFiles(files)
}

function buildContent(text, images) {
  const t = (text || '').trim()
  const imgLines = images.map(i => `![](${i.url})`).join('\n')
  if (t && imgLines) return `${t}\n\n${imgLines}`
  return t || imgLines
}

async function onSubmit() {
  const content = buildContent(draft.value, pendingImages.value)
  if (!content || busy.value) return
  busy.value = true
  try {
    const resp = await api.post('/api/home', { content })
    if (resp.post) posts.value.unshift(resp.post)
    draft.value = ''
    pendingImages.value = []
    inputEl.value?.focus()
  } catch (e) {
    alert(e?.message || '记下失败')
  } finally {
    busy.value = false
  }
}

// === 展开 / 收起 ===
const expandedIds = ref(new Set())
function toggleExpand(id) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  expandedIds.value = s
}
function isLong(m) {
  const c = m.content || ''
  return c.length > 220 || (c.match(/\n/g) || []).length >= 5
}

// === 编辑已有 post ===
const editingId = ref('')
const editDraft = ref('')
const editBusy  = ref(false)

function onEdit(m) {
  editingId.value = m.id
  editDraft.value = m.content
}
function onEditCancel() {
  editingId.value = ''
  editDraft.value = ''
}
async function onEditSave(m) {
  const content = editDraft.value.trim()
  if (!content || editBusy.value) return
  editBusy.value = true
  try {
    const resp = await api.patch(`/api/home/${m.id}`, { content })
    const i = posts.value.findIndex(x => x.id === m.id)
    if (i >= 0 && resp.post) posts.value[i] = resp.post
    onEditCancel()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    editBusy.value = false
  }
}
async function onEditPaste(e) {
  const files = []
  for (const item of e.clipboardData?.items || []) {
    if (item.kind === 'file') {
      const f = item.getAsFile()
      if (f && f.type?.startsWith('image/')) files.push(f)
    }
  }
  if (!files.length) return
  e.preventDefault()
  uploading.value = true
  try {
    for (const file of files) {
      try {
        const { url } = await uploadImage(file)
        editDraft.value = (editDraft.value ? editDraft.value + '\n' : '') + `![](${url})`
      } catch (err) {
        alert(`图片上传失败: ${err?.message || ''}`)
      }
    }
  } finally {
    uploading.value = false
  }
}

// === 卡片更多菜单 ===
const menuOpenId = ref('')
const menuAnchor = ref(null)

function openMenu(id, evt) {
  menuOpenId.value = id
  menuAnchor.value = evt.currentTarget
}
function closeMenu() {
  menuOpenId.value = ''
  menuAnchor.value = null
}
function onMenuEdit() {
  const m = posts.value.find(x => x.id === menuOpenId.value)
  closeMenu()
  if (m) onEdit(m)
}
function onMenuDelete() {
  const m = posts.value.find(x => x.id === menuOpenId.value)
  closeMenu()
  if (m) onDelete(m)
}

// === 删除 ===
async function onDelete(m) {
  if (!window.confirm('删除这条?')) return
  try {
    await api.delete(`/api/home/${m.id}`)
    posts.value = posts.value.filter(x => x.id !== m.id)
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

// === 时间分组 ===
function pad(n) { return String(n).padStart(2, '0') }
function formatTime(ts) {
  const d = parseTs(ts)
  if (!d) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function parseTs(ts) {
  if (!ts) return null
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}
function dateLabel(ts) {
  const d = parseTs(ts)
  if (!d) return '未知'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yest  = new Date(today); yest.setDate(today.getDate() - 1)
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (local.getTime() === today.getTime()) return '今天'
  if (local.getTime() === yest.getTime())  return '昨天'
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

const grouped = computed(() => {
  const groups = []
  for (const entry of timeline.value) {
    const label = dateLabel(entry.created_at)
    const g = groups.find(g => g.label === label)
    if (g) g.items.push(entry)
    else groups.push({ label, items: [entry] })
  }
  return groups
})

onMounted(async () => {
  await loadInitial()
  await nextTick()
  ensureObserver()
})
onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>
