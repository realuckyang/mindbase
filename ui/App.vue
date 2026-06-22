<template>
  <AppShell v-if="showShell">
    <RouterView />
  </AppShell>
  <RouterView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppShell from '@/system/components/AppShell.vue'

const route = useRoute()
const showShell = computed(() => route.name && route.name !== 'welcome')
</script>
