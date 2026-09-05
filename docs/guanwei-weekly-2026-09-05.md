# 观微周报 W36（2026-09-05）

> 监控轮次：第 2 轮｜HEAD ca2afb45 → 3df51498c（v1.2.2 → v1.2.6）｜本周期 5 commits（2026-08-29 当日密集提交，09-01 push）
> 定位：安全与质量基线收官周——鉴权/安全加固/AI 质量哨兵一次性补齐，但暴露「半成品加固」新风险

## 本周更新概览

| 版本 | 主题 | 定性 |
|---|---|---|
| v1.2.3 | 云同步鉴权 + 断语库 15/15 校核 | 堵旧洞 + 内容护城河坐实 |
| v1.2.4 | H1 安全审计 + eval.yml 质量哨兵 | 安全加固（含半成品） |
| v1.2.5/1.2.6 | AI 时间事实注入全路径 + 缓存按天隔离 | 质量真修复 |

## 技术调研要点（基石）

- **硬伤基线 8 项：3 修 2 未修 3 部分**。a（strict/bcrypt）✅、b（密码哈希）✅、e（断语 seed）✅ 真修复；d（存储双轨分裂）❌、h（RELEASE-SOP 缺失）❌ 延续未动；c（鉴权）⚠️、f（准确率）⚠️、g（persona）⚠️ 未实质解决。
- **最大发现——云同步鉴权是半成品**：users 三接口 requireOwner 真修，但前端 api.ts 全线未接 X-Guanwei-Token，divine/AI 链路 token 校验是死代码，鉴权退化为可伪造的「自报 username」。W35 H1 洞在 divine/AI 侧实质上没堵住，且「以为修了」更危险。
- **两处扎实真修复**：断语库 15/15 reviewed 接入（顺带修 L7 零命中兜底）+ 时间事实全路径注入（堵占问类 AI 自推年份错乱，5 回归测试全过）。

## 漏洞/缺陷清单 Top（基石，按严重度）

- **H-NEW1（高危）**：divine/AI 越权防护对真实前端失效——自报 username 可伪造，知道 username+divineId 即可读他人 resultRaw+报告。
- **H-NEW2（高危）**：GET /api/divine 历史列表零归属校验，任何人可列任意用户占卜历史（question 文本泄露）。
- **H-NEW3（高危）**：DELETE /api/divine/:id 零鉴权，与 H-NEW2 拼成「列→删」全链无鉴权。
- **中**：claimToken 建档后丢失风险（纯本地用户升级可能锁死无法云同步）；eval.yml 哨兵名不副实（口径失真 MCQ vs 开放报告、20 题/周噪声大、无 fail 告警闭环）。
- 上述 H-NEW1~3 属本次安全加固引入的半成品，非旧遗留。

## 商业/产品影响（寻商）

- 路径 A「托管前置」已清障，从「封装 MVP」升级为「封装 + 可直接试托管」；路线排序不变（A 主 / B 维持 / C 并入 A）。
- **唯一关键缺口 = 开放分发**：guanwei-mcp 连续两周停在纸面（P1-3 零动作），建议升级 P0 本周启动，与托管试跑合并推进。
- 断语 15/15 校核坐实内容护城河；但口径差 1 条（上期 11/16 剩 5 vs 本周 15/15），宣传前需核验条目数。
- 社区质变信号：issue 5→11（上期全 dependabot 噪音 → 本期 6 个真人需求），star 仅 +1（2→3）——「用的人在认真反馈，路人流量缺位」，建议下周逐条读 6 个 issue 做种子用户画像。

## 演进规划建议

1. 后端优先：补 divine/AI 链路 token 真校验 + 前端 api.ts 接 token（H-NEW1~3 同根因，一周内可收口）。
2. 分发优先：guanwei-mcp 封装启动（P1-3 → P0），这是投入产出比最高项。
3. 下周逐条读 6 个新 issue，识别种子用户画像。
4. 评估 eval.yml 改为「口径对齐 + fail pipeline」真哨兵；向作者核验断语 15/15 条目口径。

---
## 数据附录

- 检测方式：git ls-remote 443 直连超时（上期已记录），改用 GitHub API（compare + commits + tags）+ codeload tarball 浅取代码。获取时间 2026-09-05 11:02 CST。
- 远程 HEAD：`3df51498c3273bb8f577cba450c814d75241b83f`（v1.2.6，main）｜上期 `ca2afb45390147adaf2b8554f611fdc244bc194b`（v1.2.2）
- 本周期 commits（5，均 2026-08-29）：
  1. ba8a0d3b feat: 断语库全部校核与云同步鉴权（v1.2.3）
  2. f743eca4 feat: 安全加固与评测哨兵（v1.2.4）
  3. c7e75ef0 docs: 安装引导改交互式 setup 与占位符规范
  4. d3f8af49 fix: AI 解读注入当前时间事实防年份错乱（v1.2.5）
  5. 3df51498 fix: 时间事实注入覆盖全部解读路径（v1.2.6）
- 改动面：users.ts(+44/-13)、userStore.ts(+52/-5)、divine.ts(+29/-7)、ai.ts(+25/-3)、index.ts(+18)、promptBuilder.ts(+17)、duanyu.ts(shared 9/-10 + server 2/-3)、api-users.test.ts(+158/-9)、新增 eval.yml(+44)、now-fact.test.ts(+40)、duanyu-inject.test.ts(+8/-2)、tsconfig.json(+1/-1)、CHANGELOG(+57/-2) 等共 21 文件。
- 版本：v1.2.2 → v1.2.6；engines node >=22.13.0；测试合计 234 项全过（CHANGELOG 自述）。
- 社区数据：stars 2→3｜forks 0→0｜open_issues 5→11｜watchers 2｜pushed_at 2026-08-24T14:58:05Z → 2026-09-01T13:28:49Z（距本次监控 4 天，活跃健康）。
- 落档：W36/guanwei-tech-2026-09-05.md（160 行）、W36/guanwei-biz-2026-09-05.md（137 行），均核验存在、尾部完整。
- 局限：基石为静态阅读（未实测编译/测试），寻商对 commit 细节采信 PM 摘要未逐条复核 diff。
