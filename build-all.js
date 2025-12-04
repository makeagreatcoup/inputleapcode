const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createAllPackages() {
  console.log('InputLeap Code - 构建脚本');
  console.log('========================');
  
  // 创建输出目录
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // 构建Windows便携版
  console.log('\n1. 创建Windows便携版...');
  try {
    const winOutputDir = path.join(distDir, 'InputLeap-Code-Windows-Portable');
    if (!fs.existsSync(winOutputDir)) {
      fs.mkdirSync(winOutputDir, { recursive: true });
    }
    
    const essentialFiles = ['src', 'package.json', 'package-lock.json'];
    essentialFiles.forEach(file => {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(winOutputDir, file);
      
      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          if (!fs.existsSync(destPath)) {
            execSync(`xcopy "${srcPath}" "${destPath}" /E /I /Y`, { stdio: 'inherit' });
          }
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    });
    
    const winInstallScript = `@echo off
echo 正在安装依赖...
cd /d "%~dp0"
call npm install --production
echo 依赖安装完成！
pause`;
    
    const winStartScript = `@echo off
cd /d "%~dp0"
echo 启动 InputLeap Code...
call npm start`;
    
    const winReadme = `InputLeap Code - Windows便携版

安装和使用：
1. 双击运行 install-deps.bat 安装依赖（首次运行需要）
2. 双击运行 start.bat 启动应用

系统要求：
- Windows 10 或更高版本
- 网络连接（用于安装依赖）

注意事项：
- 首次运行 install-deps.bat 可能需要几分钟时间
- 确保防火墙允许应用访问网络`;
    
    fs.writeFileSync(path.join(winOutputDir, 'install-deps.bat'), winInstallScript);
    fs.writeFileSync(path.join(winOutputDir, 'start.bat'), winStartScript);
    fs.writeFileSync(path.join(winOutputDir, 'README.txt'), winReadme);
    
    console.log('✓ Windows便携版创建成功');
  } catch (error) {
    console.error('✗ Windows便携版创建失败:', error.message);
  }
  
  // 构建Mac便携版
  console.log('\n2. 创建Mac便携版...');
  try {
    const macOutputDir = path.join(distDir, 'InputLeap-Code-Mac-Portable');
    if (!fs.existsSync(macOutputDir)) {
      fs.mkdirSync(macOutputDir, { recursive: true });
    }
    
    const essentialFiles = ['src', 'package.json', 'package-lock.json'];
    essentialFiles.forEach(file => {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(macOutputDir, file);
      
      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          if (!fs.existsSync(destPath)) {
            execSync(`xcopy "${srcPath}" "${destPath}" /E /I /Y`, { stdio: 'inherit' });
          }
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    });
    
    const macInstallScript = `#!/bin/bash
echo "正在安装依赖..."
cd "$(dirname "$0")"
npm install --production
echo "依赖安装完成！"
read -p "按回车键继续..."`;
    
    const macStartScript = `#!/bin/bash
cd "$(dirname "$0")"
echo "启动 InputLeap Code..."
npm start`;
    
    const macReadme = `InputLeap Code - Mac便携版

安装和使用：
1. 打开终端，进入应用目录
2. 运行 chmod +x install-deps.sh 赋予执行权限
3. 运行 ./install-deps.sh 安装依赖（首次运行需要）
4. 运行 chmod +x start.sh 赋予执行权限
5. 运行 ./start.sh 启动应用

系统要求：
- macOS 10.14 或更高版本
- 网络连接（用于安装依赖）

注意事项：
- 首次运行 install-deps.sh 可能需要几分钟时间
- 确保防火墙允许应用访问网络`;
    
    fs.writeFileSync(path.join(macOutputDir, 'install-deps.sh'), macInstallScript);
    fs.writeFileSync(path.join(macOutputDir, 'start.sh'), macStartScript);
    fs.writeFileSync(path.join(macOutputDir, 'README.txt'), macReadme);
    
    console.log('✓ Mac便携版创建成功');
  } catch (error) {
    console.error('✗ Mac便携版创建失败:', error.message);
  }
  
  // 创建发布说明
  console.log('\n3. 创建发布说明...');
  const releaseNotes = `InputLeap Code - 发布说明
========================

版本：1.0.0
发布日期：${new Date().toLocaleDateString('zh-CN')}

包含内容：
- Windows便携版：适用于Windows 10及以上版本
- Mac便携版：适用于macOS 10.14及以上版本

使用说明：
1. 下载对应平台的便携版
2. 按照README文件中的说明进行安装和使用
3. 确保设备在同一网络环境中
4. 启动应用后即可开始使用键鼠共享功能

功能特性：
- 跨平台键鼠共享
- 剪贴板同步
- 文件传输
- 设备自动发现

系统要求：
- Node.js 14.0 或更高版本
- 网络连接
- 防火墙允许应用访问网络

技术支持：
如有问题请联系开发团队`;
  
  fs.writeFileSync(path.join(distDir, 'RELEASE-NOTES.txt'), releaseNotes);
  
  console.log('\n构建完成！');
  console.log('========================');
  console.log(`输出目录：${distDir}`);
  console.log('\n文件列表：');
  
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`📁 ${file}/`);
    } else {
      console.log(`📄 ${file}`);
    }
  });
}

createAllPackages();