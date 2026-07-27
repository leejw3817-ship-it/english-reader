# GitHub Config
# 📰 外刊读物 — English Reader

> **读世界，学英语** — 完全免费的英语外刊阅读平台
>
> 聚合 BBC、NPR、The Guardian、MIT Tech Review、Aeon 等顶级外刊，专为英语学习设计

[![Daily Crawl](https://github.com/leejw3817-ship-it/english-reader/actions/workflows/daily-crawl.yml/badge.svg)](https://github.com/leejw3817-ship-it/english-reader/actions/workflows/daily-crawl.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌐 访问地址

| 类型 | 网址 | 说明 |
|------|------|------|
| 🏠 **主站** | **[leejw3817-ship-it.github.io/english-reader](https://leejw3817-ship-it.github.io/english-reader/)** | GitHub Pages 免费托管 |
| ⚡ **备用①** | 戳下方按钮一键部署 ↓ | Vercel 全球CDN加速 |

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/leejw3817-ship-it/english-reader)

> 👆 点击上方按钮 → 用 GitHub 登录 → 点 **Deploy** → 30秒后获得 `xxx.vercel.app` 域名

---

## ✨ 特性

- 🆓 **完全免费** — 无需注册、无广告、无付费墙
- 📡 **每日自动更新** — GitHub Actions 每天 UTC 0:00/12:00 自动爬取最新文章
- 🔍 **全文搜索** — Fuse.js 模糊搜索，支持拼写容错
- 🎯 **场景分类** — 🎓四级 📖六级 📝考研 🌍雅思 💬日常 💼商务 🔬学术 🔥热点
- 📖 **本站全文阅读** — 361篇完整文章，大部分可直接阅读全文
- 📱 **移动端优化** — 系统字体零等待、GPU加速、触摸适配、刘海屏安全区
- 🌓 **深色模式** — 自动跟随系统 / `Ctrl+Shift+T` 切换
- 📖 **双击查词** — 阅读页双击任意单词查看释义+发音
- 📂 **分类筛选** — 科技/科学/世界/商业/文化/综合
- ⚡ **国内网络优化** — 系统字体栈、Fuse.js 三CDN回退

## 📡 数据源

| 来源 | 类别 | 更新频率 |
|------|------|----------|
| NPR — Top Stories | 综合 | 每小时 |
| Science Daily | 科学 | 每日 |
| PBS NewsHour | 综合 | 每日 |
| MIT Technology Review | 科技 | 每日 |
| Aeon — Philosophy, Science, Culture | 文化 | 每日 |
| Smithsonian Magazine | 文化 | 每日 |
| Popular Science | 科学 | 每日 |
| Quanta Magazine | 科学 | 每周数次 |

## 🚀 快速开始

```bash
git clone https://github.com/leejw3817-ship-it/english-reader.git
cd english-reader
npm install
npm run crawl   # 爬取最新文章
npm run dev     # http://localhost:3000
```

## 🛠️ 技术栈

| 层面 | 技术 |
|------|------|
| 爬虫 | Node.js + rss-parser + cheerio (全文抓取) |
| 前端 | Vanilla HTML/CSS/JS (零框架、零构建) |
| 搜索 | Fuse.js v7 (三CDN回退) |
| 词典 | Free Dictionary API |
| 自动化 | GitHub Actions (每日2次) |
| 托管 | GitHub Pages + Vercel |

## 📄 License

MIT © 2026 — 文章版权归原始出版商所有，仅供英语学习使用。
