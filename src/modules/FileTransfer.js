const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class FileTransfer extends EventEmitter {
  constructor() {
    super();
    this.activeTransfers = new Map();
    this.completedTransfers = new Map();
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.chunkSize = 64 * 1024; // 64KB chunks
    this.downloadDir = path.join(os.homedir(), 'Downloads', 'InputLeap');
    
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    try {
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建下载目录失败:', error);
    }
  }

  async sendFile(filePath, deviceId) {
    try {
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.size > this.maxFileSize) {
        throw new Error(`文件大小超过限制 (${this.maxFileSize / 1024 / 1024}MB)`);
      }

      const transferId = crypto.randomBytes(16).toString('hex');
      const fileName = path.basename(filePath);
      const fileHash = await this.calculateFileHash(filePath);

      const transferInfo = {
        id: transferId,
        deviceId: deviceId,
        fileName: fileName,
        filePath: filePath,
        fileSize: fileStats.size,
        fileHash: fileHash,
        startTime: Date.now(),
        status: 'preparing'
      };

      this.activeTransfers.set(transferId, transferInfo);
      this.emit('transfer-started', transferInfo);

      // 开始传输文件
      await this.sendFileChunks(transferId, filePath, deviceId);
      
      return { success: true, transferId: transferId };
      
    } catch (error) {
      console.error('文件传输失败:', error);
      return { success: false, error: error.message };
    }
  }

  async sendFileChunks(transferId, filePath, deviceId) {
    return new Promise((resolve, reject) => {
      const transferInfo = this.activeTransfers.get(transferId);
      if (!transferInfo) {
        reject(new Error('传输信息不存在'));
        return;
      }

      const readStream = fs.createReadStream(filePath, { highWaterMark: this.chunkSize });
      let transferredBytes = 0;
      const totalBytes = transferInfo.fileSize;

      // 发送传输开始消息
      this.emit('send-message', {
        type: 'file-transfer-start',
        deviceId: deviceId,
        data: {
          transferId: transferId,
          fileName: transferInfo.fileName,
          fileSize: totalBytes,
          fileHash: transferInfo.fileHash
        }
      });

      transferInfo.status = 'transferring';

      readStream.on('data', (chunk) => {
        const chunkData = {
          transferId: transferId,
          chunkIndex: Math.floor(transferredBytes / this.chunkSize),
          data: chunk.toString('base64'),
          checksum: crypto.createHash('md5').update(chunk).digest('hex')
        };

        this.emit('send-message', {
          type: 'file-transfer-data',
          deviceId: deviceId,
          data: chunkData
        });

        transferredBytes += chunk.length;
        
        // 更新传输进度
        const progress = (transferredBytes / totalBytes) * 100;
        this.emit('transfer-progress', {
          transferId: transferId,
          progress: progress,
          transferredBytes: transferredBytes,
          totalBytes: totalBytes
        });
      });

      readStream.on('end', () => {
        // 发送传输完成消息
        this.emit('send-message', {
          type: 'file-transfer-end',
          deviceId: deviceId,
          data: {
            transferId: transferId,
            success: true
          }
        });

        transferInfo.status = 'completed';
        transferInfo.endTime = Date.now();
        
        this.completedTransfers.set(transferId, transferInfo);
        this.activeTransfers.delete(transferId);
        
        this.emit('transfer-completed', transferInfo);
        resolve();
      });

      readStream.on('error', (error) => {
        // 发送传输失败消息
        this.emit('send-message', {
          type: 'file-transfer-end',
          deviceId: deviceId,
          data: {
            transferId: transferId,
            success: false,
            error: error.message
          }
        });

        transferInfo.status = 'failed';
        transferInfo.error = error.message;
        
        this.activeTransfers.delete(transferId);
        this.emit('transfer-failed', transferInfo);
        reject(error);
      });
    });
  }

  async receiveFile(transferData) {
    try {
      const { transferId, fileName, fileSize, fileHash } = transferData;
      
      const receivedFile = {
        id: transferId,
        fileName: fileName,
        fileSize: fileSize,
        fileHash: fileHash,
        receivedBytes: 0,
        chunks: new Map(),
        status: 'receiving',
        startTime: Date.now()
      };

      this.activeTransfers.set(transferId, receivedFile);
      this.emit('file-receive-start', receivedFile);

      return { success: true };
      
    } catch (error) {
      console.error('接收文件失败:', error);
      return { success: false, error: error.message };
    }
  }

  async receiveFileChunk(chunkData) {
    try {
      const { transferId, chunkIndex, data, checksum } = chunkData;
      const transfer = this.activeTransfers.get(transferId);
      
      if (!transfer) {
        throw new Error('传输不存在');
      }

      // 验证校验和
      const chunk = Buffer.from(data, 'base64');
      const calculatedChecksum = crypto.createHash('md5').update(chunk).digest('hex');
      
      if (calculatedChecksum !== checksum) {
        throw new Error('数据校验失败');
      }

      // 存储数据块
      transfer.chunks.set(chunkIndex, chunk);
      transfer.receivedBytes += chunk.length;

      // 更新接收进度
      const progress = (transfer.receivedBytes / transfer.fileSize) * 100;
      this.emit('receive-progress', {
        transferId: transferId,
        progress: progress,
        receivedBytes: transfer.receivedBytes,
        totalBytes: transfer.fileSize
      });

      return { success: true };
      
    } catch (error) {
      console.error('接收文件块失败:', error);
      return { success: false, error: error.message };
    }
  }

  async completeFileTransfer(transferData) {
    try {
      const { transferId, success, error } = transferData;
      const transfer = this.activeTransfers.get(transferId);
      
      if (!transfer) {
        throw new Error('传输不存在');
      }

      if (!success) {
        throw new Error(error || '传输失败');
      }

      // 组装文件
      const filePath = await this.assembleFile(transfer);
      
      // 验证文件完整性
      const isValid = await this.verifyFile(filePath, transfer.fileHash);
      
      if (!isValid) {
        fs.unlinkSync(filePath);
        throw new Error('文件完整性验证失败');
      }

      transfer.status = 'completed';
      transfer.filePath = filePath;
      transfer.endTime = Date.now();
      
      this.completedTransfers.set(transferId, transfer);
      this.activeTransfers.delete(transferId);
      
      this.emit('file-received', {
        transferId: transferId,
        fileName: transfer.fileName,
        filePath: filePath,
        fileSize: transfer.fileSize
      });

      return { success: true, filePath: filePath };
      
    } catch (error) {
      console.error('完成文件传输失败:', error);
      return { success: false, error: error.message };
    }
  }

  async assembleFile(transfer) {
    const fileName = this.generateUniqueFileName(transfer.fileName);
    const filePath = path.join(this.downloadDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      // 按顺序写入所有数据块
      const sortedChunks = Array.from(transfer.chunks.entries())
        .sort((a, b) => a[0] - b[0]);

      let chunkIndex = 0;

      const writeNextChunk = () => {
        if (chunkIndex >= sortedChunks.length) {
          writeStream.end();
          return;
        }

        const [index, chunk] = sortedChunks[chunkIndex];
        writeStream.write(chunk);
        chunkIndex++;
        writeNextChunk();
      };

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

      writeNextChunk();
    });
  }

  generateUniqueFileName(fileName) {
    const name = path.parse(fileName).name;
    const ext = path.parse(fileName).ext;
    let counter = 1;
    let uniqueFileName = fileName;

    while (fs.existsSync(path.join(this.downloadDir, uniqueFileName))) {
      uniqueFileName = `${name}_${counter}${ext}`;
      counter++;
    }

    return uniqueFileName;
  }

  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  async verifyFile(filePath, expectedHash) {
    try {
      const actualHash = await this.calculateFileHash(filePath);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('文件验证失败:', error);
      return false;
    }
  }

  cancelTransfer(transferId) {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      this.activeTransfers.delete(transferId);
      this.emit('transfer-cancelled', { transferId: transferId });
      return true;
    }
    return false;
  }

  getTransferStatus(transferId) {
    const transfer = this.activeTransfers.get(transferId) || 
                    this.completedTransfers.get(transferId);
    
    if (!transfer) {
      return null;
    }

    return {
      id: transfer.id,
      fileName: transfer.fileName,
      fileSize: transfer.fileSize,
      status: transfer.status,
      progress: transfer.receivedBytes ? (transfer.receivedBytes / transfer.fileSize) * 100 : 0,
      startTime: transfer.startTime,
      endTime: transfer.endTime
    };
  }

  getAllTransfers() {
    const transfers = [];
    
    this.activeTransfers.forEach(transfer => {
      transfers.push(this.getTransferStatus(transfer.id));
    });
    
    this.completedTransfers.forEach(transfer => {
      transfers.push(this.getTransferStatus(transfer.id));
    });
    
    return transfers;
  }

  cleanupOldTransfers() {
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    const now = Date.now();
    
    this.completedTransfers.forEach((transfer, transferId) => {
      if (now - transfer.endTime > maxAge) {
        this.completedTransfers.delete(transferId);
      }
    });
  }
}

module.exports = FileTransfer;