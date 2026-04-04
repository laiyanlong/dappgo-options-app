<div align="center">

# DappGo Options

**Cross-platform options strategy analysis & backtesting app**

iOS | iPadOS | macOS

[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#overview) | [繁體中文](#概覽)

</div>

---

## Overview

DappGo Options is a cross-platform mobile app for options selling strategy analysis and backtesting. All calculations run locally on your device — no server required.

- Read daily reports from [options-daily-report](https://github.com/laiyanlong/options-daily-report)
- Compare strikes across expiry dates with full metrics
- Backtest strategies with historical data
- Get model-driven trade recommendations

### Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Live prices, model verdict, today's top picks |
| **Reports** | Browse and search daily reports with smart filters |
| **Backtest** | Simple + Advanced mode, P&L curves, side-by-side comparison |
| **Matrix** | Strike comparison with Premium, IV, POP, Delta, star ratings |
| **Settings** | Theme, tickers, API keys, notifications, DappGo branding |

### Architecture

```
┌───────────────────────────────────────────┐
│         React Native / Expo App           │
│      (iOS + iPadOS + macOS Catalyst)      │
├───────────────────────────────────────────┤
│  5 Tabs: Dashboard │ Reports │ Backtest   │
│          Matrix    │ Settings             │
├───────────────────────────────────────────┤
│  Calculation Engine (TypeScript, local)   │
│  Black-Scholes │ CP Score │ POP │ IV      │
│  Backtest Engine │ Regime Classification  │
├───────────────────────────────────────────┤
│  Data: GitHub API │ SQLite │ Zustand      │
└───────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/laiyanlong/dappgo-options-app.git
cd dappgo-options-app

# Install
npm install

# Run on iOS simulator
npx expo start --ios

# Run on web (for quick preview)
npx expo start --web
```

## Tech Stack

| Tool | Purpose |
|------|---------|
| Expo SDK 54 | Cross-platform runtime |
| React Native 0.81 | Native UI |
| TypeScript 5.9 | Type safety |
| Expo Router | File-based navigation |
| Zustand | State management |
| expo-sqlite | Local database |
| expo-secure-store | API key storage |

## Project Structure

```
src/
├── engine/          # Pure TypeScript calculation engine
│   ├── black-scholes.ts
│   ├── cp-score.ts
│   ├── pop.ts
│   ├── iv-analysis.ts
│   └── backtest.ts
├── data/            # Data fetching & caching
│   ├── github-api.ts
│   ├── parser.ts
│   └── cache.ts
├── store/           # Zustand state management
│   ├── app-store.ts
│   ├── backtest-store.ts
│   └── settings-store.ts
├── components/      # Shared UI components
│   ├── charts/
│   ├── trade/
│   └── ui/
├── theme/           # Dark/Light theme system
└── utils/           # Types, formatters, constants
```

## Cost

**$0/month** — everything runs locally. Only Apple Developer ($99/yr) needed for App Store.

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Powered by **[DappGo](https://dappgo.com)** — AI Automation for Enterprise

</div>

---

## 概覽

DappGo Options 是一款跨平台選擇權賣方策略分析和回測 App。所有計算在裝置本地執行，不需要伺服器。

### 主要功能

| 功能 | 說明 |
|------|------|
| **Dashboard** | 即時股價、模型綜合評價、今日最佳交易 |
| **Reports** | 瀏覽每日報告，智慧篩選 |
| **Backtest** | 簡單 + 進階模式，P&L 曲線，並排比較 |
| **Matrix** | Strike 比較：Premium、IV、POP、Delta、星級評分 |
| **Settings** | 主題、標的、API Key、通知 |

### 快速開始

```bash
git clone https://github.com/laiyanlong/dappgo-options-app.git
cd dappgo-options-app
npm install
npx expo start --ios
```

### 費用

**$0/月** — 完全本地運算。僅上架 App Store 需要 Apple Developer ($99/年)。

<div align="center">

**[DappGo](https://dappgo.com)** — 企業級 AI 自動化

</div>
