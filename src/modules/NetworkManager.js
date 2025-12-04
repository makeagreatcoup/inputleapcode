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
  }

  async startServer(port = 24800, useTLS = true) {
    this.port = port;
    this.isSecure = useTLS;

    return new Promise((resolve, reject) => {
      if (useTLS) {
        // 生成自签名证书
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const options = {
          key: privateKey,
          cert: publicKey,
          rejectUnauthorized: false
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
        console.log(`服务器启动在端口 ${port} (TLS: ${useTLS})`);
        this.emit('server-started', port);
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
      this.emit('disconnected', connectionId);
    });

    socket.on('error', (error) => {
      console.error('连接错误:', error);
      this.connections.delete(connectionId);
      this.emit('disconnected', connectionId);
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
      const messages = this.parseMessages(data);
      messages.forEach(message => {
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
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          messages.push(JSON.parse(line));
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      }
    });
    
    return messages;
  }

  processMessage(connectionId, message) {
    switch (message.type) {
      case 'handshake':
        this.emit('handshake', connectionId, message);
        break;
        
      case 'mouse-move':
        this.emit('mouse-move', message.data);
        break;
        
      case 'mouse-click':
        this.emit('mouse-click', message.data);
        break;
        
      case 'key-press':
        this.emit('key-press', message.data);
        break;
        
      case 'clipboard-change':
        this.emit('clipboard-change', message.data);
        break;
        
      case 'file-transfer-start':
        this.emit('file-transfer-start', message.data);
        break;
        
      case 'file-transfer-data':
        this.emit('file-transfer-data', message.data);
        break;
        
      case 'file-transfer-end':
        this.emit('file-transfer-end', message.data);
        break;
        
      default:
        console.log('未知消息类型:', message.type);
    }
  }

  sendMessage(connectionId, message) {
    const socket = this.connections.get(connectionId) || this.client;
    if (socket && socket.writable) {
      const messageStr = JSON.stringify(message) + '\n';
      socket.write(messageStr);
    }
  }

  sendEvent(eventType, data) {
    const message = {
      type: eventType,
      data: data,
      timestamp: Date.now()
    };

    if (this.client) {
      // 客户端模式：发送到服务器
      this.sendMessage('server', message);
    } else {
      // 服务器模式：广播到所有连接的客户端
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