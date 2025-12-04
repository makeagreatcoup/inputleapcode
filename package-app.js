const packager = require('electron-packager');
const path = require('path');

async function packageApp() {
  try {
    console.log('开始打包应用...');
    
    const options = {
      dir: '.', // 应用目录
      out: 'dist', // 输出目录
      name: 'InputLeap Code', // 应用名称
      platform: 'win32', // 目标平台
      arch: 'x64', // 目标架构
      electronVersion: '27.0.0', // Electron版本
      prune: true, // 不包含devDependencies
      overwrite: true, // 覆盖已存在的输出
      asar: true, // 使用asar打包
      icon: 'assets/icon.ico', // 应用图标（如果存在）
      extraResource: [
        'resources/**/*'
      ]
    };

    const appPaths = await packager(options);
    console.log('应用打包成功！输出路径:', appPaths);
    
    // 创建安装程序
    console.log('创建Windows安装程序...');
    const { exec } = require('child_process');
    
    // 使用简单的NSIS命令创建安装程序
    exec(`makensis -DINPUT_DIR="${appPaths[0]}" -DOUTPUT_DIR="dist" -DAPP_NAME="InputLeap Code" installer.nsi`, (error, stdout, stderr) => {
      if (error) {
        console.error('创建安装程序失败:', error);
        return;
      }
      console.log('安装程序创建成功！');
    });
    
  } catch (error) {
    console.error('打包过程中出现错误:', error);
  }
}

packageApp();