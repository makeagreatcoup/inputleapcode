const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createPortablePackage() {
  try {
    console.log('创建便携版应用包...');
    
    // 创建输出目录
    const outputDir = path.join(__dirname, 'dist', 'InputLeap-Code-Windows-Portable');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 复制应用文件
    const filesToCopy = [
      'src',
      'node_modules',
      'package.json',
      'README.md'
    ];
    
    filesToCopy.forEach(file => {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(outputDir, file);
      
      if (fs.existsSync(srcPath)) {
        console.log(`复制 ${file}...`);
        execSync(`xcopy "${srcPath}" "${destPath}" /E /I /H /Y`, { stdio: 'inherit' });
      }
    });
    
    // 创建启动脚本
    const startScript = `@echo off
cd /d "%~dp0"
node src/main.js
pause`;
    
    fs.writeFileSync(path.join(outputDir, 'start.bat'), startScript);
    console.log('启动脚本创建完成！');
    
    // 创建说明文件
    const readme = `InputLeap Code - 便携版

使用方法：
1. 双击 start.bat 启动应用
2. 或者在命令行中运行: node src/main.js

系统要求：
- Windows 10 或更高版本
- Node.js (已包含在本包中)

注意事项：
- 首次运行可能需要一些时间来初始化
- 请确保防火墙允许应用访问网络`;
    
    fs.writeFileSync(path.join(outputDir, 'README-Portable.txt'), readme);
    console.log('说明文件创建完成！');
    
    // 创建压缩包
    console.log('创建压缩包...');
    const zipPath = path.join(__dirname, 'dist', 'InputLeap-Code-Windows-Portable.zip');
    execSync(`powershell -Command "Compress-Archive -Path '${outputDir}' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    
    console.log('便携版创建成功！');
    console.log(`输出路径: ${zipPath}`);
    
  } catch (error) {
    console.error('创建便携版时出错:', error);
  }
}

createPortablePackage();