---
title: 观微 Guanwei 技术调研 + 漏洞排查（W36）
type: 产品探索
category: 开源项目监控
repository: RubyCcll/guanwei
version: v1.2.6
head: 3df51498c
license: MIT
language: TypeScript
created: 2026-09-05
monitor_round: 2（W36 更新监控，对比 W35 基线）
source: /tmp/guanwei-monitor（main 分支 tarball，无 .git）
基线: W35/guanwei-tech-2026-08-29.md（v1.2.2, HEAD ca2afb45）
---

# 观微 Guanwei · 技术调研 + 漏洞排查（v1.2.6）

> 本轮：v1.2.2 → v1.2.6，5 个 commit（2026-08-29 当日）。技术调研看改动实现质量，漏洞排查对照 W35 硬伤基线 a~h 逐条核验 + 通读关键路由找新漏洞。
> 结论速览：**「云同步鉴权」是真修复但只覆盖了 users 三接口；divine/AI 链路的鉴权是「半成品」——前端根本不传 token，越权防护形同虚设；历史列表与删除两条路由零鉴权是新暴露的高危面。**

---

## ① 技术调研：5 个 commit 的实现质量

### 1.1 ba8a0d3b 断语库校核 + 云同步鉴权（v1.2.3）

**断语库 15/15 reviewed**：`shared/core/data/duanyu.ts` 全部条目 `status:'reviewed'`（W35 时是 11 reviewed + 4 seed）。4 条 seed（子平真诠论用神/梅花体用论/烟波钓叟三奇六仪/小六壬口诀）已按权威底本逐字校核并带 sources URL。接入逻辑正确：`duanyuReviewed()` 过滤 reviewed 后 `matchDuanyu()` 按 tags/factors 与盘面关键词交集匹配，`duanyuPromptBlock()` 注入 prompt 作「古籍引证」。**同时修复了 W35 的 L7**：`duanyu.ts:52-53` 改为 `hit > 0` 才注入，零命中直接返回空，不再兜底注入「最通用第一条」。

**云同步鉴权**（`users.ts` +44/-13，鉴权核心）：
- token 生成：`newToken()` 32 字节随机 hex，注册/登录/占位建档时签发，明文存在 `db.json` 的 `user.token` 字段。
- 密码哈希：仍 scrypt（N=16384/R=8/P=1/keylen=64 + 16 字节随机盐），本次鉴权重构**未改哈希算法**，只新增 token 体系。
- 恒时比较：`tokenMatches()` 用 `timingSafeEqual` 防时序侧信道，正确。
- `requireOwner` 中间件挂在 profile/samples/records 的 GET/PUT/POST/DELETE 全部 8 条路由，读写均须携本人 token。

### 1.2 f743eca4c 安全加固与评测哨兵（v1.2.4）

**claimToken 防抢占**：占位账号（自动建档无密语）升级须持建档时发放的 token（`users.ts:104-108`，否则 409 ACCOUNT_CLAIMED）。逻辑闭环，有 `api-users.test.ts` 覆盖。

**divine/ai 归属校验强化**：`divine.ts:44-52` 与 `ai.ts:15-23` 各实现一份 `authedUsername()`——有 token 则以 token 解析用户，堵「query/body 自报 username」越权。**但这是本周期最大的「半成品」**：见 §2 漏洞 H-NEW1。

**per-IP 令牌桶限流**（`index.ts:57-72`）：`/api/ai` 每分钟 30 次，Map 按 IP 计数。方向正确，但实现有两处瑕疵：① 只覆盖 `/api/ai`，`/api/divine` 起占不限制（可无限建占刷 SQLite）；② `aiHits` Map 只增不清理，长期运行内存缓慢泄漏。

**eval.yml 哨兵**：每周一 UTC 02:00 跑 `harness.ts --mode guanwei --limit 20`。有效性评估见 §1.5。

### 1.3 c7e75ef04 安装引导改交互式 setup（docs）

`scripts/setup.sh/bat` 改交互式 + 占位符规范。纯文档/工程，无安全影响，不展开。

### 1.4 d3f8af495 + 3df51498c AI 时间事实注入（v1.2.5/v1.2.6）

