# 贡献指南

感谢你对观微（Guanwei）的兴趣！无论是提 Issue、改文档、修 bug 还是加功能，都欢迎。

## 目录

- [开发环境](#开发环境)
- [代码结构速览](#代码结构速览)
- [提 Issue](#提-issue)
- [提 PR](#提-pr)
- [测试要求](#测试要求)
- [代码规范](#代码规范)
- [隐私约定](#隐私约定)

## 开发环境

```bash
npm install                 # 前端依赖
cd server && npm install    # 后端依赖
cp server/.env.example server/.env   # 配置 LLM Key
cd server && npm run dev    # 后端 :3018
npm run dev                 # 前端 :5173
```

## 代码结构速览

| 目录 | 职责 |
|---|---|
| `shared/core/engine/` | **排盘算法（前后端唯一副本）**：八字/紫微/星盘/奇门/六爻/六壬/小六壬/梅花/塔罗 |
| `server/src/routes/` | Express 路由：divine（排盘入库）/ ai（解读）/ users / hour（时辰反推） |
| `server/src/services/` | promptBuilder（提示词）/ llmProvider / divineStore（SQLite）/ hourInference（时辰反推引擎）/ relativesCheck（六亲校验） |
| `src/` | React 前端：面板/结果组件/页面 |
| `tests/` | Vitest 测试 |

**铁律：排盘算法只放 `shared/core/engine/`**，前端展示与后端计算都必须从这里调用，禁止另写副本。

## 提 Issue

- Bug 报告请用模板，附上：复现步骤、期望行为、实际行为、控制台报错
- 命理准确性问题请附：出生信息（日期/时辰/地点）与盘面截图，**不要**在 Issue 中公开他人隐私
- 功能建议请说明使用场景，我们会评估是否值得做

## 提 PR

1. Fork 仓库，从 `main` 切分支（`fix/xxx` 或 `feat/xxx`）
2. 小步提交，提交信息用中文描述（参考 `git log` 风格）
3. 每个 PR 至少覆盖：
   - 相关测试（新增功能必须有测试）
   - 排盘/引擎改动必须通过 `tests/core.test.ts` 等引擎测试
4. 提交前本地跑通：`npm test`（全量 180+ 项）

## 测试要求

```bash
npm test                    # 全量
npx vitest run tests/xxx    # 单个文件
```

- 引擎改动：跑排盘精度测试 + 回归集（`tests/regression-real-case.test.ts`）
- 提示词改动：跑 `tests/hour-infer.test.ts`（提示词约束断言）并说明改动意图
- **测试数据一律使用虚构样本**，禁止把真实用户出生信息/经历写入入库测试

## 代码规范

- TypeScript 严格模式；前后端共享类型放 `shared/core/types.ts`
- 排盘引擎纯函数、无副作用；新增排盘能力时同步更新 `chartBrief`（AI 事实注入源）
- 前端 UI 保持宋式美学：米白底、墨色字、青瓷绿点缀（见 `src/index.css` 设计变量）

## 隐私约定

本仓库是**零隐私仓库**：

- 密钥只在本地 `.env`（gitignore），仓库只提供 `.env.example`
- 用户数据（SQLite / db.json）全部 gitignore
- 测试数据一律使用虚构/匿名样本，禁止真实个人信息进入仓库
- 提交前请自查：`git status` 无意外文件、无真实个人信息

---

再次感谢贡献 🙏 有任何问题欢迎在 Discussion 或 Issue 中提出。
