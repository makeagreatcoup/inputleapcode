const { ipcRenderer } = require('electron');

class InputLeapUI {
  constructor() {
    this.connectionStatus = 'disconnected';
    this.connectedDevices = [];
    this.discoveredDevices = [];
    this.transferHistory = [];
    
    this.initializeElements();
    this.bindEvents();
    this.initializeUI();
  }

  initializeElements() {
    // 连接状态元素
    this.connectionStatusEl = document.getElementById('connectionStatus');
    this.connectionTextEl = document.getElementById('connectionText');
    this.deviceInfoEl = document.getElementById('deviceInfo');
    
    // 服务器模式元素
    this.serverNameEl = document.getElementById('serverName');
    this.serverPortEl = document.getElementById('serverPort');
    this.serverTlsEl = document.getElementById('serverTLS');
    this.startServerBtnEl = document.getElementById('startServerBtn');
    this.stopServerBtnEl = document.getElementById('stopServerBtn');
    
    // 客户端模式元素
    this.serverHostEl = document.getElementById('serverHost');
    this.clientPortEl = document.getElementById('clientPort');
    this.clientTlsEl = document.getElementById('clientTLS');
    this.connectBtnEl = document.getElementById('connectBtn');
    this.disconnectBtnEl = document.getElementById('disconnectBtn');
    
    // 设备发现元素
    this.discoverBtnEl = document.getElementById('discoverBtn');
    this.devicesListEl = document.getElementById('devicesList');
    
    // 文件传输元素
    this.fileSelectEl = document.getElementById('fileSelect');
    this.targetDeviceEl = document.getElementById('targetDevice');
    this.sendFileBtnEl = document.getElementById('sendFileBtn');
    this.transferHistoryEl = document.getElementById('transferHistory');
    
    // 设置元素
    this.mouseSharingEl = document.getElementById('mouseSharing');
    this.mouseScrollEl = document.getElementById('mouseScroll');
    this.keyboardSharingEl = document.getElementById('keyboardSharing');
    this.clipboardSyncEl = document.getElementById('clipboardSync');
    this.imageSyncEl = document.getElementById('imageSync');
    this.autoTlsEl = document.getElementById('autoTLS');
    this.verifyCertificateEl = document.getElementById('verifyCertificate');
    this.maxFileSizeEl = document.getElementById('maxFileSize');
    this.connectionTimeoutEl = document.getElementById('connectionTimeout');
  }

  bindEvents() {
    // 服务器模式事件
    this.startServerBtnEl.addEventListener('click', () => this.startServer());
    this.stopServerBtnEl.addEventListener('click', () => this.stopServer());
    
    // 客户端模式事件
    this.connectBtnEl.addEventListener('click', () => this.connectToServer());
    this.disconnectBtnEl.addEventListener('click', () => this.disconnect());
    
    // 设备发现事件
    this.discoverBtnEl.addEventListener('click', () => this.discoverDevices());
    
    // 文件传输事件
    this.sendFileBtnEl.addEventListener('click', () => this.sendFiles());
    
    // 设置变更事件
    this.autoTlsEl.addEventListener('change', () => this.updateTlsSettings());
  }

  async initializeUI() {
    // 获取设备信息
    const deviceInfo = await this.getDeviceInfo();
    this.deviceInfoEl.textContent = `${deviceInfo.platform} - ${deviceInfo.hostname}`;
    
    // 设置默认设备名称
    this.serverNameEl.value = deviceInfo.hostname;
    
    // 初始化连接状态
    this.updateConnectionStatus();
    
    // 加载设置
    this.loadSettings();
  }

