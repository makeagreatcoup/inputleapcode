const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class ClipboardSync extends EventEmitter {
  constructor() {
    super();
    this.isMonitoring = false;
    this.lastClipboardContent = null;
    this.platform = os.platform();
    this.tempDir = path.join(os.tmpdir(), 'inputleap-clipboard');
    
    // 确保临时目录存在
    this.ensureTempDir();
    
    // 支持的剪贴板格式
    this.supportedFormats = ['text', 'image', 'files'];
    
    // 剪贴板事件控制
    this.lastEventTime = 0;
    this.minEventInterval = 1000; // 最小事件间隔1秒
    this.isRemoteUpdating = false; // 防止远程更新触发本地事件
    
    this.initializeMonitoring();
  }

  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建临时目录失败:', error);
    }
  }

  initializeMonitoring() {
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkClipboardChange();
    }, 500); // 每500ms检查一次剪贴板变化
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async checkClipboardChange() {
    try {
      // 如果正在远程更新，跳过检查
      if (this.isRemoteUpdating) {
        return;
      }
      
      // 检查事件间隔，防止过于频繁的事件
      const now = Date.now();
      if (now - this.lastEventTime < this.minEventInterval) {
        return;
      }
      
      const currentContent = await this.getClipboardContent();
      
      if (this.hasContentChanged(currentContent)) {
        this.lastClipboardContent = currentContent;
        this.lastEventTime = now;
        this.emit('clipboard-change', currentContent);
      }
    } catch (error) {
      console.error('检查剪贴板变化失败:', error);
    }
  }

  hasContentChanged(newContent) {
    // 没有新内容则不触发
    if (!newContent) {
      return false;
    }
    // 第一次有内容
    if (!this.lastClipboardContent) {
      return true;
    }
    
    // 比较内容类型和数据
    if (this.lastClipboardContent.type !== newContent.type) {
      return true;
    }
    
    if (this.lastClipboardContent.type === 'text') {
      return this.lastClipboardContent.data !== newContent.data;
    } else if (this.lastClipboardContent.type === 'image') {
      return this.lastClipboardContent.hash !== newContent.hash;
    } else if (this.lastClipboardContent.type === 'files') {
      return JSON.stringify(this.lastClipboardContent.files) !== JSON.stringify(newContent.files);
    }
    
    return false;
  }

  async getClipboardContent() {
    try {
      // 简化版剪贴板内容获取
      // 实际应用中应使用clipboard库
      
      // 暂不模拟剪贴板内容，实际应用应接入系统剪贴板
      return null;
    } catch (error) {
      console.error('获取剪贴板内容失败:', error);
      return null;
    }
  }

  async getImageFromClipboard() {
    try {
      // 简化版图片获取
      const mockImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      if (Math.random() > 0.9) { // 10%概率返回图片
        const hash = crypto.createHash('md5').update(mockImageData).digest('hex');
        
        return {
          type: 'image',
          data: mockImageData.toString('base64'),
          format: 'PNG',
          hash: hash,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('获取剪贴板图片失败:', error);
    }
    
    return null;
  }

  async getFilesFromClipboard() {
    try {
      // 简化版文件获取
      if (Math.random() > 0.95) { // 5%概率返回文件
        return {
          type: 'files',
          files: ['/path/to/file1.txt', '/path/to/file2.jpg'],
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('获取剪贴板文件失败:', error);
    }
    
    return null;
  }

  detectImageFormat(buffer) {
    // 检测图片格式
    const signatures = {
      'PNG': [0x89, 0x50, 0x4E, 0x47],
      'JPEG': [0xFF, 0xD8, 0xFF],
      'GIF': [0x47, 0x49, 0x46],
      'BMP': [0x42, 0x4D]
    };
    
    for (const [format, signature] of Object.entries(signatures)) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return format;
    }
    
    return 'UNKNOWN';
  }

  async setClipboardContent(content) {
    try {
      // 设置远程更新标志，防止触发本地事件
      this.isRemoteUpdating = true;
      
      console.log(`设置剪贴板内容: ${content.type}`);
      // 简化版剪贴板设置
      // 实际应用中应使用clipboard库
      
      switch (content.type) {
        case 'text':
          console.log(`文本内容: ${content.data.substring(0, 50)}...`);
          break;
          
        case 'image':
          console.log(`图片格式: ${content.format}`);
          break;
          
        case 'files':
          console.log(`文件数量: ${content.files.length}`);
          break;
          
        default:
          console.warn('不支持的剪贴板内容类型:', content.type);
      }
      
      // 更新最后内容，防止重复发送
      this.lastClipboardContent = {
        type: content.type,
        data: content.data,
        timestamp: Date.now()
      };
      
      // 延迟清除远程更新标志
      setTimeout(() => {
        this.isRemoteUpdating = false;
      }, 500);
      
    } catch (error) {
      console.error('设置剪贴板内容失败:', error);
      this.isRemoteUpdating = false;
    }
  }

  // 清理临时文件
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }

  // 格式化剪贴板内容以便传输
  formatForTransfer(content) {
    const transferContent = {
      ...content,
      id: crypto.randomBytes(8).toString('hex'),
      platform: this.platform
    };
    
    // 对于大文件，可能需要特殊处理
    if (content.type === 'files') {
      transferContent.fileCount = content.files.length;
    }
    
    return transferContent;
  }

  // 从传输格式恢复剪贴板内容
  restoreFromTransfer(transferContent) {
    return {
      type: transferContent.type,
      data: transferContent.data,
      timestamp: Date.now()
    };
  }
}

module.exports = ClipboardSync;
