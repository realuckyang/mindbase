<template>
  <section class="mt-6 space-y-4">
    <div class="flex items-center gap-3">
      <img src="/favicon.svg" alt="" class="h-12 w-12" />
      <div>
        <h2 class="text-lg font-semibold text-nt">MindBase</h2>
        <p class="text-xs text-nt-soft">开源的个人记忆中心，同步你与 AI 的上下文</p>
      </div>
    </div>

    <p class="text-sm leading-relaxed text-nt-muted">
      MindBase 是一个开源的记忆中心——同步你与 AI 的上下文。
      内置可查询数据的 agent，提供 OpenAPI、MCP、Skill 三种方式打通你与 code agent 的互通。
      基于 Cloudflare Workers + D1 + R2，数据掌握在自己手里。
    </p>

    <div class="rounded-md border border-nt-divider p-4">
      <div class="text-xs text-nt-soft">项目地址</div>
      <a
        href="https://github.com/realuckyang/mindbase"
        target="_blank"
        rel="noopener"
        class="mt-1 inline-flex items-center gap-1 text-sm font-medium text-nt-accent hover:underline break-all"
      >
        github.com/realuckyang/mindbase
        <span class="text-xs">↗</span>
      </a>
    </div>

    <p class="text-xs text-nt-soft">
      MIT License · 欢迎 issue / PR / star
    </p>
  </section>
</template>

<script setup>
</script>
