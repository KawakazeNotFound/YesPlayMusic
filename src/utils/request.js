import router from '@/router';
import { doLogout, getCookie } from '@/utils/auth';
import axios from 'axios';

let baseURL = '';
// Web 和 Electron 跑在不同端口避免同时启动时冲突
if (process.env.IS_ELECTRON) {
  if (process.env.NODE_ENV === 'production') {
    baseURL = process.env.VUE_APP_ELECTRON_API_URL;
  } else {
    baseURL = process.env.VUE_APP_ELECTRON_API_URL_DEV;
  }
} else {
  baseURL = process.env.VUE_APP_NETEASE_API_URL;
}

const service = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

service.interceptors.request.use(function (config) {
  console.log(
    `[Request] 发起 API 请求: ${config.method?.toUpperCase()} ${config.url}`
  );

  if (!config.params) config.params = {};
  if (baseURL.length) {
    const musicU = getCookie('MUSIC_U');
    const csrf = getCookie('__csrf');
    const musicAT = getCookie('MUSIC_A_T');
    const musicRT = getCookie('MUSIC_R_T');

    console.log(`[Request] Cookie 检查:`, {
      MUSIC_U: musicU ? '***存在***' : '不存在',
      __csrf: csrf ? '***存在***' : '不存在',
      MUSIC_A_T: musicAT ? '***存在***' : '不存在',
      MUSIC_R_T: musicRT ? '***存在***' : '不存在',
    });

    if (baseURL[0] !== '/' && !process.env.IS_ELECTRON && musicU !== null) {
      // 构建完整的 Cookie 字符串，包含所有可用的 Cookie
      const cookieParts = [];
      if (musicU) cookieParts.push(`MUSIC_U=${musicU}`);
      if (csrf) cookieParts.push(`__csrf=${csrf}`);
      if (musicAT) cookieParts.push(`MUSIC_A_T=${musicAT}`);
      if (musicRT) cookieParts.push(`MUSIC_R_T=${musicRT}`);

      config.params.cookie = cookieParts.join('; ') + ';';
      console.log(
        `[Request] 添加完整 cookie 参数到请求:`,
        config.params.cookie
      );
    } else {
      console.log(
        `[Request] 跳过 cookie 参数 - baseURL: ${baseURL[0]}, isElectron: ${
          process.env.IS_ELECTRON
        }, musicU: ${!!musicU}`
      );
    }
  } else {
    console.error("You must set up the baseURL in the service's config");
  }

  if (!process.env.IS_ELECTRON && !config.url.includes('/login')) {
    config.params.realIP = '211.161.244.70';
    console.log(`[Request] 添加 realIP 参数`);
  }

  console.log(`[Request] 最终请求参数:`, config.params);

  // Force real_ip
  const enableRealIP = JSON.parse(
    localStorage.getItem('settings')
  ).enableRealIP;
  const realIP = JSON.parse(localStorage.getItem('settings')).realIP;
  if (process.env.VUE_APP_REAL_IP) {
    config.params.realIP = process.env.VUE_APP_REAL_IP;
  } else if (enableRealIP) {
    config.params.realIP = realIP;
  }

  const proxy = JSON.parse(localStorage.getItem('settings')).proxyConfig;
  if (['HTTP', 'HTTPS'].includes(proxy.protocol)) {
    config.params.proxy = `${proxy.protocol}://${proxy.server}:${proxy.port}`;
  }

  return config;
});

service.interceptors.response.use(
  response => {
    console.log(
      `[Response] API 响应成功: ${response.config?.method?.toUpperCase()} ${
        response.config?.url
      }`,
      {
        status: response.status,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasCode: 'code' in (response.data || {}),
        code: response.data?.code,
      }
    );

    const res = response.data;
    return res;
  },
  async error => {
    console.error(`[Response] API 响应错误:`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorMessage: error.message,
    });

    /** @type {import('axios').AxiosResponse | null} */
    let response;
    let data;
    if (error === 'TypeError: baseURL is undefined') {
      response = error;
      data = error;
      console.error("You must set up the baseURL in the service's config");
    } else if (error.response) {
      response = error.response;
      data = response.data;
      console.error(`[Response] 错误响应数据:`, data);
    }

    if (
      response &&
      typeof data === 'object' &&
      data.code === 301 &&
      data.msg === '需要登录'
    ) {
      console.warn('Token has expired. Logout now!');

      // 登出帳戶
      doLogout();

      // 導向登入頁面
      if (process.env.IS_ELECTRON === true) {
        router.push({ name: 'loginAccount' });
      } else {
        router.push({ name: 'login' });
      }
    }
  }
);

export default service;
