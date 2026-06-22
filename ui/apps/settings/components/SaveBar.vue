<template>
  <div class="flex items-center gap-3 pt-2">
    <button
      type="button"
      :disabled="busy"
      class="rounded-md bg-nt px-5 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
      @click="$emit('save')"
    >{{ busy ? '保存中…' : '保存' }}</button>
    <span v-if="saved" class="text-xs text-nt-soft">✓ 已保存</span>
    <span v-if="error" class="text-xs text-nt-danger">{{ error }}</span>
  </div>
</template>

<script setup>
defineProps({
  busy:  { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
defineEmits(['save'])
</script>
