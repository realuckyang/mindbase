# mindbase

个人数据库 / 同步用户与 AI 的上下文。

- origin: `https://github.com/realuckyang/mindbase.git`
- Node:`^20.19.0 || >=22.12.0`

## 当前状态

- **在用中**,核心承载用户的"和 AI 同步的生活上下文"。
- 主页是入口:用户手写 posts + 各应用自动事件流,合成一条时间轴。
- 核心默认装一组常用应用,其它在 [mindbase.me](https://mindbase.me) 应用商店按需装(本机就是把对应目录丢进 `apps/` 然后 redeploy)。

## 命名规则

所有应用一视同仁，没有"用户/系统"之分：

| 层 | 路径 |
|---|---|
| DB 表 | `<name>_*`（公共表用裸名：settings / tokens / contexts / conversations / messages） |
| 后端 | `server/apps/<name>/{manifest,repository,service,api}.js` |
| 前端 | `ui/apps/<name>/index.vue` |
| HTTP | `/api/<name>` |

`server/system/` 下只放纯基础设施：

- `auth/` —— 鉴权 lib + 登录/注册 HTTP endpoint（`/api/auth/*`），manifest `kind: 'infra'` 不进启动器
- `ai/` —— Agent loop（tool calling / runner / functions）
- `llm/` —— LLM provider 抽象（OpenAI / Anthropic / ...）
- `prompt/` —— System prompt 拼装（default / environment / contexts / profile）
- `collab/` —— 对外协作协议入口（OpenAPI `/api/ai/*` + MCP `/api/mcp`）
- `contexts/` —— 系统级置顶上下文
- `image/`、`utils/` —— 通用基础设施

启动器底部 dock 默认显示 `chat / collab / settings` 这 3 个 —— 在 `ui/system/lib/apps.js` 的 `DOCK` 常量里硬编码,未来可改成用户偏好。

## 加一个新应用

后端 `server/apps/<name>/{manifest,repository,service,api}.js` + 前端 `ui/apps/<name>/index.vue` + 在 `schema.sql` 的"应用"段加表（`<name>_*` 命名）+ 在 `server/apps/registry.js` 加一行 entry。

前端 `router.js` / `lib/apps.js` / `AppShell` 全部用 `import.meta.glob` 自动派生,不用手动碰。

`schema.sql` 是单一事实源,初始化 D1 用 `wrangler d1 execute mindbase --remote --file=schema.sql --yes`。

## 事件流约定

有"完成度语义"的关键动作(创建一笔账、读完一本书、目标 +1、达到里程碑)后,往 `home_events` 写一条 —— 直接 `import { insertEvent } from '../home/repository.js'`。事件失败时主操作继续完成(try/catch 吞掉)。主页时间轴会自动渲染。

密码箱性质的应用(银行卡 / 证件 / 密码 / API key 等)的数据保留在本应用,时间轴只展示主动公开的事件 —— 这是应用作者的判断,由约定承担。

## 上下文 pin 约定

`contexts` 是系统级上下文表(裸表名)。所有 AI 协作(内部 agent 的 system prompt + 外部协作的 `/api/ai/apps` 响应)都会首先读取这里的内容。

**应用何时 pin**:当应用里有"用户当前最关键的状态"需要让所有 AI 始终知晓时。例如:
- 目标应用:当前 active 目标
- 项目应用:正在进行的项目简介
- 书单:正在读的书
- 健康:用户设定的健康目标

**pin / unpin API**:

```js
// pin(upsert,同一 source_app+source_id 只存一条)
POST /api/contexts/pin
{ source_app: 'goals', source_id: '<id>', content: '2026年目标:...' }

// unpin
POST /api/contexts/unpin
{ source_app: 'goals', source_id: '<id>' }
```

`content` 是快照文本,原始数据变更后需主动重新 pin 以刷新。pin / unpin 失败不阻断主操作(try/catch 吞掉)。

## 凭证

凭证从不进代码。本机用 `~/.codex` `~/.claude` skills 里的 config.json。仓库里所有 `wrangler.jsonc` / `.env` 由用户在本机维护,不提交。

## 原则

### 一致性

前后端、数据库的命名和概念保持统一。改一个名字就所有地方一起改干净,代码和意图始终同步。

模块化、拆分清晰。每个文件保持精简长度,目录结构反映逻辑包含关系。

### 直接迭代

DDL 即单一事实源:改 schema 删 DB 重建;命名改就所有地方一起改干净。开发阶段保持代码和意图同步,跳过兼容层。

### 轻量工程

按需求做事:目前要的功能做实做对,留白处保持留白。

所有功能真接口、真数据、真逻辑,所见即所得。

### 面向用户

产品文案只面向用户:用用户语言描述价值,把内部限制、技术约束、实现细节藏在代码里。

样式优先 Tailwind,原生 CSS 留给确实必要的场景。

## 技术栈

- 前端:Vue 3 + Vite + Tailwind v4 + vuedraggable
- 后端:Cloudflare Workers + Cloudflare Vite plugin
- 存储:D1 (SQLite) + R2 (图片)
- 鉴权:PBKDF2 + HS256 JWT cookie

## 命令

```bash
npm run dev       # vite + worker 本地
npm run build     # build:skill(打 mindbase.zip)+ vite build
npm run preview   # build + wrangler dev
npm run deploy    # wrangler deploy(部署到你的实例)
```
