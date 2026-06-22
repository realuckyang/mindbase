// 给 packages/<name>/ 生成 AGENTS.md(给 AI 看)+ README.md(给人看)。
// 都从 server/manifest.js 派生。改了 manifest 或想补特有约定,改 SPECIFIC 后重跑即可。

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.argv[2]
const names = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort()

// 非显然的不变量 —— AI 改这些应用需要知道的约束。其余应用默认"标准 CRUD"。
const SPECIFIC = {
  ledger: `
- **金额以"分"为单位存储**(integer)。前端以"元"输入(0.01 精度),service 入口经 \`Math.round(n * 100)\` 转为分;前端展示时 ÷ 100。amount 字段始终保持 integer。
- \`happened_at\` 为 \`YYYY-MM-DD\` 字符串(纯日期,无时间、无时区)。月份过滤使用 \`strftime('%Y-%m', happened_at) = ?\`。
- \`type\` 取值 \`'expense' | 'income'\`,前端依据此值确定颜色(红 / 绿)。
- 创建一笔记录后调用 \`insertEvent\` 写入主页事件,作为本应用与时间轴的关联点。
`,
  todos: `
- \`done\` 在数据库中以 \`INTEGER 0/1\` 存储,API 序列化为 boolean(\`!!row.done\`)。前端 patch 时以 boolean 传入,service 入口经 \`Number(body.done)\` 转回 0/1。
- \`sort_order\` 为整数,值越小越靠前;reorder 时一次批量更新。
`,
  calendar: `
- \`date\` 为 \`YYYY-MM-DD\` 字符串;\`time\` 为 \`HH:MM\` 字符串或 null(全天事件)。时间字段保持纯字符串、无时区。
- 月份视图按 \`strftime('%Y-%m', date) = ?\` 过滤,前端按日聚合。
- 本应用承载单点日期事件;循环与提醒类需求由 todos 应用承担。
`,
  goals: `
- \`status\` 取值 \`'active' | 'done' | 'gave_up'\`。状态跃迁需 emit 事件到主页,达到 done 即为 milestone。
- \`target\` 与 \`progress\` 为非负整数,单位由 \`unit\` 字段以自由文本描述("km" / "本" / "天")。
- \`+1\` 按钮对应 \`progress + 1\`。本应用保留单一累计值,时间窗聚合由前端完成。
`,
  health: `
- \`weight_g\`(克,integer)与 \`sleep_min\`(分钟,integer)为底层单位,前端展示时转为 kg / 小时;整数单位用于避免浮点累加误差。
- \`date\` 为 \`YYYY-MM-DD\`,**每天保留一条记录**(repository 的 \`findHealthEntryByDate\` 用于 upsert)。
- 写入路径采用 upsert by date,用户同日多次记录会更新同一行。
`,
  profile: `
- \`block.content\` 会注入 chat 的 \`system prompt\`(由 \`ui/system/apps/chat\` 读取),内容直接进入 AI 上下文。block 保持精简,只放置关于用户的关键事实。
- \`sort_order\` 决定注入顺序,首要 block 承载最重要的事实(口味、工作风格、禁忌)。
- 本应用属于"主动写给 AI 看"的隐私敏感应用,与密码箱(只读、不冒泡)的语义相对。
`,
  vault: `
- **密码箱性质应用**:service 跳过 \`insertEvent\`,数据保留在本应用,时间轴保持干净。
- 字段以明文存储(D1 未引入加密层),安全性依赖 Cloudflare 账号本身、JWT cookie 与 mb_ token,应用层不再额外加密。
- 如需引入字段级加密,可在 service 中以 \`env.JWT_SECRET\` 派生 key、采用 AES-GCM 并在 schema 增加 \`iv\` 列。此改造规模较大,默认保持明文存储。
`,
  cards: `
- **密码箱性质应用**:service 跳过 \`insertEvent\`,时间轴保持干净。
- \`card_number\` 为完整卡号(明文)。展示层在 ui 中渲染为 \`**** **** **** 1234\`,API 返回完整明文,展示形态由前端决定。
- \`type\` 取值 \`'debit' | 'credit'\`。
`,
  apikeys: `
- **密码箱性质应用**:service 跳过 \`insertEvent\`,时间轴保持干净。
- \`api_key\` 为完整 key(明文),展示层在 ui 中遮罩,API 返完整值。
- \`expire_at\` 为 \`YYYY-MM-DD\` 或 null;过期判断在前端完成,系统中无后台轮询。
`,
  llms: `
- **密码箱性质应用**(base_url + api_key):service 跳过 \`insertEvent\`。
- \`api_key\` 以明文存储,展示层遮罩。
- 本应用记录的是"我使用过的大模型与配置"。chat 实际使用的模型由 \`settings\` 表的 \`ai_base_url / ai_api_key / ai_model\` 提供,两者独立维护。
`,
  accounts: `
- **密码箱性质应用**:service 跳过 \`insertEvent\`,时间轴保持干净。
- 本应用存储的是"在哪些网站有账号 + 用户名",密码由 \`vault\` 应用承担。
- 与 \`vault\` 通过用户名 / 服务名手动关联,采用无外键的自由关联方式。
`,
  servers: `
- **密码箱性质应用**(SSH 密钥 / 密码):service 跳过 \`insertEvent\`。
- \`auth\` 字段取值 \`'password' | 'key'\`,后者存储完整 PEM 私钥(明文)。
- 本应用保持只读元数据形态;Workers runtime 无 outbound SSH 能力,涉及网络副作用的功能(如"测试连接")由本地工具承担。
`,
}

