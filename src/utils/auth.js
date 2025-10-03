import Cookies from 'js-cookie';
import { logout } from '@/api/auth';
import store from '@/store';

export function setCookies(string) {
  console.log('[setCookies] 开始设置 cookies, 输入字符串长度:', string.length);
  const cookies = string.split(';;');
  console.log('[setCookies] 分割后得到', cookies.length, '个 cookie');

  cookies.map((cookie, index) => {
    console.log(
      `[setCookies] 设置第 ${index + 1} 个 cookie:`,
      cookie.substring(0, 50) + '...'
    );

    try {
      // 设置到浏览器 cookie
      document.cookie = cookie;
      console.log(`[setCookies] 浏览器 cookie 设置完成`);

      // 解析并设置到 localStorage
      const cookieKeyValue = cookie.split(';')[0].split('=');
      const key = cookieKeyValue[0];
      const value = cookieKeyValue[1];

      console.log(
        `[setCookies] 解析得到 key: ${key}, value 长度: ${value?.length || 0}`
      );
      localStorage.setItem(`cookie-${key}`, value);
      console.log(`[setCookies] localStorage 设置完成: cookie-${key}`);

      // 验证设置结果
      const checkBrowser = document.cookie.includes(key);
      const checkLocalStorage = !!localStorage.getItem(`cookie-${key}`);
      console.log(
        `[setCookies] 验证结果 - 浏览器: ${checkBrowser}, localStorage: ${checkLocalStorage}`
      );
    } catch (error) {
      console.error(`[setCookies] 设置第 ${index + 1} 个 cookie 失败:`, error);
    }
  });

  console.log('[setCookies] 所有 cookie 设置完成');
}

export function getCookie(key) {
  const browserValue = Cookies.get(key);
  const localStorageValue = localStorage.getItem(`cookie-${key}`);
  const result = browserValue ?? localStorageValue;

  console.log(`[getCookie] 获取 ${key}:`, {
    browser: browserValue ? '***存在***' : '不存在',
    localStorage: localStorageValue ? '***存在***' : '不存在',
    result: result ? '***存在***' : '不存在',
  });

  return result;
}

export function removeCookie(key) {
  Cookies.remove(key);
  localStorage.removeItem(`cookie-${key}`);
}

// MUSIC_U 只有在账户登录的情况下才有
export function isLoggedIn() {
  return getCookie('MUSIC_U') !== undefined;
}

// 账号登录
export function isAccountLoggedIn() {
  return (
    getCookie('MUSIC_U') !== undefined &&
    store.state.data.loginMode === 'account'
  );
}

// 用户名搜索（用户数据为只读）
export function isUsernameLoggedIn() {
  return store.state.data.loginMode === 'username';
}

// 账户登录或者用户名搜索都判断为登录，宽松检查
export function isLooseLoggedIn() {
  return isAccountLoggedIn() || isUsernameLoggedIn();
}

export function doLogout() {
  logout();
  removeCookie('MUSIC_U');
  removeCookie('__csrf');
  // 更新状态仓库中的用户信息
  store.commit('updateData', { key: 'user', value: {} });
  // 更新状态仓库中的登录状态
  store.commit('updateData', { key: 'loginMode', value: null });
  // 更新状态仓库中的喜欢列表
  store.commit('updateData', { key: 'likedSongPlaylistID', value: undefined });
}
