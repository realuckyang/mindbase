<template>
  <div class="relative">
    <div
      v-if="showPlaceholder"
      class="pointer-events-none absolute left-0 top-0 text-base leading-7 text-nt-hint"
    >
      {{ placeholder }}
    </div>
    <div
      ref="editorRef"
      contenteditable="true"
      class="min-h-[60vh] w-full whitespace-pre-wrap break-words text-base leading-7 text-nt outline-none
             [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md
             [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight
             [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight
             [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-xl  [&_h3]:font-semibold
             [&_strong]:font-bold [&_b]:font-bold
             [&_em]:italic [&_i]:italic"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
      @drop.prevent="onDrop"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />

    <div v-if="uploading" class="mt-2 text-xs text-nt-soft">上传图片中…</div>
    <div v-if="uploadError" class="mt-2 text-xs text-nt-danger">上传失败:{{ uploadError }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { uploadImage } from '@/system/lib/image'
import { contentToHtml, escapeForHtml } from '@/system/lib/html'

const props = defineProps({
  value:       { type: String, default: '' },
  placeholder: { type: String, default: '开始写点什么…' },
})
const emit = defineEmits(['update:value', 'input'])

const editorRef   = ref(null)
const uploading   = ref(false)
const uploadError = ref('')

// IME 输入期间不要 emit,否则中文/日文打到一半会触发 prop 来回同步
let isComposing = false
// 最近一次我们 emit 出去的 HTML。父组件把它原样 setBack 时,跳过 resync,
// 避免触发 innerHTML 重赋值 → 光标被拉回开头(移动端尤其容易出)
let lastEmitted = null

const showPlaceholder = computed(() => {
  const v = props.value || ''
  if (!v.trim()) return true
  const stripped = v.replace(/<br\s*\/?>/gi, '').replace(/<div>\s*<\/div>/gi, '').trim()
  return stripped === ''
})

function syncFromProp() {
  const el = editorRef.value
  if (!el) return
  const nextHtml = contentToHtml(props.value || '')
  if (el.innerHTML === nextHtml) return
  // 父组件把我们刚 emit 的值原样送回来 → 跳过,保留光标
  if (props.value === lastEmitted) return
  // 当前 DOM 内容跟目标的语义相同(只是没包 <div>),别重写
  if (contentToHtml(el.innerHTML || '') === nextHtml) return
  el.innerHTML = nextHtml
}

onMounted(syncFromProp)
watch(() => props.value, syncFromProp)

function emitChange() {
  const el = editorRef.value
  if (!el) return
  const html = el.innerHTML
  lastEmitted = html
  emit('update:value', html)
  emit('input', html)
}

function onCompositionStart() { isComposing = true }
function onCompositionEnd()   { isComposing = false; emitChange() }

// ───────── 键盘快捷键:Cmd/Ctrl+B / Cmd/Ctrl+I ─────────
function onKeydown(e) {
  const ctrl = e.metaKey || e.ctrlKey
  if (!ctrl || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'b') { e.preventDefault(); document.execCommand('bold');   emitChange() }
  if (k === 'i') { e.preventDefault(); document.execCommand('italic'); emitChange() }
}

// ───────── 行首 markdown 快捷键:#/##/### + 空格 → H1/H2/H3 ─────────
const BLOCK_TAGS = new Set(['DIV','P','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE'])

function enclosingBlock(node, root) {
  let el = node.nodeType === 1 ? node : node.parentElement
  while (el && el !== root) {
    if (BLOCK_TAGS.has(el.tagName)) return el
    el = el.parentElement
  }
  return null
}

function tryMarkdownHeading() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const root = editorRef.value
  if (!root) return false

  const block = enclosingBlock(sel.anchorNode, root) || root
  const text  = block.textContent || ''
  const m = text.match(/^(#{1,3}) $/)
  if (!m) return false

  const level = m[1].length
  // 清空当前 block 内容,再 formatBlock 成 H1/H2/H3
  while (block.firstChild) block.removeChild(block.firstChild)

  // 光标要落在刚被清空的 block 里
  const r = document.createRange()
  r.setStart(block, 0)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)

  document.execCommand('formatBlock', false, `H${level}`)
  return true
}

function onInput(e) {
  if (isComposing) return   // IME 组合阶段,等 compositionend
  if (e.inputType === 'insertText' && e.data === ' ') {
    if (tryMarkdownHeading()) {
      emitChange()
      return
    }
  }
  emitChange()
}

// ───────── 粘贴 / 拖放图片 ─────────
function onPaste(e) {
  const cd = e.clipboardData
  if (!cd) return

  const items = cd.items || []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        handleImageFile(file)
        return
      }
    }
  }

  e.preventDefault()
  const text = cd.getData('text/plain') || ''
  if (text) {
    document.execCommand('insertText', false, text)
    nextTick(emitChange)
  }
}

function onDrop(e) {
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      handleImageFile(f)
      return
    }
  }
}

async function handleImageFile(file) {
  uploadError.value = ''
  uploading.value = true
  try {
    const { url } = await uploadImage(file)
    insertImage(url)
    emitChange()
  } catch (err) {
    uploadError.value = err.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

// 暴露给外部(比如工具栏点"插入图片")
defineExpose({
  uploadAndInsert: handleImageFile,
})

function insertImage(url) {
  const safe = escapeForHtml(url)
  editorRef.value?.focus()
  const html = `<img src="${safe}" alt="" /><div><br></div>`
  const inserted = document.execCommand('insertHTML', false, html)
  if (!inserted) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      editorRef.value?.insertAdjacentHTML('beforeend', html)
      return
    }
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    range.insertNode(tpl.content)
  }
}
</script>
