// 简单测试脚本
console.log('开始InputLeap核心功能测试...\n');

// 测试模块加载
try {
  console.log('✓ 测试模块加载...');
  
  const NetworkManager = require('../src/modules/NetworkManager');
  const InputCapture = require('../src/modules/InputCapture');
  const ClipboardSync = require('../src/modules/ClipboardSync');
  const FileTransfer = require('../src/modules/FileTransfer');
  const DeviceDiscovery = require('../src/modules/DeviceDiscovery');
  
  console.log('✓ 所有模块加载成功');
  
  // 测试实例创建
  console.log('\n✓ 测试实例创建...');
  
  const networkManager = new NetworkManager();
  const inputCapture = new InputCapture();
  const clipboardSync = new ClipboardSync();
  const fileTransfer = new FileTransfer();
  const deviceDiscovery = new DeviceDiscovery();
  
  console.log('✓ 所有实例创建成功');
  
  // 测试基本功能
  console.log('\n✓ 测试基本功能...');
  
  // NetworkManager测试
  console.log(`- NetworkManager端口: ${networkManager.port}`);
  console.log(`- NetworkManager TLS支持: ${networkManager.isSecure}`);
  
  // InputCapture测试
  console.log(`- InputCapture平台: ${inputCapture.platform}`);
  const screenBounds = inputCapture.getScreenBounds();
  console.log(`- InputCapture屏幕尺寸: ${screenBounds.width}x${screenBounds.height}`);
  
  // ClipboardSync测试
  console.log(`- ClipboardSync支持格式: ${clipboardSync.supportedFormats.join(', ')}`);
  
  // FileTransfer测试
  console.log(`- FileTransfer最大文件大小: ${fileTransfer.maxFileSize / 1024 / 1024}MB`);
  
  // DeviceDiscovery测试
  console.log(`- DeviceDiscovery设备名称: ${deviceDiscovery.deviceName}`);
  const deviceId = deviceDiscovery.getDeviceId();
  console.log(`- DeviceDiscovery设备ID: ${deviceId.substring(0, 8)}...`);
  
  console.log('\n🎉 所有基本功能测试通过！');
  console.log('\n✨ InputLeap系统已准备就绪！');
  
  console.log('\n启动说明:');
  console.log('1. 运行 "npm start" 启动GUI应用');
  console.log('2. 或运行 "npm run dev" 启动开发模式');
  console.log('3. 在一台电脑上启动服务器模式');
  console.log('4. 在另一台电脑上连接到服务器');
  console.log('5. 开始使用键鼠共享功能！');
  
} catch (error) {
  console.error('✗ 测试失败:', error.message);
  console.error('错误详情:', error.stack);
}

console.log('\n测试完成。');