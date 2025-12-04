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
  process.exit(code);
});

child.on('error', (error) => {
  console.error('启动Electron失败:', error);
  process.exit(1);
});