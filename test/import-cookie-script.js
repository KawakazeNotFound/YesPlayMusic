/**
 * YesPlayMusic Cookie 导入脚本
 * 使用方法：
 * 1. 在 YesPlayMusic 应用中打开开发者工具（F12）
 * 2. 切换到 Console 标签
 * 3. 复制整个脚本粘贴并回车运行
 * 4. 按提示替换 newCookieString 的值
 */

(async () => {
    console.log("🎵 YesPlayMusic Cookie 导入脚本开始执行");
    console.log("=" .repeat(50));

    /* ====== 请替换为你的 Cookie ====== */
    const newCookieString = `MUSIC_U=00C60D296F7F48A8D353FD71F6FFD34274C542C34D25016BF4BC07B976360C66FD3FE3830CF7BD235D668D30B31481F0AD5ED5DE138D4CF62F0C2718926919A97ADA843617983586EFB4F29E11EBFCBED9C15FFE81D21491D2D42AEEE40686A6EC2BD70AD53A1A4ABB0A247ADFA0DAF8D54486DA20559B0569069896AB6DB4CC4DBBD4B6E4A9B88E38605165EAE8CAF4FC6BD11A6233E94B5AFC33B8BAF4881CB99C8CBB3E957E68B1CAEC3E2698613B32F0F1AABA54D138E1B7730C94EFD4EAE3A049C81F19E8C6647334440229D0BBD2491E5EB5FE4CE72051D3FBBC6966073B19AAF5671BC7414BFF80A52D195A83C9814667AA09ABDD0EA5D8DBD2C5859FE87FBF8B6CD0F77D9CD77A6DC6BBB7CE2AEE92160F4A8B79409F2A2B8F6D388D652B898DC9C7254B07C25F9277CC001266459730CFD9ADBB777D84EA3A52931524459C0139E937EB004B22B2C7004264337C6E8F2F4BB86443A9E21AC9E961BB1C71E392F65FEF204C0FD4FC77B16A1CEB0835600053F77485AC2A49EDF32F32BF8A7055CD7C96D7F6A5BF7FD8FCDF3B78; __csrf=200cff541161564064f266d6c302db84; MUSIC_A_T=1540041779907; MUSIC_R_T=1540217111647`;
    // ↑↑↑ 请替换为你的实际 Cookie 字符串（格式：key1=value1; key2=value2）

    const baseURL = "http://localhost:10754"; // 后端服务地址
    
    if (newCookieString.includes("请替换这里")) {
        console.error("❌ 请先替换 newCookieString 的值！");
        return;
    }

    /* === 步骤 0: 清除现有 Cookie === */
    console.log("\n🧹 [步骤 0] 清除现有 Cookie...");
    const cookiesToClear = ['MUSIC_U', '__csrf', 'MUSIC_A_T', 'MUSIC_R_T'];
    cookiesToClear.forEach(name => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        localStorage.removeItem(`cookie-${name}`);
        console.log(`  🗑️  清除: ${name}`);
    });
    console.log("✅ 清除完成");

    /* === 步骤 1: 写入新 Cookie === */
    console.log("\n📥 [步骤 1] 写入新 Cookie...");
    const cookieMap = {};
    
    for (const cookie of newCookieString.split(";")) {
        const c = cookie.trim();
        if (!c) continue;

        const [key, ...rest] = c.split("=");
        const value = rest.join("=").trim();
        if (!key || !value) continue;

        cookieMap[key.trim()] = value;

        // 尝试写入 document.cookie（可能失败，这是正常的）
        try {
            const encoded = `${key}=${value}; path=/; max-age=${60*60*24*365}`;
            document.cookie = encoded;
            console.log(`  🍪 尝试写入 document.cookie: ${key.substring(0, 20)}...`);
        } catch (e) {
            console.warn(`  ⚠️  document.cookie 写入失败: ${key}`);
        }

        // 写入 localStorage（主要存储方式）
        localStorage.setItem(`cookie-${key}`, value);
        console.log(`  💾 localStorage 写入: cookie-${key}`);
    }
    console.log("✅ Cookie 写入完成");
    console.log(`  共写入 ${Object.keys(cookieMap).length} 个 cookie`);
    
    // 验证写入结果
    console.log("\n🔍 验证 Cookie 写入结果:");
    ['MUSIC_U', '__csrf', 'MUSIC_A_T', 'MUSIC_R_T'].forEach(key => {
        const lsValue = localStorage.getItem(`cookie-${key}`);
        console.log(`  ${key}: ${lsValue ? '✓ 已保存' : '✗ 未找到'} (${lsValue ? lsValue.substring(0, 20) + '...' : 'N/A'})`);
    });

    /* === 步骤 2: 构建请求 Cookie 字符串 === */
    console.log("\n🔧 [步骤 2] 构建请求参数...");
    const cookieParts = [];
    for (const [key, value] of Object.entries(cookieMap)) {
        cookieParts.push(`${key}=${value}`);
    }
    const requestCookie = cookieParts.join("; ");
    console.log(`  Cookie 字符串长度: ${requestCookie.length}`);

    /* === 步骤 3: 获取用户信息 === */
    console.log("\n🌐 [步骤 3] 请求用户信息...");
    const apiUrl = `${baseURL}/user/account?cookie=${encodeURIComponent(requestCookie)}&timestamp=${Date.now()}`;
    console.log(`  请求 URL: ${baseURL}/user/account`);
    
    let userData;
    try {
        const res = await fetch(apiUrl);
        userData = await res.json();
        console.log(`  📦 响应状态: ${res.status}`);
        console.log(`  📦 响应数据:`, userData);
    } catch (e) {
        console.error("❌ 请求失败:", e);
        console.error("   请确保后端服务正在运行（端口 10754）");
        return;
    }

    if (userData.code !== 200) {
        console.error("❌ API 返回错误:", userData);
        console.error("   可能原因：Cookie 已过期或无效");
        return;
    }

    // 兼容两种数据结构：profile 或 account
    const profile = userData.profile || userData.account;
    if (!profile) {
        console.error("❌ 响应中没有用户信息");
        return;
    }

    const userId = profile.userId || profile.id;
    const nickname = profile.nickname || profile.userName;
    console.log(`✅ 获取成功！`);
    console.log(`  👤 用户ID: ${userId}`);
    console.log(`  👤 昵称: ${nickname}`);

    /* === 步骤 4: 更新 localStorage.data === */
    console.log("\n📂 [步骤 4] 更新应用状态...");
    let oldData;
    try {
        oldData = JSON.parse(localStorage.getItem("data") || "{}");
        console.log("  📄 当前 data:", oldData);
    } catch {
        console.warn("  ⚠️  当前 data 解析失败，重置为空对象");
        oldData = {};
    }

    const newData = {
        ...oldData,
        user: profile,
        loginMode: "account",
        likedSongPlaylistID: undefined // 强制重新获取
    };

    try {
        localStorage.setItem("data", JSON.stringify(newData));
        console.log("✅ 应用状态更新完成");
        console.log("  👤 user:", profile.nickname || profile.userName);
        console.log("  🔑 loginMode:", "account");
    } catch (e) {
        console.error("❌ localStorage 写入失败:", e);
        return;
    }

    /* === 步骤 5: 完成 === */
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Cookie 导入成功！");
    console.log("🏠 3秒后将刷新页面...");
    console.log("=".repeat(50));

    setTimeout(() => {
        location.reload();
    }, 3000);
})();
