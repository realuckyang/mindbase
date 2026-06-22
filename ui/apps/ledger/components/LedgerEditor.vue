<template>
  <div class="space-y-3">
    <!-- 收支二选一 -->
    <div class="grid grid-cols-2 gap-1.5">
      <label
        v-for="opt in TYPE_OPTIONS"
        :key="opt.value"
        class="cursor-pointer rounded border px-3 py-2 text-center text-sm transition"
        :class="form.type === opt.value
          ? (opt.value === 'expense' ? 'border-nt-danger bg-nt-danger/5 text-nt-danger' : 'border-emerald-500 bg-emerald-50 text-emerald-700')
          : 'border-nt-divider text-nt-soft hover:bg-nt-hover'"
      >
        <input v-model="form.type" type="radio" :value="opt.value" class="sr-only" />
        <span class="font-medium">{{ opt.label }}</span>
      </label>
    </div>

    <!-- 金额 -->
    <div>
      <div class="mb-1 text-xs text-nt-soft">金额</div>
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-nt">¥</span>
        <input
          ref="amountEl"
          v-model="form.amount"
          type="text"
          inputmode="decimal"
          placeholder="0.00"
          class="flex-1 rounded border border-nt-divider bg-white px-2 py-1.5 text-xl font-semibold tabular-nums text-nt outline-none placeholder:text-nt-hint focus:border-nt-accent"
          @input="onAmountInput"
        />
      </div>
    </div>

    <!-- 日期 -->
    <div>
      <div class="mb-1 text-xs text-nt-soft">日期</div>
      <input
        v-model="form.happened_at"
        type="date"
        class="w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none placeholder:text-nt-hint focus:border-nt-accent"
      />
    </div>

    <!-- 分类(带历史自动补全) -->
    <div>
      <div class="mb-1 text-xs text-nt-soft">分类</div>
      <input
        v-model="form.category"
        type="text"
        list="ledger-categories"
        placeholder="餐饮 / 交通 / 工资 …"
        class="w-full rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none placeholder:text-nt-hint focus:border-nt-accent"
      />
      <datalist id="ledger-categories">
        <option v-for="c in categoryOptions" :key="c" :value="c" />
      </datalist>
    </div>

    <!-- 备注 -->
    <div>
      <div class="mb-1 text-xs text-nt-soft">备注</div>
      <textarea
        v-model="form.note"
        rows="2"
        placeholder="可选"
        class="w-full resize-y rounded border border-nt-divider bg-white px-2 py-1.5 text-sm text-nt outline-none placeholder:text-nt-hint focus:border-nt-accent"
      ></textarea>
    </div>

    <!-- 操作 -->
    <div class="flex items-center gap-2 pt-1 text-xs">
      <button
        type="button"
        class="rounded px-2 py-1 text-nt-soft hover:bg-nt-hover hover:text-nt"
        @click="$emit('cancel')"
      >取消</button>
      <button
        v-if="isEdit"
        type="button"
        class="rounded px-2 py-1 text-nt-danger hover:bg-nt-danger/10"
        @click="$emit('delete')"
      >删除</button>
      <button
        type="button"
        :disabled="!canSave"
        class="ml-auto rounded bg-nt px-3 py-1 text-white hover:bg-nt-strong disabled:opacity-50"
        @click="onSave"
      >保存</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, ref, nextTick, onMounted } from 'vue'

const TYPE_OPTIONS = [
  { value: 'expense', label: '支出' },
  { value: 'income',  label: '收入' },
]

const props = defineProps({
  modelValue:       { type: Object, required: true },
  isEdit:           { type: Boolean, default: false },
  categoryOptions:  { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'cancel', 'delete'])

const amountEl = ref(null)

const form = reactive({
  type:        props.modelValue.type        || 'expense',
  amount:      props.modelValue.amount      || '',
  category:    props.modelValue.category    || '',
  note:        props.modelValue.note        || '',
  happened_at: props.modelValue.happened_at || '',
})

watch(() => props.modelValue, (v) => {
  form.type        = v.type        || 'expense'
  form.amount      = v.amount      || ''
  form.category    = v.category    || ''
  form.note        = v.note        || ''
  form.happened_at = v.happened_at || ''
})

// 输入金额时只允许数字 + 最多一个小数点 + 最多两位小数
const onAmountInput = (e) => {
  let v = String(e.target.value).replace(/[^\d.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  const [whole, frac] = v.split('.')
  if (frac !== undefined) v = whole + '.' + frac.slice(0, 2)
  form.amount = v
  e.target.value = v
}

const canSave = computed(() => {
  const n = Number(form.amount)
  return Number.isFinite(n) && n > 0 && form.happened_at
})

const onSave = () => {
  emit('save', {
    type:        form.type,
    amount:      Number(form.amount),
    category:    form.category.trim(),
    note:        form.note.trim(),
    happened_at: form.happened_at,
  })
}

onMounted(() => { nextTick(() => amountEl.value?.focus()) })
</script>
