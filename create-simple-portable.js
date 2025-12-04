const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createSimplePortable() {
  try {
    console.log('创建简单便携版...');
    
    // 创建输出目录
    const outputDir = path.join(__dirname, 'dist', 'InputLeap-Code-Portable');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 复制必要的文件
    const essentialFiles = [
      'src',
      'package.json',
      'package-lock.json'
    ];
    
    essentialFiles.forEach(file => {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(outputDir, file);
      
      if (fs.existsSync(srcPath)) {
        console.log(`复制 ${file}...`);
        if (fs.statSync(srcPath).isDirectory()) {
          execSync(`xcopy "${srcPath}" "${destPath}" /E /I /Y`, { stdio: 'inherit' });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    });
    
    // 创建安装依赖脚本
    const installScript = `@echo off
echo 正在安装依赖...
cd /d "%~dp0"
call npm install --production
echo 依赖安装完成！
pause`;
    
    fs.writeFileSync(path.join(outputDir, 'install-deps.bat'), installScript);
    
    // 创建启动脚本
    const startScript = `@echo off
cd /d "%~dp0"
echo 启动 InputLeap Code...
call npm start`;
    
    fs.writeFileSync(path.join(outputDir, 'start.bat'), startScript);
    
    // 创建说明文件
    const readme = `InputLeap Code - 便携版

安装和使用：
1. 双击运行 install-deps.bat 安装依赖（首次运行需要）
2. 双击运行 start.bat 启动应用

系统要求：
- Windows 10 或更高版本
- 网络连接（用于安装依赖）

注意事项：
- 首次运行 install-deps.bat 可能需要几分钟时间
- 确保防火墙允许应用访问网络
- 如果遇到问题，请检查是否已安装 Node.js`;
    
    fs.writeFileSync(path.join(outputDir, 'README.txt'), readme);
    
    console.log('便携版创建成功！');
    console.log(`输出路径: ${outputDir}`);
    
  } catch (error) {
    console.error('创建便携版时出错:', error);
  }
}

createSimplePortable();