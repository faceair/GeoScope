# GeoScope 🧭

**GeoScope** 是一个基于 **Tauri v2 + Rust + React + Tailwind CSS** 构建的现代化、高性能、全离线 IP 与手机号归属地查询桌面程序。

支持跨端运行在 **macOS / Windows / Linux**。

---

## ✨ 核心特性

- 🚀 **极致性能**：底层 Rust 引擎，基于二进制有序索引与内存二分查找，单次点查与高并发批量查询均在微秒/毫秒级完成。
- 🔒 **纯离线与隐私安全**：所有数据均在本地查询，零外网网络请求，绝不上报用户任何查询内容。
- 🧠 **智能即时单查**：首页单输入框自适应识别 IPv4 / IPv6 / 11位手机号（支持 +86 与空格破折号过滤），支持 `Cmd/Ctrl + K` 全局快捷聚焦。
- 📊 **并发批量分析**：支持多行文本粘贴、文件导入（`.txt` / `.csv`），多核并发秒级处理数万条记录，并提供成功率、耗时统计与表格多维过滤。
- 💾 **本地历史时间线**：自动保留所有查询历史与时间戳，支持一键重查、关键词搜索、单条删除与 CSV 导出。
- 📦 **开箱即用数据库**：自动识别本地 `ipip_china_cn.ipdb` 与 `phone.dat`，并提供可视化数据库诊断与路径切换面板。

---

## 📂 数据库支持

默认自动载入以下离线数据库（可在界面设置中随时更改）：
1. **IP 归属地库**：IPIP.net IPDB 格式（如 `/Users/faceair/Downloads/ipip_china_cn.ipdb`）
2. **手机号归属地库**：`phone.dat` 二进制库（如 `/Users/faceair/Downloads/phone.dat`，包含广电 192、各家虚拟运营商等 51.7 万条号段）

---

## 🛠️ 本地启动与构建

```bash
cd /Users/faceair/Developer/GeoScope

# 1. 安装前端依赖
pnpm install

# 2. 启动桌面端开发调试模式 (带热重载)
pnpm tauri dev

# 3. 打包发布跨端安装包 (macOS .dmg/.app, Windows .exe, Linux .deb)
pnpm tauri build
```

---

## 🏛️ 项目目录结构

```
GeoScope/
├── src-tauri/             # Rust 桌面端核心
│   ├── src/
│   │   ├── phone.rs       # 纯 Rust 高效二分查找 phone.dat 解析器
│   │   ├── db_manager.rs  # 双数据库并发管理与自动发现
│   │   ├── models.rs      # 数据模型与序列化
│   │   ├── commands.rs    # Tauri IPC 通信接口
│   │   └── lib.rs         # 核心入口与集成测试
│   └── Cargo.toml
├── src/                   # React + TypeScript + Tailwind 前端界面
│   ├── components/
│   │   ├── Navbar.tsx     # 顶部导航与数据库状态指示灯
│   │   ├── SingleSearch.tsx # 智能单查首页与结果卡片
│   │   ├── BatchSearch.tsx  # 批量并发分析、表格与导出
│   │   ├── HistoryView.tsx  # 查询历史时间线管理
│   │   └── SettingsModal.tsx# 数据库源配置与状态诊断
│   ├── services/
│   │   ├── tauri.ts       # Tauri invoke API 封装与降级
│   │   └── history.ts     # 本地持久化存储
│   ├── types.ts           # 数据类型定义
│   └── App.tsx            # 主应用框架
└── package.json
```
