# 💸 订阅(subs)

订阅服务清单与年化花费,提醒续费节奏。

## MindBase 是什么

[MindBase](https://mindbase.me) 是一个用于与 AI 同步生活上下文的个人数据库,跑在 **Cloudflare Workers + D1** 上,部署在你自己的 Cloudflare 账号下,通过自有域名访问。每个应用承载用户生活的一面(记账 / 待办 / 笔记 / 健康 / 收藏 …),共享同一份 SQLite,作为 AI 长期记忆的事实来源。

尚未部署 MindBase 时,先按 [github.com/realuckyang/mindbase](https://github.com/realuckyang/mindbase) 完成实例搭建,再安装本包。

## 这个包做什么

订阅服务清单与年化花费,提醒续费节奏。

涉及的表:
- `app_subs_services`


## 安装

将下方一句话发给 Claude Code 或 Codex:

```
按 https://mindbase.me/packages/subs.README.md 的步骤,把 subs 应用集成进我本地的 mindbase 仓库,然后 npm run deploy。
```

**源文件位置**:本包的所有源文件已随主仓库一同 clone,位于 `packages/subs/` 目录;也可从 [https://mindbase.me/packages/subs.zip](https://mindbase.me/packages/subs.zip) 下载解压获得。

AI 会依据主仓库根 `AGENTS.md` 的契约与本包文件,完成以下步骤:

1. 将 `packages/subs/server/` 下的 4 个文件(`manifest / repository / service / api`)复制到 `server/apps/subs/`
2. 将 `packages/subs/ui/` 中的 `index.vue`(及可选的 `components/`)复制到 `ui/apps/subs/`
3. 把 `packages/subs/schema.sql` 中的 `CREATE TABLE` 段追加到主仓库根 `schema.sql` 的"应用"段(主仓库 schema 集中在一个文件,作为单一事实源),并对 D1 执行新增的建表语句
4. 在 `server/apps/registry.js` 的 `ENTRIES` 数组中追加一行 entry(`import` manifest 与 api)
5. `npm run deploy`

## 卸载

将上述步骤反向执行,并对相关表执行 `DROP TABLE`。可让 AI 协助完成。

## 元信息

```json
{
  "name": "subs",
  "icon": "💸",
  "label": "订阅",
  "kind": "context",
  "tables": [
    "app_subs_services"
  ],
  "subpaths": []
}
```
