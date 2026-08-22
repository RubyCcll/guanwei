# 观微 · 以术问道

<p align="center">
  <b>Open-source Chinese metaphysics: nine arts of divination with AI interpretation.</b><br>
  <i>简体中文</i> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <img src="docs/assets/guanwei-banner.png" alt="观微 Guanwei · 以术问道，观微知著" width="720">
</p>

<p align="center">
  <a href="https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml"><img src="https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://rubyccll.github.io/guanwei/"><img src="https://img.shields.io/badge/demo-GitHub_Pages-4a5442" alt="GitHub Pages"></a>
  <a href="https://github.com/RubyCcll/guanwei/releases"><img src="https://img.shields.io/github/v/release/RubyCcll/guanwei" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-9c4a2f" alt="MIT License"></a>
  <a href="https://github.com/RubyCcll/guanwei"><img src="https://img.shields.io/badge/TypeScript-5.8-3178c6" alt="TypeScript"></a>
  <a href="https://github.com/RubyCcll/guanwei/issues"><img src="https://img.shields.io/badge/tests-181-brightgreen" alt="Tests"></a>
</p>

<p align="center">
  <b>Guanwei</b> — an open-source Chinese metaphysics application: eight-character Bazi, Ziwei Doushu, classical astrology, Qimen Dunjia, Liuyao, Da Liu Ren, Meihua, Xiaoliuren and Tarot — with AI-powered in-depth interpretation.
  <br><i>东玄为主、中西合参的玄学占卜应用：九术排盘、AI 深度解读、古籍引证、学馆修习，一条链路贯通「排盘 → 解读 → 归档 → 回看」。</i>
</p>

> 占问所得，仅供修身养性、怡情遣兴之用，不构成任何决策依据。

## ▶️ 立即体验（无需注册 · 无需配置 · 无需 API Key）

<p align="center">
  <a href="https://rubyccll.github.io/guanwei/#/demo"><img src="docs/assets/demo.gif" alt="演示：九术排盘 → AI 报告" width="700"></a><br>
  <a href="https://rubyccll.github.io/guanwei/#/demo"><b>▶ 打开交互演示</b></a> —— <b>九种术数本地排盘</b>（浏览器直接计算，零后端），八字附带完整 AI 解读示例
</p>

