# InputLeap Code - AI 开发助手指南

## 项目概述

InputLeap Code 是一个基于 Electron 的跨平台键鼠共享系统，支持 Windows 和 macOS 之间的键鼠控制、剪贴板同步和文件传输。项目使用模块化架构设计，通过 TLS 加密确保通信安全，并提供现代化的 React 界面。

## 核心技术栈

- **框架**: Electron 27 + React 18
- **网络通信**: Node.js net/tls + WebSocket (ws)
- **设备发现**: bonjour-service (mDNS/Bonjour)
- **输入处理**: robotjs (平台特定的输入模拟)
- **剪贴板操作**: clipboard npm 包
- **构建工具**: electron-builder + electron-packager
- **测试框架**: Jest

## 开发命令

### 基础开发
```bash
# 安装依赖
npm install

# 开发模式启动 (支持跨平台编码处理)
npm run dev          # macOS/Linux
npm run dev:win      # Windows (处理中文编码)

# 生产模式启动
npm start
npm run start:win    # Windows 版本
```

### 构建与打包
```bash
# 标准构建 (使用 electron-builder)
npm run build
npm run dist         # 构建但不发布

# 平台特定构建脚本
node build.js           # 通用构建
node build-windows.js   # Windows 专用
node build-all.js       # 全平台构建

# 创建便携版本
node create-portable.js         # 标准便携版
node create-simple-portable.js  # 简化便携版
node create-mac-portable.js     # macOS 便携版
```

### 测试
```bash
# Jest 测试
npm test

# 手动模块测试
node test/test-modules.js       # 测试所有核心模块
node test/basic-test.js         # 基础功能测试
node test/simple-test.js        # 简单集成测试
```

## 架构概览

### 主要模块结构
```
src/
├── main.js                    # Electron 主进程入口
├── modules/                   # 核心功能模块
│   ├── NetworkManager.js      # 网络通信管理 (TLS/Socket)
│   ├── InputCapture.js        # 输入捕获与模拟
│   ├── ClipboardSync.js       # 剪贴板同步 (文本/图片)
│   ├── FileTransfer.js        # 文件传输 (分块传输)
│   └── DeviceDiscovery.js     # 设备发现 (mDNS)
└── renderer/                  # 渲染进程 (UI)
    ├── index.html             # 主界面
    └── app.js                 # React 前端逻辑
```

### 事件驱动架构
系统采用事件驱动模式，通过优先级队列处理不同类型的事件：
- **最高优先级**: 鼠标移动、点击、键盘输入
- **中等优先级**: 剪贴板变更
- **普通优先级**: 文件传输相关
- **最低优先级**: 握手和配置

## 关键实现细节

### 网络通信
- 默认端口: 24800 (兼容 Synergy)
- TLS 加密: 默认启用，支持证书验证
- 连接管理: 支持多设备连接，Map 结构维护连接状态
- 事件队列: 优先级队列确保实时性

### 输入捕获
- **Windows**: 使用 Windows API (user32.dll)
- **macOS**: 使用 AppleScript 和 CGEvent
- 防循环: 标志位防止远程触发的事件再次传播
- 阈值控制: 鼠标移动阈值 (默认 5px) 减少无效事件

### 剪贴板同步
- 支持格式: 纯文本、PNG、JPEG、GIF
- 图片处理: Base64 编码传输
- 格式检测: 通过文件头识别图片类型
- 防风暴: 事件频率限制机制

### 文件传输
- 分块传输: 默认 64KB 块大小
- 最大文件: 100MB 限制
- 进度追踪: 实时传输进度
- 完整性校验: 文件大小和哈希验证

## 安全特性

1. **TLS 加密**: 所有网络传输默认使用 TLS 1.3
2. **证书管理**: 支持自签名证书和证书验证
3. **设备认证**: 握手阶段进行设备验证
4. **权限控制**:
   - macOS: 需要辅助功能权限
   - Windows: 可能需要管理员权限

## 构建配置

### 平台支持
- **Windows**: NSIS 安装包 + 便携版 (x64, ia32)
- **macOS**: DMG + ZIP (x64, arm64) - 支持 Hardened Runtime
- **Linux**: AppImage + DEB (x64)

### 资源文件
- 图标路径: `assets/icon.ico` (Windows), `assets/icon.icns` (macOS), `assets/icon.png` (Linux)
- 额外资源: `resources/` 目录会复制到应用中

## 常见问题排查

### 开发环境
1. **中文乱码**: Windows 开发使用 `start.js` 脚本处理编码
2. **端口占用**: 默认 24800，可在应用配置中修改
3. **权限问题**:
   - macOS: 系统偏好设置 > 安全性与隐私 > 辅助功能
   - Windows: 以管理员身份运行

### 构建问题
1. **构建失败**: 检查 `node_modules` 是否完整安装
2. **图标缺失**: 确保 `assets/` 目录下有对应平台的图标文件
3. **签名问题**: macOS 需要 entitlements 文件进行代码签名

### 性能优化
- 调整鼠标移动阈值减少网络流量
- 限制剪贴板同步频率避免事件风暴
- 使用事件优先级确保输入实时性

## 调试技巧

1. **主进程调试**: 使用 `--dev` 参数启动开启开发者工具
2. **模块测试**: 运行 `test/test-modules.js` 检查各模块状态
3. **网络调试**: 检查防火墙设置和端口占用情况
4. **日志输出**: 控制台会显示详细的连接和传输日志

## 变更记录 (Changelog)

### 2025-12-05
- 创建初始 CLAUDE.md 文档
- 整理项目架构和开发指南
- 补充构建和调试说明

---

*本文档随项目更新而维护，最后更新时间: 2025-12-05*