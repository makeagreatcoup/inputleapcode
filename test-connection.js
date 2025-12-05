#!/usr/bin/env node

// 连接功能测试脚本
const net = require('net');
const tls = require('tls');

console.log('🔧 InputLeap 连接测试脚本\n');

// 测试配置
const testConfigs = [
  { host: '127.0.0.1', port: 24800, useTLS: false, name: '本地TCP连接' },
  { host: '192.168.0.104', port: 24800, useTLS: true, name: '目标服务器TLS连接' },
  { host: '192.168.0.104', port: 24800, useTLS: false, name: '目标服务器TCP连接' },
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`🔗 测试连接: ${config.name} (${config.host}:${config.port})`);

    const attemptConnection = (useTLS, attemptName) => {
      return new Promise((attemptResolve) => {
        const connectFunction = useTLS ? tls.connect : net.connect;

        const connectionTimeout = setTimeout(() => {
          attemptResolve({ success: false, error: '连接超时', attempt: attemptName });
        }, 5000);

        const client = connectFunction(config.port, config.host, {
          rejectUnauthorized: false,
          timeout: 5000,
          secureProtocol: 'TLS_method',
          minVersion: 'TLSv1.2'
        }, () => {
          clearTimeout(connectionTimeout);
          console.log(`✅ ${config.name} (${attemptName}) - 连接成功`);

          // 发送测试消息
          const testMessage = JSON.stringify({
            type: 'test',
            timestamp: Date.now(),
            message: `Hello from test script (${attemptName})`
          }) + '\n';

          client.write(testMessage);

          client.setTimeout(2000, () => {
            client.end();
            attemptResolve({ success: true, attempt: attemptName });
          });
        });

        client.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.log(`❌ ${config.name} (${attemptName}) - 连接失败: ${error.message}`);

          // 检查是否是SSL/TLS错误
          const isSSLError = error.message.includes('SSL') ||
                            error.message.includes('TLS') ||
                            error.message.includes('WRONG_VERSION_NUMBER');

          attemptResolve({
            success: false,
            error: error.message,
            attempt: attemptName,
            isSSLError: isSSLError
          });
        });

        client.on('timeout', () => {
          clearTimeout(connectionTimeout);
          console.log(`⏰ ${config.name} (${attemptName}) - 连接超时`);
          client.destroy();
          attemptResolve({ success: false, error: '连接超时', attempt: attemptName });
        });

        client.on('data', (data) => {
          console.log(`📥 ${config.name} (${attemptName}) - 收到响应: ${data.toString().trim()}`);
        });
      });
    };

    // 如果配置要求TLS，先尝试TLS，失败后尝试TCP
    if (config.useTLS) {
      attemptConnection(true, 'TLS').then((tlsResult) => {
        if (tlsResult.success) {
          resolve({ success: true, config, method: 'TLS' });
        } else if (tlsResult.isSSLError) {
          console.log(`🔄 TLS连接失败，尝试TCP回退连接`);
          return attemptConnection(false, 'TCP回退').then((tcpResult) => {
            if (tcpResult.success) {
              resolve({ success: true, config, method: 'TCP回退', tlsError: tlsResult.error });
            } else {
              resolve({
                success: false,
                error: `TLS和TCP都失败。TLS错误: ${tlsResult.error}, TCP错误: ${tcpResult.error}`,
                config
              });
            }
          });
        } else {
          resolve({ success: false, error: tlsResult.error, config });
        }
      });
    } else {
      // 直接尝试TCP
      attemptConnection(false, 'TCP').then((result) => {
        resolve({ success: result.success, error: result.error, config, method: 'TCP' });
      });
    }
  });
}

async function scanPorts(host) {
  console.log(`🔍 扫描主机 ${host} 的常用端口...`);

  const commonPorts = [24800, 8080, 3000, 22, 80, 443];
  const results = [];

  for (const port of commonPorts) {
    try {
      await testConnection({ host, port, useTLS: false, name: `端口${port}` });
    } catch (error) {
      // 忽略扫描错误
    }
  }
}

async function main() {
  console.log('开始网络连接测试...\n');

  // 测试基本连接
  for (const config of testConfigs) {
    const result = await testConnection(config);

    if (result.success) {
      console.log(`💡 提示: ${config.name} 可用，可以尝试在应用中连接到 ${config.host}:${config.port}`);
    }
  }

  // 扫描本地端口
  await scanPorts('127.0.0.1');

  console.log('\n🔧 调试建议:');
  console.log('1. 如果本地连接失败，请确保有服务器在运行 (npm start)');
  console.log('2. 如果有服务器运行但连接失败，检查端口是否正确');
  console.log('3. 如果端口被占用，停止其他使用端口24800的应用');
  console.log('4. 检查防火墙设置，确保允许本地连接');
  console.log('5. 在应用中打开开发者工具 (F12) 查看控制台日志');

  console.log('\n✅ 测试完成');
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 运行测试
main().catch(console.error);