# 🎁 心愿单(wishlist)· MindBase 应用

这是 [MindBase](https://mindbase.me) 应用包,装进 MindBase 实例后,为用户提供"心愿单"这一面。

## MindBase 是什么

一个跑在 **Cloudflare Workers + D1** 上的、用于与 AI 同步生活上下文的个人数据库。每个应用承载用户生活的一面(记账 / 待办 / 笔记 / 健康 / 收藏 …),共用一份 SQLite,前端 Vue 3,后端 Workers。

- 形态:浏览器 web 应用,部署在用户自己的 Cloudflare 账号下
- 部署:`git clone https://github.com/realuckyang/mindbase` 后跟随仓库 README 的指引,完成 D1、R2、Worker 的初始化
- 使用:浏览器访问绑定的自有域名,与 AI 共享同一份事实

## 阅读顺序

1. **主仓库根 `AGENTS.md`** —— MindBase 全局契约:目录结构、命名规则(`app_<name>_*` 表前缀)、`apps/` 与 `system/apps/` 的分层、schema 集中策略、registry 注册方式。最重要的一份。
2. **本包 `README.md`** —— 装这个包的步骤(给人和 AI 同看),装包流程以此为准。
3. **本包 `schema.sql`** —— 本应用建立的表。
4. **本包 `server/manifest.js`** —— name / label / icon / tables / subpaths 的事实源。

## 这个包的形态

- **slug**:`wishlist`
- **类型**:上下文应用(数据进入 AI 视野)
- **表**(`app_wishlist_*` 前缀):
  - `app_wishlist_items`
- **路由**:
  - `/api/wishlist` 标准 CRUD —— GET 列表、POST 创建、GET/PATCH/DELETE /<id>
  - 子路径:
  - (只有标准 CRUD)
- **后端**:`server/{manifest,repository,service,api}.js` 四件套
- **前端**:`ui/index.vue`(可能附 `ui/components/`)

## 修改

装好后,代码位置在 `server/apps/wishlist/` 与 `ui/apps/wishlist/`。改完执行 `npm run deploy`。

**通用约定**(与主仓库根 `AGENTS.md` 一致):
- 表名以 `app_wishlist_*` 为前缀;调整 DDL 时直接修改根 `schema.sql` 并重建数据库,数据迁移由重新建表承担
- 字段变更时所有相关位置同步更新,保持单一事实源
- service 中具备"完成度语义"的关键动作(创建一笔、读完一本、状态跃迁)发生后,向 `app_home_events` 写入一条事件 —— `import { insertEvent } from '../home/repository.js'`,事件写入失败时主操作继续完成
- 密码箱性质的应用(银行卡 / 证件 / 密码 / API key)的数据保留在本应用,时间轴仅展示主动公开的事件
- 凭证由本机环境维护,代码中通过 `env.` 读取

**本包特有约定**:

标准 CRUD,跟主仓库根 AGENTS.md 的通用约定一致即可。

## 跟主仓库的关系

本包是"独立分发的应用源",存放在主仓库的 `packages/wishlist/` 目录(便于查看与维护),并通过 [mindbase.me/apps/wishlist](https://mindbase.me/apps/wishlist) 以 zip 形式分发。安装即将 `packages/` 中的对应文件复制到 `server/apps/` 与 `ui/apps/` 的相应位置。

本包是 MindBase 实例的组件,依赖 `system/`(auth / utils / image)、registry、`app_home_events` 表、`settings` 表等公共设施。开发时参考相邻的 `apps/home/` 即可对齐形态。
