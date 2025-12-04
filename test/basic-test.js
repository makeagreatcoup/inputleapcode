console.log('InputLeap 基本功能测试');

// 测试基本模块加载
try {
  const NetworkManager = require('../src/modules/NetworkManager');
  console.log('✓ NetworkManager 加载成功');
  
  const networkManager = new NetworkManager();
  console.log('✓ NetworkManager 实例创建成功');
  console.log(`  端口: ${networkManager.port}`);
  
} catch (e) {
  console.log('✗ NetworkManager 测试失败:', e.message);
}

try {
  const InputCapture = require('../src/modules/InputCapture');
  console.log('✓ InputCapture 加载成功');
  
  const inputCapture = new InputCapture();
  console.log('✓ InputCapture 实例创建成功');
  console.log(`  平台: ${inputCapture.platform}`);
  
} catch (e) {
  console.log('✗ InputCapture 测试失败:', e.message);
}

try {
  const ClipboardSync = require('../src/modules/ClipboardSync');
  console.log('✓ ClipboardSync 加载成功');
  
  const clipboardSync = new ClipboardSync();
  console.log('✓ ClipboardSync 实例创建成功');
  console.log(`  支持格式: ${clipboardSync.supportedFormats.join(', ')}`);
  
} catch (e) {
  console.log('✗ ClipboardSync 测试失败:', e.message);
}

try {
  const FileTransfer = require('../src/modules/FileTransfer');
  console.log('✓ FileTransfer 加载成功');
  
  const fileTransfer = new FileTransfer();
  console.log('✓ FileTransfer 实例创建成功');
  console.log(`  最大文件大小: ${fileTransfer.maxFileSize / 1024 / 1024}MB`);
  
} catch (e) {
  console.log('✗ FileTransfer 测试失败:', e.message);
}

try {
  const DeviceDiscovery = require('../src/modules/DeviceDiscovery');
  console.log('✓ DeviceDiscovery 加载成功');
  
  const deviceDiscovery = new DeviceDiscovery();
  console.log('✓ DeviceDiscovery 实例创建成功');
  console.log(`  设备名称: ${deviceDiscovery.deviceName}`);
  
} catch (e) {
  console.log('✗ DeviceDiscovery 测试失败:', e.message);
}

console.log('\n测试完成！');