#!/usr/bin/env node

// 跨平台启动脚本，处理Windows中文编码问题
const { spawn, execSync } = require('child_process');
const platform = process.platform;

// Windows平台设置UTF-8编码
if (platform === 'win32') {
  try {
    execSync('chcp 65001 >nul', { stdio: 'inherit' });
  } catch (error) {
    console.warn('设置控制台编码失败:', error.message);
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
const isDev = args.includes('--dev');

console.log('🚀 启动 InputLeap Code (修复版本)');
console.log('📍 修复内容: 真实 mDNS 设备发现，替换模拟设备数据\n');

// 启动Electron应用
const path = require('path');
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
const electronArgs = isDev ? ['.', '--dev'] : ['.'];

console.log('启动Electron应用...');
console.log('Electron路径:', electronPath);
console.log('启动参数:', electronArgs);

const child = spawn(electronPath, electronArgs, {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log('\n✅ 应用已退出，代码:', code);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('\n❌ 启动Electron失败:', error);
  console.error('💡 请确保依赖已正确安装: npm install');
  process.exit(1);
});