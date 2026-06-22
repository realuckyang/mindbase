<template>
  <section class="mt-6 space-y-5">
    <div v-if="loading" class="py-6 text-sm text-nt-soft">加载中…</div>
    <template v-else>
      <Field label="System Prompt" hint="留空使用默认。你可以加入个人偏好、领域知识、回答风格等。">
        <textarea
          v-model="form.ai_system_prompt"
          rows="14"
          :placeholder="defaultPrompt"
          class="mb-input font-mono text-[13px] leading-relaxed"
        ></textarea>
      </Field>
      <div class="flex items-center gap-3">
        <SaveBar :busy="busy" :saved="saved" :error="error" @save="onSave" />
        <button
          type="button"
          class="rounded px-3 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt"
          @click="form.ai_system_prompt = defaultPrompt"
        >填入默认</button>
        <button
          v-if="form.ai_system_prompt"
          type="button"
          class="rounded px-3 py-1 text-xs text-nt-soft hover:bg-nt-hover hover:text-nt-danger"
          @click="form.ai_system_prompt = ''"
        >清空(用默认)</button>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/api'
import Field from './Field.vue'
import SaveBar from './SaveBar.vue'

const props = defineProps({
  form:          { type: Object, required: true },
  defaultPrompt: { type: String, default: '' },
  loading:       { type: Boolean, default: false },
})

const busy  = ref(false)
const saved = ref(false)
const error = ref('')

async function onSave() {
  busy.value = true; saved.value = false; error.value = ''
  try {
    const { settings } = await api.patch('/api/settings', {
      ai_system_prompt: props.form.ai_system_prompt,
    })
    props.form.ai_system_prompt = settings.ai_system_prompt
    saved.value = true
    setTimeout(() => { saved.value = false }, 1500)
  } catch (e) {
    error.value = e?.message || '保存失败'
  } finally { busy.value = false }
}
</script>
