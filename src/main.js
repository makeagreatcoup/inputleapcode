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
      try {
        // 只在客户端模式下处理远程事件
        if (!this.isServer) {
          this.handleRemoteMouseMove(data);
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
        // 只在服务器模式下发送鼠标事件
        if (this.isServer) {
          // 确定事件发送策略
          let shouldSend = false;
          let eventType = '';

          if (data.transferToRemote) {
            shouldSend = true;
            eventType = '跳转到远程';
          } else if (data.returnToLocal) {
            shouldSend = true;
            eventType = '返回本地';
          } else if (data.enterEdge) {
            shouldSend = true;
            eventType = '边缘进入';
          } else if (data.normalMove) {
            // 检查是否在跳转状态
            if (this.inputCapture.edgeState.isTransferred) {
              // 在跳转状态下，发送普通移动事件给客户端
              shouldSend = true;
              eventType = '远程移动';
            } else {
              // 本地移动，不发送
              eventType = '本地移动(跳过)';
            }
          }

          if (shouldSend) {
            console.log(`[服务器] 发送${eventType}: (${data.x}, ${data.y})`);
            this.networkManager.sendEvent('mouse-move', data);
          } else {
            // 每100次移动输出一次，避免日志刷屏
            if (this.inputCapture.moveCounter % 100 === 0) {
              console.log(`[服务器] ${eventType}: (${data.x}, ${data.y}) [跳过]`);
            }
          }
        }
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

  handleRemoteMouseMove(data) {
    const localBounds = this.inputCapture.screenBounds;
    let targetX, targetY;

    console.log(`[客户端] 接收到远程鼠标事件:`, data);

    if (data.transferToRemote) {
      // 跳转事件：服务器鼠标到达边缘，客户端鼠标应该从对应边缘出现
      console.log(`[客户端] 🚀 服务器从${data.edge}边缘跳转，客户端鼠标出现`);

      const remoteBounds = data.screenBounds;
      const relativeX = (data.x - remoteBounds.left) / remoteBounds.width;
      const relativeY = (data.y - remoteBounds.top) / remoteBounds.height;

      switch (data.edge) {
        case 'left':   // 服务器左边缘 -> 客户端右边缘
          targetX = localBounds.right - 20;
          targetY = localBounds.top + (relativeY * localBounds.height);
          break;
        case 'right':  // 服务器右边缘 -> 客户端左边缘
          targetX = localBounds.left + 20;
          targetY = localBounds.top + (relativeY * localBounds.height);
          break;
        case 'top':    // 服务器上边缘 -> 客户端下边缘
          targetX = localBounds.left + (relativeX * localBounds.width);
          targetY = localBounds.bottom - 20;
          break;
        case 'bottom': // 服务器下边缘 -> 客户端上边缘
          targetX = localBounds.left + (relativeX * localBounds.width);
          targetY = localBounds.top + 20;
          break;
        default:
          console.warn(`[客户端] 未知边缘: ${data.edge}`);
          return;
      }

      // 确保坐标在有效范围内
      targetX = Math.max(localBounds.left + 10, Math.min(targetX, localBounds.right - 10));
      targetY = Math.max(localBounds.top + 10, Math.min(targetY, localBounds.bottom - 10));

      console.log(`[客户端] 🎯 鼠标出现在: (${Math.round(targetX)}, ${Math.round(targetY)})`);

      // 设置客户端状态为"已跳转"
      this.inputCapture.edgeState.isTransferred = true;
      this.inputCapture.edgeState.isAtEdge = false;

    } else if (data.normalMove && this.inputCapture.edgeState.isTransferred) {
      // 普通移动事件：客户端已跳转，接收服务器鼠标移动
      console.log(`[客户端] 🖱️ 远程鼠标移动: 远程(${data.x}, ${data.y}) -> 本地`);

      // 将远程坐标转换为本地坐标
      const remoteBounds = data.screenBounds;
      const scaleX = localBounds.width / remoteBounds.width;
      const scaleY = localBounds.height / remoteBounds.height;

      targetX = localBounds.left + (data.x - remoteBounds.left) * scaleX;
      targetY = localBounds.top + (data.y - remoteBounds.top) * scaleY;

      // 确保坐标在有效范围内
      targetX = Math.max(localBounds.left + 5, Math.min(targetX, localBounds.right - 5));
      targetY = Math.max(localBounds.top + 5, Math.min(targetY, localBounds.bottom - 5));

    } else if (data.returnToLocal) {
      // 返回本地事件：服务器鼠标从边缘返回
      console.log(`[客户端] 🏠 服务器鼠标返回本地，客户端鼠标隐藏`);

      // 将客户端鼠标移到屏幕中心或安全位置
      targetX = localBounds.left + localBounds.width / 2;
      targetY = localBounds.top + localBounds.height / 2;

      // 重置客户端状态
      this.inputCapture.edgeState.isTransferred = false;
      this.inputCapture.edgeState.isAtEdge = false;

    } else if (data.enterEdge) {
      // 边缘进入事件：服务器鼠标到达边缘，但还未跳转
      console.log(`[客户端] 👀 服务器鼠标到达${data.edge}边缘，等待跳转`);
      // 预处理，暂时不移动鼠标
      return;
    } else {
      // 其他事件暂时忽略
      console.log(`[客户端] 忽略事件:`, data);
      return;
    }

    // 执行鼠标移动
    if (targetX !== undefined && targetY !== undefined) {
      console.log(`[客户端] 🎯 移动鼠标到: (${Math.round(targetX)}, ${Math.round(targetY)})`);

      this.inputCapture.moveMouseTo(Math.round(targetX), Math.round(targetY))
        .then(() => {
          console.log(`[客户端] ✅ 鼠标移动成功`);
        })
        .catch((error) => {
          console.error(`[客户端] ❌ 鼠标移动失败:`, error);
        });
    }
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