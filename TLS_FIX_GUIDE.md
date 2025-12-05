# InputLeap Code SSL/TLS 错误修复指南

## 问题诊断

你遇到的错误：
```
无法连接到服务器 192.168.0.104:24800 - 140190131656480:error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER:../../third_party/boringssl/src/ssl/tls_record.cc:231:
```

这是一个典型的 **SSL/TLS 版本不兼容错误**。客户端尝试使用TLS连接，但服务器没有正确配置TLS，或者TLS版本不匹配。

## 修复内容 (已完成)

### 1. 智能TLS回退机制 ✅
**文件**: `src/modules/NetworkManager.js`

实现了智能连接策略：
- 首先尝试TLS连接（如果用户选择）
- 检测到SSL/TLS错误时自动回退到TCP连接
- 提供详细的错误信息和连接状态

```javascript
// 如果是TLS连接失败且错误与SSL相关，尝试TCP连接
if (useTLSAttempt && error.message.includes('SSL') ||
    error.message.includes('TLS') ||
    error.message.includes('WRONG_VERSION_NUMBER')) {
  console.log(`🔄 TLS连接失败，尝试回退到TCP连接`);
  rejectAttempt({ retryTCP: true, originalError: error.message });
}
```

### 2. 服务器TLS配置简化 ✅
简化了TLS服务器配置，移除了复杂的证书生成过程，使用更兼容的TLS设置。

### 3. 增强的错误检测 ✅
专门检测SSL/TLS相关错误，包括：
- SSL routines错误
- TLS版本不匹配
- WRONG_VERSION_NUMBER错误

## 预期行为

现在连接过程应该是这样的：

### 场景1: 服务器支持TLS
```
🔗 开始连接到服务器: {host: "192.168.0.104", port: 24800, useTLS: true}
🔗 尝试TLS连接到 192.168.0.104:24800
✅ TLS连接建立成功 192.168.0.104:24800
🔒 加密状态: 已启用
✅ 连接到服务器成功: 192.168.0.104
```

### 场景2: 服务器不支持TLS（自动回退）
```
🔗 开始连接到服务器: {host: "192.168.0.104", port: 24800, useTLS: true}
🔗 尝试TLS连接到 192.168.0.104:24800
❌ TLS连接错误 192.168.0.104:24800: SSL routines:WRONG_VERSION_NUMBER
🔄 TLS连接失败，尝试回退到TCP连接
🔄 自动回退到TCP连接 192.168.0.104:24800
🔗 尝试普通TCP连接到 192.168.0.104:24800
✅ TCP连接建立成功 192.168.0.104:24800
🔒 加密状态: 未启用
✅ TCP回退连接成功
✅ 连接到服务器成功: 192.168.0.104
```

## 立即测试

### 方法1: 使用修复后的应用
```bash
# 启动修复版本
npm run dev
# 或
node start-fixed.js
```

1. 在连接选项卡中输入：`192.168.0.104`
2. 端口：`24800`
3. 启用TLS：`是`（推荐）
4. 点击"连接"
5. 观察控制台输出

### 方法2: 使用测试脚本
```bash
node test-connection.js
```

这将测试连接到 `192.168.0.104:24800` 并显示详细的连接过程。

## 调试信息

连接成功时你应该看到：
- ✅ 连接成功通知
- 控制台显示连接方法（TLS或TCP回退）
- 按钮状态改变为"断开连接"

连接失败时：
- ❌ 详细的错误信息
- 🔧 故障排除建议
- 按钮恢复可用状态

## 故障排除

### 如果仍然连接失败

1. **检查服务器是否运行**：
   ```bash
   node test-connection.js
   ```

2. **检查防火墙设置**：
   - macOS: 系统偏好设置 > 安全性与隐私 > 防火墙
   - 确保允许端口 24800

3. **检查网络连通性**：
   ```bash
   ping 192.168.0.104
   ```

4. **手动端口测试**：
   ```bash
   telnet 192.168.0.104 24800
   ```

### 如果TLS回退不工作

1. 确保在应用中启用了TLS选项
2. 查看控制台是否有回退日志
3. 如果回退失败，尝试直接禁用TLS连接

## 技术细节

### 错误分析
- `WRONG_VERSION_NUMBER`: 客户端发送TLS握手，但服务器未响应TLS版本
- `SSL routines`: SSL协议层错误
- 回退机制: 3秒内检测并自动切换到TCP

### 连接超时
- TLS连接: 8秒超时
- TCP回退: 8秒超时
- 总时间: 最多16秒

---

**修复完成**: 2025-12-05
**主要改进**: 智能TLS回退、增强错误处理、简化服务器配置

现在应用应该能够智能处理TLS兼容性问题，自动回退到TCP连接，确保连接成功率最大化。