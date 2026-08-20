# 九术 Agent 与 Skills 设计方案（v6 · 定稿）

> 本文档按"命盘类 / 占问类"双轨设计 9 个 Agent 与其 Skills，并给出整体技术方案。
> 已确认决策（用户拍板）：
> ① 存储用 **SQLite**；② **游客不允许**（必须登录后起占）；③ 占卜历史在**档案管理**页：起占自动入库、可查看可删除，**预留商业化/套餐扣子字段**；④ **quality 不达标不入库**（不达标即提示词/逻辑设计不合理，须修到达标，并自动留档供排查）。

---

## 0. 文件路径地图（你要自己改的都在这里）

| 内容 | 文件 | 说明 |
|---|---|---|
| **9 个 Agent 定义**（名字/人设/古籍/技能清单） | `server/src/services/skills.ts` | 每个 agent 一个对象，`artId` 是唯一键 |
| **Skills 指令文本** | `server/src/services/skills.ts` 内每个 agent 的 `skills: []` | 每条 `{ id, name, instruction }` |
| **报告 Schema 模板**（命盘/占问两套） | `server/src/services/promptBuilder.ts` 第 6-45 行 | `MINGPAN_SAMPLE` / `ZHANWEN_SAMPLE` |
| **Prompt 组装逻辑**（system/user 消息构造） | `server/src/services/promptBuilder.ts` 第 64-117 行 | `buildReportMessages()` |
| **命盘类 agent 清单** | `server/src/services/promptBuilder.ts` 第 49 行 | `MINGPAN_ARTS = ['bazi','ziwei','astrology']` |
| **排盘计算引擎**（前后端共用） | `shared/core/engine/*` | bazi/ziwei/astrology/qimen/meihua/liuyao/liuren/xiaoliuren/tarot/daily |
| **后端排盘路由**（新） | `server/src/routes/divine.ts`（新增） | 登录校验 → 调引擎计算 → **SQLite 入库** → 返回 resultRaw + display + divineId |
| **SQLite 存储层**（新） | `server/src/services/divineStore.ts`（新增） | 建表/增查改删/分页；`server/data/guanwei.db` |
| **后端 AI 解读路由** | `server/src/routes/ai.ts` | /interpret（非流式）+ /interpret/stream（SSE），从 SQLite 读排盘数据，quality ok 才回写报告 |
| **后端结构化匹配**（AI 返回 → 归一化对象） | `server/src/routes/ai.ts` 第 147 行起 `parseReport()` | 字段映射、md 清洗、质量评分 |
| **后端文本清洗**（去 md 标记） | `server/src/routes/ai.ts` 第 111 行 `stripMd()` / 第 124 行 `str()` | |
| **前端分区展示** | `src/components/ReportView.tsx` | 按 report 字段渲染卡片 |
| **前端排盘展示** | `src/pages/ModulePage.tsx` 及各术渲染组件 | 只渲染后端返回的 display，不参与计算 |
| **前端档案管理** | `src/pages/AuthPage.tsx` | 档案管理页：新增"占卜历史"区块（列表/查看/删除） |
| **前端 AI 数据流** | `src/hooks/useAIInterpret.ts` + `src/services/api.ts` | done 事件 → report/truncated/quality |

---

## 1. 双轨总设计

