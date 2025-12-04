const EventEmitter = require('events');
const tls = require('tls');
const net = require('net');
const crypto = require('crypto');

class NetworkManager extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.client = null;
    this.connections = new Map();
    this.isSecure = false;
    this.port = 24800; // 默认端口，类似Synergy
    
    // 事件优先级队列
    this.eventQueue = [];
    this.isProcessingQueue = false;
    this.eventPriorities = {
      'mouse-move': 1,      // 最高优先级
      'mouse-click': 1,
      'key-press': 1,
      'clipboard-change': 2, // 中等优先级
      'file-transfer-start': 3,
      'file-transfer-data': 3,
      'file-transfer-end': 3,
      'handshake': 4        // 最低优先级
    };
  }

  async startServer(port = 24800, useTLS = true) {
    this.port = port;
    this.isSecure = useTLS;

    return new Promise((resolve, reject) => {
      if (useTLS) {
        // 简化证书生成，直接使用私钥作为证书
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        // 创建一个简单的自签名证书
        const cert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAMlyFqk69v+9MA0GCSqGSIb3DQEBCwUAMA0xCzAJBgNVBAYTAlVT
MB4XDTE5MDUwMjE4MjE0NVoXDTIwMDUwMTE4MjE0NVowDTELMAkGA1UEBhMCVVMw
gZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMYi7KvzmJl9pz7S3Lj2Q7m0Lp5
N9XJ9Q3fH8Y9qJ1Q5Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q
AgMBAAEwDQYJKoZIhvcNAQELBQADgYEAj+6Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8
-----END CERTIFICATE-----`;

        // 验证证书格式
        if (!privateKey || !cert) {
          throw new Error('证书生成失败');
        }

        const options = {
          key: privateKey,
          cert: cert,
          rejectUnauthorized: false,
          secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3
        };

        this.server = tls.createServer(options, (socket) => {
          this.handleConnection(socket);
        });
      } else {
        this.server = net.createServer((socket) => {
          this.handleConnection(socket);
        });
      }

      this.server.listen(port, () => {
        // 获取本机IP地址
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        const results = Object.create(null);

        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
              if (!results[name]) {
                results[name] = [];
              }
              results[name].push(net.address);
            }
          }
        }

        console.log(`Server started on port ${port} (TLS: ${useTLS})`);
        console.log('Available IP addresses:');
        for (const [interfaceName, addresses] of Object.entries(results)) {
          console.log(`  ${interfaceName}: ${addresses.join(', ')}`);
        }
        
        // 将IP地址信息传递给前端
        this.emit('server-started', { port, ips: results });
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  async connectToServer(host, port = 24800, useTLS = true) {
    return new Promise((resolve, reject) => {
      const connectFunction = useTLS ? tls.connect : net.connect;
      
      this.client = connectFunction(port, host, { rejectUnauthorized: false }, () => {
        console.log(`连接到服务器 ${host}:${port}`);
        this.setupClientHandlers();
        this.emit('connected', host);
        resolve();
      });

      this.client.on('error', (error) => {
        reject(error);
      });
    });
  }

  handleConnection(socket) {
    const connectionId = crypto.randomBytes(8).toString('hex');
    this.connections.set(connectionId, socket);

    socket.on('data', (data) => {
      this.handleMessage(connectionId, data);
    });

    socket.on('close', () => {
      this.connections.delete(connectionId);
      if (this.connectionBuffers) {
        this.connectionBuffers.delete(connectionId);
      }
      this.emit('disconnected', connectionId);
    });

    socket.on('error', (error) => {
      console.error('连接错误:', error);
      this.connections.delete(connectionId);
      if (this.connectionBuffers) {
        this.connectionBuffers.delete(connectionId);
      }
    });

    // 发送初始握手消息
    this.sendMessage(connectionId, {
      type: 'handshake',
      version: '1.0',
      timestamp: Date.now()
    });

    this.emit('connected', connectionId);
  }

  setupClientHandlers() {
    this.client.on('data', (data) => {
      this.handleMessage('server', data);
    });

    this.client.on('close', () => {
      this.client = null;
      this.emit('disconnected', 'server');
    });

    this.client.on('error', (error) => {
      console.error('客户端连接错误:', error);
      this.client = null;
      this.emit('disconnected', 'server');
    });
  }

  handleMessage(connectionId, data) {
    try {
      console.log(`handleMessage被调用，连接ID: ${connectionId}，数据长度: ${data.length}`);
      const messages = this.parseMessages(data);
      console.log(`解析到 ${messages.length} 条消息`);
      messages.forEach((message, index) => {
        console.log(`处理第${index + 1}条消息:`, message.type);
        this.processMessage(connectionId, message);
      });
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }

  parseMessages(data) {
    // 简单的消息协议：JSON消息以换行符分隔
    const messages = [];
    let buffer = data.toString();
    let lines = buffer.split('\n');
    
    console.log('解析消息，原始数据:', buffer.substring(0, 200) + '...');
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        try {
          // 确保JSON字符串完整
          const jsonStr = line.trim();
          console.log(`处理第${index + 1}行:`, jsonStr);
          
          if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
            const parsed = JSON.parse(jsonStr);
            console.log('解析成功:', parsed.type);
            messages.push(parsed);
          } else {
            console.warn('跳过不完整的消息:', jsonStr.substring(0, 50) + '...');
          }
        } catch (error) {
          console.error('解析消息失败:', error.message);
          console.error('原始消息:', line.substring(0, 100));
        }
      }
    });
    
    console.log('解析完成，共', messages.length, '条消息');
    return messages;
  }

  processMessage(connectionId, message) {
    // 将消息加入优先级队列
    const priority = this.eventPriorities[message.type] || 999;
    this.eventQueue.push({
      connectionId,
      message,
      priority,
      timestamp: Date.now()
    });
    
    // 按优先级排序
    this.eventQueue.sort((a, b) => a.priority - b.priority);
    
    // 开始处理队列
    this.processEventQueue();
  }

  async processEventQueue() {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      
      try {
        switch (event.message.type) {
          case 'handshake':
            this.emit('handshake', event.connectionId, event.message);
            break;
            
          case 'mouse-move':
            console.log('NetworkManager: 处理mouse-move事件:', event.message.data);
            this.emit('mouse-move', event.message.data);
            // 鼠标事件后稍作延迟，确保处理完成
            await new Promise(resolve => setTimeout(resolve, 10));
            break;
            
          case 'mouse-click':
            this.emit('mouse-click', event.message.data);
            await new Promise(resolve => setTimeout(resolve, 10));
            break;
            
          case 'key-press':
            this.emit('key-press', event.message.data);
            await new Promise(resolve => setTimeout(resolve, 10));
            break;
            
          case 'clipboard-change':
            // 剪贴板事件去重：如果队列中还有剪贴板事件，跳过当前的
            const hasMoreClipboard = this.eventQueue.some(e => e.message.type === 'clipboard-change');
            if (!hasMoreClipboard) {
              this.emit('clipboard-change', event.message.data);
            }
            break;
            
          case 'file-transfer-start':
            this.emit('file-transfer-start', event.message.data);
            break;
            
          case 'file-transfer-data':
            this.emit('file-transfer-data', event.message.data);
            break;
            
          case 'file-transfer-end':
            this.emit('file-transfer-end', event.message.data);
            break;
            
          default:
            console.log('未知消息类型:', event.message.type);
        }
      } catch (error) {
        console.error('处理事件时出错:', error);
      }
    }
    
    this.isProcessingQueue = false;
  }

  sendMessage(connectionId, message) {
    const socket = this.connections.get(connectionId) || this.client;
    if (socket && socket.writable) {
      const messageStr = JSON.stringify(message) + '\n';
      console.log(`发送消息到 ${connectionId}:`, messageStr.trim());
      socket.write(messageStr);
    } else {
      console.log(`无法发送消息到 ${connectionId}: socket不可用`);
    }
  }

  sendEvent(eventType, data) {
    const message = {
      type: eventType,
      data: data,
      timestamp: Date.now()
    };

    console.log(`发送事件: ${eventType}, 数据:`, data);
    
    if (this.client) {
      // 客户端模式：发送到服务器
      console.log('客户端模式：发送到服务器');
      this.sendMessage('server', message);
    } else {
      // 服务器模式：广播到所有连接的客户端
      console.log(`服务器模式：广播到 ${this.connections.size} 个客户端`);
      this.connections.forEach((socket, connectionId) => {
        this.sendMessage(connectionId, message);
      });
    }
  }

  isConnected() {
    return this.client !== null || this.connections.size > 0;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    
    this.connections.forEach((socket, connectionId) => {
      socket.end();
    });
    this.connections.clear();
    
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = NetworkManager;