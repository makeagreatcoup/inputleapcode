/**
 * 测试边缘跳转功能
 */

const InputCapture = require('../src/modules/InputCapture');

class MockInputCapture extends InputCapture {
  constructor() {
    super();
    // 重写屏幕边界为已知值，便于测试
    this.screenBounds = {
      left: 0,
      top: 0,
      width: 1920,
      height: 1080,
      right: 1920,
      bottom: 1080
    };

    // 事件记录
    this.events = [];
  }

  emit(eventName, data) {
    super.emit(eventName, data);
    this.events.push({ eventName, data, timestamp: Date.now() });
  }

  // 模拟鼠标位置
  simulateMousePos() {
    return this.testMousePos || { x: 960, y: 540 };
  }

  // 设置测试鼠标位置
  setMousePosition(x, y) {
    this.testMousePos = { x, y };
  }
}

async function testEdgeTransition() {
  console.log('🧪 开始边缘跳转功能测试...\n');

  const inputCapture = new MockInputCapture();

  // 启动鼠标捕获
  inputCapture.startMouseCapture();

  console.log('📍 初始状态检查:');
  console.log('- 屏幕边界:', inputCapture.screenBounds);
  console.log('- 边缘检测阈值:', inputCapture.edgeThreshold);
  console.log('- 初始边缘状态:', inputCapture.edgeState);

  // 测试1: 鼠标移动到左边缘
  console.log('\n🎯 测试1: 鼠标移动到左边缘');
  inputCapture.setMousePosition(2, 540); // 接近左边缘

  // 模拟鼠标移动事件触发
  inputCapture.handleMouseStateChange(
    { x: 2, y: 540 },
    inputCapture.getScreenEdge({ x: 2, y: 540 }),
    Date.now()
  );

  console.log('- 鼠标位置:', { x: 2, y: 540 });
  console.log('- 检测到的边缘:', inputCapture.getScreenEdge({ x: 2, y: 540 }));
  console.log('- 边缘状态:', inputCapture.edgeState);
  console.log('- 发送的事件数量:', inputCapture.events.length);

  // 测试2: 在边缘停留并触发跳转
  console.log('\n🚀 测试2: 在边缘停留并触发跳转');
  const currentTime = Date.now();
  inputCapture.edgeState.lastTransferTime = currentTime - 600; // 模拟600ms前的跳转

  inputCapture.handleMouseStateChange(
    { x: 1, y: 540 },
    'left',
    Date.now()
  );

  console.log('- 跳转后边缘状态:', inputCapture.edgeState);
  console.log('- 发送的事件数量:', inputCapture.events.length);

  // 显示最近的事件
  const recentEvents = inputCapture.events.slice(-3);
  console.log('- 最近的事件:');
  recentEvents.forEach((event, index) => {
    console.log(`  ${index + 1}. ${event.eventName}:`, {
      x: event.data.x,
      y: event.data.y,
      edge: event.data.edge,
      enterEdge: event.data.enterEdge,
      transferToRemote: event.data.transferToRemote
    });
  });

  // 测试3: 鼠标从边缘返回到屏幕中心
  console.log('\n🏠 测试3: 鼠标从边缘返回到屏幕中心');
  inputCapture.setMousePosition(960, 540);

  inputCapture.handleMouseStateChange(
    { x: 960, y: 540 },
    null, // 不在边缘
    Date.now()
  );

  console.log('- 返回后边缘状态:', inputCapture.edgeState);
  console.log('- 发送的事件数量:', inputCapture.events.length);

  // 测试4: 测试普通本地移动
  console.log('\n🖱️ 测试4: 测试普通本地移动');
  inputCapture.setMousePosition(500, 500);

  inputCapture.handleMouseStateChange(
    { x: 500, y: 500 },
    null, // 不在边缘
    Date.now()
  );

  console.log('- 普通移动后边缘状态:', inputCapture.edgeState);
  console.log('- 发送的事件数量:', inputCapture.events.length);

  // 测试5: 测试所有边缘
  console.log('\n🔄 测试5: 测试所有边缘');
  const edges = [
    { name: 'top', pos: { x: 960, y: 2 } },
    { name: 'right', pos: { x: 1918, y: 540 } },
    { name: 'bottom', pos: { x: 960, y: 1078 } },
    { name: 'left', pos: { x: 2, y: 540 } }
  ];

  edges.forEach(edge => {
    console.log(`\n  测试${edge.name}边缘:`);
    inputCapture.setMousePosition(edge.pos.x, edge.pos.y);
    const detectedEdge = inputCapture.getScreenEdge(edge.pos);
    console.log(`  - 位置: (${edge.pos.x}, ${edge.pos.y})`);
    console.log(`  - 检测到边缘: ${detectedEdge}`);
    console.log(`  - 是否正确: ${detectedEdge === edge.name ? '✅' : '❌'}`);
  });

  // 性能测试
  console.log('\n⚡ 性能测试:');
  const performanceTestStart = Date.now();
  const testCycles = 1000;

  for (let i = 0; i < testCycles; i++) {
    const x = Math.random() * 1920;
    const y = Math.random() * 1080;
    const edge = inputCapture.getScreenEdge({ x, y });

    inputCapture.handleMouseStateChange(
      { x, y },
      edge,
      Date.now()
    );
  }

  const performanceTestEnd = Date.now();
  const performanceTime = performanceTestEnd - performanceTestStart;
  const avgTimePerEvent = performanceTime / testCycles;

  console.log(`- 处理${testCycles}个事件耗时: ${performanceTime}ms`);
  console.log(`- 平均每个事件耗时: ${avgTimePerEvent.toFixed(3)}ms`);
  console.log(`- 处理能力: ${(1000/avgTimePerEvent).toFixed(0)} 事件/秒`);

  // 停止捕获
  inputCapture.stopMouseCapture();

  console.log('\n✅ 边缘跳转功能测试完成！');

  return {
    totalEvents: inputCapture.events.length,
    performance: {
      totalTime: performanceTime,
      avgTimePerEvent: avgTimePerEvent,
      eventsPerSecond: 1000 / avgTimePerEvent
    },
    finalState: inputCapture.edgeState
  };
}

// 运行测试
testEdgeTransition().then(results => {
  console.log('\n📊 测试结果总结:');
  console.log('- 总事件数:', results.totalEvents);
  console.log('- 性能:', results.performance);
  console.log('- 最终状态:', results.finalState);
}).catch(console.error);