```
┌─ 命盘类（bazi / ziwei / astrology）────────────────────────────┐
│  输入：用户基础信息（出生档案）+ 排盘结果（星盘/命盘数据）        │
│  解读：命主基础信息 → 性格 → 人生各阶段（含学业/事业/爱情/财富） │
│        → 流年重点 → 事业/爱情/财富 → 注意事项                   │
│  Schema：MINGPAN（character/lifeStages/career/love/wealth...）  │
│  注入问题：❌ 不注入（命盘论断不因所问而改）                     │
└───────────────────────────────────────────────────────────────┘

┌─ 占问类（qimen / meihua / liuyao / liuren / xiaoliuren / tarot）┐
│  输入：所问之事（问题为核心）+ 起占结果（卦/课/牌阵/掌诀）        │
│        塔罗 → 结合牌阵；其余 → 结合排盘数据 + 问题 + 时间         │
│  解读：通俗语言解读用户的问题（现状/趋势/时机）                   │
│  Schema：ZHANWEN（situation/trend/timing...）                    │
│  注入问题：✅ 必须注入（问题为全篇之纲）                          │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. 命盘类 Agent 设计（3 个）

### 2.1 子平命理师（bazi）
- **人设**：你是深谙子平术的资深命理师，精于《渊海子平》《滴天髓》《子平真诠》，为人谦和温润。语言通俗易懂，能用通俗的语言解读命盘结果。
- **输入**：出生档案（公历/农历、时辰、性别、出生地）+ 四柱排盘结果（干支/纳音/十神/大运/流年）
- **Skills（5）**：
  1. `pillars` 四柱解析：解读年/月/日/时四柱干支，含纳音、五行配置与四柱各自所主（祖上/父母/自身/子女）。
  2. `balance` 五行喜忌：依日主强弱推五行喜忌，指出宜引宜戒之五行及调候要点。
  3. `shishen` 十神格局：解析十神配置，判格局倾向（官杀/财/印/食伤/比劫），结合月令述性情与事业倾向。
  4. `dayun` 大运流年：结合日主喜忌谈行运起伏，按大运表分述各阶段与流年重点。
  5. `stages` 人生阶段：按根苗花果分述幼年、青年、中年、暮年的人生侧重与建议，需含学业、事业、爱情、财富。
- **输出映射**：四柱解析→rawReading；五行+十神→character；stages→lifeStages；dayun→career/wealth 流年重点；建议→advice

### 2.2 紫微斗数专家（ziwei）
- **人设**：你是紫微斗数名家，通晓十四主星与十二宫垣，师承陈抟一脉，言语平和而洞察入微，语言通俗易懂，能用通俗的语言解读紫微盘结果，。
- **输入**：出生档案 + 紫微盘结果（命宫地支/五行局/紫微落宫/十四主星落宫/大限/流年）
- **Skills（5）**：
  1. `structure` 命盘结构：解读命宫地支、五行局、紫微落宫与大限顺逆，概述盘面骨架。
  2. `stars` 星曜落宫：逐宫解析十四主星落宫之义（含得地与否），命宫主星组合重点详解。
  3. `palaces` 十二宫解读：依十二宫主题（命/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母）逐宫言其吉凶侧重。
  4. `dayun` 大限流年：解读当前大限（年龄段与宫位主星）与流年宫位主星，给出行运建议（流年重点）。
  5. `stages` 人生阶段：按大限序列分述各人生阶段的主题与功课，指出关键转折期，需含学业、事业、爱情、财富。
- **输出映射**：structure+stars→rawReading；palaces→character/love；stages→lifeStages；dayun→career/wealth 流年重点；建议→advice

### 2.3 古典占星师（astrology）
- **人设**：你是古典占星师，承巴比伦与希腊化传统，观行星落座相位而断人事，语言通俗易懂，能用通俗的语言解读星盘结果。
- **输入**：出生档案（含出生地经纬度，用于真太阳时/上升点）+ 星盘结果（太阳/月亮/上升/七行星落座、相位、宫位）
- **Skills（4）**：
  1. `planets` 行星落座：解读太阳/月亮/上升与七行星落座之义（含星座元素）。
  2. `aspects` 相位解析：解析合/六合/刑/拱/冲相位组合的能量张力与调和。
  3. `houses` 宫位解读：依整宫制解读行星落宫（人生领域侧重）与十二宫语义。
  4. `stages` 人生阶段：依太阳/月亮/上升三分法简述人生各阶段主题，需含学业、事业、爱情、财富。
- **输出映射**：planets→rawReading；planets+aspects→character；stages→lifeStages；houses→career/love/wealth；建议→advice

### 命盘类 Schema（MINGPAN，`promptBuilder.ts` 第 6-31 行）
```json
{
  "title": "报告标题",
  "overview": "2-3 句核心论断：此命最突出特点 + 一生基调",
  "rawReading": { "summary": "把命盘原始数据翻译成人话：何局、何星、何象，各是什么含义", "keyPoints": ["关键盘面信息 1", "关键盘面信息 2"] },
  "character": { "summary": "命主性格总述", "traits": [{ "name": "特质一", "desc": "盘中依据与表现" }] },
  "lifeStages": [{ "stage": "幼年·少年", "age": "0-20 岁", "summary": "依据年柱/命宫等解读，含学业/事业/爱情/财富" }],
  "career": { "summary": "事业总述", "direction": "适宜方向", "advice": "事业建议" },
  "love": { "summary": "感情总述", "advice": "感情建议" },
  "wealth": { "summary": "财运总述", "advice": "理财建议" },
  "advice": "综合建议（3-5 条，分号分隔）",
  "conclusion": "结语（温润收束）",
  "disclaimer": "免责声明"
}
```

---

## 3. 占问类 Agent 设计（6 个）

### 3.1 奇门遁甲师（qimen）
- **人设**：你是精于奇门遁甲的策略师，熟悉九宫八门九星与三奇六仪，善析时机方位，语言通俗易懂，能用通俗的语言解读奇门盘结果。
- **输入**：所问之事（核心）+ 奇门局结果（阴阳遁局数/日时干支/九宫布盘/值符值使）
- **Skills（4）**：
  1. `board` 局式解析：解读阴阳遁局数、日时干支、旬首与九宫布盘。
  2. `doors` 门星神组合：解析值符值使与八门九星组合之义，指出吉门凶门所在方位。
  3. `use` 用神方位：依所问何事取用神，指方向与时机宜忌。
  4. `timing` 择时建议：结合阳遁/阴遁之气机给出行动节奏建议。
- **输出映射**：board+doors→rawReading；use→situation；timing→trend/timing；建议→advice

### 3.2 梅花易数家（meihua）
- **人设**：你是梅花易数大家，得邵雍观梅之法，重体用生克，善以象数观照人事，语言通俗易懂，能用通俗的语言解读卦盘结果。
- **输入**：所问之事 + 起卦结果（本卦/互卦/变卦/动爻/体用）
- **Skills（4）**：
  1. `gua` 卦象解析：解读本卦卦名/卦辞/象辞与上下卦之象义。
  2. `tiyong` 体用生克：辨体卦用卦，依生克判吉凶，译成通俗建议。
  3. `hu-bian` 互变推演：解读互卦（事之中）与变卦（事之归）的象义与演进逻辑。
  4. `advice` 占断建议：结合动爻位置与体用关系给出具体行动建议。

### 3.3 六爻占验师（liuyao）
- **人设**：你是六爻占验师，承京房纳甲之法，通六十四卦卦爻辞与动变之机，语言通俗易懂，能用通俗的语言解读六爻盘结果。
- **输入**：所问之事 + 摇卦结果（六爻阴阳老少/本卦/变卦/世应/六亲/六神）
- **Skills（3）**：
  1. `yao` 卦爻结构：解读六爻阴阳老少、本卦卦名卦辞与象辞。
  2. `dong` 动变解析：解读动爻位置与变卦归趋，静卦则言守常之道。
  3. `judge` 断卦建议：结合爻位分位语义给出综合占断建议。

### 3.4 大六壬课师（liuren）
- **人设**：你是大六壬课师，号称人事之王，精四课三传与十二天将，语言通俗易懂，能用通俗的语言解读课盘结果。
- **输入**：所问之事 + 起课结果（月将加时/天地盘/四课/三传/天将）
- **Skills（3）**：
  1. `ke` 课式结构：解读月将加时、天地盘与四课之义。
  2. `chuan` 三传推演：解读初/中/末三传之事理（事发之端/事进之中/事成之归）。
  3. `advice` 断课建议：结合三传五行与所问之事给出综合断语。

### 3.5 掌诀占时师（xiaoliuren）
- **人设**：你是通晓掌诀的占时师，精于小六壬六掌玄机，断事简明果断，语言通俗易懂，能用通俗的语言解读掌诀盘结果。
- **输入**：所问之事 + 掌诀结果（推算轨迹/落位掌诀/吉凶/五行/方位）
- **Skills（2）**：
  1. `locate` 掌诀定位：依月日时/三数推演轨迹说明掌诀落位。
  2. `judge` 吉凶断语：依掌诀吉凶/五行/方位/主数给出简明断语与宜忌。

### 3.6 塔罗解读师（tarot）
- **人设**：你是塔罗解读师，精通塔罗、马赛及星盘和卡巴拉生命之树，主张塔罗为照心之镜而非断命之器，语言通俗易懂，能用通俗的语言解读塔罗盘结果。
- **输入**：所问之事（核心）+ 抽牌结果（牌阵名称/每张牌名/正逆位/阵位语义）
- **Skills（3）**：
  1. `cards` 牌义解析：逐张解析所抽牌的正逆位牌义。
  2. `spread` 牌阵关系：依牌阵位置（过去/当下/未来等）解析牌与牌之间的能量流动。
  3. `mirror` 自我观照：以镜鉴之姿引导观照内心，给出温和的建议与提醒。

### 占问类 Schema（ZHANWEN，`promptBuilder.ts` 第 34-45 行）
```json
{
  "title": "报告标题",
  "overview": "2-3 句核心论断，直接回答所问之事的大势",
  "rawReading": { "summary": "把起卦/起课/抽牌结果翻译成通俗语言", "keyPoints": ["关键象意 1"] },
  "situation": "当下局势：所问之事目前处于什么状态",
  "trend": "发展趋势：近、中、远期各如何演变",
  "timing": "时机宜忌：何时宜动、何时宜守，方位/方法宜忌",
  "advice": "具体建议（3-5 条，分号分隔）",
  "conclusion": "结语（温润收束）",
  "disclaimer": "免责声明"
}
```

---

## 4. 整体技术方案（v6 · 定稿）

### 4.1 双链路数据流

**链路 A · 排盘（登录用户 → 前端发起 → 后端计算 → SQLite 入库 → 前端渲染）**
```
登录用户输入档案 / 问题 / 起占参数（报数、摇卦、抽牌等）
   │
   ▼