**修复内容**：`promptBuilder.ts` 新增 `nowFact()`（`:83-88`）注入当前公历年月日时分+星期，加「不得自行推算年份」约束，堵占问类 AI 凭干支自推年份的错误（如"2025年1月"）。
- v1.2.5 单点：只覆盖 `buildReportMessages`/`buildStep1Messages`。
- v1.2.6 全路径：补 `buildStep2Messages`（流式主路径）/`buildMessages`/`systemPrompt`，并给 Step1 缓存键加「按天隔离」（`ai.ts:203-204`，key = divineId|day|question），防跨日复用过期「现在」。
- 测试 `tests/now-fact.test.ts` 5 项断言覆盖全部路径，质量扎实。

**两处小瑕疵**：① 缓存隔离用 `toISOString().slice(0,10)` 取 **UTC 日期**，中国 UTC+8 下 UTC 16:00 前归属「昨天」，粒度偏差极小、无功能影响；② `nowFact()` 用 `new Date()` 服务器本地时间，与排盘真太阳时无关，语义正确。

### 1.5 eval.yml 哨兵有效性（MingLi-Bench 口径）

**口径失真**：MingLi-Bench 是 160 道 MCQ 多选题（婚姻 44/事业 25/家庭 22…），观微输出是开放式 JSON 报告。harness 需把报告结论对到选项上做匹配，这个「开放→MCQ」转换本身有信息损失，评测的是「结论对选项的映射」而非「解读质量」。
**降采样噪声**：`--limit 20` 每周仅 20 题，统计误差 ±20pp 以上，只能抓「大回退」，抓不到 prompt 细粒度回退。
**无告警闭环**：workflow 只 `tail -30` 输出 + upload-artifact，**准确率回退不会 fail pipeline**——跑是跑了，但回退不告警，哨兵≈失职。需加阈值断言或失败退出。
**依赖 secret**：需 `LLM_DEEPSEEK_KEY`，未配置则 job 失败。
**文档滞后**：`eval/README.md:54` 已知限制#3 仍写「断语库全部 seed 未注入」，与本次 15/15 reviewed 已接入矛盾。

---

## ② 漏洞排查：硬伤基线 a~h 逐条核对

| # | 硬伤 | W35→W36 状态 | 结论 |
|---|---|---|---|
| a | tsconfig strict:false | ✅ 已修复（v1.1.3 已修，本次+1/-1 仅清理 include） | 根 tsconfig:19-22 strict 全开；server:8 strict:true；本次把 include 从 ["src","api"] 改 ["src","shared"]（删"api"残留 L6、加"shared"） |
| b | djb2 密码哈希 | ✅ 已修复（scrypt） | users.ts:42-48 scrypt + 随机盐 + timingSafeEqual + djb2 自动升级；鉴权重构未改哈希、只加 token。前端 userStore.ts:76-81 仍 djb2（本地演示级，文档自认） |
| c | 缺鉴权中间件 | ⚠️ **部分修复（关键缺口仍在）** | users 三接口 requireOwner 真修；divine/ai 是「半成品」见 H-NEW1；历史列表/删除零鉴权见 H-NEW2/3 |
| d | JSON/SQLite 存储分裂 | ❌ 未修复 | users.ts:9 db.json vs divineStore.ts:9 guanwei.db；且现三处独立无锁读写 db.json，并发覆盖更严重 |
| e | 断语库 seed 未接入 | ✅ 已修复（15/15 reviewed） | duanyu.ts 全 reviewed；L7 零命中不注入也一并修复 |
| f | AI 准确率 ~40% | ⚠️ 未提升（仅加哨兵机制） | eval.yml 是回归监控非准确率提升；40%/41.7% 数值未变（README:42-46 未更新） |
| g | 9 persona 提示词注入 | ⚠️ 未修复（现状未变） | promptBuilder.ts:1 仍「单轮注入，多 Agent 编排规划中」 |
| h | docs/RELEASE-SOP.md 缺失 | ❌ 未修复 | release.sh:7,73 仍引用；docs/ 仅 assets/ |

### 🔴 高危（新暴露）

