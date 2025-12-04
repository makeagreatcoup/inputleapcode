const EventEmitter = require('events');
const os = require('os');
const crypto = require('crypto');

class DeviceDiscovery extends EventEmitter {
  constructor() {
    super();
    this.bonjour = null;
    this.service = null;
    this.browser = null;
    this.discoveredDevices = new Map();
    this.announcementInterval = null;
    this.deviceName = this.getDeviceName();
    this.serviceType = 'inputleap';
    this.servicePort = 24800;
  }

  getDeviceName() {
    const hostname = os.hostname();
    const platform = os.platform();
    const platformName = platform === 'win32' ? 'Windows' : 
                         platform === 'darwin' ? 'macOS' : 'Linux';
    return `${hostname} (${platformName})`;
  }

  async startAnnouncement(port = 24800, useTLS = true) {
    try {
      this.servicePort = port;
      
      // 简化版服务公告
      console.log(`设备发现服务已启动: ${this.deviceName}`);
      this.emit('announcement-started', {
        name: this.deviceName,
        port: port,
        useTLS: useTLS
      });
      
      // 定期重新发布公告（确保服务可见性）
      this.startPeriodicAnnouncement();
      
      return { success: true };
      
    } catch (error) {
      console.error('启动设备公告失败:', error);
      return { success: false, error: error.message };
    }
  }

  startPeriodicAnnouncement() {
    // 每30秒重新发布公告
    this.announcementInterval = setInterval(() => {
      console.log('重新发布公告...');
    }, 30000);
  }

  async discover(timeout = 10000) {
    try {
      // 清理之前的发现结果
      this.discoveredDevices.clear();
      
      // 简化版设备发现（模拟）
      console.log('开始设备发现...');
      
      // 模拟发现设备
      const mockDevices = [
        {
          id: 'mock-device-1',
          name: 'Mock Device 1 (Windows)',
          host: '192.168.1.100',
          port: 24800,
          platform: 'win32',
          arch: 'x64',
          version: '1.0.0',
          useTLS: true,
          lastSeen: Date.now(),
          status: 'online'
        },
        {
          id: 'mock-device-2',
          name: 'Mock Device 2 (macOS)',
          host: '192.168.1.101',
          port: 24800,
          platform: 'darwin',
          arch: 'x64',
          version: '1.0.0',
          useTLS: true,
          lastSeen: Date.now(),
          status: 'online'
        }
      ];
      
      // 模拟异步发现过程
      setTimeout(() => {
        mockDevices.forEach(device => {
          this.discoveredDevices.set(device.id, device);
          this.emit('device-found', device);
        });
      }, 1000);
      
      // 设置超时
      const discoveryPromise = new Promise((resolve) => {
        setTimeout(() => {
          this.stopDiscovery();
          resolve(Array.from(this.discoveredDevices.values()));
        }, timeout);
      });

      this.emit('discovery-started');
      return await discoveryPromise;
      
    } catch (error) {
      console.error('设备发现失败:', error);
      return [];
    }
  }

  stopDiscovery() {
    console.log('停止设备发现');
    this.emit('discovery-stopped');
  }

  stopAnnouncement() {
    if (this.announcementInterval) {
      clearInterval(this.announcementInterval);
      this.announcementInterval = null;
    }
    
    console.log('停止设备公告');
    this.emit('announcement-stopped');
  }

  stop() {
    this.stopDiscovery();
    this.stopAnnouncement();
  }

  getDeviceId() {
    try {
      // 尝试获取机器的唯一标识符
      const machineId = this.generateMockMachineId();
      return crypto.createHash('md5').update(machineId).digest('hex');
    } catch (error) {
      // 备用方案：使用网络接口MAC地址
      const networkInterfaces = os.networkInterfaces();
      for (const interfaceName of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return crypto.createHash('md5').update(iface.mac).digest('hex');
          }
        }
      }
      
      // 最后备用方案：使用主机名
      return crypto.createHash('md5').update(os.hostname()).digest('hex');
    }
  }

  generateMockMachineId() {
    // 模拟机器ID
    return 'mock-machine-id-' + Math.random().toString(36).substring(2);
  }

  async testConnection(deviceInfo) {
    try {
      // 简化版连接测试
      console.log(`测试连接到 ${deviceInfo.host}:${deviceInfo.port}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // 模拟连接成功
          resolve({ 
            success: true, 
            latency: Math.floor(Math.random() * 50) + 10 
          });
        }, 100);
      });
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getDiscoveredDevices() {
    return Array.from(this.discoveredDevices.values());
  }

  getDeviceById(deviceId) {
    return this.discoveredDevices.get(deviceId);
  }

  removeDevice(deviceId) {
    this.discoveredDevices.delete(deviceId);
    this.emit('device-removed', deviceId);
  }

  updateDeviceStatus(deviceId, status) {
    const device = this.discoveredDevices.get(deviceId);
    if (device) {
      device.status = status;
      device.lastSeen = Date.now();
      this.emit('device-updated', device);
    }
  }

  // 清理过期的设备发现记录
  cleanupOldDevices(maxAge = 60000) { // 1分钟
    const now = Date.now();
    const devicesToRemove = [];
    
    this.discoveredDevices.forEach((device, deviceId) => {
      if (now - device.lastSeen > maxAge) {
        devicesToRemove.push(deviceId);
      }
    });
    
    devicesToRemove.forEach(deviceId => {
      this.removeDevice(deviceId);
    });
  }

  // 获取本地网络信息
  getNetworkInfo() {
    const networkInterfaces = os.networkInterfaces();
    const networks = [];
    
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const interfaces = networkInterfaces[interfaceName];
      
      for (const iface of interfaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          networks.push({
            name: interfaceName,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac
          });
        }
      }
    }
    
    return networks;
  }

  // 生成设备配置信息
  getDeviceConfig() {
    return {
      id: this.getDeviceId(),
      name: this.deviceName,
      platform: os.platform(),
      arch: os.arch(),
      version: '1.0.0',
      networks: this.getNetworkInfo(),
      capabilities: {
        clipboard: true,
        fileTransfer: true,
        mouseControl: true,
        keyboardControl: true
      }
    };
  }
}

module.exports = DeviceDiscovery;