  async getDeviceInfo() {
    const os = require('os');
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  updateConnectionStatus(status = null) {
    if (status !== null) {
      this.connectionStatus = status;
    }
    
    this.connectionStatusEl.className = 'status-indicator';
    
    switch (this.connectionStatus) {
      case 'connected':
        this.connectionStatusEl.classList.add('status-connected');
        this.connectionTextEl.textContent = '已连接';
        break;
      case 'connecting':
        this.connectionStatusEl.classList.add('status-searching');
        this.connectionTextEl.textContent = '连接中...';
        break;
      case 'searching':
        this.connectionStatusEl.classList.add('status-searching');
        this.connectionTextEl.textContent = '搜索设备中...';
        break;
      default:
        this.connectionStatusEl.classList.add('status-disconnected');
        this.connectionTextEl.textContent = '未连接';
    }
  }

  async startServer() {
    try {
      this.updateConnectionStatus('connecting');
      
      const config = {
        name: this.serverNameEl.value,
        port: parseInt(this.serverPortEl.value),
        useTLS: this.serverTlsEl.checked
      };
      
      const result = await ipcRenderer.invoke('start-server', config);
      
      if (result.success) {
        this.updateConnectionStatus('connected');
        this.startServerBtnEl.classList.add('d-none');
        this.stopServerBtnEl.classList.remove('d-none');
        
        // 显示IP地址信息
        if (result.serverInfo && result.serverInfo.ips) {
          const serverIPsEl = document.getElementById('serverIPs');
          let ipHTML = '<strong>可用IP地址:</strong><br>';
          for (const [interfaceName, addresses] of Object.entries(result.serverInfo.ips)) {
            ipHTML += `<div><strong>${interfaceName}:</strong> ${addresses.map(ip => `<code>${ip}</code>`).join(', ')}</div>`;
          }
          serverIPsEl.innerHTML = ipHTML;
          this.showNotification('服务器已启动', 'success');
        } else {
          this.showNotification('服务器已启动', 'success');
        }
      } else {
        this.updateConnectionStatus('disconnected');
        this.showNotification(`启动服务器失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.updateConnectionStatus('disconnected');
      this.showNotification(`启动服务器失败: ${error.message}`, 'error');
    }
  }

  async stopServer() {
    try {
      await ipcRenderer.invoke('disconnect');
      this.updateConnectionStatus('disconnected');
      this.startServerBtnEl.classList.remove('d-none');
      this.stopServerBtnEl.classList.add('d-none');
      
      // 清空IP地址显示
      const serverIPsEl = document.getElementById('serverIPs');
      serverIPsEl.innerHTML = '<small class="text-muted">启动服务器后将显示可用IP地址</small>';
      
      this.showNotification('服务器已停止', 'info');
    } catch (error) {
      this.showNotification(`停止服务器失败: ${error.message}`, 'error');
    }
  }

  async connectToServer() {
    try {
      // 验证输入
      const host = this.serverHostEl.value.trim();
      const port = parseInt(this.clientPortEl.value);

      if (!host) {
        this.showNotification('请输入服务器地址', 'warning');
        return;
      }

      if (isNaN(port) || port <= 0 || port > 65535) {
        this.showNotification('请输入有效的端口号 (1-65535)', 'warning');
        return;
      }

      console.log('🔗 开始连接流程:', { host, port, tls: this.clientTlsEl.checked });

      this.updateConnectionStatus('connecting');
      this.connectBtnEl.disabled = true;
      this.connectBtnEl.innerHTML = '<i class="bi bi-hourglass-split"></i> 连接中...';

      const config = {
        host: host,
        port: port,
        useTLS: this.clientTlsEl.checked
      };

      console.log('📤 发送连接请求到主进程:', config);
      const result = await ipcRenderer.invoke('connect-to-server', config);

      console.log('📥 收到连接结果:', result);

      if (result.success) {
        this.updateConnectionStatus('connected');
        this.connectBtnEl.classList.add('d-none');
        this.disconnectBtnEl.classList.remove('d-none');
        this.showNotification(`✅ 连接成功: ${host}:${port}`, 'success');
      } else {
        this.updateConnectionStatus('disconnected');
        this.showNotification(`❌ 连接失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('💥 连接过程中发生异常:', error);
      this.updateConnectionStatus('disconnected');
      this.showNotification(`💥 连接失败: ${error.message}`, 'error');
    } finally {
      // 恢复按钮状态
      this.connectBtnEl.disabled = false;
      this.connectBtnEl.innerHTML = '<i class="bi bi-link-45deg"></i> 连接';
    }
  }

  async disconnect() {
    try {
      await ipcRenderer.invoke('disconnect');
      this.updateConnectionStatus('disconnected');
      this.connectBtnEl.classList.remove('d-none');
      this.disconnectBtnEl.classList.add('d-none');
      this.showNotification('已断开连接', 'info');
    } catch (error) {
      this.showNotification(`断开连接失败: ${error.message}`, 'error');
    }
  }

  async discoverDevices() {
    try {
      this.updateConnectionStatus('searching');
      this.discoverBtnEl.disabled = true;
      this.discoverBtnEl.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 搜索中...';
      
      const devices = await ipcRenderer.invoke('discover-devices');
      this.discoveredDevices = devices;
      this.updateDevicesList();
      
      this.updateConnectionStatus(this.connectionStatus === 'searching' ? 'disconnected' : this.connectionStatus);
      this.showNotification(`发现 ${devices.length} 个设备`, 'info');
    } catch (error) {
      this.showNotification(`设备发现失败: ${error.message}`, 'error');
    } finally {
      this.discoverBtnEl.disabled = false;
      this.discoverBtnEl.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新';
    }
  }

  updateDevicesList() {
    if (this.discoveredDevices.length === 0) {
      this.devicesListEl.innerHTML = `
        <div class="text-center text-muted">
          <i class="bi bi-search" style="font-size: 3rem;"></i>
          <p>未发现设备，请确保设备在同一局域网内</p>
        </div>
      `;
      return;
    }
    
    const devicesHTML = this.discoveredDevices.map(device => `
      <div class="device-card" data-device-id="${device.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">
              <i class="bi bi-laptop"></i> ${device.name}
            </h6>
            <small class="text-muted">
              ${device.host}:${device.port} | ${device.platform} | 
              <i class="bi bi-shield${device.useTLS ? '-fill' : ''}"></i> 
              ${device.useTLS ? 'TLS' : '无加密'}
            </small>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary connect-device-btn" 
                    data-host="${device.host}" 
                    data-port="${device.port}" 
                    data-tls="${device.useTLS}">
              <i class="bi bi-link-45deg"></i> 连接
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    this.devicesListEl.innerHTML = devicesHTML;
    
    // 绑定连接按钮事件
    document.querySelectorAll('.connect-device-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const host = e.target.dataset.host;
        const port = e.target.dataset.port;
        const tls = e.target.dataset.tls === 'true';
        
        this.serverHostEl.value = host;
        this.clientPortEl.value = port;
        this.clientTlsEl.checked = tls;
        
        // 切换到连接选项卡
        document.getElementById('connection-tab').click();
      });
    });
  }

  async sendFiles() {
    const files = this.fileSelectEl.files;
    const targetDevice = this.targetDeviceEl.value;
    
    if (files.length === 0) {
      this.showNotification('请选择要发送的文件', 'warning');
      return;
    }
    
    if (!targetDevice) {
      this.showNotification('请选择目标设备', 'warning');
      return;
    }
    
    try {
      for (const file of files) {
        const result = await ipcRenderer.invoke('send-file', file.path, targetDevice);
        
        if (result.success) {
          this.addTransferItem({
            id: result.transferId,
            fileName: file.name,
            fileSize: file.size,
            direction: 'upload',
            status: 'transferring',
            progress: 0
          });
        } else {
          this.showNotification(`发送文件失败: ${result.error}`, 'error');
        }
      }
      
      this.fileSelectEl.value = '';
      this.showNotification(`正在发送 ${files.length} 个文件`, 'info');
    } catch (error) {
      this.showNotification(`发送文件失败: ${error.message}`, 'error');
    }
  }

  addTransferItem(transfer) {
    this.transferHistory.unshift(transfer);
    this.updateTransferHistory();
  }

  updateTransferHistory() {
    if (this.transferHistory.length === 0) {
      this.transferHistoryEl.innerHTML = '<p class="text-muted">暂无传输记录</p>';
      return;
    }
    
    const historyHTML = this.transferHistory.slice(0, 10).map(transfer => `
      <div class="file-transfer-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="bi bi-file-earmark${transfer.direction === 'upload' ? '-arrow-up' : '-arrow-down'}"></i>
            <span class="fw-bold">${transfer.fileName}</span>
            <small class="text-muted">(${this.formatFileSize(transfer.fileSize)})</small>
          </div>
          <div>
            <span class="badge bg-${this.getStatusColor(transfer.status)}">${transfer.status}</span>
          </div>
        </div>
        ${transfer.progress !== undefined ? `
          <div class="progress-container">
            <div class="progress" style="height: 5px;">
              <div class="progress-bar" style="width: ${transfer.progress}%"></div>
            </div>
            <small class="text-muted">${Math.round(transfer.progress)}%</small>
          </div>
        ` : ''}
      </div>
    `).join('');
    
    this.transferHistoryEl.innerHTML = historyHTML;
  }

  getStatusColor(status) {
    switch (status) {
      case 'completed': return 'success';
      case 'transferring': return 'primary';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  updateTlsSettings() {
    const autoTLS = this.autoTlsEl.checked;
    this.serverTlsEl.checked = autoTLS;
    this.clientTlsEl.checked = autoTLS;
    this.serverTlsEl.disabled = autoTLS;
    this.clientTlsEl.disabled = autoTLS;
  }

  loadSettings() {
    // 从本地存储加载设置
    const settings = JSON.parse(localStorage.getItem('inputleap-settings') || '{}');
    
    this.mouseSharingEl.checked = settings.mouseSharing !== false;
    this.mouseScrollEl.checked = settings.mouseScroll !== false;
    this.keyboardSharingEl.checked = settings.keyboardSharing !== false;
    this.clipboardSyncEl.checked = settings.clipboardSync !== false;
    this.imageSyncEl.checked = settings.imageSync !== false;
    this.autoTlsEl.checked = settings.autoTLS !== false;
    this.verifyCertificateEl.checked = settings.verifyCertificate === true;
    this.maxFileSizeEl.value = settings.maxFileSize || 100;
    this.connectionTimeoutEl.value = settings.connectionTimeout || 10;
    
    this.updateTlsSettings();
  }

  saveSettings() {
    const settings = {
      mouseSharing: this.mouseSharingEl.checked,
      mouseScroll: this.mouseScrollEl.checked,
      keyboardSharing: this.keyboardSharingEl.checked,
      clipboardSync: this.clipboardSyncEl.checked,
      imageSync: this.imageSyncEl.checked,
      autoTLS: this.autoTlsEl.checked,
      verifyCertificate: this.verifyCertificateEl.checked,
      maxFileSize: parseInt(this.maxFileSizeEl.value),
      connectionTimeout: parseInt(this.connectionTimeoutEl.value)
    };
    
    localStorage.setItem('inputleap-settings', JSON.stringify(settings));
    this.showNotification('设置已保存', 'success');
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// IPC事件监听
ipcRenderer.on('device-connected', (event, deviceId) => {
  console.log('设备已连接:', deviceId);
  ui.updateConnectionStatus('connected');
});

ipcRenderer.on('device-disconnected', (event, deviceId) => {
  console.log('设备已断开:', deviceId);
  ui.updateConnectionStatus('disconnected');
});

ipcRenderer.on('device-found', (event, device) => {
  console.log('发现设备:', device);
});

ipcRenderer.on('file-received', (event, data) => {
  console.log('文件已接收:', data);
  ui.addTransferItem({
    id: data.transferId,
    fileName: data.fileName,
    fileSize: data.fileSize,
    direction: 'download',
    status: 'completed',
    progress: 100
  });
  ui.showNotification(`已接收文件: ${data.fileName}`, 'success');
});

// 初始化UI
const ui = new InputLeapUI();

// 保存设置
document.querySelectorAll('input, select').forEach(element => {
  element.addEventListener('change', () => {
    if (element.closest('#settings')) {
      ui.saveSettings();
    }
  });
});