**H-NEW1｜divine/AI 越权防护对真实前端失效——前端从不传 token，鉴权退化为「自报 username」**
- `src/services/api.ts` 的 `apiDivine`(:243)、`apiDivineHistory`(:266)、`apiDivineDetail`(:272)、`apiDivineDelete`(:278)、`aiInterpretStream`(:170) **全部只带 `Content-Type`，不带 `X-Guanwei-Token`**。全项目唯一带 token 的是 `userStore.ts:179 syncHeaders()`，只用于 profile/records 同步。
- 后果：`divine.ts:148` 与 `ai.ts:45,110` 的归属校验走「无 token fallback」分支 `username === rec.username`——username 是客户端自报、可伪造。**知道对方 username + divineId 即可读其 resultRaw（完整出生数据）与 AI report**。W35 H1 的「知道 username 即可读任意档案」在 divine/AI 侧**实质上未修复**，只是把 token 校验写成了死代码。
- 根因：前端登录/注册拿 token 后存 localStorage session，但 `api.ts` 未接 `sessionToken()`，前端改造与后端鉴权脱节。

**H-NEW2｜GET /api/divine 历史列表零归属校验**
- `divine.ts:134-140`：`ensureUser(username)` 后直接 `listDivinations(username)`，**无 token 校验、无归属校验**。任何人可列任意用户的占卜历史（artId + question 文本 + createdAt + hasReport），question 是用户输入的问题（可能含隐私），属隐私泄露。

**H-NEW3｜DELETE /api/divine/:id 零鉴权**
- `divine.ts:155-160`：`deleteDivination(id, username)`，username 取自 query 自报。配合 H-NEW2 可构成「列→删」全链无鉴权：先列受害者历史拿 id，再 `DELETE /:id?username=victim` 删除，全程无需 token。

### 🟠 中危

**M-NEW1｜POST /api/divine 记录归属 bug——用自报 username 而非 resolved owner**
- `divine.ts:57-58` 算出 `owner = authed || username`，但 `:123` `createDivination({ username, ... })` 传的是**原始自报 username**，不是 `owner`。持 alice token 可把占卜记录写到 victim 名下（数据污染，且后续 victim 列表/详情会看到不属于自己的记录）。

**M-NEW2｜token 生命周期脆弱：无过期、无吊销、登录不轮换、明文存盘**
- `users.ts:51-53` token 32 字节随机、**无 expiresAt 字段**、登录返回同一 token 不轮换、logout 仅清前端 localStorage 不吊销服务端。db.json 一旦泄露（JSON 明文）全部 token 泄露即全量账号失守。对「本地/内网自部署」定位可接受，但暴露公网则高危。

**M-NEW3｜限流覆盖不完整 + 令牌桶内存泄漏**
- 限流只挂 `/api/ai`，`/api/divine` 起占无限流（可无限建占刷 SQLite 与 resultRaw）；`aiHits` Map（`index.ts:58`）只增不清理，长期运行缓慢涨内存。

**M4（延续 W35）｜AI 解读质量评测缺口仍在**
- `ai.ts:349-369` 质量评分仍是「字段存在 + 长度>10 字」的结构门禁，不测解读对错；准确率 40% 无提升。eval.yml 哨兵因「无告警闭环 + 降采样噪声」实际起不到回归防护（见 §1.5）。

### 🟡 低危

**L-NEW1｜占位账号锁定风险（ensureUser 发 claimToken 但从不返回）**
- `divine.ts:32` 自动建档生成 token 却**不返回给前端**。真实场景：用户离线本地注册 → 在线起占 → divine 先自动建档占位（token 无人知）→ 之后 `fetchServerToken` 登录(无密语 401)→register(占位→409 ACCOUNT_CLAIMED)。用户本地账号永久无法云同步。需要「起占建档后返回 claimToken」或「让前端先 register 再起占」。

