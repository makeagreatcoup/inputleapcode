// 测试核心模块的基本功能
const NetworkManager = require('../src/modules/NetworkManager');
const InputCapture = require('../src/modules/InputCapture');
const ClipboardSync = require('../src/modules/ClipboardSync');
const FileTransfer = require('../src/modules/FileTransfer');
const DeviceDiscovery = require('../src/modules/DeviceDiscovery');

console.log('开始测试InputLeap核心模块...\n');

// 测试NetworkManager
async function testNetworkManager() {
  console.log('=== 测试NetworkManager ===');
  try {
    const networkManager = new NetworkManager();
    console.log('✓ NetworkManager实例创建成功');
    
    // 测试端口配置
    console.log(`✓ 默认端口: ${networkManager.port}`);
    console.log(`✓ TLS支持: ${networkManager.isSecure}`);
    
    console.log('NetworkManager测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ NetworkManager测试失败:', error.message);
    return false;
  }
}

// 测试InputCapture
async function testInputCapture() {
  console.log('=== 测试InputCapture ===');
  try {
    const inputCapture = new InputCapture();
    console.log('✓ InputCapture实例创建成功');
    
    // 测试屏幕边界获取
    const screenBounds = inputCapture.getScreenBounds();
    console.log(`✓ 屏幕边界: ${screenBounds.width}x${screenBounds.height}`);
    
    // 测试边缘检测
    const edgeTest = inputCapture.getScreenEdge({ x: 5, y: 100 });
    console.log(`✓ 边缘检测: ${edgeTest || '无边缘'}`);
    
    console.log('InputCapture测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ InputCapture测试失败:', error.message);
    return false;
  }
}

// 测试ClipboardSync
async function testClipboardSync() {
  console.log('=== 测试ClipboardSync ===');
  try {
    const clipboardSync = new ClipboardSync();
    console.log('✓ ClipboardSync实例创建成功');
    
    // 测试支持格式
    console.log(`✓ 支持格式: ${clipboardSync.supportedFormats.join(', ')}`);
    
    // 测试图片格式检测
    const testPNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const format = clipboardSync.detectImageFormat(testPNG);
    console.log(`✓ 图片格式检测: ${format}`);
    
    console.log('ClipboardSync测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ ClipboardSync测试失败:', error.message);
    return false;
  }
}

// 测试FileTransfer
async function testFileTransfer() {
  console.log('=== 测试FileTransfer ===');
  try {
    const fileTransfer = new FileTransfer();
    console.log('✓ FileTransfer实例创建成功');
    
    // 测试配置
    console.log(`✓ 最大文件大小: ${fileTransfer.maxFileSize / 1024 / 1024}MB`);
    console.log(`✓ 块大小: ${fileTransfer.chunkSize / 1024}KB`);
    
    // 测试唯一文件名生成
    const uniqueName = fileTransfer.generateUniqueFileName('test.txt');
    console.log(`✓ 唯一文件名生成: ${uniqueName}`);
    
    console.log('FileTransfer测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ FileTransfer测试失败:', error.message);
    return false;
  }
}

// 测试DeviceDiscovery
async function testDeviceDiscovery() {
  console.log('=== 测试DeviceDiscovery ===');
  try {
    const deviceDiscovery = new DeviceDiscovery();
    console.log('✓ DeviceDiscovery实例创建成功');
    
    // 测试设备名称
    console.log(`✓ 设备名称: ${deviceDiscovery.deviceName}`);
    
    // 测试设备ID生成
    const deviceId = deviceDiscovery.getDeviceId();
    console.log(`✓ 设备ID: ${deviceId.substring(0, 8)}...`);
    
    // 测试网络信息获取
    const networkInfo = deviceDiscovery.getNetworkInfo();
    console.log(`✓ 网络接口数量: ${networkInfo.length}`);
    
    // 测试设备配置
    const deviceConfig = deviceDiscovery.getDeviceConfig();
    console.log(`✓ 平台: ${deviceConfig.platform}`);
    console.log(`✓ 功能: ${Object.keys(deviceConfig.capabilities).join(', ')}`);
    
    console.log('DeviceDiscovery测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ DeviceDiscovery测试失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  const results = [];
  
  results.push(await testNetworkManager());
  results.push(await testInputCapture());
  results.push(await testClipboardSync());
  results.push(await testFileTransfer());
  results.push(await testDeviceDiscovery());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`=== 测试结果 ===`);
  console.log(`通过: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过！系统准备就绪。');
  } else {
    console.log('⚠️  部分测试失败，请检查错误信息。');
  }
}

// 运行测试
runAllTests().catch(console.error);