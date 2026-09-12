# GeoScope 🧭

**GeoScope** 是一款现代、高质感、**完全离线**的 IP 与手机号归属地查询桌面客户端。

采用 **Tauri v2 + Rust + React 19 + Tailwind CSS 4 + SQLite** 架构构建，专为追求极速响应、内容至上与绝对数据隐私的开发者、网络工程师及安全分析人员打造。

---

## ✨ 核心特性

- 🔒 **完全离线查询 · 数据不出本机**  
  内置纯真 IP 库（CZ88）、IPIP.net 官方库与全国手机号段库，单次点查与高并发批量查询均在微秒级完成，零外网网络请求，绝不上报用户任何查询内容。
- 🎯 **多源智能融合**  
  自动融合纯真库的细粒度机构备注（高校、企事业单位、数据中心出口）与 IPIP 的规范行政区划代码、标准时区及经纬度坐标。平时呈现统一纯净结果，仅在两源数据产生分歧时优雅提示差异。
- 📦 **零配置 · 开箱即用**  
  核心数据库随安装包直接分发并内置打包，安装后双击即可直接使用，彻底免去手动下载、导入与配置路径的繁琐步骤。
- 💾 **本地 SQLite 驱动 · 30天自动滚动记录**  
  历史记录由本地 SQLite 引擎管理，单条查询与批量分析批次物理隔离，严格按照时间戳自动保留最近 30 天内的所有记录，过期静默淘汰，永无数据膨胀顾虑。
- 🤖 **Agent Native · 专属 Skills 技能支持**  
  后台轻量守护接口（默认监听 `http://127.0.0.1:17890`），并在 `/skill.md` 动态分发标准技能规范。提供一键复制给 AI 助手的提示词，让 **Cursor、Claude Code、Devin、Windsurf** 等 Agent 自动读取并安装该技能。
- 🖥️ **macOS & Windows 跨端原生体验**  
  支持点击红叉自动最小化至系统托盘（Menu Bar / 任务栏通知区），保持后台接口静默守护；采用 Apple HIG 标准像素级图标与呼吸感极佳的浅白质感主题。

---

## 🚀 快速开始

### 1. 从 Release 安装包直接运行

可在项目的 [Releases 页面](https://github.com/faceair/GeoScope/releases) 下载适合你操作系统的最新安装包：

- **macOS**：下载 `GeoScope_x.x.x_aarch64.dmg` 拖拽至应用程序即可使用。
- **Windows**：下载 `GeoScope_x.x.x_x64-setup.exe` 或 `.msi` 双击安装。

### 2. 源码本地开发调试

```bash
# 克隆仓库
git clone https://github.com/faceair/GeoScope.git
cd GeoScope

# 安装前端依赖
pnpm install

# 启动桌面端调试运行 (热重载)
pnpm tauri dev
```

### 3. 本地构建打包

```bash
# 构建当前平台的 Release 安装包
pnpm tauri build
```

---

## 🤖 大模型 Agent 接入说明

GeoScope 本地启动后会自动提供轻量 HTTP 接口：

```bash
# 1. 单条查询 (IP 或 手机号)
curl -s "http://127.0.0.1:17890/api/query?q=162.105.10.100"

# 2. 批量并发查询
curl -s -X POST "http://127.0.0.1:17890/api/batch" \
  -H "Content-Type: application/json" \
  -d '{"queries": ["180.101.50.242", "13800138000"]}'

# 3. 获取 Skill 规范定义文档
curl -s "http://127.0.0.1:17890/skill.md"
```

你也可以直接打开应用中的 **`Agent 接入`** 页面，一键复制提示词发给你的 AI 助手，让 Agent 自动拉取 `http://127.0.0.1:17890/skill.md` 并完成本地技能安装。

---

## 🏛️ 架构与目录结构

```
GeoScope/
├── .github/workflows/    # 跨平台 GitHub Actions CI/CD 流水线 (macOS + Windows)
├── src-tauri/            # Rust 桌面端核心引擎
│   ├── src/
│   │   ├── qqwry.rs      # 纯真 IP 库 (CZ88) 高性能 GBK 二分查找解析器
│   │   ├── phone.rs      # 国内手机号段库二分查找解析器
│   │   ├── db_manager.rs # 多源数据库自动寻址与并发查询调度
│   │   ├── storage.rs    # 本地 SQLite 统一持久化存储与 30 天清理机制
│   │   ├── http_server.rs# 本地守护服务 (REST API + /skill.md)
│   │   └── lib.rs        # 系统托盘与主事件生命周期管理
│   ├── data/             # 内置离线数据库资源 (随安装包打包分发)
│   └── Cargo.toml
├── src/                  # 前端 React 19 + TypeScript 交互界面
│   ├── components/
│   │   ├── Navbar.tsx           # 顶部浅白磨砂导航栏
│   │   ├── SingleSearch.tsx     # 单条查询与核心属性看板
│   │   ├── BatchSearch.tsx      # 批量分析表格、状态过滤与 CSV/JSON 导出
│   │   ├── HistoryView.tsx      # 历史时间线 (单查与批量物理隔离)
│   │   ├── AgentIntegration.tsx# Agent 技能接入指南与提示词
│   │   └── BrandLogo.tsx        # 浅白质感矢量专属 BrandLogo
│   ├── utils/
│   │   ├── geoMerge.ts          # 多源数据智能融合与冲突检测算法
│   │   ├── coordinateTransform.ts# WGS-84 与高德火星坐标系 (GCJ-02) 转换
│   │   └── openUrl.ts           # 桌面端原生系统浏览器调用桥接
│   └── types.ts
└── package.json
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源发布。
