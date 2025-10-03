#!/usr/bin/env node

/**
 * Cookie API 测试脚本
 * 用于验证手动导入的cookie是否能正常调用后端API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 读取登录成功的cookie数据
const loginDataPath = path.join(__dirname, 'login-success.json');
const loginData = JSON.parse(fs.readFileSync(loginDataPath, 'utf8'));

console.log('===== Cookie API 测试 =====\n');
console.log('测试日期:', new Date().toISOString());
console.log('Cookie数据来源:', loginDataPath);
console.log('\n1. 加载Cookie数据...');

// 构建cookie字符串
const cookies = loginData.cookies;
const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

console.log('   Cookie数量:', cookies.length);
cookies.forEach(c => {
  console.log(`   - ${c.name}: ${c.value.substring(0, 20)}...`);
});

// 测试配置
const baseURL = process.env.VUE_APP_NETEASE_API_URL || 'http://localhost:10754';
console.log('\n2. 后端服务地址:', baseURL);

// 测试函数
async function testAPI(endpoint, params = {}) {
  const url = `${baseURL}${endpoint}`;
  const allParams = {
    ...params,
    cookie: cookieString,
    timestamp: Date.now(),
  };

  console.log(`\n--- 测试: ${endpoint} ---`);
  console.log('请求URL:', url);
  console.log('请求参数:', {
    ...allParams,
    cookie: cookieString.substring(0, 50) + '...',
  });

  try {
    const response = await axios.get(url, { 
      params: allParams,
      timeout: 15000,
    });
    
    console.log('✅ 响应状态:', response.status);
    console.log('✅ 响应数据:', JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// 主测试流程
async function main() {
  console.log('\n========================================');
  console.log('开始测试后端API...');
  console.log('========================================');

  // 测试1: 获取用户账号信息
  console.log('\n【测试1】获取用户账号信息 /user/account');
  const accountResult = await testAPI('/user/account');

  if (accountResult.success) {
    const data = accountResult.data;
    console.log('\n分析返回数据结构:');
    console.log('  - code:', data.code);
    console.log('  - account:', data.account ? '存在' : '不存在');
    console.log('  - profile:', data.profile ? '存在' : '不存在');
    
    if (data.account) {
      console.log('  - account.id:', data.account.id);
      console.log('  - account.userName:', data.account.userName);
    }
    
    if (data.profile) {
      console.log('  - profile.userId:', data.profile.userId);
      console.log('  - profile.nickname:', data.profile.nickname);
    }
  }

  // 测试2: 获取用户歌单
  if (accountResult.success && accountResult.data.account?.id) {
    const uid = accountResult.data.account.id;
    console.log('\n【测试2】获取用户歌单 /user/playlist');
    console.log('使用 UID:', uid);
    
    const playlistResult = await testAPI('/user/playlist', {
      uid: uid,
      limit: 10,
      offset: 0,
    });

    if (playlistResult.success) {
      const data = playlistResult.data;
      console.log('\n分析返回数据:');
      console.log('  - code:', data.code);
      console.log('  - playlist数量:', data.playlist?.length || 0);
      
      if (data.playlist && data.playlist.length > 0) {
        console.log('\n前3个歌单:');
        data.playlist.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.trackCount}首)`);
        });
      }
    }
  }

  // 测试3: 获取喜欢的音乐列表
  if (accountResult.success && accountResult.data.account?.id) {
    const uid = accountResult.data.account.id;
    console.log('\n【测试3】获取喜欢的音乐列表 /likelist');
    
    const likelistResult = await testAPI('/likelist', { uid: uid });

    if (likelistResult.success) {
      const data = likelistResult.data;
      console.log('\n分析返回数据:');
      console.log('  - code:', data.code);
      console.log('  - ids数量:', data.ids?.length || 0);
      
      if (data.ids && data.ids.length > 0) {
        console.log('  - 前5个歌曲ID:', data.ids.slice(0, 5));
      }
    }
  }

  console.log('\n========================================');
  console.log('测试完成！');
  console.log('========================================\n');
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试过程中发生错误:', error);
  process.exit(1);
});
