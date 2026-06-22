<template>
  <section class="mt-6 space-y-5">
    <Field label="当前密码">
      <input
        v-model="form.old"
        type="password"
        autocomplete="current-password"
        class="mb-input"
      />
    </Field>
    <Field label="新密码" hint="至少 6 位">
      <input
        v-model="form.next"
        type="password"
        autocomplete="new-password"
        class="mb-input"
      />
    </Field>
    <Field label="重复新密码">
      <input
        v-model="form.next2"
        type="password"
        autocomplete="new-password"
        class="mb-input"
      />
    </Field>
    <SaveBar :busy="busy" :saved="saved" :error="error" @save="onSave" />
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { api } from '@/api'
import Field from './Field.vue'
import SaveBar from './SaveBar.vue'

const form = reactive({ old: '', next: '', next2: '' })
const busy  = ref(false)
const saved = ref(false)
const error = ref('')

async function onSave() {
  error.value = ''
  saved.value = false
  if (!form.old)              { error.value = '请输入当前密码'; return }
  if (form.next.length < 6)   { error.value = '新密码至少 6 位'; return }
  if (form.next !== form.next2) { error.value = '两次输入的新密码不一致'; return }

  busy.value = true
  try {
    await api.post('/api/auth/password', { old_password: form.old, new_password: form.next })
    form.old = ''; form.next = ''; form.next2 = ''
    saved.value = true
    setTimeout(() => { saved.value = false }, 1500)
  } catch (e) {
    const msg = e?.message || ''
    if (/invalid_old_password/.test(msg)) error.value = '当前密码错误'
    else if (/password_too_short/.test(msg)) error.value = '新密码至少 6 位'
    else error.value = msg || '修改失败'
  } finally {
    busy.value = false
  }
}
</script>
