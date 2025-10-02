/**
 * 测试 qr-login-test.js 模块导出是否正常
 */

const qrLoginModule = require('./qr-login-test.js');

console.log('========== 测试模块导出 ==========\n');

console.log('导出的内容:', Object.keys(qrLoginModule));

console.log('\n检查导出的函数:');
console.log('- generateQRCodeForLogin:', typeof qrLoginModule.generateQRCodeForLogin);
console.log('- checkQRCodeStatus:', typeof qrLoginModule.checkQRCodeStatus);
console.log('- NeteaseAPITest:', typeof qrLoginModule.NeteaseAPITest);

console.log('\n测试生成二维码...');

qrLoginModule.generateQRCodeForLogin()
  .then(result => {
    console.log('\n✅ 生成二维码成功!');
    console.log('返回结果:', JSON.stringify({
      success: result.success,
      hasData: !!result.data,
      unikey: result.data?.unikey,
      hasQrcodeSvg: !!result.data?.qrcodeSvg
    }, null, 2));
    
    if (result.success && result.data) {
      console.log('\n二维码 URL:', result.data.qrcodeUrl);
      console.log('Unikey:', result.data.unikey);
      console.log('API 实例数据存在:', !!result.data.api);
    }
  })
  .catch(error => {
    console.error('\n❌ 生成二维码失败:', error.message);
    console.error(error.stack);
  });
