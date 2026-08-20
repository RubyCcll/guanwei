# 观微 · 以术问道

[![CI](https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml)

东玄为主、中西合参的玄学占卜应用：九术排盘、AI 深度解读、古籍引证、学馆修习，一条链路贯通「排盘 → 解读 → 归档 → 回看」。

> 占问所得，仅供修身养性、怡情遣兴之用，不构成任何决策依据。

## ✨ 功能

### 九术排盘（前端展示 + 后端计算入库）
| 类目 | 术数 |
|---|---|
| 命盘类 | 八字（子平）、紫微斗数、古典星盘（VSOP87 回归黄道） |
| 占问类 | 奇门遁甲、梅花易数、六爻、大六壬、小六壬、塔罗 |

- 出生时间支持 **公历/农历双历**、精确到时刻（东玄据此推时辰，星盘直接用时刻）
- 地点精确到 **省市区县 → 经纬度**（真太阳时校正）
- 起占结果由后端计算并**持久化入库**（SQLite），六爻摇卦、塔罗抽牌等交互结果同样后端定稿

### AI 深度解读
- 9 个 Agent × Skills 编排（如紫微：命盘结构 → 星曜落宫 → 十二宫 → 大限流年 → 人生阶段）
- **双轨 Schema**：命盘类（原始解读/性格/人生阶段/学业事业/爱情/财富/健康）、占问类（现状/趋势/时机）
- **盘面事实一致性约束**：AI 必须逐字引用排盘数据，不得编造（如上升星座）
- 问题-术数**适配性分析**（如奇门不适于问情爱）
- 流式生成：生成中只显示滚动字数，完成后再呈现结构化报告卡片
- 报告可导出 Markdown / 存为 PDF

### 其他
- 古籍页（背景动画、经典原文）、学馆（九术源流与知识）
- 用户档案管理（主档案/示例档案/编辑/切换）
- 占卜历史（起占自动归档，可回看排盘与 AI 报告，可删除）
- 占卜记录预留商业化字段（套餐/配额）

## 🏗️ 技术架构

```
前端 React 18 + TS + Vite + Tailwind（宋式美学 UI）
后端 Express + tsx（SSE 流式 + SQLite 存储）
共享引擎 shared/core/engine/*（lunar-typescript 历法 + astronomy-engine 星历）
AI 层：多 LLM 适配（兼容 OpenAI 兼容端点与 Google 格式，服务商由 server/.env 配置）
```

### 数据流
```
① 排盘：登录用户 → 前端输入 → POST /api/divine → 后端引擎计算 → SQLite 入库 → 前端渲染
② AI：点击解读 → POST /api/ai/interpret/stream(divineId) → 后端读库 → 组装 Prompt → LLM SSE 流式返回
     → 后端 parseReport 结构化匹配（清洗/映射/质量评分）→ quality=ok 才入库 → 前端 ReportView
③ 历史：GET /api/divine?username= → 档案管理页列表/详情/删除
```

## 🌐 在线演示

[GitHub Pages 演示站](https://rubyccll.github.io/guanwei/) —— 仅前端 UI 预览（首页/九术说明/古籍/学馆）。

> ⚠️ 演示站为纯静态托管，**不含后端服务**：排盘、AI 解读、登录等依赖后端的能力在演示站不可用（会提示"请先入馆/推演未应机"）。完整功能请本地运行（见下）。

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22（使用内置 node:sqlite）
- 一个 LLM API Key（OpenAI 兼容端点或 Google 格式均可，见 server/.env.example）

### 安装与启动

```bash
# 1. 安装依赖
npm install            # 前端
cd server && npm install && cd ..

# 2. 配置后端环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填入所选服务商的 Key（见 .env.example 注释）

# 3. 配置前端开发环境（可选）
cp .env.development.example .env.development

# 4. 启动后端（端口 3018）
cd server && npm run dev

# 5. 启动前端（端口 5178，另开终端）
npm run dev
```

打开 http://localhost:5178 → 缘起页注册 → 九术页起占 → 召 AI 成报告。

### 测试
```bash
npm test                 # 128 项测试（核心引擎/渲染/交互/存储/流程）
cd server && npx tsx scripts/divineStoreSmoke.ts   # SQLite 存储冒烟
```

## 📁 目录结构

```
├── src/               # 前端（页面/组件/hooks/服务）
├── server/
│   ├── src/
│   │   ├── routes/    # divine（排盘）/ ai（解读）/ users（用户）
│   │   └── services/  # skills（Agent）/ promptBuilder / llmProvider / divineStore
│   ├── data/          # SQLite 与用户数据（gitignore）
│   └── .env.example
├── shared/core/       # 前后端共用引擎（排盘算法/数据）
├── shared/core/       # 前后端共用引擎（排盘算法/数据）
├── docs/              # 需求与设计文档（本地）
└── tests/             # 测试
```

## 🔐 安全说明
- 所有密钥仅存于本地 `server/.env`（已 gitignore），仓库只提供 `.env.example` 模板
- AI 报告质量门槛：结构评分不达标不入库，自动留档供改进提示词

## 🗺️ 迭代计划

本项目长期维护、持续迭代，已完成与计划方向（随版本推进更新）：

已完成：
- ✅ **排盘精度**：八字（藏干十神/旺衰拆解/用神喜忌/大运流年/神煞/胎元命宫身宫）、紫微（辅曜安星/生年四化/庙旺落陷/格局识别）、星盘（宫位/行星入宫/庙旺逆行）、六爻纳甲（六亲六神世应/月破旬空）、奇门（值使/暗干/八神）、六壬（贵人/十二天将）、梅花（体用旺衰）
- ✅ **AI 解读**：两步管线（盘面解析 → 深度报告）、盘面事实注入、画像级 Schema（原生家庭/心理行为模式/亲密关系）、多 LLM 适配
- ✅ **评测闭环**：接入 MingLi-Bench（160 题）建立 AI 解读评测基线，评测驱动 prompt 迭代（server/scripts/eval/）
- ✅**排盘精度**：紫微小星补全、八字月令取格；Placidus 宫位制、外行星；六爻六亲世应、大六壬九宗门等进阶推演
- ✅**AI 解读**：断语库 reviewed 后注入引证闭环；报告结构继续打磨；提示词与质量评分持续调优（评测 + `ai_fail_logs` 双驱动）
计划方向：
- **开放分发**：MCP Server / Agent Skill / REST API（复用 shared/core 单一算法副本）
- **体验**：更多 UI 打磨、移动端适配、性能优化
- **持续演进**：更细致的解读和更精确的个人化设计

### 如何参与
- 🐛 遇到问题 → 提 [Bug 报告](https://github.com/RubyCcll/guanwei/issues/new?template=bug_report.yml)
- 💡 有想法 → 提 [功能建议](https://github.com/RubyCcll/guanwei/issues/new?template=feature_request.yml)
- 📦 发版节奏：功能累积后打 tag 发 Release，v1.0.0 起遵循语义化版本

## 📄 License
[MIT](LICENSE)

---

**观微** · 以术问道，观微知著。本仓库将持续迭代，欢迎 Star 与 Issue。
