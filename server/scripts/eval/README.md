# 观微 × MingLi-Bench 评测闭环（M1）

> 目标：把 [MingLi-Bench](https://github.com/DestinyLinker/MingLi-Bench)（160 道命理师大赛真题 MCQ，MIT）接入观微，
> 形成「评测驱动 prompt 迭代」正循环：改 prompt → 重跑 → 看准确率变化 → 保留最优。

## 数据

- `datasets/data.json`：160 道题（12 类事件：婚姻 44 / 事业 25 / 家庭 22 / 健康 17 / 性格 14 / 财运 13 / 学业 11 …）
- `datasets/fortune_api_results.json`：iztro 预排的 32 个命盘（case_id 关联题目），**排盘与推理解耦**（等价于基准的 `--astro`）
- 拉取：`bash scripts/eval/fetch-datasets.sh`（jsDelivr CDN 优先，raw 兜底；数据 MIT，可再分发）

## 用法（在 server/ 目录下）

```bash
npx tsx scripts/eval/harness.ts --mode baseline --limit 20   # 裸模型对照（仅出生信息）
npx tsx scripts/eval/harness.ts --mode guanwei --limit 20    # 观微管线（盘注入 + 事实一致性约束）
npx tsx scripts/eval/harness.ts --mode guanwei               # 全量 160 题（约 2-4 分钟，DeepSeek）
npx tsx scripts/eval/harness.ts --mode guanwei --engine own --limit 24   # 观微自研八字引擎注入（排盘有效性验证）
npx tsx scripts/eval/harness.ts --mode guanwei --category 婚姻 --limit 30
```

参数：`--mode` baseline|guanwei（默认 guanwei）、`--limit N`（0=全量）、`--category`、`--workers N`（默认 3）、`--verbose`（保留模型全文输出）

## 报告

- 每次运行写入 `reports/<mode>-<时间戳>.json`（可机读，供回归对比）
- 控制台输出总准确率 + 分类别准确率 + 答错样本

## 两种模式的意义

| 模式 | 输入 | 说明 |
|---|---|---|
| baseline | 出生信息 raw | 裸 LLM 命理推理能力基线 |
| guanwei | 出生信息 + **iztro 盘面事实** + **观微事实一致性约束** | 观微管线的排盘+推理解耦评测 |

**护城河叙事**：公开「guanwei - baseline」增益（管线带来的提升），而非绝对分数。

## 当前最优配置与迭代记录（2026-08-20）

| 配置 | 准确率 | 结论 |
|---|---|---|
| baseline | 36.9% | 裸模型对照 |
| guanwei 全量注入 | 36.3% | 类别分化大（家庭 +22.7pp / 子女 -33pp） |
| guanwei --focus | 33.1% | ❌ 聚焦注入失败，已弃用 |
| **guanwei + 事件流年** | **40.0%** | ✅ iztro 盘最优（财运 15.4%→61.5%） |
| guanwei --engine own（观微八字盘，24 题） | 41.7% | ✅ 自研引擎有效（健康 75%/性格 100%） |

基线报告：docs/evals/2026-08-20-全量基线.md

## 已知限制（迭代待办）

1. **年龄口径**：大限定位疑似虚岁口径，边缘年份需 age/age+1 双查
2. **无年份事件题**：「何年结婚」类需流年四化/星动推理注入（衔接方向 D 考时校准）
3. ~~断语库未注入~~（2026-08-29 已解决）：duanyu.ts 已 15/15 reviewed 并接入 prompt（matchDuanyu 按盘面关键词匹配，零命中不注入）
4. **Agent 编排未接入**：当前是「单轮 prompt 注入」管线；9 Agent×Skills 编排接入后作为 guanwei-pro 模式
5. **评测集与观微术数体系差异**：基准为八字+紫微体系，观微其他七术暂无评测集（可自建）
6. **八字侧未接入**：当前全用 iztro 紫微盘，可加四柱五行十神注入对照