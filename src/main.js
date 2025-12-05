const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 修复Windows中文乱码问题
if (process.platform === 'win32') {
  process.env.PYTHONIOENCODING = 'utf-8';
  process.env.LANG = 'zh_CN.UTF-8';
  // 设置控制台编码
  if (process.stdout) {
    process.stdout.write('\x1b[?25h'); // 显示光标
  }
}

// 导入核心模块
const NetworkManager = require('./modules/NetworkManager');
const InputCapture = require('./modules/InputCapture');
const ClipboardSync = require('./modules/ClipboardSync');
const FileTransfer = require('./modules/FileTransfer');
const DeviceDiscovery = require('./modules/DeviceDiscovery');

class InputLeapApp {
  constructor() {
    this.mainWindow = null;
    this.networkManager = null;
    this.inputCapture = null;
    this.clipboardSync = null;
    this.fileTransfer = null;
    this.deviceDiscovery = null;
    this.isServer = false;
    this.connectedDevices = new Map();
  }

  async initialize() {
    await app.whenReady();
    this.createMainWindow();
    this.initializeModules();
    this.setupIpcHandlers();
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  initializeModules() {
    // 初始化网络管理器
    this.networkManager = new NetworkManager();
    this.networkManager.on('connected', (deviceId) => {
      this.connectedDevices.set(deviceId, { status: 'connected' });
      this.mainWindow.webContents.send('device-connected', deviceId);
    });

    this.networkManager.on('disconnected', (deviceId) => {
      this.connectedDevices.delete(deviceId);
      this.mainWindow.webContents.send('device-disconnected', deviceId);
    });

    // 接收远程鼠标移动事件
    this.networkManager.on('mouse-move', (data) => {
      console.log(`[客户端] 接收到远程鼠标移动事件: (${data.x}, ${data.y}), 边缘: ${data.edge}`);
      
      try {
        // 计算在本地屏幕的对应位置
        const localBounds = this.inputCapture.screenBounds;
        console.log(`[客户端] 本地屏幕边界:`, localBounds);
        
        let targetX = data.x;
        let targetY = data.y;
        
        // 根据边缘调整位置
        switch (data.edge) {
          case 'left':
            targetX = localBounds.right - 50; // 从右边缘进入
            console.log(`[客户端] 左边缘进入，目标X坐标: ${targetX}`);
            break;
          case 'right':
            targetX = localBounds.left + 50; // 从左边缘进入
            console.log(`[客户端] 右边缘进入，目标X坐标: ${targetX}`);
            break;
          case 'top':
            targetY = localBounds.bottom - 50; // 从下边缘进入
            console.log(`[客户端] 上边缘进入，目标Y坐标: ${targetY}`);
            break;
          case 'bottom':
            targetY = localBounds.top + 50; // 从上边缘进入
            console.log(`[客户端] 下边缘进入，目标Y坐标: ${targetY}`);
            break;
          default:
            console.warn(`[客户端] 未知边缘: ${data.edge}`);
            return;
        }
        
        console.log(`[客户端] 准备移动鼠标到本地位置: (${targetX}, ${targetY})`);
        
        // 添加移动完成回调
        const moveResult = this.inputCapture.moveMouseTo(targetX, targetY);
        if (moveResult instanceof Promise) {
          moveResult.then(() => {
            console.log(`[客户端] 鼠标移动完成: (${targetX}, ${targetY})`);
          }).catch((error) => {
            console.error(`[客户端] 鼠标移动失败:`, error);
          });
        } else {
          console.log(`[客户端] 鼠标移动指令已发送: (${targetX}, ${targetY})`);
        }
      } catch (error) {
        console.error(`[客户端] 处理鼠标移动事件时出错:`, error);
      }
    });

    // 接收远程鼠标点击事件
    this.networkManager.on('mouse-click', (data) => {
      this.inputCapture.simulateMouseClick(data);
    });

    // 接收远程键盘按键事件
    this.networkManager.on('key-press', (data) => {
      this.inputCapture.simulateKeyPress(data);
    });

    // 初始化输入捕获
    this.inputCapture = new InputCapture();
    this.inputCapture.on('mouse-move', (data) => {
      if (this.networkManager.isConnected()) {
        this.networkManager.sendEvent('mouse-move', data);
      }
    });

    this.inputCapture.on('mouse-click', (data) => {
      if (this.networkManager.isConnected()) {
        this.networkManager.sendEvent('mouse-click', data);
      }
    });

    this.inputCapture.on('key-press', (data) => {
      if (this.networkManager.isConnected()) {
        this.networkManager.sendEvent('key-press', data);
      }
    });

    // 初始化剪贴板同步
    this.clipboardSync = new ClipboardSync();
    this.clipboardSync.on('clipboard-change', (data) => {
      if (this.networkManager.isConnected()) {
        this.networkManager.sendEvent('clipboard-change', data);
      }
    });

    // 初始化文件传输
    this.fileTransfer = new FileTransfer();
    this.fileTransfer.on('file-received', (data) => {
      this.mainWindow.webContents.send('file-received', data);
    });

    // 初始化设备发现
    this.deviceDiscovery = new DeviceDiscovery();
    this.deviceDiscovery.on('device-found', (device) => {
      this.mainWindow.webContents.send('device-found', device);
    });
  }

  setupIpcHandlers() {
    // 启动服务器
    ipcMain.handle('start-server', async (event, config) => {
      try {
        this.isServer = true;
        
        // 监听服务器启动事件以获取IP信息
        const serverInfo = await new Promise((resolve, reject) => {
          this.networkManager.once('server-started', (info) => {
            resolve(info);
          });
          
          this.networkManager.startServer(config.port, false).catch(reject);
        });
        
        await this.deviceDiscovery.startAnnouncement(config.name);
        
        // 启动鼠标捕获（只有服务器需要）
        this.inputCapture.startMouseCapture();
        
        return { success: true, serverInfo };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 连接到服务器
    ipcMain.handle('connect-to-server', async (event, config) => {
      try {
        console.log('🔗 开始连接到服务器:', config);
        this.isServer = false;

        // 使用用户配置的TLS设置
        await this.networkManager.connectToServer(config.host, config.port, config.useTLS);

        console.log('✅ 连接到服务器成功:', config.host);
        return { success: true };
      } catch (error) {
        console.error('❌ 连接到服务器失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 搜索设备
    ipcMain.handle('discover-devices', async () => {
      return await this.deviceDiscovery.discover();
    });

    // 发送文件
    ipcMain.handle('send-file', async (event, filePath, deviceId) => {
      try {
        await this.fileTransfer.sendFile(filePath, deviceId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 获取连接状态
    ipcMain.handle('get-connection-status', () => {
      return {
        isConnected: this.networkManager.isConnected(),
        isServer: this.isServer,
        connectedDevices: Array.from(this.connectedDevices.keys())
      };
    });

    // 断开连接
    ipcMain.handle('disconnect', () => {
      this.networkManager.disconnect();
      this.deviceDiscovery.stop();
      this.inputCapture.stopMouseCapture();
    });
  }
}

// 应用启动
const inputLeapApp = new InputLeapApp();

app.on('ready', () => {
  inputLeapApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    inputLeapApp.createMainWindow();
  }
});

// 安全退出
app.on('before-quit', () => {
  if (inputLeapApp.networkManager) {
    inputLeapApp.networkManager.disconnect();
  }
  if (inputLeapApp.deviceDiscovery) {
    inputLeapApp.deviceDiscovery.stop();
  }
});