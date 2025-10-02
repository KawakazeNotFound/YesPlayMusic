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
    // 在浏览器环境中，我们无法直接require Node.js模块
    // 所以这里需要通过 Electron 的 ipcRenderer 或者其他方式
    if (!process.env.IS_ELECTRON) {
      throw new Error('自定义二维码登录仅支持 Electron 环境');
    }

    try {
      // Electron 环境
      const { ipcRenderer } = require('electron');
      qrLoginModule = {
        generateQRCode: () => ipcRenderer.invoke('qr-login-generate'),
        checkStatus: (apiData, unikey) =>
          ipcRenderer.invoke('qr-login-check', { apiData, unikey }),
      };
      console.log('[QR Bridge] 自定义二维码登录模块初始化成功');
    } catch (error) {
      console.error('[QR Bridge] 初始化失败:', error);
      throw new Error('自定义二维码登录模块初始化失败: ' + error.message);
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

  if (!module || !module.generateQRCode) {
    throw new Error('自定义二维码登录模块未初始化或不可用');
  }

  const result = await module.generateQRCode();

  if (!result.success) {
    throw new Error(result.error || '生成二维码失败');
  }

  // 保存 API 实例数据用于后续检查
  currentApiInstance = result.data.apiData;

  return result;
}

/**
 * 检查二维码状态
 * @param {string} unikey - 二维码的 unikey
 * @param {Object} apiData - API 实例数据
 * @returns {Promise<Object>} { code, message, cookies?, keyCookies? }
 */
export async function checkQRCodeStatus(unikey, apiData) {
  const module = await initModule();

  if (!module || !module.checkStatus) {
    throw new Error('自定义二维码登录模块未初始化或不可用');
  }

  // 使用传入的 apiData 或当前缓存的实例
  const dataToUse = apiData || currentApiInstance;
  return await module.checkStatus(dataToUse, unikey);
}

/**
 * 清除当前 API 实例
 */
export function clearApiInstance() {
  currentApiInstance = null;
}
