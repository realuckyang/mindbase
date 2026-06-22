<template>
  <div class="mt-6">
    <p class="text-sm leading-relaxed text-nt-soft">
      描述你想要的应用,下方会自动生成一段完整指令(MindBase 应用契约 + 你的需求)。复制后交给 Claude Code 或 Codex,即可在你 clone 的仓库中按规范建好这个应用。
    </p>

    <label class="mt-6 block text-sm font-medium text-nt">想要一个什么样的应用</label>
    <textarea
      v-model="userIdea"
      rows="4"
      placeholder="例如:加一个 plants 应用,记我的多肉 —— 名字、买入日期、上次浇水、备注。"
      class="mt-2 w-full rounded-md border border-nt-divider bg-white px-3 py-2.5 text-[15px] text-nt outline-none placeholder:text-nt-hint focus:border-nt-accent"
    ></textarea>

    <div class="mt-6 rounded-md border border-nt-divider overflow-hidden">
      <div class="flex items-center justify-between border-b border-nt-divider bg-nt-hover/40 px-4 py-2">
        <span class="text-xs font-medium text-nt-soft">prompt</span>
        <button
          type="button"
          :disabled="!userIdea.trim()"
          class="rounded border border-nt-divider bg-white px-2.5 py-1 text-xs text-nt-muted hover:bg-nt-hover hover:text-nt disabled:opacity-50 disabled:cursor-not-allowed"
          @click="copyAll"
        >{{ copied ? '✓ 已复制' : '复制' }}</button>
      </div>
      <pre
        class="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words bg-white p-4 font-mono text-[13px] leading-relaxed text-nt"
      >{{ prompt }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import agentsSource from '../../../../AGENTS.md?raw'

const userIdea = ref('')
const copied   = ref(false)

const prompt = computed(() => {
  const idea = userIdea.value.trim() || '（在上方写下你想要的应用,这里会自动合并）'
  return `请按照下方的 MindBase 应用契约,在本地仓库中实现一个新应用。

需求:

${idea}

——以下为 MindBase 应用契约(AGENTS.md 全文)——

${agentsSource}`
})

async function copyAll() {
  if (!userIdea.value.trim()) return
  try {
    await navigator.clipboard.writeText(prompt.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    alert('复制失败')
  }
}
</script>
