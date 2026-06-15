-- MindBase 数据库 schema —— 单一事实源,初始化 D1 用:
--   npx wrangler d1 execute mindbase --remote --file=schema.sql --yes
--
-- 约定:
--   - 公共表用裸表名:conversations / messages / tokens / settings / contexts
--   - 应用表用 `<name>_*` 命名,跟应用目录同名
--   - 加新应用 = 在下面"应用"段 append 一节 CREATE TABLE
--
-- 所有表集中在这一个文件,保持单一事实源;加新应用就在下面 append 一节。


-- ============================================================
-- 公共表(对应 system/ 下的基础设施)
-- ============================================================

-- ---- chat:对话(会话 + 消息) ----
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  meta            TEXT,
  usage           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, id);

CREATE TABLE compactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  start_message_id INTEGER NOT NULL,
  end_message_id   INTEGER NOT NULL,
  summary          TEXT NOT NULL,
  tokens           INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_compactions_conv ON compactions(conversation_id, id);

-- ---- collab:外部 AI 接入授权 token ----
CREATE TABLE tokens (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  scope         TEXT NOT NULL DEFAULT 'read',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at  TEXT
);
CREATE INDEX idx_tokens_token ON tokens(token);

-- ---- settings:全局 KV(AI 模型 url/key/model、动态默认 icon/cover 等)----
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- contexts:系统级上下文 —— 用户 / 各应用 pin 进来的内容,所有 AI 协作首先读取 ----
CREATE TABLE contexts (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL DEFAULT '',
  source_app  TEXT NOT NULL DEFAULT '',
  source_id   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_app, source_id)
);
CREATE INDEX idx_contexts_sort ON contexts(sort_order ASC);


