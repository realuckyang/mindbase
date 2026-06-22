<template>
  <div class="w-full">
    <draggable
      v-if="merged.length > 0"
      v-model="merged"
      item-key="key"
      tag="ul"
      class="flex flex-col"
      :animation="160"
      ghost-class="mb-drag-ghost"
      drag-class="mb-drag-drag"
      :delay="touchDelay"
      :delay-on-touch-only="true"
      :touch-start-threshold="3"
      :move="onMove"
      @start="onDragStart"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <li
          :data-mb-kind="element.kind"
          :data-mb-id="element.id"
        >
          <router-link
            :to="element.kind === 'notebook'
              ? { name: 'notebook', params: { id: element.id } }
              : { name: 'note',     params: { id: element.id } }"
            class="flex min-h-7 items-center gap-2 rounded px-1.5 py-1 transition-colors"
            :class="[
              nestTargetId === element.id
                ? 'bg-nt-accent-bg ring-2 ring-nt-accent ring-inset'
                : 'hover:bg-nt-hover',
            ]"
          >
            <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base">
              {{ element.icon || (element.kind === 'notebook' ? '📁' : '📄') }}
            </span>
            <span class="flex-1 min-w-0 truncate text-sm text-nt">
              <template v-if="element.kind === 'notebook'">
                {{ element.name || '无标题' }}<span class="text-nt-soft"> /</span>
              </template>
              <template v-else>
                {{ element.title || '无标题' }}
              </template>
            </span>
            <span
              v-if="nestTargetId === element.id"
              class="ml-1 text-xxs text-nt-accent font-medium select-none"
            >
              放入
            </span>
          </router-link>
        </li>
      </template>
    </draggable>

    <div v-else class="py-6 text-sm text-nt-soft">还没有内容。</div>

    <div class="mt-3 flex flex-col gap-0.5">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm text-nt-muted hover:bg-nt-hover hover:text-nt"
        @click="$emit('add-notebook')"
      >
        <span class="inline-flex h-5 w-5 items-center justify-center text-base">＋</span>
        <span>新建笔记本</span>
      </button>
      <button
        v-if="canAddNote"
        type="button"
        class="flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm text-nt-muted hover:bg-nt-hover hover:text-nt"
        @click="$emit('add-note')"
      >
        <span class="inline-flex h-5 w-5 items-center justify-center text-base">＋</span>
        <span>新建笔记</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { beginDrag, endDrag, dragState, setHoverTarget, suppressNextClick } from '@/system/composables/useTreeDrag'

const props = defineProps({
  notebooks:  { type: Array, default: () => [] },
  notes:      { type: Array, default: () => [] },
  canAddNote: { type: Boolean, default: true },
  // 当前列表所在的父级(用于"拖到自己当前父级是 noop"判断)
  // null = 根层级(首页)
  parentId:   { type: String, default: null },
})
const emit = defineEmits(['add-notebook', 'add-note', 'reorder', 'nest', 'move'])

// 移动端长按 200ms 才触发拖动,避免点击/滚动误触发;桌面 0ms 立即响应
const touchDelay = 200

// 合并 notebooks + notes,按 sort_order 升序;同 sort_order 时笔记本在前
const merged = ref([])

watch(
  () => [props.notebooks, props.notes],
  () => {
    const all = [
      ...props.notebooks.map(n => ({ ...n, kind: 'notebook', key: `nb-${n.id}` })),
      ...props.notes.map(n     => ({ ...n, kind: 'note',     key: `n-${n.id}` })),
    ]
    all.sort((a, b) => {
      const oa = a.sort_order ?? 0
      const ob = b.sort_order ?? 0
      if (oa !== ob) return oa - ob
      if (a.kind !== b.kind) return a.kind === 'notebook' ? -1 : 1
      return (a.created_at || '').localeCompare(b.created_at || '')
    })
    merged.value = all
  },
  { immediate: true, deep: true },
)

// 拖动期间记录被拖项的 kind/id(原 array 在 SortableJS 期间索引会乱)
const dragging = ref(null)
// 当前嵌套目标 — hover notebook 行超过 NEST_DWELL_MS 时被设
const nestTarget = ref(null)
const nestTargetId = computed(() => nestTarget.value?.id ?? null)

// 悬停 dwell 检测(Finder 风格:停留够久就切到嵌套语义)
const NEST_DWELL_MS = 500
let hoverTargetId = null
let hoverTimer = null

