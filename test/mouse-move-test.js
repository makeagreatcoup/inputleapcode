#!/usr/bin/env node

// 测试鼠标移动功能
const InputCapture = require('../src/modules/InputCapture');

console.log('测试鼠标移动功能...');

const inputCapture = new InputCapture();

// 监听事件
inputCapture.on('mouseMove', (data) => {
  console.log('捕获到鼠标移动事件:', data);
});

inputCapture.on('error', (error) => {
  console.error('InputCapture错误:', error);
});

// 等待1秒后开始测试
setTimeout(async () => {
  try {
    console.log('开始测试鼠标移动到坐标 (800, 600)...');

    // 测试鼠标移动
    await inputCapture.moveMouseTo(800, 600);
    console.log('鼠标移动测试完成！');

    // 再移动到另一个位置
    setTimeout(async () => {
      try {
        console.log('测试移动到坐标 (1000, 500)...');
        await inputCapture.moveMouseTo(1000, 500);
        console.log('第二次鼠标移动测试完成！');

        process.exit(0);
      } catch (error) {
        console.error('第二次鼠标移动测试失败:', error);
        process.exit(1);
      }
    }, 2000);

  } catch (error) {
    console.error('鼠标移动测试失败:', error);
    process.exit(1);
  }
}, 1000);

console.log('鼠标移动测试准备中...');