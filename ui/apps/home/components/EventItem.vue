<template>
  <component
    :is="ev.ref_id && route ? 'router-link' : 'div'"
    :to="ev.ref_id && route ? route : undefined"
    class="-mx-3 flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-nt-hover"
    :class="ev.ref_id && route ? 'cursor-pointer' : ''"
  >
    <span class="text-xl leading-none">{{ ev.icon || '·' }}</span>
    <div class="min-w-0 flex-1">
      <div class="truncate text-nt">{{ ev.summary }}</div>
      <div class="text-[11px] text-nt-soft">
        {{ formatTime(ev.created_at) }} · {{ appLabel }}
      </div>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  ev: { type: Object, required: true },
})

// 应用 slug → 中文名 + 路由名。和 AppShell.vue 保持一致;
// 简单 map,不为单一消费引第三方依赖。
const APP_META = {
  ledger: { label: '记账', route: 'ledger' },
  books:  { label: '书单', route: 'books'  },
  goals:  { label: '目标', route: 'goals'  },
}

const meta = computed(() => APP_META[props.ev.app] || { label: props.ev.app, route: null })
const appLabel = computed(() => meta.value.label)
const route = computed(() => meta.value.route ? { name: meta.value.route } : null)

function pad(n) { return String(n).padStart(2, '0') }
function formatTime(ts) {
  if (!ts) return ''
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>
