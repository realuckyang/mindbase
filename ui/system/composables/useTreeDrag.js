import { reactive } from 'vue'

/**
 * 全局拖动状态:ItemList 在 dragstart 时写、dragend 时清。
 * Breadcrumb 的 drop target 读这个 state 来判断是否高亮 + 处理放下。
 *
 * 不依赖 SortableJS 跨容器,纯 module-level singleton + native HTML5 events,
 * 实现最简单且不跟 vuedraggable 内部状态打架。
 */
export const dragState = reactive({
  active: false,
  kind: null, // 'note' | 'notebook'
  id: null,
  /**
   * 当前拖动元素所在的 parent。Breadcrumb drop target 用来判断
   * "拖到当前所在父级是 noop"(不发请求)。
   * - 在 Notebook 视图里被拖出去的子项,parent 就是当前 notebook id
   * - 在首页(根)被拖出去的子项,parent 是 null
   */
  parentId: null,
  /**
   * 移动端 touch 拖动期间共享的 hover target — 用于 Breadcrumb 高亮。
   * 桌面端 native dragenter/dragleave 已经在 Breadcrumb 内自管,这字段
   * 主要给 touch 路径用。格式:{ kind: 'root' | 'notebook', id: string | null }
   */
  hoverTarget: null,
})

export const beginDrag = ({ kind, id, parentId }) => {
  dragState.active = true
  dragState.kind = kind
  dragState.id = id
  dragState.parentId = parentId ?? null
  dragState.hoverTarget = null
}

export const endDrag = () => {
  dragState.active = false
  dragState.kind = null
  dragState.id = null
  dragState.parentId = null
  dragState.hoverTarget = null
}

export const setHoverTarget = (target) => {
  dragState.hoverTarget = target
}

/**
 * 拖动结束后浏览器可能合成一次 click(touchend → click,或 mouseup → click),
 * 落在 router-link 上会触发导航跳走。装一次性 capture-phase click 拦截,
 * 350ms 后自动撤销。drop 处理器调用一次即可。
 */
export const suppressNextClick = () => {
  const handler = (e) => {
    e.stopPropagation()
    e.preventDefault()
  }
  document.addEventListener('click', handler, { capture: true, once: true })
  setTimeout(() => {
    document.removeEventListener('click', handler, { capture: true })
  }, 350)
}