> 另有 [GitHub Pages 静态演示站](https://rubyccll.github.io/guanwei/)（首页/九术说明/古籍/学馆）。完整功能（真实排盘 + 实时 AI 解读 + 存档）请本地/云端部署（见下）。

## 🖼️ 界面预览

<p align="center">
  <img src="docs/assets/screenshot-home.png" alt="首页" width="49%">
  <img src="docs/assets/screenshot-bazi.png" alt="八字排盘" width="49%">
</p>

## ✨ 功能

### 九术排盘（确定性历法计算，前后端单一算法副本）
| 类目 | 术数 |
|---|---|
| 命盘类 | 八字（子平）、紫微斗数、古典星盘（VSOP87 回归黄道） |
| 占问类 | 奇门遁甲、梅花易数、六爻、大六壬、小六壬、塔罗 |

- 出生时间支持 **公历/农历双历**、精确到时刻（东玄据此推时辰，星盘直接用时刻）
- 地点精确到 **省市区县 → 经纬度**（真太阳时校正，含 1986-1991 中国夏令时回拨）；未填地点时明示"按北京时间排盘"
- **时辰未知支持**：不排时柱仅依年月日三柱论命；可**依人生关键事件反推时辰**（流年 × 时柱应象打分引擎）
- **盘面动态话术**：排盘结果按日主×季节×旺衰×十神×五行旺缺×大运喜忌生成个性化解读，告别千篇一律的模板
- 起占结果由后端计算并**持久化入库**（SQLite），六爻摇卦、塔罗抽牌等交互结果同样后端定稿

### AI 深度解读
- 9 个 Agent × Skills 编排（如紫微：命盘结构 → 星曜落宫 → 十二宫 → 大限流年 → 人生阶段）
- **双轨 Schema**：命盘类（原始解读/性格/原生家庭/心智模式/人生阶段/事业/爱情/财富/健康）、占问类（现状/趋势/时机）
- **盘面事实一致性约束**：AI 必须逐字引用排盘数据，不得编造；后端**六亲宫位事实校验 + 矛盾定向修正**（宫位地支/主星/借星/生年四化）
- **解读稳定性**：Step1 盘面解析缓存复用、低温采样、论断锚定（主观程度词必须有盘面依据）、去重与字数预算
- **人生经历校准**：可录入命主已知人生事件，AI 解读在对应流年处呼应、且不与已知经历矛盾
- 问题-术数**适配性分析**（如奇门不适于问情爱）
- 流式生成 + 结构化报告卡片，可导出 Markdown / 存为 PDF

### 其他
- 古籍页（背景动画、经典原文）、学馆（九术源流与知识）
- 用户档案管理（主档案/示例档案/编辑/切换）
- 占卜历史（起占自动归档，可回看排盘与 AI 报告，可删除）

## 🏗️ 技术架构

```
前端 React 18 + TS + Vite + Tailwind（宋式美学 UI）
后端 Express + tsx（SSE 流式 + SQLite 存储）
共享引擎 shared/core/engine/*（lunar-typescript 历法 + astronomy-engine 星历）
AI 层：多 LLM 适配（OpenAI 兼容 / Google 格式，DeepSeek / Gemini / Groq / 通义 / 自定义端点）
```

### 数据流
```
① 排盘：登录用户 → 前端输入 → POST /api/divine → 后端引擎计算 → SQLite 入库 → 前端渲染
② AI：点击解读 → POST /api/ai/interpret/stream(divineId) → 后端读库 → 组装 Prompt → LLM SSE 流式返回
     → 后端 parseReport 结构化匹配（清洗/映射/质量评分/六亲事实校验）→ quality=ok 才入库 → 前端 ReportView
③ 历史：GET /api/divine?username= → 档案管理页列表/详情/删除
```

## 🚀 快速开始（三选一，1 分钟跑起来）

**只需一步：配置你的 API Key**（[5 家服务商任选](#-获取-api-key5-家服务商任选)，DeepSeek 性价比最高）。

### 方式一：GitHub Codespaces（零本地安装，云端一键）

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/RubyCcll/guanwei)

点击按钮 → 云端环境自动装好依赖 → 终端执行：

```bash
./scripts/setup.sh --key 你的APIKey
```

### 方式二：Docker（无需 Node 环境，免构建）

预构建镜像已发布到 GitHub Container Registry（amd64 + arm64 双平台）：

```bash
./scripts/setup.sh --docker --key 你的APIKey   # 自动配置 + 拉取镜像 + 启动
# 或手动：
#   cp server/.env.example server/.env   （填入 Key）
#   docker compose up -d                  （自动拉取 GHCR 镜像）
```

打开 http://localhost:5173 。停止：`docker compose down`。

镜像：`ghcr.io/rubyccll/guanwei-guanwei-web` / `guanwei-guanwei-backend`；端口冲突时 `WEB_PORT=5180 API_PORT=3020 docker compose up -d` 覆盖。也可直接 `docker pull ghcr.io/rubyccll/guanwei-guanwei-web:latest`。

### 方式三：本地 Node.js（≥ 22）

```bash
./scripts/setup.sh --key 你的APIKey   # 交互式可直接运行 ./scripts/setup.sh
```

脚本自动：安装依赖 → 写入 `server/.env`（Key 仅存本地）→ 启动前后端。打开 http://localhost:5173 → 缘起页注册 → 九术页起占 → 召 AI 成报告。

### 🖥️ 观微 CLI（启动 / 更新 / 自检一条命令）

```bash
npm link        # 全局安装 guanwei 命令（或直接 ./scripts/guanwei）

guanwei setup --key sk-xxx   # 配置 API Key（交互式：guanwei setup）
guanwei start                # 启动（--docker 用容器）
guanwei doctor               # 环境自检（Node/配置/占位密钥/端口/依赖/版本）
guanwei update               # 更新到最新版（git 增量合并，.env 等本地配置不覆盖）
guanwei check / status       # 版本检查 / 状态
guanwei stop                 # 停止（docker 模式）
```

> `guanwei update` 采用 **git 增量合并**：只拉取远程变更、保留本地所有配置（`.env` 等已 gitignore 文件不受影响）；检测到本地未提交修改会先提示并自动 stash 保护，更新完成后恢复。

### 🔑 获取 API Key（5 家服务商任选）

| 服务商 | 官方入口 | 说明 |
|---|---|---|
| **DeepSeek**（推荐） | https://platform.deepseek.com | 性价比最高，中文好 |
| Groq | https://console.groq.com | 有免费额度 |
| Gemini | https://aistudio.google.com/apikey | 有免费额度 |
| 通义千问 | https://dashscope.console.aliyun.com/ | 国内直连 |
| 自定义端点 | 任意 OpenAI 兼容接口 | `--provider custom` |

注册后在对应平台创建 Key → 运行 `./scripts/setup.sh --key 你的Key`（Windows 用 `scripts/setup.bat --key 你的Key`）即完成配置；未配置时页面会有明确引导。

### 测试
```bash
npm test                 # 181 项测试（核心引擎/渲染/交互/存储/流程/提示词）
cd server && npx tsx scripts/divineStoreSmoke.ts   # SQLite 存储冒烟
```

## 📁 目录结构

```
├── src/                 # 前端（页面/组件/hooks/服务）
├── server/
│   ├── src/
│   │   ├── routes/      # divine（排盘）/ ai（解读）/ users / hour（时辰反推）
│   │   └── services/    # promptBuilder / llmProvider / divineStore / hourInference / relativesCheck / sixRelatives
│   ├── data/            # SQLite 与用户数据（gitignore）
│   └── .env.example
├── shared/core/         # 前后端共用引擎（排盘算法/数据，单一副本）
├── scripts/             # setup.sh（一键配置）/ guanwei（CLI）/ release.sh（发版）/ setup.bat（Windows）
├── deploy/              # nginx 配置（Docker 部署）
├── .devcontainer/       # GitHub Codespaces 模板
├── Dockerfile.web / Dockerfile.server / docker-compose.yml
├── docs/                # 开源素材（banner/截图/GIF/示例报告）
└── tests/               # 测试（含回归集）
```

## 🔐 安全说明
- 所有密钥仅存于本地 `server/.env`（已 gitignore），仓库只提供 `.env.example` 模板；Docker 镜像构建已排除 `.env`（.dockerignore）
- AI 报告质量门槛：结构评分不达标不入库，自动留档供改进提示词
- 测试数据全部虚构/匿名化，不含真实用户隐私；真实案例仅存本地（git 忽略）

## 📄 示例输出

- [示例 AI 报告 PDF](docs/assets/sample-report.pdf)（虚构档案，真实管线生成）

## 🗺️ 迭代计划

已完成（v1.1.x）：
- ✅ **排盘精度**：八字（藏干十神/旺衰拆解/用神喜忌/大运流年/神煞/胎元命宫身宫/时辰未知）、紫微（辅曜安星/生年四化/庙旺落陷/格局识别）、星盘（宫位/行星入宫/庙旺逆行）、六爻纳甲（六亲六神世应/月破旬空）、奇门（值使/暗干/八神）、六壬（贵人/十二天将）、梅花（体用旺衰）
- ✅ **AI 解读**：两步管线（盘面解析 → 深度报告）、盘面事实注入、画像级 Schema、多 LLM 适配、解读稳定化与去重、六亲事实校验修正、人生经历校准
- ✅ **时辰反推**：依人生关键事件推演时辰（流年 × 时柱应象打分引擎）
- ✅ **盘面动态话术**：排盘结果按盘面数据生成个性化解读
- ✅ **部署套件**：一键配置脚本、Docker Compose（GHCR 预构建镜像）、Codespaces、guanwei CLI（启动/更新/自检）、Windows 支持
- ✅ **演示页**：九术本地排盘（纯浏览器引擎）+ 八字示例报告，GitHub Pages 直接体验
- ✅ **评测闭环**：接入 MingLi-Bench（160 题）建立 AI 解读评测基线，评测驱动 prompt 迭代

计划方向：
- **开放分发**：MCP Server / Agent Skill / REST API（复用 shared/core 单一算法副本）
- **体验**：移动端适配深化、性能优化、演示页输入表单
- **持续演进**：更细致的解读和更精确的个人化设计

## 🤝 如何参与

- 🐛 遇到问题 → 提 [Bug 报告](https://github.com/RubyCcll/guanwei/issues/new?template=bug_report.yml)
- 💡 有想法 → 提 [功能建议](https://github.com/RubyCcll/guanwei/issues/new?template=feature_request.yml)
- 🧑‍💻 想写代码 → 见 [CONTRIBUTING.md](CONTRIBUTING.md)（含「我想做什么 → 推荐起点」导航）
- 🌱 新手友好 → [good first issue](https://github.com/RubyCcll/guanwei/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- ⭐ 觉得不错 → 点个 Star，就是最大的支持
- 📦 发版节奏：语义化版本，见 [CHANGELOG.md](CHANGELOG.md)；发版一条命令 `./scripts/release.sh <版本号>`

## 📄 License
[MIT](LICENSE)

---

**观微** · 以术问道，观微知著。本仓库将持续迭代，欢迎 Star 与 Issue。
