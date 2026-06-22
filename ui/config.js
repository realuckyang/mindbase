// 前端运行时配置(目前没有,占位以便未来扩展)。
// build 时由 vite.config.js 从 wrangler.jsonc 的 vars 里挑安全字段注入。
/* eslint-disable no-undef */
const CONFIG = (typeof __PUBLIC_CONFIG__ !== 'undefined') ? __PUBLIC_CONFIG__ : {}
export default CONFIG