// ============================================================
// AGENTS.md(给 AI)
// ============================================================
const agentsMd = (m) => {
  const subpathLines = (m.subpaths || []).length
    ? (m.subpaths.map((p) => `  - \`/api/${m.name}${p}\``).join('\n'))
    : '  - (只有标准 CRUD)'
  const tableLines = (m.tables || []).map((t) => `  - \`${t}\``).join('\n')
  const specific = SPECIFIC[m.name] ? SPECIFIC[m.name].trim() : '标准 CRUD,跟主仓库根 AGENTS.md 的通用约定一致即可。'

  return `# ${m.icon} ${m.label}(${m.name})· MindBase 应用

这是 [MindBase](https://mindbase.me) 应用包,装进 MindBase 实例后,为用户提供"${m.label}"这一面。

## MindBase 是什么

一个跑在 **Cloudflare Workers + D1** 上的、用于与 AI 同步生活上下文的个人数据库。每个应用承载用户生活的一面(记账 / 待办 / 笔记 / 健康 / 收藏 …),共用一份 SQLite,前端 Vue 3,后端 Workers。

- 形态:浏览器 web 应用,部署在用户自己的 Cloudflare 账号下
- 部署:\`git clone https://github.com/realuckyang/mindbase\` 后跟随仓库 README 的指引,完成 D1、R2、Worker 的初始化
- 使用:浏览器访问绑定的自有域名,与 AI 共享同一份事实

## 阅读顺序

1. **主仓库根 \`AGENTS.md\`** —— MindBase 全局契约:目录结构、命名规则(\`app_<name>_*\` 表前缀)、\`apps/\` 与 \`system/apps/\` 的分层、schema 集中策略、registry 注册方式。最重要的一份。
2. **本包 \`README.md\`** —— 装这个包的步骤(给人和 AI 同看),装包流程以此为准。
3. **本包 \`schema.sql\`** —— 本应用建立的表。
4. **本包 \`server/manifest.js\`** —— name / label / icon / tables / subpaths 的事实源。

## 这个包的形态

- **slug**:\`${m.name}\`
- **类型**:${m.kind === 'context' ? '上下文应用(数据进入 AI 视野)' : '系统应用(平台基础设施)'}
- **表**(\`app_${m.name}_*\` 前缀):
${tableLines}
- **路由**:
  - \`/api/${m.name}\` 标准 CRUD —— GET 列表、POST 创建、GET/PATCH/DELETE /<id>
  - 子路径:
${subpathLines}
- **后端**:\`server/{manifest,repository,service,api}.js\` 四件套
- **前端**:\`ui/index.vue\`(可能附 \`ui/components/\`)

## 修改

装好后,代码位置在 \`server/apps/${m.name}/\` 与 \`ui/apps/${m.name}/\`。改完执行 \`npm run deploy\`。

**通用约定**(与主仓库根 \`AGENTS.md\` 一致):
- 表名以 \`app_${m.name}_*\` 为前缀;调整 DDL 时直接修改根 \`schema.sql\` 并重建数据库,数据迁移由重新建表承担
- 字段变更时所有相关位置同步更新,保持单一事实源
- service 中具备"完成度语义"的关键动作(创建一笔、读完一本、状态跃迁)发生后,向 \`app_home_events\` 写入一条事件 —— \`import { insertEvent } from '../home/repository.js'\`,事件写入失败时主操作继续完成
- 密码箱性质的应用(银行卡 / 证件 / 密码 / API key)的数据保留在本应用,时间轴仅展示主动公开的事件
- 凭证由本机环境维护,代码中通过 \`env.\` 读取

**本包特有约定**:

${specific}

## 跟主仓库的关系

本包是"独立分发的应用源",存放在主仓库的 \`packages/${m.name}/\` 目录(便于查看与维护),并通过 [mindbase.me/apps/${m.name}](https://mindbase.me/apps/${m.name}) 以 zip 形式分发。安装即将 \`packages/\` 中的对应文件复制到 \`server/apps/\` 与 \`ui/apps/\` 的相应位置。

本包是 MindBase 实例的组件,依赖 \`system/\`(auth / utils / image)、registry、\`app_home_events\` 表、\`settings\` 表等公共设施。开发时参考相邻的 \`apps/home/\` 即可对齐形态。
`
}

