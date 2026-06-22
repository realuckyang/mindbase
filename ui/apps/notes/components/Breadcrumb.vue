<template>
  <nav class="flex flex-wrap items-center gap-0.5 text-sm text-nt-muted">
    <!-- 首页:可作为根级 drop target -->
    <router-link
      :to="{ name: 'notes' }"
      data-mb-drop
      data-mb-drop-kind="root"
      class="rounded-sm px-1.5 py-0.5 transition-colors"
      :class="dropTargetClass(rootDropState)"
      @dragenter.prevent="onEnter('root', null, $event)"
      @dragover.prevent="onOver('root', null, $event)"
      @dragleave="onLeave('root', null)"
      @drop.prevent="onDrop('root', null)"
    >
      首页
    </router-link>

    <template v-for="(item, idx) in items" :key="item.id ?? idx">
      <span class="select-none px-0.5 text-nt-soft">/</span>

      <!-- 中间层级 (item.to 存在) → 可点击 + 可作为 drop target -->
      <router-link
        v-if="item.to"
        :to="item.to"
        data-mb-drop
        data-mb-drop-kind="notebook"
        :data-mb-drop-id="item.id"
        class="flex max-w-64 items-center gap-1 truncate rounded-sm px-1.5 py-0.5 transition-colors"
        :class="dropTargetClass(getDropState(item.id))"
        @dragenter.prevent="onEnter('notebook', item.id, $event)"
        @dragover.prevent="onOver('notebook', item.id, $event)"
        @dragleave="onLeave('notebook', item.id)"
        @drop.prevent="onDrop('notebook', item.id)"
      >
        <span v-if="item.icon" class="inline-flex h-4 w-4 items-center justify-center">{{ item.icon }}</span>
        <span class="truncate">{{ item.name }}</span>
      </router-link>

      <!-- 末端(当前页) → 不能 drop 到自己,只显示 -->
      <span
        v-else
        class="flex max-w-64 items-center gap-1 truncate px-1.5 py-0.5 text-nt"
      >
        <span v-if="item.icon" class="inline-flex h-4 w-4 items-center justify-center">{{ item.icon }}</span>
        <span class="truncate">{{ item.name || '无标题' }}</span>
      </span>
    </template>
  </nav>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { dragState, suppressNextClick } from '@/system/composables/useTreeDrag'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['move'])

// dragenter 计数:dragenter / dragleave 在子节点之间会反复触发,
// 用引用计数才能正确判断"完全离开"。每个 target id 各自一份。
const enterCounts = reactive({})

// hover 信号来源:桌面 native dragenter/leave(enterCounts)+ 移动端 touchmove(dragState.hoverTarget)
const rootDropState = computed(() => ({
  active: dragState.active && canDropTo('root', null),
  hover: (enterCounts['__root__'] || 0) > 0
    || dragState.hoverTarget?.kind === 'root',
}))

const getDropState = (id) => ({
  active: dragState.active && canDropTo('notebook', id),
  hover: (enterCounts[id] || 0) > 0
    || (dragState.hoverTarget?.kind === 'notebook' && dragState.hoverTarget?.id === id),
})

const dropTargetClass = (state) => {
  if (!state.active) return 'hover:bg-nt-hover hover:text-nt'
  if (state.hover) {
    // 拖入中:加深 + 边框,清晰提示"放在这"
    return 'bg-nt-accent-bg text-nt ring-2 ring-nt-accent ring-inset'
  }
  // 拖动期间但未 hover:轻微高亮提示"这里可放"
  return 'bg-nt-hover text-nt'
}

/**
 * 判断当前拖动元素能否放到指定 target。
 * - 自己拖自己 → no(notebook 拖到自己 — 拖动源不会同时是 target,但保险起见)
 * - 当前 parent === target.parentId → noop(已经在那)
 * - 拖到自己当前父级也是 noop
 */
function canDropTo(targetKind, targetId) {
  if (!dragState.active) return false
  // 拖到自己 → 不允许
  if (dragState.kind === 'notebook' && dragState.id === targetId) return false
  // 已经在该 parent 下 → noop
  const currentParent = dragState.parentId // null = root
  const targetParent = targetKind === 'root' ? null : targetId
  if (currentParent === targetParent) return false
  return true
}

const keyOf = (kind, id) => kind === 'root' ? '__root__' : id

function onEnter(kind, id) {
  if (!canDropTo(kind, id)) return
  const k = keyOf(kind, id)
  enterCounts[k] = (enterCounts[k] || 0) + 1
}

function onOver(kind, id, e) {
  if (!canDropTo(kind, id)) {
    e.dataTransfer.dropEffect = 'none'
    return
  }
  e.dataTransfer.dropEffect = 'move'
}

function onLeave(kind, id) {
  const k = keyOf(kind, id)
  if (!enterCounts[k]) return
  enterCounts[k] -= 1
  if (enterCounts[k] <= 0) delete enterCounts[k]
}

function onDrop(targetKind, targetId) {
  // 即使 canDrop 为 false 也清 hover,避免视觉残留
  const k = keyOf(targetKind, targetId)
  delete enterCounts[k]

  if (!canDropTo(targetKind, targetId)) return

  // drop 之后浏览器可能合成 click 在 router-link 上 → 触发导航跳走
  suppressNextClick()

  emit('move', {
    kind: dragState.kind,
    id: dragState.id,
    target: { kind: targetKind, id: targetId },
  })
}
</script>

