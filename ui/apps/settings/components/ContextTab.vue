<template>
  <section class="mt-6 space-y-5">
    <div v-if="loading" class="py-6 text-sm text-nt-soft">加载中…</div>
    <template v-else>
      <Field label="触发压缩 total_tokens" hint="上一次模型调用的 total_tokens 达到该值时,下一次调用前先压缩历史。0 表示关闭。">
        <input v-model.number="form.compressThreshold" type="number" min="0" step="100" class="mb-input" />
      </Field>

      <Field label="工具结果最大字符数" hint="每个工具返回给模型和历史的最大字符数。">
        <input v-model.number="form.toolResultMaxChars" type="number" min="1000" max="50000" step="1000" class="mb-input" />
      </Field>

      <Field label="压缩提示词" hint="用于把旧消息压缩成后续上下文。">
        <textarea v-model="form.compactPrompt" rows="8" class="mb-input font-mono text-[13px] leading-relaxed" placeholder="你负责压缩聊天上下文..."></textarea>
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
      compressThreshold: props.form.compressThreshold,
      compactPrompt: props.form.compactPrompt,
      toolResultMaxChars: props.form.toolResultMaxChars,
    })
    props.form.compressThreshold = settings.compressThreshold
    props.form.compactPrompt = settings.compactPrompt
    props.form.toolResultMaxChars = settings.toolResultMaxChars
    saved.value = true
    setTimeout(() => { saved.value = false }, 1500)
  } catch (e) {
    error.value = e?.message || '保存失败'
  } finally { busy.value = false }
}
</script>
