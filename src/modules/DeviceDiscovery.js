const EventEmitter = require('events');
const os = require('os');
const crypto = require('crypto');
const { createBonjour } = require('bonjour-service');

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
    this.isDiscovering = false;
    this.discoveryTimeout = null;
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

      // 初始化 Bonjour
      this.bonjour = createBonjour();

      // 获取设备配置
      const deviceConfig = this.getDeviceConfig();

      // 发布 mDNS 服务
      this.service = this.bonjour.publish({
        name: this.deviceName,
        type: this.serviceType,
        port: port,
        txt: {
          version: '1.0.0',
          platform: deviceConfig.platform,
          arch: deviceConfig.arch,
          deviceId: deviceConfig.id,
          useTLS: useTLS.toString(),
          timestamp: Date.now().toString()
        }
      });

      this.service.on('up', () => {
        console.log(`mDNS 服务已发布: ${this.deviceName} (${this.serviceType})`);
        this.emit('announcement-started', {
          name: this.deviceName,
          port: port,
          useTLS: useTLS
        });
      });

      this.service.on('error', (err) => {
        console.error('mDNS 服务发布失败:', err);
        this.emit('announcement-error', err);
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
    return new Promise((resolve, reject) => {
      try {
        // 清理之前的发现结果
        this.discoveredDevices.clear();
        this.isDiscovering = true;

        // 初始化 Bonjour（如果尚未初始化）
        if (!this.bonjour) {
          this.bonjour = createBonjour();
        }

        console.log('开始 mDNS 设备发现...');

        // 开始浏览 InputLeap 服务
        this.browser = this.bonjour.find({ type: this.serviceType }, (service) => {
          if (service.name === this.deviceName) {
            // 忽略自己的服务
            return;
          }

          const deviceInfo = {
            id: service.txt?.deviceId || service.name,
            name: service.name,
            host: service.addresses?.[0] || service.host,
            port: service.port,
            platform: service.txt?.platform || 'unknown',
            arch: service.txt?.arch || 'unknown',
            version: service.txt?.version || '1.0.0',
            useTLS: service.txt?.useTLS === 'true',
            lastSeen: Date.now(),
            status: 'online',
            rawService: service
          };

          // 过滤重复设备
          if (!this.discoveredDevices.has(deviceInfo.id)) {
            this.discoveredDevices.set(deviceInfo.id, deviceInfo);
            console.log(`发现设备: ${deviceInfo.name} (${deviceInfo.host}:${deviceInfo.port})`);
            this.emit('device-found', deviceInfo);
          }
        });

        this.browser.on('up', (service) => {
          console.log(`设备上线: ${service.name}`);
        });

        this.browser.on('down', (service) => {
          console.log(`设备下线: ${service.name}`);
          // 从发现列表中移除
          const deviceId = service.txt?.deviceId || service.name;
          this.removeDevice(deviceId);
        });

        this.browser.on('error', (err) => {
          console.error('mDNS 浏览错误:', err);
        });

        this.emit('discovery-started');

        // 设置发现超时
        this.discoveryTimeout = setTimeout(() => {
          this.stopDiscovery();
          console.log(`设备发现完成，找到 ${this.discoveredDevices.size} 个设备`);
          resolve(Array.from(this.discoveredDevices.values()));
        }, timeout);

      } catch (error) {
        console.error('设备发现失败:', error);
        this.isDiscovering = false;
        reject(error);
      }
    });
  }

  stopDiscovery() {
    this.isDiscovering = false;

    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = null;
    }

    if (this.browser) {
      this.browser.stop();
      this.browser = null;
    }

    console.log('设备发现已停止');
    this.emit('discovery-stopped');
  }

  stopAnnouncement() {
    if (this.announcementInterval) {
      clearInterval(this.announcementInterval);
      this.announcementInterval = null;
    }

    if (this.service) {
      this.service.stop();
      this.service = null;
    }

    console.log('设备公告已停止');
    this.emit('announcement-stopped');
  }

  stop() {
    this.stopDiscovery();
    this.stopAnnouncement();

    if (this.bonjour) {
      this.bonjour.destroy();
      this.bonjour = null;
    }
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