const clearHover = () => {
  hoverTargetId = null
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

// ─── 移动端 touch 追踪 ────────────────────────────────────────
// 桌面端 native HTML5 dragenter/leave 已经在 Breadcrumb 自管。
// 移动端用 SortableJS fallback 模式,native drag events 不触发,
// 我们自己挂 touchmove + elementFromPoint 找面包屑 drop target,
// 把 hover 状态写到全局 dragState.hoverTarget 让 Breadcrumb 高亮。
let touchMoveHandler = null
let touchHoverEl = null

function attachTouchTracker() {
  if (touchMoveHandler) return
  touchMoveHandler = (te) => {
    const t = te.touches[0]
    if (!t) return
    const el = document.elementFromPoint(t.clientX, t.clientY)
    const dropEl = el?.closest?.('[data-mb-drop]') || null
    if (dropEl === touchHoverEl) return
    touchHoverEl = dropEl
    if (!dropEl) {
      setHoverTarget(null)
    } else {
      setHoverTarget({
        kind: dropEl.dataset.mbDropKind,
        id: dropEl.dataset.mbDropId || null,
      })
    }
  }
  document.addEventListener('touchmove', touchMoveHandler, { passive: true })
}

function detachTouchTracker() {
  if (touchMoveHandler) {
    document.removeEventListener('touchmove', touchMoveHandler)
    touchMoveHandler = null
  }
  touchHoverEl = null
}


function onDragStart(e) {
  const idx = e.oldIndex
  const item = merged.value[idx]
  if (!item) return
  dragging.value = { kind: item.kind, id: item.id }
  nestTarget.value = null
  clearHover()
  beginDrag({ kind: item.kind, id: item.id, parentId: props.parentId })
  attachTouchTracker()
}

/**
 * SortableJS onMove:每次鼠标移动到候选位置都会调一次。
 * 返回 false 会让 SortableJS 不在该位置 drop;返回 true 正常重排。
 *
 * 规则:
 * - 如果鼠标在某 notebook 行的"中央 40%~85% 区域"且该 notebook
 *   不是被拖动元素自己 → 标记嵌套目标,返回 false(阻止重排)
 * - 否则 → 清嵌套目标,返回 true(让 SortableJS 处理重排插入)
 *
 * 中央比例特意取 0.4~0.85 而不是 0.3~0.7,留出顶部 40% 给"插到前面",
 * 底部 15% 给"插到后面",中央留大一些利于触达嵌套。
 */
/**
 * SortableJS onMove,每次鼠标 hover 新位置都触发。
 * 我们用 hover-dwell 判断嵌套语义:
 * - hover 一个 notebook 行 → 启动 500ms 计时器
 * - 计时器到了 → 切到嵌套语义(nestTarget = { kind: 'notebook', id })
 * - 移开/换行 → 清计时器,清 nestTarget
 * - 已处于嵌套语义时 → return false 阻止 SortableJS 在该位置 swap
 */
function onMove(evt) {
  const target = evt.related
  const kind = target?.dataset?.mbKind
  const id = target?.dataset?.mbId

  // 不是 notebook 行,或就是被拖动的自己 → 走重排,清状态
  if (kind !== 'notebook' || (dragging.value && dragging.value.id === id)) {
    clearHover()
    if (nestTarget.value) nestTarget.value = null
    return true
  }

  // 进入新的 notebook 行 → 重启 dwell 计时器
  if (hoverTargetId !== id) {
    clearHover()
    hoverTargetId = id
    if (nestTarget.value) nestTarget.value = null
    hoverTimer = setTimeout(() => {
      nestTarget.value = { kind: 'notebook', id }
    }, NEST_DWELL_MS)
  }

  // 已切到嵌套语义 → 阻止 SortableJS 在该位置 swap(避免视觉错乱)
  if (nestTarget.value && nestTarget.value.id === id) return false

  // 还在等 dwell → 让 SortableJS 正常 swap(保持"插到上/下"的视觉)
  return true
}

function onDragEnd(e) {
  detachTouchTracker()
  clearHover()

  // 在 endDrag 清空之前抓 hoverTarget(移动端拖到面包屑用)
  const breadcrumbHover = dragState.hoverTarget
  const dragged = dragging.value
  const inListNest = nestTarget.value

  endDrag()
  nestTarget.value = null
  dragging.value = null

  // 优先级:面包屑 move > 列表内嵌套 nest > 同级重排
  if (breadcrumbHover && dragged) {
    suppressNextClick() // 阻止 router-link 合成 click 跳走
    emit('move', { kind: dragged.kind, id: dragged.id, target: breadcrumbHover })
    return
  }
  if (inListNest && dragged) {
    emit('nest', { kind: dragged.kind, id: dragged.id, target: inListNest })
    return
  }
  if (e.oldIndex === e.newIndex) return
  emit('reorder', merged.value.map(item => ({ kind: item.kind, id: item.id })))
}
</script>

<style scoped>
.mb-drag-ghost { opacity: 0.35; }
.mb-drag-drag  { background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
</style>
