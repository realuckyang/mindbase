# MindBase

**MindBase 是一个开源的记忆中心——同步你与 AI 的上下文。**

🤖 **AI 互通** — 内置可查询数据的 agent，兼容大多数模型与市面上的各种 coding plan。同时提供 OpenAPI、MCP、Skill 三种方式打通你与 code agent 的互通——你的 code agent 在工作中能了解你的上下文，记录做过什么，积累经验，更新项目状态，记住你的偏好等。

🌱 **记忆有形状** — 记忆不是一条条抽象的数据，而是有自己形状、自己交互、自己功能的应用。内置 12 个应用，另有 40+ 可选，你还可以让 AI 快速开发属于你的记忆应用。

☁️ **数据在你手里** — 快速部署在 Cloudflare 上，底层依托 Workers、D1、R2，免费额度足够日常使用。D1 内建 30 天时间点恢复，兜住 AI 误操作，让你更放心地让 AI 读写你的数据。

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/notes.png" alt="笔记" /></td>
    <td width="33%"><img src="docs/screenshots/chat-sql-query.png" alt="对话" /></td>
    <td width="33%"><img src="docs/screenshots/collab-skill.png" alt="协作" /></td>
  </tr>
  <tr>
    <td align="center"><sub>笔记 · 嵌套结构 + 封面</sub></td>
    <td align="center"><sub>对话 · sql_query 查询数据</sub></td>
    <td align="center"><sub>协作 · Skill / MCP / OpenAPI</sub></td>
  </tr>
</table>

---

## 🤝 同步你和 AI 的上下文

一份数据，所有 AI 共用。

### 内置 agent

产品内对话直连 D1，通过 `sql_query` 完成聚合、跨应用整理与批量更新，所有 SQL 在对话中可见。兼容 OpenAI 协议，可填写任意符合规范的 base URL。

### 外部 AI

`设置 → 协作` 开启，拿到一把 `mb_` token。三种接入：

- **Anthropic Skill** —— 下载 [mindbase.zip](https://github.com/realuckyang/mindbase/raw/main/mindbase.zip) 放入 skills 目录（Claude Code: `~/.claude/skills/mindbase/`），该 AI 在后续对话中即掌握 MindBase 的用法。
- **OpenAPI 3.1** —— 将 schema URL 与 token 粘贴进 ChatGPT 或任意支持 OpenAPI 的 AI，即可按需调用。
- **MCP** —— 通过 Model Context Protocol 接入，同样的两把工具（`apps_list` + `sql_query`）。

同一把 token，N 个 AI 共用同一份事实。

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/chat-sql-query.png" alt="内置对话" /></td>
    <td width="33%"><img src="docs/screenshots/collab-skill.png" alt="Skill 接入" /></td>
    <td width="33%"><img src="docs/screenshots/prompts.png" alt="指令集" /></td>
  </tr>
  <tr>
    <td align="center"><sub>内置对话 · sql_query</sub></td>
    <td align="center"><sub>外部 AI · Anthropic Skill</sub></td>
    <td align="center"><sub>指令集 · 复用 prompt 模板</sub></td>
  </tr>
</table>

---

## 🌱 记忆有自己的形状

每个应用都有与之匹配的界面、交互与功能。

核心预置 12 个应用 —— 🏠 主页 · ✅ 待办 · 📚 笔记 · 💰 记账 · 📂 项目 · 🪪 个人档 · 🤖 大模型 · 📜 指令集 · 🔑 API · 📧 邮箱 · 🌐 域名 · 🗺️ 足迹。另有 40+ 免费模板在 [**mindbase.me**](https://mindbase.me) 按需安装。

模板里没有的，在「设置 → 新建应用」里写下需求，自动拼出完整指令，交给 Claude Code 或 Codex，跑 `npm run deploy` 即可上线。

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/llms.png" alt="大模型" /></td>
    <td width="33%"><img src="docs/screenshots/footprints.png" alt="足迹" /></td>
    <td width="33%"><img src="docs/screenshots/todos.png" alt="待办" /></td>
  </tr>
  <tr>
    <td align="center"><sub>大模型</sub></td>
    <td align="center"><sub>足迹</sub></td>
    <td align="center"><sub>待办</sub></td>
  </tr>
</table>

---

## 🏠 数据在你手里

- **免费即可用** —— Cloudflare 免费额度足够个人日常使用
- **30 天时间点恢复** —— D1 内建 point-in-time recovery，兜住 AI 误操作
- **一行导出** —— `wrangler d1 export` 整库带走，SQL 文件通用
- **开源自部署** —— MIT 协议，你的 token、你的 secret、你的数据

---

## 🚀 部署

需要：**Cloudflare 账号**、**Node 22+**

```bash
git clone https://github.com/realuckyang/mindbase
cd mindbase && npm install

# 1. 初始化 D1 与 R2
npx wrangler d1 create mindbase
npx wrangler r2 bucket create mindbase

# 2. 填写配置
cp wrangler.example.jsonc wrangler.jsonc
# 修改 account_id / database_id / JWT_SECRET

# 3. 建表并部署
npx wrangler d1 execute mindbase --remote --file=schema.sql --yes
npm run deploy
```

第一次访问会引导设置用户名与密码，之后用密码登录。

备份整库：

```bash
npx wrangler d1 export mindbase --remote --output backup-$(date +%Y%m%d).sql
```

---

## 🧱 技术栈

| 层 | 用了什么 |
|---|---|
| 运行时 | Cloudflare Workers |
| 存储 | D1 (SQLite) + R2 (图片) |
| 鉴权 | PBKDF2 + HS256 JWT cookie |
| 前端 | Vue 3 + Vite + Tailwind v4 |
| AI | OpenAI 兼容 Chat Completions + 流式 + 工具调用 |
| 标准 | OpenAPI 3.1 + Anthropic Skills + MCP |

```
mindbase/
  schema.sql                 单一 DDL（系统 + 应用）
  AGENTS.md                  给 AI 加应用的契约
  server/
    index.js                 Worker 入口
    router.js                /api/<name> 统一分发
    apps/<name>/             用户应用（manifest / repository / service / api）
    system/
      auth/  utils/  image/  基础设施
      apps/<name>/           系统应用（chat / collab / settings / user）
    collab/                  对外 AI 接入（openapi / mcp）
  ui/
    main.js  App.vue  router.js  api.js
    apps/<name>/             用户应用 UI
    system/
      apps/<name>/           系统应用 UI
      components/            AppShell / Popover / Cover ...
      composables/ lib/      跨应用 hook / 工具
  skills/mindbase/           Anthropic Skill 源文件
```

---

## License

[MIT](./LICENSE)
