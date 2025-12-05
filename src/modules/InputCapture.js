const EventEmitter = require('events');
const os = require('os');

class InputCapture extends EventEmitter {
  constructor() {
    super();
    this.isCapturing = false;
    this.screenBounds = this.getScreenBounds();
    this.platform = os.platform();
    
    // 鼠标移动阈值，避免过于频繁的事件
    this.mouseThreshold = 1; // 降低到1像素，提高响应性
    this.lastMousePos = { x: 0, y: 0 };

    // 边缘检测阈值
    this.edgeThreshold = 5;
    
    // 防止循环移动的标志
    this.isRemoteMoving = false;
    this.remoteMoveTimeout = null;
    
    this.initializeCapture();
  }

  initializeCapture() {
    if (this.platform === 'win32') {
      this.initializeWindowsCapture();
    } else if (this.platform === 'darwin') {
      this.initializeMacCapture();
    }
  }

  initializeWindowsCapture() {
    try {
      // Windows平台输入捕获初始化（不自动启动）
      this.startKeyboardCapture();
      console.log('Windows输入捕获初始化完成');
    } catch (error) {
      console.error('Windows输入捕获初始化失败:', error);
    }
  }

  initializeMacCapture() {
    try {
      // macOS平台需要特殊权限
      this.requestMacPermissions();
      this.startKeyboardCapture();
      console.log('macOS输入捕获初始化完成');
    } catch (error) {
      console.error('macOS输入捕获初始化失败:', error);
    }
  }

  async requestMacPermissions() {
    // macOS需要辅助功能权限
    console.log('检查macOS辅助功能权限...');
    try {
      console.log('macOS辅助功能权限检查跳过');
    } catch (error) {
      console.warn('macOS辅助功能权限检查失败');
    }
  }

  startMouseCapture() {
    this.isCapturing = true;
    this.isAtEdge = false; // 新增：跟踪是否在边缘状态
    this.lastEdge = null;

    // 使用定时器检查鼠标位置
    this.mouseInterval = setInterval(() => {
      if (!this.isCapturing) return;

      try {
        // 获取真实鼠标位置
        const mousePos = this.simulateMousePos();

        // 检查鼠标是否移动了足够的距离
        const deltaX = Math.abs(mousePos.x - this.lastMousePos.x);
        const deltaY = Math.abs(mousePos.y - this.lastMousePos.y);

        if (deltaX >= this.mouseThreshold || deltaY >= this.mouseThreshold) {
          this.lastMousePos = mousePos;

          // 检查鼠标是否在屏幕边缘
          const edge = this.getScreenEdge(mousePos);

          // 状态变化处理
          if (edge && !this.isRemoteMoving) {
            if (!this.isAtEdge || edge !== this.lastEdge) {
              console.log(`🎯 鼠标到达${edge}边缘，位置: (${mousePos.x}, ${mousePos.y})`);
              this.isAtEdge = true;
              this.lastEdge = edge;

              this.emit('mouse-move', {
                x: mousePos.x,
                y: mousePos.y,
                edge: edge,
                screenBounds: this.screenBounds,
                enterEdge: true
              });
            }
          } else if (!edge && this.isAtEdge) {
            // 鼠标离开边缘
            console.log(`🚪 鼠标离开边缘，位置: (${mousePos.x}, ${mousePos.y})`);
            this.isAtEdge = false;
            this.lastEdge = null;

            this.emit('mouse-move', {
              x: mousePos.x,
              y: mousePos.y,
              edge: null,
              screenBounds: this.screenBounds,
              leaveEdge: true
            });
          } else if (!edge && !this.isRemoteMoving) {
            // 普通鼠标移动（非边缘，非远程控制）
            this.emit('mouse-move', {
              x: mousePos.x,
              y: mousePos.y,
              edge: null,
              screenBounds: this.screenBounds,
              normalMove: true
            });
          }
        }
      } catch (error) {
        console.error('鼠标捕获错误:', error);
      }
    }, 8); // 提高到120fps，减少延迟
  }

  stopMouseCapture() {
    this.isCapturing = false;
    if (this.mouseInterval) {
      clearInterval(this.mouseInterval);
      this.mouseInterval = null;
    }
    console.log('鼠标捕获已停止');
  }