// ============================================================
// README.md(给人)
// ============================================================
const readmeMd = (m) => {
  const tableLines = (m.tables || []).map((t) => `- \`${t}\``).join('\n')
  const subpathSection = (m.subpaths || []).length
    ? `专属子路径(在标准 CRUD 之外):\n${m.subpaths.map((p) => `- \`/api/${m.name}${p}\``).join('\n')}\n`
    : ''

  const meta = {
    name: m.name,
    icon: m.icon,
    label: m.label,
    kind: m.kind,
    tables: m.tables || [],
    subpaths: m.subpaths || [],
  }

  return `# ${m.icon} ${m.label}(${m.name})

${m.summary}

## MindBase 是什么

[MindBase](https://mindbase.me) 是一个用于与 AI 同步生活上下文的个人数据库,跑在 **Cloudflare Workers + D1** 上,部署在你自己的 Cloudflare 账号下,通过自有域名访问。每个应用承载用户生活的一面(记账 / 待办 / 笔记 / 健康 / 收藏 …),共享同一份 SQLite,作为 AI 长期记忆的事实来源。

尚未部署 MindBase 时,先按 [github.com/realuckyang/mindbase](https://github.com/realuckyang/mindbase) 完成实例搭建,再安装本包。

## 这个包做什么

${m.summary}

涉及的表:
${tableLines}

${subpathSection}
## 安装

将下方一句话发给 Claude Code 或 Codex:

\`\`\`
按 https://mindbase.me/packages/${m.name}.README.md 的步骤,把 ${m.name} 应用集成进我本地的 mindbase 仓库,然后 npm run deploy。
\`\`\`

**源文件位置**:本包的所有源文件已随主仓库一同 clone,位于 \`packages/${m.name}/\` 目录;也可从 [https://mindbase.me/packages/${m.name}.zip](https://mindbase.me/packages/${m.name}.zip) 下载解压获得。

AI 会依据主仓库根 \`AGENTS.md\` 的契约与本包文件,完成以下步骤:

1. 将 \`packages/${m.name}/server/\` 下的 4 个文件(\`manifest / repository / service / api\`)复制到 \`server/apps/${m.name}/\`
2. 将 \`packages/${m.name}/ui/\` 中的 \`index.vue\`(及可选的 \`components/\`)复制到 \`ui/apps/${m.name}/\`
3. 把 \`packages/${m.name}/schema.sql\` 中的 \`CREATE TABLE\` 段追加到主仓库根 \`schema.sql\` 的"应用"段(主仓库 schema 集中在一个文件,作为单一事实源),并对 D1 执行新增的建表语句
4. 在 \`server/apps/registry.js\` 的 \`ENTRIES\` 数组中追加一行 entry(\`import\` manifest 与 api)
5. \`npm run deploy\`

## 卸载

将上述步骤反向执行,并对相关表执行 \`DROP TABLE\`。可让 AI 协助完成。

## 元信息

\`\`\`json
${JSON.stringify(meta, null, 2)}
\`\`\`
`
}

for (const name of names) {
  const manifestUrl = pathToFileURL(join(ROOT, name, 'server/manifest.js')).href
  const m = (await import(manifestUrl)).default
  writeFileSync(join(ROOT, name, 'AGENTS.md'), agentsMd(m))
  writeFileSync(join(ROOT, name, 'README.md'), readmeMd(m))
}
console.log(`generated ${names.length} × (AGENTS.md + README.md)`)
