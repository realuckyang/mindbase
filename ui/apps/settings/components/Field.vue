<template>
  <label class="block">
    <div class="mb-1 text-sm font-medium text-nt">{{ label }}</div>
    <div v-if="hint" class="mb-1 text-xs text-nt-soft">{{ hint }}</div>
    <slot />
  </label>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
})
</script>
