import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// 前端目前不需要任何 wrangler vars。如果未来要暴露,
// 在这里读 wrangler.jsonc 并挑字段进 __PUBLIC_CONFIG__。
// 注意:JWT_SECRET 永远不要进 bundle。
const PUBLIC_CONFIG = {}

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./ui', import.meta.url)),
    },
  },
  define: {
    __PUBLIC_CONFIG__: JSON.stringify(PUBLIC_CONFIG),
  },
})
