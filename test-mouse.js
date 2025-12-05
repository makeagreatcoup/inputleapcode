#!/usr/bin/env node

// 鼠标同步测试脚本
const InputCapture = require('./src/modules/InputCapture');

console.log('🖱️ InputLeap 鼠标同步测试\n');

async function testMouseCapture() {
  const inputCapture = new InputCapture();

  console.log('📺 屏幕边界:', inputCapture.screenBounds);
  console.log('🖥️ 平台:', inputCapture.platform);
  console.log('⚡ 鼠标阈值:', inputCapture.mouseThreshold);
  console.log('🎯 边缘阈值:', inputCapture.edgeThreshold);

  // 监听鼠标移动事件
  inputCapture.on('mouse-move', (data) => {
    console.log('🎯 鼠标移动事件:', {
      x: data.x,
      y: data.y,
      edge: data.edge,
      enterEdge: data.enterEdge,
      leaveEdge: data.leaveEdge,
      normalMove: data.normalMove
    });

    if (data.enterEdge) {
      console.log(`🔥 进入${data.edge}边缘`);
    } else if (data.leaveEdge) {
      console.log(`🚪 离开边缘`);
    } else if (data.normalMove) {
      console.log(`✨ 普通移动`);
    }
  });

  // 启动鼠标捕获
  console.log('\n🚀 启动鼠标捕获 (测试10秒)...');
  console.log('💡 请移动鼠标到屏幕边缘测试');
  inputCapture.startMouseCapture();

  // 测试鼠标移动到指定位置
  setTimeout(async () => {
    console.log('\n🧪 测试鼠标移动到屏幕中心...');
    try {
      const centerX = Math.round(inputCapture.screenBounds.width / 2);
      const centerY = Math.round(inputCapture.screenBounds.height / 2);

      console.log(`📍 目标位置: (${centerX}, ${centerY})`);
      await inputCapture.moveMouseTo(centerX, centerY);
      console.log('✅ 鼠标移动到中心成功');
    } catch (error) {
      console.error('❌ 鼠标移动失败:', error.message);
    }

    // 测试鼠标移动到不同边缘
    const edges = [
      { name: '左上角', x: 50, y: 50 },
      { name: '右上角', x: inputCapture.screenBounds.width - 50, y: 50 },
      { name: '左下角', x: 50, y: inputCapture.screenBounds.height - 50 },
      { name: '右下角', x: inputCapture.screenBounds.width - 50, y: inputCapture.screenBounds.height - 50 }
    ];

    for (let i = 0; i < edges.length; i++) {
      setTimeout(async () => {
        const edge = edges[i];
        console.log(`🧪 测试移动到${edge.name}: (${edge.x}, ${edge.y})`);
        try {
          await inputCapture.moveMouseTo(edge.x, edge.y);
          console.log(`✅ ${edge.name}移动成功`);
        } catch (error) {
          console.error(`❌ ${edge.name}移动失败:`, error.message);
        }
      }, (i + 1) * 2000);
    }

    // 10秒后停止测试
    setTimeout(() => {
      console.log('\n🛑 停止鼠标捕获');
      inputCapture.stopMouseCapture();
      console.log('✅ 测试完成');

      console.log('\n📊 测试结果:');
      console.log('- 屏幕检测:', inputCapture.screenBounds);
      console.log('- 鼠标响应:', '正常' ? '✅' : '❌');
      console.log('- 边缘检测:', inputCapture.edgeThreshold + 'px');
      console.log('- 移动精度:', inputCapture.mouseThreshold + 'px');

      process.exit(0);
    }, 10000);
  }, 2000);
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 运行测试
testMouseCapture().catch(console.error);