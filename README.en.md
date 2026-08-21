# Guanwei · Ask the Way through Divination

<p align="center">
  <img src="docs/assets/guanwei-banner.png" alt="Guanwei · Ask the Way through Divination" width="720">
</p>

<p align="center">
  <a href="https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml"><img src="https://github.com/RubyCcll/guanwei/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://rubyccll.github.io/guanwei/"><img src="https://img.shields.io/badge/demo-GitHub_Pages-4a5442" alt="GitHub Pages"></a>
  <a href="https://github.com/RubyCcll/guanwei/releases"><img src="https://img.shields.io/github/v/release/RubyCcll/guanwei" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-9c4a2f" alt="MIT License"></a>
  <a href="https://github.com/RubyCcll/guanwei"><img src="https://img.shields.io/badge/TypeScript-5.8-3178c6" alt="TypeScript"></a>
</p>

<p align="center">
  [English](README.en.md) · [简体中文](README.md)
</p>

An open-source Chinese metaphysics application covering **nine arts of divination** — Bazi (Eight Characters), Ziwei Doushu, classical astrology, Qimen Dunjia, Liuyao, Da Liu Ren, Meihua, Xiaoliuren and Tarot — with **AI-powered in-depth interpretation** backed by rigorous chart-fact consistency checks.

> All readings are for reflection and entertainment only; never a basis for real decisions.

## ▶️ Try It Now (No API Key Needed)

<p align="center">
  <a href="https://rubyccll.github.io/guanwei/#/demo"><img src="docs/assets/demo.gif" alt="Demo: chart → AI report" width="700"></a>
  <br><a href="https://rubyccll.github.io/guanwei/#/demo"><b>▶ Open the Interactive Demo</b></a> — chart computed locally, AI report from a built-in sample. No backend, no API key.
</p>

## Screenshots

<p align="center">
  <img src="docs/assets/screenshot-home.png" alt="Home page" width="49%">
  <img src="docs/assets/screenshot-bazi.png" alt="Bazi chart" width="49%">
</p>

## ✨ Features

### Nine Arts of Divination (frontend display + backend computation)
| Category | Arts |
|---|---|
| Natal charts | Bazi (Ziping), Ziwei Doushu, Classical astrology (VSOP87 ecliptic) |
| Divination | Qimen Dunjia, Meihua, Liuyao, Da Liu Ren, Xiaoliuren, Tarot |

- **Gregorian/Lunar dual-calendar** birth input, precise to the minute (east-Asian arts use the two-hour shichen, astrology uses exact time)
- Location down to **province/city/district → longitude/latitude** (true solar time correction, including 1986–1991 China DST rollback)
- **Unknown birth hour support**: charts without the hour pillar, plus **hour inference from life events** (year × hour-pillar interaction scoring)
- Results computed by the backend and **persisted to SQLite**

### AI Deep Interpretation
- 9 agents × skill orchestration (e.g. Ziwei: chart structure → star palaces → twelve houses → major cycles → life stages)
- **Dual schemas**: natal-chart reports (raw reading / character / family / mind / life stages / career / love / wealth / health) and divination reports (situation / trend / timing)
- **Chart-fact consistency**: the AI must quote chart data verbatim; the backend **verifies six-relations facts** (palace branch, main stars, borrowed stars, four transformations) and patches contradictions
- **Stable readings**: cached chart-parsing step, low sampling temperature, evidence-anchored claims, de-duplication with word budgets
- **Life-event calibration**: record known life events; the AI echoes them at the matching years and never contradicts them
- Question–art **suitability analysis** (e.g. Qimen is not advised for romance questions)
- Streaming generation + structured report cards; export to Markdown / PDF

### Other
- Classics pages, academy (history and knowledge of the nine arts)
- Profile management (primary/sample profiles), divination history with AI reports

## 🏗️ Architecture

```
Frontend: React 18 + TypeScript + Vite + Tailwind (Song-dynasty aesthetics)
Backend:  Express + tsx (SSE streaming + SQLite)
Shared:   shared/core/engine/* — single source of truth for all chart algorithms
AI:       multi-LLM adapter (OpenAI-compatible & Google formats, configured via server/.env)
```

## 🚀 Quick Start

### Requirements
- Node.js ≥ 22 (uses built-in node:sqlite)
- One LLM API key (OpenAI-compatible or Google format, see server/.env.example)

```bash
# 1. Install dependencies
npm install                 # frontend
cd server && npm install && cd ..

# 2. Configure backend
cp server/.env.example server/.env   # add your LLM key

# 3. Start backend (port 3018)
cd server && npm run dev

# 4. Start frontend (default port 5173, another terminal)
npm run dev
```

Open http://localhost:5173 → register → cast a chart → summon the AI report.

### Tests
```bash
npm test    # 180+ tests (engines / rendering / interactions / storage / prompts)
```

## 📁 Structure

```
├── src/               # Frontend (pages / components / hooks / services)
├── server/
│   ├── src/routes/    # divine / ai / users / hour
│   └── src/services/  # promptBuilder / llmProvider / divineStore / hourInference / relativesCheck
├── shared/core/       # Shared chart engines (single copy)
├── docs/              # Design docs & open-source assets
└── tests/             # Tests (incl. regression set)
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — including the **zero-privacy policy** (no real user data, keys, or personal info in this repository).

## 📄 License
[MIT](LICENSE)

---

**Guanwei** · 以术问道，观微知著。 Long-term maintenance — welcome to Star & open Issues.
