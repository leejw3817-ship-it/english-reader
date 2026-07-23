# 📰 English Reader — 外刊读物

> Read the world. Learn English.
>
> 一个完全免费的英语外刊阅读工具，自动聚合来自 BBC、NPR、The Guardian、MIT Tech Review、Aeon、Scientific American 等顶级外刊的高质量英文文章。

[![Daily Article Crawl](https://github.com/31184/english-reader/actions/workflows/daily-crawl.yml/badge.svg)](https://github.com/31184/english-reader/actions/workflows/daily-crawl.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ 特性 Features

- **🆓 完全免费** — 无需注册、无广告、无付费墙
- **📡 每日自动更新** — GitHub Actions 每天自动爬取最新外刊文章
- **🔍 全文搜索** — 基于 Fuse.js 的模糊搜索，支持拼写容错
- **📱 PWA 支持** — 可安装到桌面/手机，支持离线阅读
- **🌓 深色模式** — 自动跟随系统主题，也可手动切换
- **📖 单词查询** — 双击文章中的任意单词查看释义（支持发音）
- **📂 分类筛选** — 按科技、科学、商业、文化、世界等分类浏览
- **📊 难度标注** — 每篇文章标注 Beginner / Intermediate / Advanced
- **🎨 Google 风格设计** — 极简高级 UI，专注阅读体验

## 📡 数据源 RSS Sources

| 来源 | 类别 | 更新频率 |
|------|------|----------|
| **BBC News** — World / Technology / Business | World, Tech, Business | 每小时 |
| **NPR** — Top Stories | General | 每小时 |
| **The Guardian** — World / Technology | World, Tech | 每小时 |
| **MIT Technology Review** | Technology | 每日 |
| **Aeon** — Philosophy, Science, Culture | Culture | 每日 |
| **Smithsonian Magazine** | Culture, Science | 每日 |
| **Popular Science** | Science | 每日 |
| **Quanta Magazine** — Math, Physics, CS | Science | 每周数次 |

*注：由于网络限制，部分源（BBC、The Guardian）在 GitHub Actions (Ubuntu) 环境中可正常爬取，本地测试可能超时。*

## 🚀 快速开始 Quick Start

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/31184/english-reader.git
cd english-reader

# 安装依赖
npm install

# 运行爬虫（获取最新文章）
npm run crawl

# 启动本地服务器
npm run dev
# 访问 http://localhost:3000
```

### 部署到 GitHub Pages

1. Fork 本仓库
2. 在仓库 Settings → Pages 中：
   - Source: **GitHub Actions**
   - 或 Source: **Deploy from a branch** → `main` / `/public`
3. GitHub Actions 将自动运行爬虫并部署

## 📁 项目结构 Project Structure

```
english-reader/
├── .github/workflows/
│   └── daily-crawl.yml        # GitHub Actions 定时爬取
├── crawler/
│   ├── index.js               # 爬虫主入口
│   ├── sources.js             # RSS 源配置
│   ├── fetcher.js             # RSS 解析 + 归一化
│   ├── dedup.js               # 去重逻辑
│   └── storage.js             # JSON 读写
├── data/
│   └── articles.json          # 文章数据（自动更新）
├── public/                    # 静态站点（部署到 Pages）
│   ├── index.html             # 主页面
│   ├── manifest.json          # PWA 配置
│   ├── sw.js                  # Service Worker
│   ├── favicon.svg
│   ├── .nojekyll
│   ├── css/
│   │   └── style.css          # Google 风格样式
│   └── js/
│       ├── app.js             # 主应用逻辑
│       ├── router.js          # Hash 路由器
│       └── search.js          # 搜索引擎 (Fuse.js)
├── package.json
└── README.md
```

## 🛠️ 技术栈 Tech Stack

| 层面 | 技术 |
|------|------|
| 爬虫 | Node.js + rss-parser + axios |
| 前端 | Vanilla HTML/CSS/JS (零框架) |
| 搜索 | Fuse.js v7 (模糊搜索) |
| 词典 | Free Dictionary API |
| 自动化 | GitHub Actions |
| 托管 | GitHub Pages |
| 离线 | Service Worker + Cache API |

## 🤝 贡献 Contributing

欢迎提交 Issue 和 Pull Request！

- 🐛 报告 Bug → [Open an Issue](https://github.com/31184/english-reader/issues)
- 💡 新功能建议 → [Open an Issue](https://github.com/31184/english-reader/issues)
- 📰 添加新的 RSS 源 → 编辑 `crawler/sources.js`

### 添加新的 RSS 源

在 `crawler/sources.js` 中添加：

```js
{
  name: 'Source Name',
  slug: 'source-slug',
  url: 'https://example.com/rss.xml',
  category: 'Technology',
  language: 'en',
  color: '#hexcolor',
}
```

## 📄 许可 License

MIT © 2026 — 文章版权归原始出版商所有，本工具仅用于教育目的聚合 RSS 摘要。

---

**Made with ❤️ for English learners worldwide.**
