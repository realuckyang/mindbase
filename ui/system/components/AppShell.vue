<template>
  <div class="flex min-h-dvh flex-col">
    <header class="fixed inset-x-0 top-0 z-40 flex h-11 items-center justify-between border-b border-nt-divider bg-white/95 px-3 backdrop-blur md:px-4">
      <div class="flex min-w-0 items-center gap-1.5 px-1">
        <span class="text-base leading-none">{{ currentApp.icon }}</span>
        <h1 class="truncate text-sm font-semibold text-nt">{{ currentApp.label }}</h1>
      </div>

      <button
        ref="launcherBtn"
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded text-nt-muted hover:bg-nt-hover hover:text-nt"
        :title="launcherOpen ? '关闭' : '切换应用'"
        @click="toggleLauncher"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
          <rect x="1"  y="1"  width="7" height="7" rx="1.4"/>
          <rect x="10" y="1"  width="7" height="7" rx="1.4"/>
          <rect x="1"  y="10" width="7" height="7" rx="1.4"/>
          <rect x="10" y="10" width="7" height="7" rx="1.4"/>
        </svg>
      </button>

      <Popover :open="launcherOpen" :anchor="launcherAnchor" :width="320" @close="launcherOpen = false">
        <div class="max-h-[60vh] overflow-y-auto overscroll-contain px-1 pt-1">
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="app in LAUNCHER_APPS"
              :key="app.name"
              type="button"
              :disabled="!app.to"
              :class="[
                'flex flex-col items-center justify-center gap-1 rounded-md py-3 transition',
                isActive(app)
                  ? 'bg-nt-hover-strong text-nt'
                  : app.to
                    ? 'text-nt hover:bg-nt-hover'
                    : 'cursor-not-allowed text-nt opacity-40',
              ]"
              @click="goTo(app)"
            >
              <span class="text-2xl leading-none">{{ app.icon }}</span>
              <span class="text-[11px] font-medium">{{ app.label }}</span>
            </button>
          </div>
        </div>

        <div class="mt-2 border-t border-nt-divider"></div>
        <div class="grid grid-cols-3 gap-1 px-1 pt-1 pb-1">
          <button
            v-for="sys in DOCK_APPS"
            :key="sys.name"
            type="button"
            :class="[
              'flex flex-col items-center justify-center gap-1 rounded-md py-3 transition',
              isActive(sys)
                ? 'bg-nt-hover-strong text-nt'
                : 'text-nt hover:bg-nt-hover',
            ]"
            @click="goTo(sys)"
          >
            <span class="text-2xl leading-none">{{ sys.icon }}</span>
            <span class="text-[11px] font-medium">{{ sys.label }}</span>
          </button>
        </div>
      </Popover>
    </header>

    <main class="min-w-0 flex-1 pt-11">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Popover from './Popover.vue'
import { APPS_META, LAUNCHER_APPS, DOCK_APPS } from '@/system/lib/apps.js'

const route   = useRoute()
const router  = useRouter()

function isActive(app) {
  return app.match(route.path)
}

const currentApp = computed(() => {
  const a = APPS_META.find(isActive)
  return a || { icon: '🧠', label: 'MindBase' }
})

const launcherBtn    = ref(null)
const launcherOpen   = ref(false)
const launcherAnchor = ref(null)

function toggleLauncher() {
  if (launcherOpen.value) { launcherOpen.value = false; return }
  launcherAnchor.value = launcherBtn.value || null
  launcherOpen.value = true
}

function goTo(app) {
  launcherOpen.value = false
  if (!app.to) return
  router.push(app.to)
}
</script>