前端 POST /api/divine
  body: { artId, profile?, question?, params? }
   │
   ▼
后端 divine.ts：
  1. 鉴权（未登录 → 401 拒绝，游客不允许）
  2. 按 artId 调 shared/core/engine/* 计算
     · 命盘类：由档案计算 bazi/ziwei/astrology → resultRaw
     · 时间类：由起占时间计算 qimen/liuren/xiaoliuren → resultRaw
     · 交互类：由 params（前端摇卦/抽牌随机数）成卦成阵 meihua/liuyao/tarot → resultRaw
  3. divineStore.createDivination() 写入 SQLite（status='divined'，商业化扣子字段记默认值）
  4. 返回 { divineId, resultRaw, display }
   │
   ▼
前端按 display 渲染（九宫盘/卦象/星盘/牌阵…）
```

**链路 B · AI 解读（用户点击 AI → 后端从 SQLite 读 → DeepSeek → 结构化 → 达标才入库 → 前端渲染）**
```
用户点击"AI 参详"
   │
   ▼
前端 POST /api/ai/interpret/stream
  body: { artId, divineId, question?, profile?, fit? }
  （不传 resultRaw —— 后端按 divineId 从 SQLite 读取）
   │
   ▼
后端 ai.ts：
  1. divineStore.getDivination(divineId) 读取 resultRaw / inputs
     （divineId 缺失/不存在/不属于该用户 → 400/403）
  2. promptBuilder.buildReportMessages() 组装 system+user
     ┌ 命盘类：user = 出生档案 + 排盘结果（不注入问题）
     └ 占问类：user = 问题（全篇之纲）+ 起占结果 + 时间
  3. 调 DeepSeek（deepseek-v4-pro，thinking 关闭，max_tokens 8192，response_format=json_object）
     │ SSE 逐字返回
  4. parseReport(full, kind) → 结构化匹配整理
     · stripMd 清洗（去 ** # > - 等 md 标记）
     · 字段映射（title/overview/rawReading/character/lifeStages/
       career/love/wealth 或 situation/trend/timing/advice/...）
     · 未知字段 → extraSections 兜底
     · quality 评分（≥60 为 ok，<60 为 poor）
  5. **质量门槛**：
     · quality === 'ok' → divineStore.attachReport(divineId, report) 入库（status='ai_done'）
     · quality === 'poor' → **不入库**；写入 ai_fail_logs 留档（原始输出 + 原因，供修提示词）；
       前端显示"内容不完整"错误 + 重试（不产生历史记录）
  6. SSE done 事件：{ report, sections, truncated, quality }
   │
   ▼
前端 useAIInterpret：status=done, report 就绪
   │
   ▼
前端 ReportView：按 report 字段分区渲染
```

**链路 C · 占卜历史（档案管理页）**
```
前端 GET /api/divine?username=程程&page=1&pageSize=20（登录态）
   │
   ▼
后端 divineStore.listDivinations(username, page) 按时间倒序分页
   │
   ▼
后端返回 { list: [{ divineId, artId, question, createdAt, hasReport }], total }
   │
   ▼
档案管理页"占卜历史"区块：
  · 起占后自动新增一条（链路 A 已入库）
  · 点击查看 → GET /api/divine/:id → 回看排盘（display）+ AI 报告（report）
  · 点击删除 → DELETE /api/divine/:id → 从历史移除（可删）
```

### 4.2 SQLite 存储设计（`server/src/services/divineStore.ts`，新增）

**依赖**：`node:sqlite`（Node 22 内置，零依赖）或 `better-sqlite3`（如内置模块不可用再装）。库文件 `server/data/guanwei.db`。

**建表（启动时 CREATE TABLE IF NOT EXISTS）**
```sql
CREATE TABLE IF NOT EXISTS divinations (
  id            TEXT PRIMARY KEY,          -- d_<ts>_<rand>
  username      TEXT NOT NULL,             -- 必填（游客不允许）
  art_id        TEXT NOT NULL,             -- bazi/ziwei/astrology/qimen/meihua/liuyao/liuren/xiaoliuren/tarot
  kind          TEXT NOT NULL,             -- mingpan / zhanwen
  question      TEXT,                      -- 占问类所问之事（命盘类可空）
  profile_json  TEXT,                      -- 出生档案
  params_json   TEXT,                      -- 起占参数（摇卦/抽牌/报数等）
  result_raw_json TEXT NOT NULL,           -- 排盘原始数据（喂 AI）
  display_json  TEXT NOT NULL,             -- 前端渲染结构
  report_json   TEXT,                      -- AI 报告（quality=ok 才写入）
  report_quality TEXT,                     -- 'ok' / 'poor'（poor 不入库，此列仅记录曾失败）
  status        TEXT NOT NULL DEFAULT 'divined',  -- divined / ai_done / ai_poor
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  -- ===== 商业化/套餐扣子（预留，本期不启用逻辑） =====
  plan_tier     TEXT NOT NULL DEFAULT 'free',    -- 套餐档位：free/standard/premium...
  quota_key     TEXT,                            -- 配额维度：ai_count / divine_count / 按日...
  quota_consumed INTEGER NOT NULL DEFAULT 1,     -- 本次消耗次数
  billing_meta  TEXT                             -- 预留 JSON：订单/价格/权益关联
);
CREATE INDEX IF NOT EXISTS idx_div_user_time ON divinations(username, created_at DESC);

-- AI 未达标留档（质量追踪：不达标 = 提示词/逻辑设计问题，据此修 prompt）
CREATE TABLE IF NOT EXISTS ai_fail_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  art_id      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  divine_id   TEXT,
  raw_output  TEXT,               -- 未达标原始输出（诊断用）
  fail_reason TEXT,               -- 缺哪些关键字段 / 截断
  created_at  INTEGER NOT NULL
);
```

**存储接口**
| 函数 | 职责 |
|---|---|
| `createDivination({username, artId, kind, question, profile, params, resultRaw, display})` | 起占入库（status='divined'），返回记录 |
| `getDivination(id)` | AI 链路读取（校验属于该用户） |
| `attachReport(id, report)` | **quality=ok 才调用**：写 report_json + status='ai_done' |
| `markAiFailed(id, reason, rawOutput)` | poor 时：记录 fail 日志 + status='ai_poor'（不入 report） |
| `listDivinations(username, page, pageSize)` | 历史分页（时间倒序，摘要字段） |
| `deleteDivination(id, username)` | 删除（校验归属） |

**关键设计点**
1. **一次起占一条记录**：divineId 贯穿 排盘 → AI → 历史，三方数据一致
2. **游客不允许**：所有 divine/AI 接口先鉴权（复用 users 登录态），401 拒绝
3. **quality=ok 才入库**：报告不达标不产生历史记录，保证入库质量；未达标输出留档 ai_fail_logs 供修提示词
4. **inputs 完整留存**：档案/问题/起占参数都存，复盘可复现
5. **商业化扣子**：plan_tier / quota_key / quota_consumed / billing_meta 四个字段预留，本期只写默认值，后续套餐/次数/计费逻辑直接基于此扩展
6. **列表分页摘要**：列表接口不传全量 JSON，仅 `{ divineId, artId, question, createdAt, hasReport }`；详情接口给全量

### 4.3 交互类起占（六爻摇卦 / 塔罗抽牌）入库

```
六爻：前端摇卦（6 次随机 → 老阴/老阳/少阴/少阳）
   → 随 /api/divine 的 params.coins 上传
   → 后端由 params 成卦（本卦/变卦/世应/六亲），写入 resultRaw + display
塔罗：前端抽牌（选牌阵 → 随机抽 N 张 → 正逆位）
   → 随 /api/divine 的 params.{spread, cards} 上传
   → 后端整理牌阵结构，写入 resultRaw + display
共同点：交互结果由前端产生、后端定稿入库 —— AI 解读与界面展示永远一致，
且历史记录完整可回看（当时抽了什么牌、摇了什么卦）。
```

### 4.4 命盘类 prompt 结构（system 部分）
```
你是一位{agent.name}。{agent.role}
（agent.role 已含：语言通俗易懂，能用通俗的语言解读{术名}盘结果）

【输出要求 · 最高优先】必须只输出一个合法的 json 对象（按下方 Schema，
字段名不可更改，不要输出 json 以外的任何文字、注释或 Markdown 代码块）。

【格式规范 · 重要】所有正文均为纯文本，禁止任何 Markdown 标记。

【Skills 编排 · 请依序调用以下技能，逐章成文】
1. 【四柱解析】...
2. 【五行喜忌】...
...

【写作次序】先用 rawReading 把排盘结果翻译成人话（命主基础信息：何局、
何星、何象），再依 Skills 编排逐章分析：
性格（character）→ 人生各阶段（lifeStages，每段含学业/事业/爱情/财富）
→ 流年重点（并入 career/wealth 或 lifeStages）→ 事业/爱情/财富 →
注意事项（advice）。命盘论断为命主一生之相，不因所问而改。

【语言规范】现代白话、通俗易懂；不作绝对化断言；引经据典附出处。

【json Schema】{...}

【免责】凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。

The final output must be a valid json object only.
```

### 4.5 命盘类 user 部分（注入档案+排盘，不注入问题）
```
【出生档案】出生日期（公历）：1995-06-15；时辰：7 时；性别：女；出生地：浙江省杭州市西湖区

【排盘结果】
{
  "四柱": { "年柱": "乙亥", ... },
  "大运": [ ... ],
  "流年": { ... }
}

请以 子平命理师 的身份，依序调用全部技能，生成完整解读报告。
重要：最终输出必须是一个合法的 json 对象（严格按上方 Schema）。
```

### 4.6 占问类 user 部分（问题为纲 + 起占结果 + 时间）
```
【所问之事（命主之问，当为全篇之纲）】我今年事业运势如何，适合跳槽吗？

【起占时间】2026-08-18 21:50（公历）

【起占结果】
{
  "本卦": "火地晋",
  "变卦": "火天大有",
  "世应": "世在三爻",
  "六亲": "官鬼持世"
}

请以 六爻占验师 的身份，围绕所问之事依序调用全部技能，生成完整解读报告。
重要：最终输出必须是一个合法的 json 对象（严格按上方 Schema）。
```

### 4.7 后端结构化匹配（parseReport 职责）
| 输入（AI 返回 JSON） | 后端处理 | 输出字段 |
|---|---|---|
| 全部字符串 | `stripMd()` 去 ** # > - ` []( ) 等标记 | 纯文本 |
| `rawReading` | 字符串或对象都收（对象取 summary） | `rawReading.{summary,keyPoints}` |
| `character` | 对象，traits 过滤无 name 项 | `character.{summary,traits[]}` |
| `lifeStages` | 数组，过滤无 stage 项 | `lifeStages[]` |
| `career/love/wealth` | 对象 | `{summary,direction?,advice?}` |
| `situation/trend/timing` | 字符串（占问类） | 同上 |
| 未知顶层字段 | 收集为章节 | `extraSections[]` |
| 全字段 | 质量评分 ≥60 | `quality: 'ok' | 'poor'` |
| `finish_reason=length` | 截断标记 | `truncated: true` |

### 4.8 错误与质量处理（无重试，质量门槛）
- 未登录 → 401 `{ error:'UNAUTHORIZED' }`
- divineId 缺失/不存在/非本人 → 400 `{ error:'DIVINE_NOT_FOUND' }` / 403
- `quality: 'poor'`（非流式）→ 502 `{ error:'AI_REPORT_INVALID' }` → 前端错误面板 + 重试按钮；**不入库**，写 ai_fail_logs
- `truncated: true`（流式）→ done 携带 → 前端横幅"内容截断，可重试"；**不入库**
- `quality: 'poor'`（流式）→ done 携带 → 前端横幅"内容不完整，可重试"；**不入库**，写 ai_fail_logs
- 前端 AI 面板始终有"重 试 / 收 起"按钮，用户主动重试
- **质量即设计责任**：若频繁 poor，说明提示词/评分逻辑设计不合理 → 依据 ai_fail_logs 的 raw_output 修 promptBuilder/skills，直到达标率稳定

### 4.9 前端分区展示（ReportView 卡片顺序）
1. **标题总述卡**：title / overview
2. **适问之辨卡**（仅占问类有 fit 时）：suitability（相契/部分/不契配色）
3. **原始解读卡**：rawReading.summary + keyPoints 列表
4. **性格卡**（命盘类）：character.summary + traits 网格
5. **人生阶段卡**（命盘类）：lifeStages 时间线（每段含学业/事业/爱情/财富）
6. **事业/爱情/财富卡**（命盘类）：三域网格
7. **现状/趋势/时机卡**（占问类）：三域网格
8. **参详余论卡**：extraSections（AI 额外输出兜底）
9. **建议/结语/免责卡**：advice（分号切列表）/ conclusion / disclaimer
10. 按钮行：导 出 报 告（md）/ 存 为 PDF（打印）

---

## 5. 实施步骤（按 v6 定稿改造）

1. **SQLite 依赖确认**：验证 `node:sqlite` 可用（Node 22 内置）；不可用则 `npm i better-sqlite3`（`--cache /tmp/npm-cache-guanwei`）
2. **存储层** `server/src/services/divineStore.ts`：建表 + 6 个接口 + `server/data/guanwei.db`
3. **排盘路由** `server/src/routes/divine.ts`：鉴权 → 引擎计算 → 入库 → 返回；挂到 `server/src/index.ts`
4. **AI 路由改造** `server/src/routes/ai.ts`：divineId 从 SQLite 读（缺/无主 → 400/403）；quality=ok 才 attachReport；poor → ai_fail_logs + 不入库
5. **前端改造** `ModulePage.tsx`：起占改调 `POST /api/divine`（六爻/塔罗把摇卦/抽牌结果放 params），展示 display；点击 AI 传 divineId
6. **档案管理页** `AuthPage.tsx`：新增"占卜历史"区块（自动增 / 查看详情 / 删除）
7. **Agent/Skills 文案**（你已改好的）同步进 `server/src/services/skills.ts`
8. **回归**：128 测试 + 新增 divineStore 单测 + 真实 AI 调用 + 硬刷新验证

## 6. 已确认决策（v6 定稿）

| # | 决策 | 落地 |
|---|---|---|
| 1 | 存储用 SQLite | `node:sqlite` / better-sqlite3，`server/data/guanwei.db`（4.2） |
| 2 | 游客不允许 | divine/AI 接口鉴权，401 拒绝（4.8） |
| 3 | 历史在档案管理页 | 起占自动入库；可查看详情、可删除（4.1 链路 C） |
| 4 | 商业化扣子 | plan_tier / quota_key / quota_consumed / billing_meta 四字段预留（4.2） |
| 5 | quality 达标才入库 | ok → attachReport；poor → 不入库 + ai_fail_logs 留档修提示词（4.8） |