**L2/L3/L4/L6（延续 W35，本次仅部分清理）**
- L2 CHANGELOG 计数：v1.2.0 仍写「16 条中 11 条 reviewed」+「223 项」，实际 15 条 reviewed、实测 234 项（CHANGELOG:18 自报）。计数与断语数量仍未完全对齐。
- L3 断语库数量注释已随 15/15 校核自然消解，但 `eval/README.md` 仍写「全部 seed」。
- L4 品牌统一：server 包名已改 guanwei-server ✅（本次修复），但 `index.ts:85` banner 仍是「观微后端」（无碍）。
- L6 前后端鉴权双轨死代码：随 token 体系部分激活，但前端 `api.ts` 未接 token 导致后端 token 校验在 divine/AI 仍是死代码（见 H-NEW1）。

---

## ③ 代码证据速查（文件:行号）

| 结论 | 证据 |
|---|---|
| scrypt 哈希（未变） | users.ts:42-48 |
| token 签发/恒时比较 | users.ts:51-60 |
| requireOwner（users 三接口真修） | users.ts:141-150 |
| claimToken 409 | users.ts:104-108 |
| divine/ai authedUsername token 优先 | divine.ts:44-52、ai.ts:15-23 |
| 前端从不传 token（死代码根因） | api.ts:170/243/266/272/278 无 X-Guanwei-Token |
| 历史列表零鉴权 | divine.ts:134-140 |
| 删除零鉴权 | divine.ts:155-160 |
| 记录归属 bug（自报 username） | divine.ts:123 |
| AI 限流令牌桶 | index.ts:57-72 |
| 时间事实注入 nowFact | promptBuilder.ts:83-88 |
| Step1 缓存按天隔离（UTC 日） | ai.ts:203-204 |
| 断语零命中不注入 | server/src/services/duanyu.ts:52-53 |
| 断语 15/15 reviewed | shared/core/data/duanyu.ts:23-143 |
| 评测哨兵 eval.yml | .github/workflows/eval.yml:32-37 |
| 准确率 40% 未变 | server/scripts/eval/README.md:42-46 |
| 9 persona 仍提示词注入 | promptBuilder.ts:1 |
| RELEASE-SOP 仍缺失 | release.sh:7,73 |

---

## ④ 结论摘要

1. **断语库与时间事实是两处扎实的真修复**：15/15 reviewed 断语接入 + L7 零命中不注入，古籍引证成为完整卖点；时间事实全路径注入 + 缓存按天隔离，用一个「禁止自推年份」的工程约束精准堵住占问类 AI 年份错乱，测试 5 项全过。

2. **「云同步鉴权」是真修复但只覆盖 1/3 面**：users 三接口（profile/samples/records）的 requireOwner 是完整鉴权；但 divine/AI 的 token 校验是**半成品**——前端 `api.ts` 从不带 token，鉴权退化为「自报 username」可伪造，加上历史列表、删除两条路由零鉴权，W35 H1 的「知道 username 即可读/改任意数据」在 divine/AI 侧实质上未堵住，反而因「以为修了」而放松警惕。这是本周期最需要 PM/可乐注意的结论。

3. **新暴露 3 个高危面**：divine/AI 越权防护失效（H-NEW1）、历史列表零鉴权（H-NEW2）、删除零鉴权（H-NEW3）——三者可拼成「未授权读隐私 → 未授权删除」全链。根因是前端 token 接入与后端鉴权脱节，属**本次安全加固引入的半成品状态**，非旧代码遗留。

4. **eval.yml 哨兵名不副实**：口径失真（开放报告→MCQ）+ 降采样噪声（20 题/周）+ 无告警闭环（回退不 fail pipeline），实际起不到 AI 质量回归防护；准确率 40% 仍无提升，是「AI 深度解读」产品卖点与实测质量的持续鸿沟。

5. **基线 8 项硬伤进度**：a✅ b✅ e✅ 已修复；d❌ h❌ 未修复；c⚠️ f⚠️ g⚠️ 部分/未实质解决。安全边界从「全裸」进步到「users 侧有锁、divine/AI 侧半锁」，但存储双轨无锁、RELEASE-SOP 缺失、9 persona 营销领先实现三项延续未动。

---

*本报告由 pm-leader（若水）派发、基石（product-architect）执行，W36 更新监控轮次，基于 /tmp/guanwei-monitor（v1.2.6, HEAD 3df51498c）静态阅读产出（未实测编译/测试，因本轮为 diff 增量核对）。*
