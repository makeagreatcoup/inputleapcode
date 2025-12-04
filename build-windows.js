const builder = require('electron-builder');
const path = require('path');

async function build() {
  try {
    // 先构建Windows版本
    console.log('开始构建Windows版本...');
    await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64),
      config: {
        appId: 'com.inputleap.code',
        productName: 'InputLeap Code',
        electronDownload: {
          cache: path.join(__dirname, 'electron-cache')
        },
        directories: {
          output: 'dist'
        },
        files: [
          'src/**/*',
          'node_modules/**/*',
          'package.json'
        ],
        win: {
          target: 'nsis',
          icon: 'assets/icon.ico'
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: 'InputLeap Code'
        }
      }
    });
    console.log('Windows版本构建完成！');
    
  } catch (error) {
    console.error('构建过程中出现错误:', error);
  }
}

build();