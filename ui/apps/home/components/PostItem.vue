<template>
  <div class="space-y-2">
    <template v-for="(n, i) in nodes" :key="i">
      <div
        v-if="n.type === 'text'"
        class="md text-[16px] leading-[1.65] text-[color:var(--color-nt)]"
        v-html="n.html"
      ></div>
      <a
        v-else-if="n.type === 'image'"
        :href="n.src"
        target="_blank"
        rel="noopener"
        class="block"
      >
        <img
          :src="n.src"
          alt=""
          loading="lazy"
          class="max-h-80 rounded border border-nt-divider object-contain"
        />
      </a>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

// marked 配置:GFM + 单换行变 <br>(更贴近"短文"的体感)
marked.setOptions({ gfm: true, breaks: true })

const props = defineProps({
  content: { type: String, default: '' },
})

// 先把纯文本里的 ![alt](url) 拆成节点(图片单独走预览+尺寸控制)。
// 剩下的文本片段交给 marked 渲染。url 必须 /i/ 或 http(s) 前缀,防注入。
const IMG_RE = /!\[[^\]\n]*\]\((\S+?)\)/g
const SAFE_SRC = /^(?:\/i\/|https?:\/\/)/i

const nodes = computed(() => {
  const raw = String(props.content || '')
  const out = []
  let last = 0
  let m
  IMG_RE.lastIndex = 0
  while ((m = IMG_RE.exec(raw)) !== null) {
    const src = m[1]
    if (!SAFE_SRC.test(src)) continue
    if (m.index > last) {
      const t = raw.slice(last, m.index).replace(/\n+$/, '')
      if (t) out.push({ type: 'text', html: marked.parse(t) })
    }
    out.push({ type: 'image', src })
    last = m.index + m[0].length
  }
  if (last < raw.length) {
    const t = raw.slice(last).replace(/^\n+/, '')
    if (t) out.push({ type: 'text', html: marked.parse(t) })
  }
  return out
})
</script>
