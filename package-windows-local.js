const packager = require('electron-packager');
const path = require('path');

async function packageApp() {
  try {
    console.log('开始打包Windows应用...');
    
    // 查找本地Electron路径
    const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist');
    
    const options = {
      dir: '.', // 应用目录
      out: 'dist', // 输出目录
      name: 'InputLeap Code', // 应用名称
      platform: 'win32', // 目标平台
      arch: 'x64', // 目标架构
      electronVersion: '27.3.11', // 使用本地Electron版本
      prune: true, // 不包含devDependencies
      overwrite: true, // 覆盖已存在的输出
      asar: true, // 使用asar打包
      quiet: true, // 静默模式
      download: {
        cache: path.join(__dirname, 'node_modules', 'electron')
      }
    };

    const appPaths = await packager(options);
    console.log('Windows应用打包成功！输出路径:', appPaths);
    
    // 创建便携版压缩包
    const archiver = require('archiver');
    const fs = require('fs');
    const output = fs.createWriteStream('dist/InputLeap-Code-Windows-Portable.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log('便携版压缩包创建成功！大小:', archive.pointer() + ' bytes');
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    archive.directory(appPaths[0], false);
    archive.finalize();
    
  } catch (error) {
    console.error('打包过程中出现错误:', error);
  }
}

packageApp();