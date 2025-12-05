#!/usr/bin/env node

// 简单的设备发现测试脚本
const path = require('path');

console.log('🔍 开始测试 InputLeap 设备发现功能...\n');

try {
  // 尝试加载模块
  const DeviceDiscovery = require('./src/modules/DeviceDiscovery');
  console.log('✅ 设备发现模块加载成功\n');

  // 创建实例
  const discovery = new DeviceDiscovery();
  console.log('✅ 设备发现实例创建成功\n');

  // 测试设备配置获取
  const deviceConfig = discovery.getDeviceConfig();
  console.log('📱 本地设备配置:');
  console.log(`   名称: ${deviceConfig.name}`);
  console.log(`   平台: ${deviceConfig.platform}`);
  console.log(`   架构: ${deviceConfig.arch}`);
  console.log(`   ID: ${deviceConfig.id}`);
  console.log(`   网络接口: ${deviceConfig.networks.length} 个\n`);

  // 测试设备公告
  console.log('🚀 启动设备公告...');
  discovery.startAnnouncement(24800, true).then(result => {
    if (result.success) {
      console.log('✅ 设备公告启动成功');
      console.log(`   服务名: ${discovery.deviceName}`);
      console.log(`   端口: ${discovery.servicePort}`);
      console.log(`   服务类型: ${discovery.serviceType}\n`);

      // 设置事件监听
      discovery.on('device-found', (device) => {
        console.log('🔍 发现设备:');
        console.log(`   名称: ${device.name}`);
        console.log(`   地址: ${device.host}:${device.port}`);
        console.log(`   平台: ${device.platform}`);
        console.log(`   TLS: ${device.useTLS ? '是' : '否'}\n`);
      });

      // 开始设备发现
      console.log('🔍 开始设备发现（10秒超时）...');
      discovery.discover(10000).then(devices => {
        console.log(`✅ 设备发现完成，找到 ${devices.length} 个设备`);

        if (devices.length === 0) {
          console.log('💡 提示: 没有发现其他设备，这是正常的，因为当前只有一台设备在运行');
          console.log('   要测试完整功能，请在另一台设备上也启动此应用');
        }

        devices.forEach((device, index) => {
          console.log(`   ${index + 1}. ${device.name} (${device.host}:${device.port})`);
        });

        // 清理资源
        console.log('\n🧹 清理资源...');
        discovery.stop();
        console.log('✅ 测试完成！');

        process.exit(0);

      }).catch(error => {
        console.error('❌ 设备发现失败:', error.message);
        discovery.stop();
        process.exit(1);
      });

    } else {
      console.error('❌ 设备公告启动失败:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ 模块加载失败:', error.message);
  console.error('\n请确保在项目根目录运行此脚本，并且依赖已安装');
  console.error('可以尝试运行: npm install');
  process.exit(1);
}