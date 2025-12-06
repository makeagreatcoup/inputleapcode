/**
 * 测试IP缓存功能
 */

// 模拟localStorage环境
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        data: {},
        setItem: function(key, value) { this.data[key] = value; },
        getItem: function(key) { return this.data[key] || null; },
        removeItem: function(key) { delete this.data[key]; }
    };
}

// 导入UI相关的函数（模拟）
class MockUI {
    constructor() {
        this.serverHostEl = { value: '' };
        this.clientPortEl = { value: '24800' };
        this.clientTlsEl = { checked: true };
        this.serverHistoryEl = {
            innerHTML: '',
            value: ''
        };
        this.clearHistoryBtnEl = { style: { display: 'none' } };
    }

    // IP连接历史相关功能
    saveConnectionToCache(host, port, useTLS) {
        try {
            // 获取现有历史记录
            const history = JSON.parse(localStorage.getItem('inputleap-connection-history') || '[]');

            // 创建新的连接记录
            const newConnection = {
                host: host,
                port: port,
                useTLS: useTLS,
                lastConnected: new Date().toISOString()
            };

            // 移除重复记录（相同主机和端口）
            const filteredHistory = history.filter(conn =>
                !(conn.host === host && conn.port === port)
            );

            // 添加新记录到开头
            filteredHistory.unshift(newConnection);

            // 最多保存10条记录
            const limitedHistory = filteredHistory.slice(0, 10);

            // 保存到localStorage
            localStorage.setItem('inputleap-connection-history', JSON.stringify(limitedHistory));

            console.log('✅ IP连接历史已保存:', { host, port, useTLS });

            // 更新下拉框显示
            this.updateHistoryDropdown();

        } catch (error) {
            console.error('❌ 保存IP连接历史失败:', error);
        }
    }

    loadConnectionHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('inputleap-connection-history') || '[]');

            // 更新下拉框
            this.updateHistoryDropdown(history);

            // 如果有历史记录，默认选择最近的一次连接
            if (history.length > 0) {
                const latestConnection = history[0];
                this.serverHostEl.value = latestConnection.host;
                this.clientPortEl.value = latestConnection.port;
                this.clientTlsEl.checked = latestConnection.useTLS;
            }

            console.log('✅ 已加载IP连接历史:', history.length, '条记录');

        } catch (error) {
            console.error('❌ 加载IP连接历史失败:', error);
        }
    }

    updateHistoryDropdown(history = null) {
        try {
            if (!history) {
                history = JSON.parse(localStorage.getItem('inputleap-connection-history') || '[]');
            }

            // 清空现有选项（保留默认选项）
            this.serverHistoryEl.innerHTML = '<option value="">选择历史连接...</option>';

            // 添加历史记录选项
            history.forEach((conn, index) => {
                const option = {
                    value: `${conn.host}:${conn.port}:${conn.useTLS ? 'true' : 'false'}`
                };

                const timeAgo = this.getTimeAgo(new Date(conn.lastConnected));
                const tlsText = conn.useTLS ? '🔒' : '🔓';
                option.textContent = `${tlsText} ${conn.host}:${conn.port} (${timeAgo})`;

                console.log(`📝 历史记录选项 ${index + 1}:`, option.textContent);
            });

            // 显示或隐藏清除历史按钮
            this.clearHistoryBtnEl.style.display = history.length > 0 ? 'block' : 'none';

        } catch (error) {
            console.error('❌ 更新历史下拉框失败:', error);
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return '刚刚';
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + '分钟前';
        if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + '小时前';
        if (diffInSeconds < 2592000) return Math.floor(diffInSeconds / 86400) + '天前';

        return date.toLocaleDateString();
    }
}

// 测试功能
async function testIPCache() {
    console.log('🧪 开始测试IP缓存功能...\n');

    const ui = new MockUI();

    // 测试1: 保存第一次连接
    console.log('📍 测试1: 保存第一次连接');
    ui.saveConnectionToCache('192.168.1.100', 24800, true);

    // 测试2: 保存第二次连接
    console.log('\n📍 测试2: 保存第二次连接');
    ui.saveConnectionToCache('192.168.1.200', 24801, false);

    // 测试3: 保存重复连接（应该去重）
    console.log('\n📍 测试3: 保存重复连接（应该去重）');
    ui.saveConnectionToCache('192.168.1.100', 24800, true);

    // 测试4: 加载历史记录
    console.log('\n📍 测试4: 加载历史记录');
    ui.loadConnectionHistory();
    console.log('当前服务器地址:', ui.serverHostEl.value);
    console.log('当前端口:', ui.clientPortEl.value);
    console.log('当前TLS设置:', ui.clientTlsEl.checked);

    // 测试5: 显示缓存内容
    console.log('\n📍 测试5: 显示缓存内容');
    const cache = localStorage.getItem('inputleap-connection-history');
    if (cache) {
        const parsedCache = JSON.parse(cache);
        console.log('缓存中的连接记录:');
        parsedCache.forEach((conn, index) => {
            console.log(`  ${index + 1}. ${conn.host}:${conn.port} (TLS: ${conn.useTLS}, 连接时间: ${new Date(conn.lastConnected).toLocaleString()})`);
        });
    }

    console.log('\n✅ IP缓存功能测试完成！');
}

// 运行测试
testIPCache().catch(console.error);