  simulateMousePos() {
    // 获取真实鼠标位置
    try {
      const { execSync } = require('child_process');
      
      if (this.platform === 'win32') {
        // Windows使用PowerShell获取鼠标位置，修复中文乱码问题
        const { execSync } = require('child_process');
        const result = execSync('powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $pos = [System.Windows.Forms.Cursor]::Position; Write-Host X=$($pos.X) Y=$($pos.Y)"', { 
          encoding: 'utf8',
          shell: 'cmd.exe',
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            LANG: 'zh_CN.UTF-8'
          }
        });
        const match = result.match(/X=(\d+)\s+Y=(\d+)/);
        if (match) {
          return {
            x: parseInt(match[1]),
            y: parseInt(match[2])
          };
        }

      } else if (this.platform === 'darwin') {
        // macOS使用AppleScript获取鼠标位置
        try {
          const result = execSync('osascript -e \'tell application "System Events" to get the position of the mouse\'', { encoding: 'utf8' });
          const match = result.match(/(\d+),\s*(\d+)/);
          if (match) {
            return {
              x: parseInt(match[1]),
              y: parseInt(match[2])
            };
          }
        } catch (error) {
          console.error('AppleScript获取鼠标位置失败:', error);
        }
        
        // 备用方案：使用Python获取鼠标位置
        try {
          const result = execSync('python3 -c "from Quartz import CGEventGetLocation; from AppKit import NSEvent; loc = CGEventGetLocation(None); print(f\'{int(loc.x)},{int(loc.y)}\')"', { encoding: 'utf8' });
          const match = result.match(/(\d+),(\d+)/);
          if (match) {
            return {
              x: parseInt(match[1]),
              y: parseInt(match[2])
            };
          }
        } catch (pythonError) {
          console.error('Python获取鼠标位置失败:', pythonError);
        }
      }
    } catch (error) {
      console.error('获取鼠标位置失败:', error);
    }
    
