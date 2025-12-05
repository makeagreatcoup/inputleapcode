# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
node test/mouse-move-test.js    # 鼠标移动专项测试
```

## 架构概览

### 核心架构模式
InputLeap Code 采用**分层模块化架构**，基于事件驱动模式实现跨设备通信：

- **主进程层**: Electron 主进程，管理核心业务逻辑和模块协调
- **模块层**: 5个核心功能模块，每个都是 EventEmitter，支持松耦合通信
- **渲染进程层**: React 前端界面，通过 IPC 与主进程通信
- **网络层**: TLS 加密通信，支持优先级队列和消息协议

### 主要模块结构
```
src/
├── main.js                    # Electron 主进程入口，InputLeapApp 主类
├── modules/                   # 核心功能模块 (EventEmitter 模式)
│   ├── NetworkManager.js      # 网络通信管理 (TLS/Socket + 优先级队列)
│   ├── InputCapture.js        # 输入捕获与模拟 (跨平台API抽象)
│   ├── ClipboardSync.js       # 剪贴板同步 (文本/图片格式检测)
│   ├── FileTransfer.js        # 文件传输 (分块传输 + 完整性校验)
│   └── DeviceDiscovery.js     # 设备发现 (mDNS/Bonjour服务)
├── renderer/                  # 渲染进程 (UI)
│   ├── index.html             # 主界面 (Bootstrap 5 + React)
│   └── app.js                 # React 前端逻辑 (选项卡式界面)
└── start.js                   # 跨平台启动脚本 (处理Windows编码)
```

### 事件驱动架构与消息协议
系统采用**优先级队列**处理不同类型的事件，确保实时性：
- **最高优先级 (1)**: 鼠标移动、点击、键盘输入
- **中等优先级 (2)**: 剪贴板变更
- **普通优先级 (3)**: 文件传输相关
- **最低优先级 (4)**: 握手和配置

**消息协议**: 基于 JSON 的换行符分隔消息格式，支持双向通信和广播

## 关键实现细节

### 网络通信 (NetworkManager.js)
- **双向通信**: 支持 TCP/Socket 和 TLS 加密连接
- **兼容性**: 默认端口 24800 (兼容 Synergy)
- **连接管理**: Map 结构维护多设备连接状态
- **优先级队列**: 确保鼠标键盘事件的实时处理
- **消息协议**: JSON 格式，换行符分隔，支持类型化消息

### 输入捕获 (InputCapture.js)
- **跨平台抽象**: Windows (PowerShell + System API) 和 macOS (AppleScript + CGEvent)
- **边缘检测**: 屏幕边缘阈值触发 (默认 10px)，自动检测屏幕边界
- **防循环机制**: `isRemoteMoving` 标志位防止远程事件再次传播
- **阈值控制**: 鼠标移动阈值减少无效网络事件

### 剪贴板同步 (ClipboardSync.js)
- **多格式支持**: 纯文本、PNG、JPEG、GIF 和文件列表
- **图片处理**: Base64 编码传输，文件头自动识别类型
- **防风暴机制**: 事件间隔限制 (1秒) 和远程更新标志位
- **内容检测**: 智能变化检测避免重复同步

### 文件传输 (FileTransfer.js)
- **分块传输**: 默认 64KB 块大小，支持断点续传
- **完整性校验**: MD5 块校验 + SHA256 文件校验
- **进度追踪**: 实时传输进度反馈和状态管理
- **限制控制**: 100MB 最大文件限制和传输超时机制

### 设备发现 (DeviceDiscovery.js)
- **服务发现**: 基于 bonjour-service 的 mDNS/Bonjour 服务
- **设备标识**: 基于机器ID和MAC地址的唯一标识
- **网络扫描**: 自动获取本地网络接口信息
- **服务公告**: 定期重新发布服务 (30秒间隔)

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

## 开发指南

### 环境配置和权限要求
1. **中文编码**: Windows 开发使用 `start.js` 脚本自动设置 UTF-8 编码
2. **端口配置**: 默认 24800 (兼容 Synergy)，支持自定义配置
3. **权限设置**:
   - macOS: 系统偏好设置 > 安全性与隐私 > 辅助功能
   - Windows: 建议以管理员身份运行以获得完整输入控制权限

### 构建和打包注意事项
1. **图标文件**: 确保 `assets/` 目录包含对应平台图标 (.ico/.icns/.png)
2. **代码签名**: macOS 需要 entitlements 文件进行 Hardened Runtime 签名
3. **依赖检查**: 构建前确保 `node_modules` 完整安装
4. **跨平台构建**: 使用专用脚本处理平台特定的构建需求

### 调试和测试策略
1. **开发者模式**: 使用 `--dev` 参数启动开启 DevTools 和详细日志
2. **模块测试**: 运行 `test/test-modules.js` 检查各模块独立功能
3. **专项测试**: 使用 `test/mouse-move-test.js` 测试跨平台输入捕获
4. **网络调试**: 检查防火墙设置，确保 mDNS 和端口 24800 可访问

### 性能调优参数
- **鼠标移动阈值**: 调整网络流量与响应精度的平衡
- **剪贴板同步频率**: 防止事件风暴的频率限制
- **文件传输块大小**: 根据网络条件调整 64KB 默认值
- **事件优先级**: 确保输入事件的实时处理性能

## 变更记录 (Changelog)

### 2025-12-05
- 创建初始 CLAUDE.md 文档
- 整理项目架构和开发指南
- 补充构建和调试说明

---

*本文档随项目更新而维护，最后更新时间: 2025-12-05*