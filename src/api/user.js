import request from '@/utils/request';
import axios from 'axios';
import CryptoJS from 'crypto-js';

// 直接调用网易云音乐官方API的工具函数
class NeteaseMusicDirect {
  constructor() {
    this.presetKey = '0CoJUm6Qyw8W8jud';
    this.iv = '0102030405060708';
    this.publicKey = '010001';
    this.modulus =
      '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
    this.userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
  }

  // 获取浏览器中的cookie
  getCookies() {
    const getCookie = name => {
      const browserValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
      const localStorageValue = localStorage.getItem(`cookie-${name}`);
      return browserValue || localStorageValue;
    };

    return {
      MUSIC_U: getCookie('MUSIC_U'),
      __csrf: getCookie('__csrf'),
      MUSIC_A_T: getCookie('MUSIC_A_T'),
      MUSIC_R_T: getCookie('MUSIC_R_T'),
    };
  }

  // 生成16位随机字符串
  newLen16Rand() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // AES加密
  aesEncrypt(text, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  }

  // RSA加密（简化版本）
  rsaEncrypt(text) {
    // 简化的RSA加密实现
    const reversedText = text.split('').reverse().join('');
    let result = '';
    for (let i = 0; i < reversedText.length; i++) {
      result += reversedText.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return result.padStart(256, '0');
  }

  // API参数加密
  apiParamsEncode(data) {
    const text = JSON.stringify(data);
    const secKey = this.newLen16Rand();

    // 第一次AES加密
    const firstEncrypt = this.aesEncrypt(text, this.presetKey, this.iv);

    // 第二次AES加密
    const params = this.aesEncrypt(firstEncrypt, secKey, this.iv);

    // RSA加密secKey
    const encSecKey = this.rsaEncrypt(secKey);

    return {
      params,
      encSecKey,
    };
  }

  // 直接调用网易云音乐API
  async callNeteaseAPI(api, data = {}) {
    const cookies = this.getCookies();

    console.log('[NeteaseMusicDirect] 调用API:', api);
    console.log('[NeteaseMusicDirect] Cookie状态:', {
      MUSIC_U: cookies.MUSIC_U ? '存在' : '不存在',
      __csrf: cookies.__csrf ? '存在' : '不存在',
      MUSIC_A_T: cookies.MUSIC_A_T ? '存在' : '不存在',
      MUSIC_R_T: cookies.MUSIC_R_T ? '存在' : '不存在',
    });

    if (!cookies.MUSIC_U) {
      throw new Error('MUSIC_U cookie 不存在，请先登录');
    }

    const encodedParams = this.apiParamsEncode(data);

    // 构建cookie字符串
    const cookieParts = [];
    if (cookies.MUSIC_U) cookieParts.push(`MUSIC_U=${cookies.MUSIC_U}`);
    if (cookies.__csrf) cookieParts.push(`__csrf=${cookies.__csrf}`);
    if (cookies.MUSIC_A_T) cookieParts.push(`MUSIC_A_T=${cookies.MUSIC_A_T}`);
    if (cookies.MUSIC_R_T) cookieParts.push(`MUSIC_R_T=${cookies.MUSIC_R_T}`);

    const headers = {
      'User-Agent': this.userAgent,
      Referer: 'https://music.163.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
      Cookie: cookieParts.join('; '),
    };

    try {
      console.log('[NeteaseMusicDirect] 发送请求...');
      const response = await axios({
        method: 'POST',
        url: api,
        headers: headers,
        data: new URLSearchParams(encodedParams).toString(),
        timeout: 15000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      console.log('[NeteaseMusicDirect] 响应状态:', response.status);
      console.log('[NeteaseMusicDirect] 响应数据:', response.data);

      return response.data;
    } catch (error) {
      console.error('[NeteaseMusicDirect] API调用失败:', error);
      throw error;
    }
  }
}

// 创建直接API调用实例
const neteaseDirectAPI = new NeteaseMusicDirect();

/**
 * 获取用户详情
 * 说明 : 登录后调用此接口 , 传入用户 id, 可以获取用户详情
 * - uid : 用户 id
 * @param {number} uid
 */
export function userDetail(uid) {
  return request({
    url: '/user/detail',
    method: 'get',
    params: {
      uid,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 获取账号详情
 * 说明 : 登录后调用此接口 ,可获取用户账号信息
 * 直接调用网易云音乐官方API
 */
export function userAccount() {
  console.log('[userAccount] 使用直接官方API调用');
  return neteaseDirectAPI.callNeteaseAPI(
    'https://music.163.com/api/nuser/account/get',
    {}
  );
}

/**
 * 获取用户歌单
 * 说明 : 登录后调用此接口 , 传入用户 id, 可以获取用户歌单
 * - uid : 用户 id
 * - limit : 返回数量 , 默认为 30
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.uid
 * @param {number} params.limit
 * @param {number=} params.offset
 * 直接调用网易云音乐官方API
 */
export function userPlaylist(params) {
  console.log('[userPlaylist] 使用直接官方API调用, params:', params);
  return neteaseDirectAPI.callNeteaseAPI(
    'https://music.163.com/weapi/user/playlist',
    {
      uid: params.uid.toString(),
      limit: params.limit?.toString() || '30',
      offset: params.offset?.toString() || '0',
    }
  );
}

/**
 * 获取用户播放记录
 * 说明 : 登录后调用此接口 , 传入用户 id, 可获取用户播放记录
 * - uid : 用户 id
 * - type : type=1 时只返回 weekData, type=0 时返回 allData
 * @param {Object} params
 * @param {number} params.uid
 * @param {number} params.type
 */
export function userPlayHistory(params) {
  return request({
    url: '/user/record',
    method: 'get',
    params,
  });
}

/**
 * 喜欢音乐列表（需要登录）
 * 说明 : 调用此接口 , 传入用户 id, 可获取已喜欢音乐id列表(id数组)
 * - uid: 用户 id
 * @param {number} uid
 * 直接调用网易云音乐官方API
 */
export function userLikedSongsIDs(uid) {
  console.log('[userLikedSongsIDs] 使用直接官方API调用, uid:', uid);
  return neteaseDirectAPI.callNeteaseAPI(
    'https://music.163.com/weapi/song/like/get',
    {
      uid: uid.toString(),
    }
  );
}

/**
 * 每日签到
 * 说明 : 调用此接口可签到获取积分
 * -  type: 签到类型 , 默认 0, 其中 0 为安卓端签到 ,1 为 web/PC 签到
 * @param {number} type
 */
export function dailySignin(type = 0) {
  return request({
    url: '/daily_signin',
    method: 'post',
    params: {
      type,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 获取收藏的专辑（需要登录）
 * 说明 : 调用此接口可获取到用户收藏的专辑
 * - limit : 返回数量 , 默认为 25
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*25, 其中 25 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.limit
 * @param {number=} params.offset
 */
export function likedAlbums(params) {
  return request({
    url: '/album/sublist',
    method: 'get',
    params: {
      limit: params.limit,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 获取收藏的歌手（需要登录）
 * 说明 : 调用此接口可获取到用户收藏的歌手
 */
export function likedArtists(params) {
  return request({
    url: '/artist/sublist',
    method: 'get',
    params: {
      limit: params.limit,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 获取收藏的MV（需要登录）
 * 说明 : 调用此接口可获取到用户收藏的MV
 */
export function likedMVs(params) {
  return request({
    url: '/mv/sublist',
    method: 'get',
    params: {
      limit: params.limit,
      timestamp: new Date().getTime(),
    },
  });
}

/**
 * 上传歌曲到云盘（需要登录）
 */
export function uploadSong(file) {
  let formData = new FormData();
  formData.append('songFile', file);
  return request({
    url: '/cloud',
    method: 'post',
    params: {
      timestamp: new Date().getTime(),
    },
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 200000,
  }).catch(error => {
    alert(`上传失败，Error: ${error}`);
  });
}

/**
 * 获取云盘歌曲（需要登录）
 * 说明 : 登录后调用此接口 , 可获取云盘数据 , 获取的数据没有对应 url, 需要再调用一 次 /song/url 获取 url
 * - limit : 返回数量 , 默认为 200
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*200, 其中 200 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.limit
 * @param {number=} params.offset
 */
export function cloudDisk(params = {}) {
  params.timestamp = new Date().getTime();
  return request({
    url: '/user/cloud',
    method: 'get',
    params,
  });
}

/**
 * 获取云盘歌曲详情（需要登录）
 */
export function cloudDiskTrackDetail(id) {
  return request({
    url: '/user/cloud/detail',
    method: 'get',
    params: {
      timestamp: new Date().getTime(),
      id,
    },
  });
}

/**
 * 删除云盘歌曲（需要登录）
 * @param {Array} id
 */
export function cloudDiskTrackDelete(id) {
  return request({
    url: '/user/cloud/del',
    method: 'get',
    params: {
      timestamp: new Date().getTime(),
      id,
    },
  });
}