    // 如果获取失败，返回最后已知位置或随机位置
    return this.lastMousePos || {
      x: Math.floor(this.screenBounds.width / 2),
      y: Math.floor(this.screenBounds.height / 2)
    };
  }

  startKeyboardCapture() {
    // 键盘事件捕获（简化版本）
    try {
      console.log('键盘捕获已启动');
    } catch (error) {
      console.error('键盘捕获初始化失败:', error);
    }
  }

  getScreenBounds() {
    try {
      if (this.platform === 'darwin') {
        // macOS获取真实屏幕尺寸
        const { execSync } = require('child_process');
        const result = execSync('osascript -e \'tell application "Finder" to get the bounds of the window of the desktop\'', { encoding: 'utf8' });
        const match = result.match(/(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const left = parseInt(match[1]);
          const top = parseInt(match[2]);
          const right = parseInt(match[3]);
          const bottom = parseInt(match[4]);
          return {
            width: right - left,
            height: bottom - top,
            left: left,
            top: top,
            right: right,
            bottom: bottom
          };
        }
      } else if (this.platform === 'win32') {
        // Windows获取真实屏幕尺寸
        const { execSync } = require('child_process');
        try {
          // 尝试获取虚拟屏幕（多显示器支持）
          const result = execSync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; Write-Host X=$($b.X) Y=$($b.Y) W=$($b.Width) H=$($b.Height)"', { encoding: 'utf8', shell: 'cmd.exe' });
          const match = result.match(/X=(\-?\d+)\s+Y=(\-?\d+)\s+W=(\d+)\s+H=(\d+)/);
          if (match) {
            const left = parseInt(match[1]);
            const top = parseInt(match[2]);
            const width = parseInt(match[3]);
            const height = parseInt(match[4]);
            console.log(`[InputCapture] Windows虚拟屏幕边界: Left=${left}, Top=${top}, Width=${width}, Height=${height}`);
            return {
              width: width,
              height: height,
              left: left,
              top: top,
              right: left + width,
              bottom: top + height
            };
          }
        } catch (e) {
          console.warn('[InputCapture] 获取虚拟屏幕失败，尝试主屏幕:', e);
        }

        // 备用：获取主屏幕
        try {
          const result = execSync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Host X=$($b.X) Y=$($b.Y) W=$($b.Width) H=$($b.Height)"', { encoding: 'utf8', shell: 'cmd.exe' });
          const match = result.match(/X=(\-?\d+)\s+Y=(\-?\d+)\s+W=(\d+)\s+H=(\d+)/);
          if (match) {
            const left = parseInt(match[1]);
            const top = parseInt(match[2]);
            const width = parseInt(match[3]);
            const height = parseInt(match[4]);
            console.log(`[InputCapture] Windows主屏幕边界: Left=${left}, Top=${top}, Width=${width}, Height=${height}`);
            return {
              width: width,
              height: height,
              left: left,
              top: top,
              right: left + width,
              bottom: top + height
            };
          }
        } catch (e) {
          console.error('[InputCapture] 获取主屏幕失败:', e);
        }
      }
      
      // 默认屏幕尺寸
      return {
        width: 1920,
        height: 1080,
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080
      };
    } catch (error) {
      console.error('获取屏幕边界失败:', error);
      return {
        width: 1920,
        height: 1080,
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080
      };
    }
  }

  getScreenEdge(mousePos) {
    const threshold = this.edgeThreshold; // 使用实例变量
    const bounds = this.screenBounds;

    // 左边缘
    if (mousePos.x <= bounds.left + threshold) {
      return 'left';
    }

    // 右边缘
    if (mousePos.x >= bounds.right - threshold) {
      return 'right';
    }

    // 上边缘
    if (mousePos.y <= bounds.top + threshold) {
      return 'top';
    }

    // 下边缘
    if (mousePos.y >= bounds.bottom - threshold) {
      return 'bottom';
    }

    return null;
  }

  // 模拟鼠标移动（接收远程事件时使用）
  simulateMouseMove(data) {
    try {
      console.log(`模拟鼠标移动到: ${data.x}, ${data.y}`);
      // 实际应用中应使用robotjs
    } catch (error) {
      console.error('鼠标移动模拟失败:', error);
    }
  }

  // 模拟鼠标点击
  simulateMouseClick(data) {
    try {
      const button = data.button || 'left';
      const double = data.double || false;
      console.log(`模拟鼠标${double ? '双' : '单'}击: ${button}`);
      // 实际应用中应使用robotjs
    } catch (error) {
      console.error('鼠标点击模拟失败:', error);
    }
  }

  // 移动鼠标到指定位置
  moveMouseTo(x, y) {
    return new Promise((resolve, reject) => {
      try {
        // 设置远程移动标志，防止循环
        this.isRemoteMoving = true;

        // 清除之前的超时
        if (this.remoteMoveTimeout) {
          clearTimeout(this.remoteMoveTimeout);
        }

        // 200ms后清除远程移动标志（减少防循环时间）
        this.remoteMoveTimeout = setTimeout(() => {
          this.isRemoteMoving = false;
        }, 200);

        // 坐标边界检查
        if (x < 0 || y < 0 || x > this.screenBounds.width || y > this.screenBounds.height) {
          console.warn(`[InputCapture] 坐标超出屏幕范围: (${x}, ${y})，进行裁剪`);
          x = Math.max(0, Math.min(x, this.screenBounds.width));
          y = Math.max(0, Math.min(y, this.screenBounds.height));
        }

        console.log(`[InputCapture] 移动鼠标到位置: (${x}, ${y})`);

        if (this.platform === 'win32') {
          // Windows使用PowerShell移动鼠标
          const { execSync } = require('child_process');
          const psCommand = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`;

          execSync(psCommand, {
            encoding: 'utf8',
            shell: 'cmd.exe',
            timeout: 1000
          });
          console.log(`[InputCapture] Windows鼠标移动完成: (${x}, ${y})`);
          resolve();

        } else if (this.platform === 'darwin') {
          const { execSync } = require('child_process');
          let moved = false;

          // 优先级1: 使用CGEvent直接移动鼠标（最快）
          try {
            const command = `python3 -c "
from Quartz.CoreGraphics import CGEventCreateMouseEvent, CGEventPost, kCGEventMouseMoved, kCGHIDEventTap, kCGMouseButtonLeft
from Quartz.CoreGraphics import CGPoint
try:
    event = CGEventCreateMouseEvent(None, kCGEventMouseMoved, CGPoint(${x}, ${y}), kCGMouseButtonLeft)
    CGEventPost(kCGHIDEventTap, event)
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
"`;

            const result = execSync(command, {
              encoding: 'utf8',
              timeout: 500
            }).trim();

            if (result === 'SUCCESS') {
              moved = true;
              console.log(`[InputCapture] CGEvent移动成功: (${x}, ${y})`);
            }
          } catch (error) {
            console.warn(`[InputCapture] CGEvent移动失败: ${error.message}`);
          }

          // 优先级2: 使用cliclick工具（如果安装）
          if (!moved) {
            try {
              // cliclick的m:命令是纯移动，不点击
              execSync(`cliclick m:${x},${y}`, {
                encoding: 'utf8',
                timeout: 500
              });
              moved = true;
              console.log(`[InputCapture] cliclick移动成功: (${x}, ${y})`);
            } catch (error) {
              console.warn(`[InputCapture] cliclick移动失败: ${error.message}`);
            }
          }

          // 优先级3: 使用自动化脚本（备用）
          if (!moved) {
            try {
              const script = `
tell application "System Events"
    tell process "System Events"
        set frontmost to true
        try
            -- 使用UI automation来移动鼠标
            set thePosition to {${x}, ${y}}
            click at thePosition
            print("SUCCESS")
        on error errMsg
            print("ERROR: " & errMsg)
        end try
    end tell
end tell`;

              const result = execSync(`osascript -e '${script}'`, {
                encoding: 'utf8',
                timeout: 1000
              }).trim();

              if (result.includes('SUCCESS')) {
                moved = true;
                console.log(`[InputCapture] AppleScript移动成功: (${x}, ${y})`);
              }
            } catch (error) {
              console.warn(`[InputCapture] AppleScript移动失败: ${error.message}`);
            }
          }

          if (moved) {
            resolve();
          } else {
            reject(new Error('macOS所有鼠标移动方法都失败'));
          }
        } else {
          // 其他平台暂不支持
          resolve();
        }
      } catch (error) {
        console.error('[InputCapture] 移动鼠标失败:', error);
        reject(error);
      }
    });
  }

  // 模拟键盘按键
  simulateKeyPress(data) {
    try {
      const key = data.key;
      const modifier = data.modifier;
      console.log(`模拟键盘按键: ${modifier ? modifier + '+' : ''}${key}`);
      // 实际应用中应使用robotjs
    } catch (error) {
      console.error('键盘按键模拟失败:', error);
    }
  }

  // 处理鼠标滚轮
  simulateMouseScroll(data) {
    try {
      console.log(`模拟鼠标滚轮: x=${data.x || 0}, y=${data.y || 0}`);
      // 实际应用中应使用robotjs
    } catch (error) {
      console.error('鼠标滚轮模拟失败:', error);
    }
  }

  // 处理拖拽操作
  simulateMouseDrag(data) {
    try {
      console.log(`模拟鼠标拖拽到: ${data.x}, ${data.y}`);
      // 实际应用中应使用robotjs
    } catch (error) {
      console.error('鼠标拖拽模拟失败:', error);
    }
  }

  // 更新屏幕边界（当屏幕配置改变时）
  updateScreenBounds() {
    this.screenBounds = this.getScreenBounds();
  }

  // 停止捕获
  stopCapture() {
    this.isCapturing = false;
    
    if (this.mouseInterval) {
      clearInterval(this.mouseInterval);
      this.mouseInterval = null;
    }
    
    // 停止键盘捕获
    // 这里需要根据实际实现添加清理代码
  }

  // 获取当前鼠标位置
  getCurrentMousePosition() {
    try {
      return this.simulateMousePos();
    } catch (error) {
      console.error('获取鼠标位置失败:', error);
      return { x: 0, y: 0 };
    }
  }

  // 检查点是否在屏幕内
  isPointInScreen(point) {
    return point.x >= this.screenBounds.left &&
           point.x <= this.screenBounds.right &&
           point.y >= this.screenBounds.top &&
           point.y <= this.screenBounds.bottom;
  }

  // 将远程坐标转换到本地屏幕坐标
  translateCoordinates(remotePoint, remoteBounds) {
    // 简单的比例转换，可以根据需要实现更复杂的布局逻辑
    const scaleX = this.screenBounds.width / remoteBounds.width;
    const scaleY = this.screenBounds.height / remoteBounds.height;
    
    return {
      x: this.screenBounds.left + (remotePoint.x - remoteBounds.left) * scaleX,
      y: this.screenBounds.top + (remotePoint.y - remoteBounds.top) * scaleY
    };
  }
}

module.exports = InputCapture;
