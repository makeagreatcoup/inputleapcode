const builder = require('electron-builder');
const path = require('path');

async function build() {
  try {
    // 构建Windows版本
    console.log('开始构建Windows版本...');
    await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(),
      config: {
        appId: 'com.inputleap.code',
        productName: 'InputLeap Code',
        directories: {
          output: 'dist'
        },
        files: [
          'src/**/*',
          'node_modules/**/*',
          'package.json'
        ],
        win: {
          target: [
            {
              target: 'nsis',
              'arch': ['x64']
            }
          ],
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
    
    // 构建Mac版本
    console.log('开始构建Mac版本...');
    await builder.build({
      targets: builder.Platform.MAC.createTarget(),
      config: {
        appId: 'com.inputleap.code',
        productName: 'InputLeap Code',
        directories: {
          output: 'dist'
        },
        files: [
          'src/**/*',
          'node_modules/**/*',
          'package.json'
        ],
        mac: {
          category: 'public.app-category.utilities',
          target: [
            {
              target: 'dmg',
              'arch': ['x64']
            }
          ]
        }
      }
    });
    console.log('Mac版本构建完成！');
    
  } catch (error) {
    console.error('构建过程中出现错误:', error);
  }
}

build();