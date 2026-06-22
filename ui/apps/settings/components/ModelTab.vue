<template>
  <section class="mt-6 space-y-5">
    <div v-if="loading" class="py-6 text-sm text-nt-soft">加载中…</div>
    <template v-else>
      <Field label="Base URL">
        <input
          v-model="form.ai_base_url"
          type="url"
          placeholder="https://api.openai.com/v1/chat/completions"
          class="mb-input"
        />
      </Field>

      <Field label="API Key">
        <input
          v-model="form.ai_api_key"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="sk-..."
          class="mb-input font-mono"
        />
      </Field>

      <Field label="Model">
        <input
          v-model="form.ai_model"
          type="text"
          placeholder="gpt-4o-mini"
          class="mb-input"
        />
      </Field>

      <SaveBar :busy="busy" :saved="saved" :error="error" @save="onSave" />
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/api'
import Field from './Field.vue'
import SaveBar from './SaveBar.vue'

const props = defineProps({
  form:    { type: Object, required: true },
  loading: { type: Boolean, default: false },
})

const busy  = ref(false)
const saved = ref(false)
const error = ref('')

async function onSave() {
  busy.value = true; saved.value = false; error.value = ''
  try {
    const { settings } = await api.patch('/api/settings', {
      ai_base_url: props.form.ai_base_url.trim(),
      ai_api_key:  props.form.ai_api_key.trim(),
      ai_model:    props.form.ai_model.trim(),
    })
    props.form.ai_base_url = settings.ai_base_url
    props.form.ai_api_key  = settings.ai_api_key
    props.form.ai_model    = settings.ai_model
    saved.value = true
    setTimeout(() => { saved.value = false }, 1500)
  } catch (e) {
    error.value = e?.message || '保存失败'
  } finally { busy.value = false }
}
</script>