-- ============================================================
-- 应用 (apps/*)
-- ============================================================

-- ---- home:主页时间轴(你和 AI 共写)+ 应用事件流 ----
CREATE TABLE home_posts (
  id          TEXT PRIMARY KEY,
  author      TEXT NOT NULL DEFAULT 'user',
  content     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_home_posts_created ON home_posts(created_at DESC);

INSERT INTO home_posts (id, author, content) VALUES
  ('welcome-1', 'system', '👋 欢迎使用 MindBase —— 你与 AI 的记忆中心。在这里记录生活，所有 AI 共享同一份上下文。'),
  ('welcome-2', 'system', '💡 点击右上角打开应用中心，进入设置，在「协作」里拿到 token，让你的 AI 也能读写这里的数据。');

-- 各应用 service.js 在关键动作后往这里 INSERT 一条
-- (直接 import home/repository.js 的 insertEvent,或自己写 SQL)。
-- 仅用于主页时间轴渲染,无副作用。
CREATE TABLE home_events (
  id          TEXT PRIMARY KEY,
  app         TEXT NOT NULL,                -- 'ledger' / 'books' / 'goals' ...
  action      TEXT NOT NULL,                -- 'created' / 'status_changed' / 'milestone' / 'completed'
  ref_id      TEXT,                          -- 源记录 id,可空(已删除时仍保留事件)
  summary     TEXT NOT NULL,                 -- 一行人话,e.g. "记了一笔咖啡 ¥18"
  icon        TEXT,                          -- '💰',渲染快
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_home_events_created ON home_events(created_at DESC);


-- ---- todos ----
-- 待办:单层清单。
CREATE TABLE todos_items (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  done        INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_todos_items_done ON todos_items(done, sort_order);

INSERT INTO todos_items (id, title, sort_order) VALUES
  ('seed-todo-1', '在设置中配置大模型', 1),
  ('seed-todo-2', '在 Codex 中配置 MindBase Skill', 2),
  ('seed-todo-3', '在 Claude Code 中配置 MindBase Skill', 3);

-- ---- notes ----
-- 笔记:无限嵌套笔记本 + 笔记。
CREATE TABLE notes_notebooks (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES notes_notebooks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  cover       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_notebooks_parent ON notes_notebooks(parent_id);

CREATE TABLE notes_pages (
  id           TEXT PRIMARY KEY,
  notebook_id  TEXT REFERENCES notes_notebooks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  icon         TEXT,
  cover        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_pages_notebook ON notes_pages(notebook_id);

INSERT INTO notes_pages (id, notebook_id, title, content, sort_order) VALUES
  ('seed-note-1', NULL, '什么是 MindBase', '<h1>什么是 MindBase</h1><div><br></div><div>MindBase 是一个开源的记忆中心——同步你与 AI 的上下文。</div><div><br></div><h2>🤖 AI 互通</h2><div>内置可查询数据的 agent，兼容大多数模型与各种 coding plan。</div><div>提供 OpenAPI、MCP、Skill 三种方式打通你与 code agent 的互通。</div><div>你的 code agent 在工作中能了解你的上下文，记录做过什么，积累经验，更新项目状态，记住你的偏好。</div><div><br></div><h2>🌱 记忆有形状</h2><div>记忆不是一条条抽象的数据，而是有自己形状、自己交互、自己功能的应用。</div><div>内置 12 个应用，另有 40+ 免费模板可选，你还可以让 AI 快速开发属于你的记忆应用。</div><div><br></div><h2>☁️ 数据在你手里</h2><div>快速部署在 Cloudflare 上，底层依托 Workers、D1、R2，免费额度足够日常使用。</div><div>D1 内建 30 天时间点恢复，兜住 AI 误操作，让你更放心地让 AI 读写你的数据。</div>', 1);

-- ---- ledger ----
-- 记账:逐笔流水。amount 单位"分"避免浮点。
CREATE TABLE ledger_entries (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'expense',   -- 'expense' | 'income'
  amount      INTEGER NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  happened_at TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ledger_entries_happened ON ledger_entries(happened_at DESC, id DESC);
CREATE INDEX idx_ledger_entries_type_cat ON ledger_entries(type, category);

-- ---- projects ----
-- 个人项目(博客/副业/实验)。status ∈ { active, paused, done, abandoned }。
CREATE TABLE projects_items (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_items_status  ON projects_items(status);
CREATE INDEX idx_projects_items_created ON projects_items(created_at DESC);

-- ---- profile ----
-- 个人档:多 block 组成,每个 block 有标题 + 内容。
CREATE TABLE profile_blocks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_profile_blocks_sort ON profile_blocks(sort_order);

-- ---- llms ----
-- 大模型:在用的 LLM API key 配置。
CREATE TABLE llms_keys (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL,
  api_key       TEXT NOT NULL DEFAULT '',
  base_url      TEXT NOT NULL DEFAULT '',
  default_model TEXT NOT NULL DEFAULT '',
  quota_note    TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- prompts ----
-- 指令集:常用 prompt 模板。
CREATE TABLE prompts_items (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '',
  model       TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO prompts_items (id, title, content, tags) VALUES
  ('seed-prompt-1', 'MindBase 应用开发指令', '# mindbase

个人数据库 / 同步用户与 AI 的上下文。

- origin: `https://github.com/realuckyang/mindbase.git`
- Node:`^20.19.0 || >=22.12.0`

## 命名规则

所有应用一视同仁，没有"用户/系统"之分：

| 层 | 路径 |
|---|---|
| DB 表 | `<name>_*`（裸名也可，如 settings / tokens / contexts / conversations / messages 这些公共表） |
| 后端 | `server/apps/<name>/{manifest,repository,service,api}.js` |
| 前端 | `gui/apps/<name>/index.vue` |
| HTTP | `/api/<name>` |

`server/system/` 下只放纯基础设施（auth / utils / image / contexts），不放应用。

## 加一个新应用

后端四件套 + 前端 index.vue + 在 schema.sql 的"应用"段加表 + 在 `server/apps/registry.js` 加一行 entry。

前端 `router.js` / `lib/apps.js` / `AppShell` 全部用 `import.meta.glob` 自动派生，不用手动碰。

`schema.sql` 是单一事实源。

## 事件流约定

关键动作后往 `home_events` 写一条 —— `import { insertEvent } from ''../home/repository.js''`。事件失败时主操作继续（try/catch 吞掉）。

## 原则

- 一致性：前后端、数据库命名统一，改名就所有地方一起改干净
- 直接迭代：DDL 即单一事实源，跳过兼容层
- 轻量工程：按需求做事，所见即所得
- 面向用户：产品文案只面向用户，技术细节藏在代码里', '开发,AGENTS');

-- ---- apikeys ----
-- 各种服务的 API key。
CREATE TABLE apikeys_items (
  id          TEXT PRIMARY KEY,
  service     TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  api_key     TEXT NOT NULL DEFAULT '',
  scope       TEXT NOT NULL DEFAULT '',
  expire_at   TEXT,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_apikeys_items_expire ON apikeys_items(expire_at);

-- ---- emails ----
-- 邮箱地址簿。
CREATE TABLE emails_addresses (
  id         TEXT PRIMARY KEY,
  address    TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  provider   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_emails_addresses_created ON emails_addresses(created_at DESC);

-- ---- domains ----
-- 域名:记录持有的域名、注册商、过期日期。
CREATE TABLE domains_items (
  id          TEXT PRIMARY KEY,
  domain      TEXT NOT NULL,
  registrar   TEXT NOT NULL DEFAULT '',
  expire_date TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_domains_items_expire ON domains_items(expire_date);

-- ---- footprints ----
-- 足迹。
CREATE TABLE footprints_visits (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL DEFAULT '',
  visited_at  TEXT,
  note        TEXT NOT NULL DEFAULT '',
  cover       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_footprints_visits_visited ON footprints_visits(visited_at DESC);
