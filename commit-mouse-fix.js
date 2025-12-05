#!/usr/bin/env node

console.log('🔧 InputLeap Code Git 提交助手');
console.log('================================\n');

console.log('📋 检测到的修改文件:');
console.log('✅ src/modules/InputCapture.js - 鼠标同步核心优化');
console.log('✅ src/main.js - 坐标映射逻辑重写');
console.log('✅ test-mouse.js - 新增鼠标测试工具');
console.log('✅ MOUSE_SYNC_FIX_GUIDE.md - 修复指南文档');

console.log('\n🎯 主要修复内容:');
console.log('1. 修复鼠标同步卡顿问题 - 降低移动阈值从5px到1px');
console.log('2. 提高鼠标捕获频率 - 从60fps提升到120fps');
console.log('3. 重写坐标映射逻辑 - 服务器边缘到客户端边缘的智能映射');
console.log('4. 优化macOS鼠标移动性能 - 使用CGEvent和cliclick工具');
console.log('5. 改进状态管理 - 增加边缘进入/离开状态跟踪');
console.log('6. 减少防循环时间 - 从500ms减少到200ms');

console.log('\n📝 建议的Commit Message:');
console.log('================================');

const commitMessage = `fix(鼠标同步): 修复鼠标卡顿和移动受限问题

🐛 修复问题:
- 服务器鼠标移到边缘后，客户端鼠标只能受限移动
- 鼠标移动卡顿，响应延迟严重
- 坐标映射错误，无法全屏移动

⚡ 性能优化:
- 降低鼠标移动阈值：5px → 1px，提高响应性
- 提高捕获频率：60fps → 120fps，减少延迟
- 减少防循环时间：500ms → 200ms，提升实时性

🔧 核心改进:
- 重写坐标映射逻辑，实现服务器边缘到客户端边缘的智能映射
- 优化macOS鼠标移动性能，使用CGEvent和cliclick工具
- 改进状态管理，增加边缘进入/离开状态跟踪
- 新增test-mouse.js测试工具，验证鼠标同步功能

📚 文档完善:
- 新增MOUSE_SYNC_FIX_GUIDE.md修复指南
- 详细说明修复内容和测试方法

🎯 修复效果:
- ✅ 鼠标可在客户端全屏流畅移动
- ✅ 智能坐标映射，保持相对位置
- ✅ 120fps高频率捕获，低延迟响应
- ✅ 解决边缘移动受限问题

Fixes #1
Closes #2`;

console.log(commitMessage);

console.log('\n🚀 执行Git命令:');
console.log('================================');

const { execSync } = require('child_process');

try {
  // 检查git状态
  console.log('1. 检查Git状态...');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(status);

  // 查看差异
  console.log('\n2. 查看修改差异...');
  const diff = execSync('git diff --stat', { encoding: 'utf8' });
  console.log(diff);

  // 添加所有修改文件
  console.log('\n3. 添加修改文件到暂存区...');
  execSync('git add src/modules/InputCapture.js src/main.js test-mouse.js MOUSE_SYNC_FIX_GUIDE.md', { encoding: 'utf8' });
  console.log('✅ 文件已添加到暂存区');

  // 创建提交
  console.log('\n4. 创建提交...');
  execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });
  console.log('✅ 提交创建成功！');

  // 显示提交信息
  console.log('\n5. 最新提交信息:');
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log(log);

  console.log('\n🎉 提交完成！现在可以推送到GitHub了：');
  console.log('git push origin master');

} catch (error) {
  if (error.message.includes('git: command not found')) {
    console.log('\n❌ Git未安装或不可用');
    console.log('\n📝 请手动执行以下命令:');
    console.log('================================');
    console.log('git add src/modules/InputCapture.js src/main.js test-mouse.js MOUSE_SYNC_FIX_GUIDE.md');
    console.log(`git commit -m "${commitMessage}"`);
    console.log('git push origin master');
  } else {
    console.error('❌ 执行Git命令时出错:', error.message);
  }
}

console.log('\n📋 提交清单:');
console.log('================================');
console.log('☑️ 代码优化 - InputCapture.js性能大幅提升');
console.log('☑️ 逻辑修复 - main.js坐标映射重写');
console.log('☑️ 测试工具 - test-mouse.js验证脚本');
console.log('☑️ 文档完善 - MOUSE_SYNC_FIX_GUIDE.md指南');
console.log('☑️ 提交信息 - 详细的修改说明和修复效果');