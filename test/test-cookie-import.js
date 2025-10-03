const fs = require('fs');
const path = require('path');

// 模拟 ModalImportCookie.vue 的 cookie 处理逻辑
function simulateModalImportCookie() {
    console.log('===== ModalImportCookie 组件逻辑模拟 =====\n');
    
    try {
        // 读取生成的格式化数据
        const formatPath = path.join(__dirname, 'login-success-with-format.json');
        const formatData = JSON.parse(fs.readFileSync(formatPath, 'utf8'));
        
        // 获取 YesPlayMusic 格式的 cookie 字符串
        const ypmCookieString = formatData.ypmCookieString;
        
        console.log('1. 输入的 Cookie 字符串（YesPlayMusic 格式）:');
        console.log('   长度:', ypmCookieString.length);
        console.log('   开头:', ypmCookieString.substring(0, 80) + '...');
        
        // 模拟 ModalImportCookie.vue 中的解析逻辑
        console.log('\n2. 解析过程（模拟 ModalImportCookie.vue）:');
        console.log('   分割符: ";;"');
        
        // 按照 ;; 分割
        const cookies = ypmCookieString.split(';;');
        console.log('   分割后得到', cookies.length, '个 cookie');
        
        // 解析每个 cookie
        const parsedCookies = {};
        cookies.forEach((cookie, index) => {
            console.log(`\n   处理第 ${index + 1} 个 cookie:`);
            console.log('   原始:', cookie.substring(0, 50) + '...');
            
            // 解析 cookie 的 key=value 部分（忽略 path、domain 等属性）
            const cookieKeyValue = cookie.split(';')[0].split('=');
            const key = cookieKeyValue[0].trim();
            const value = cookieKeyValue[1];
            
            if (key && value) {
                parsedCookies[key] = value;
                console.log(`   解析得到: ${key} = ${value.substring(0, 30)}...`);
            } else {
                console.log('   ❌ 解析失败');
            }
        });
        
        console.log('\n3. 解析结果:');
        Object.entries(parsedCookies).forEach(([key, value]) => {
            console.log(`   ${key}: ${value ? '✅ 存在' : '❌ 缺失'}`);
        });
        
        // 验证关键 cookies 是否存在
        const requiredCookies = ['MUSIC_U', '__csrf', 'MUSIC_A_T', 'MUSIC_R_T'];
        console.log('\n4. 关键 Cookie 验证:');
        const missingCookies = [];
        
        requiredCookies.forEach(cookieName => {
            if (parsedCookies[cookieName]) {
                console.log(`   ✅ ${cookieName}: 存在`);
            } else {
                console.log(`   ❌ ${cookieName}: 缺失`);
                missingCookies.push(cookieName);
            }
        });
        
        // 模拟 setCookies 函数的处理
        console.log('\n5. 模拟 setCookies 处理:');
        if (missingCookies.length === 0) {
            console.log('   ✅ 所有关键 cookies 都存在，可以进行设置');
            
            // 构建用于设置的 cookie 数组（模拟 ModalImportCookie.vue 的逻辑）
            const cookieArray = [];
            Object.entries(parsedCookies).forEach(([key, value]) => {
                // 为每个 cookie 添加基本属性
                cookieArray.push(`${key}=${value}; path=/; domain=.music.163.com`);
            });
            
            const finalCookieString = cookieArray.join(';;');
            console.log('   设置用的 cookie 字符串长度:', finalCookieString.length);
            
            // 验证时间戳
            if (parsedCookies.MUSIC_R_T) {
                const timestamp = parseInt(parsedCookies.MUSIC_R_T);
                const date = new Date(timestamp);
                const isExpired = date < new Date();
                console.log(`   ⚠️  MUSIC_R_T 时间戳: ${date.toISOString()} ${isExpired ? '(已过期)' : '(有效)'}`);
            }
            
            return {
                success: true,
                cookies: parsedCookies,
                warning: missingCookies.length === 0 ? null : '部分 cookies 缺失'
            };
        } else {
            console.log(`   ❌ 缺失关键 cookies: ${missingCookies.join(', ')}`);
            return {
                success: false,
                error: `缺失关键 cookies: ${missingCookies.join(', ')}`
            };
        }
        
    } catch (error) {
        console.error('❌ 模拟失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 运行模拟
if (require.main === module) {
    const result = simulateModalImportCookie();
    
    console.log('\n===== 总结 =====');
    if (result.success) {
        console.log('✅ 格式验证成功');
        console.log('   YesPlayMusic 的 ModalImportCookie 组件应该能够正确解析这种格式的 cookie');
        console.log('   ⚠️  但是由于 cookies 已过期，实际使用时可能会失败');
    } else {
        console.log('❌ 格式验证失败:', result.error);
    }
    console.log('================');
}

module.exports = { simulateModalImportCookie };