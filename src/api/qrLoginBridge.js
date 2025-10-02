/**
 * 二维码登录桥接模块
 * 用于调用 test/qr-login-test.js 中的自定义二维码登录逻辑
 */

// 动态导入 qr-login-test 模块
let qrLoginModule = null;

// 存储当前的 API 实例
let currentApiInstance = null;

/**
 * 初始化模块
 */
async function initModule() {
  if (!qrLoginModule) {
    try {
      // 在浏览器环境中，我们无法直接require Node.js模块
      // 所以这里需要通过 Electron 的 ipcRenderer 或者其他方式
      if (process.env.IS_ELECTRON) {
        // Electron 环境
        const { ipcRenderer } = require('electron');
        qrLoginModule = {
          generateQRCode: () => ipcRenderer.invoke('qr-login-generate'),
          checkStatus: (apiData, unikey) => 
            ipcRenderer.invoke('qr-login-check', { apiData, unikey })
        };
      } else {
        // 浏览器环境，使用原来的 API
        console.warn('[QR Bridge] 非 Electron 环境，将使用默认 API');
        qrLoginModule = null;
      }
    } catch (error) {
      console.error('[QR Bridge] 初始化失败:', error);
      qrLoginModule = null;
    }
  }
  return qrLoginModule;
}

/**
 * 生成二维码
 * @returns {Promise<Object>} { success, data: { unikey, qrcodeUrl, qrcodeSvg } }
 */
export async function generateQRCodeForLogin() {
  const module = await initModule();
  
  if (module && module.generateQRCode) {
    const result = await module.generateQRCode();
    if (result.success) {
      // 保存 API 实例数据用于后续检查
      currentApiInstance = result.data.apiData;
    }
    return result;
  }
  
  // 回退到默认实现
  return {
    success: false,
    useDefault: true,
    error: '使用默认 API'
  };
}

/**
 * 检查二维码状态
 * @param {string} unikey - 二维码的 unikey
 * @param {Object} apiData - API 实例数据
 * @returns {Promise<Object>} { code, message, cookies?, keyCookies? }
 */
export async function checkQRCodeStatus(unikey, apiData) {
  const module = await initModule();
  
  if (module && module.checkStatus) {
    // 使用传入的 apiData 或当前缓存的实例
    const dataToUse = apiData || currentApiInstance;
    return await module.checkStatus(dataToUse, unikey);
  }
  
  // 回退到默认实现
  return {
    code: 0,
    message: '使用默认 API',
    useDefault: true
  };
}

/**
 * 清除当前 API 实例
 */
export function clearApiInstance() {
  currentApiInstance = null;
}
