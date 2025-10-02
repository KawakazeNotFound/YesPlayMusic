/* eslint-disable no-undef */
const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class NeteaseAPITest {
  constructor() {
    // 严格按照 go-musicfox 的参数设置
    this.publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;
    this.modulus =
      '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
    this.iv = Buffer.from('0102030405060708', 'utf8');
    this.presetKey = Buffer.from('0CoJUm6Qyw8W8jud', 'utf8');
    this.userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
    this.globalCookies = [];

    // 初始化 sDeviceId (按照 go-musicfox 逻辑)
    this.sDeviceId = this.generateSDeviceId();
  }

  // 生成 sDeviceId，按照 go-musicfox 的 GenerateSDeviceId 逻辑
  generateSDeviceId() {
    const randomNum = Math.floor(Math.random() * 1000000);
    return `unknown-${randomNum}`;
  }

  // 生成chainId，按照 go-musicfox 的 GenerateChainID 逻辑
  generateChainId() {
    const version = 'v1';
    const platform = 'web';
    const action = 'login';
    const timestamp = Date.now();
    return `${version}_${this.sDeviceId}_${platform}_${action}_${timestamp}`;
  }

  // 手动解压缩响应数据
  decompressResponse(buffer, encoding) {
    try {
      let decompressed;

      switch (encoding) {
        case 'gzip':
          decompressed = zlib.gunzipSync(buffer);
          break;
        case 'deflate':
          decompressed = zlib.inflateSync(buffer);
          break;
        case 'br':
          // Brotli 解压缩
          decompressed = zlib.brotliDecompressSync(buffer);
          break;
        default:
          // 没有压缩或未知压缩格式
          decompressed = buffer;
          break;
      }

      return decompressed.toString('utf8');
    } catch (error) {
      console.error('[DECOMPRESS ERROR]', error.message);
      // 如果解压缩失败，尝试直接返回原始数据
      return buffer.toString('utf8');
    }
  }

  // 生成16位随机字符串，严格按照 go-musicfox 的方式
  newLen16Rand() {
    const stdChars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randByte = '';
    let randByteReverse = '';

    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * stdChars.length);
      const char = stdChars[randomIndex];
      randByte += char;
      randByteReverse = char + randByteReverse; // 反向拼接
    }

    return [
      Buffer.from(randByte, 'utf8'),
      Buffer.from(randByteReverse, 'utf8'),
    ];
  }

  // AES-CBC 加密，严格按照 go-musicfox 的方式
  aesEncryptCBC(buffer, key, iv) {
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(true); // PKCS7 padding
    let encrypted = cipher.update(buffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted;
  }

  // RSA加密，严格按照 go-musicfox 的方式
  // eslint-disable-next-line no-unused-vars
  rsaEncrypt(buffer, key) {
    // 创建 128-16 = 112 字节的缓冲区，然后追加原始数据
    const buffers = Buffer.alloc(112);
    const fullBuffer = Buffer.concat([buffers, buffer]);

    // 使用 BigInt 进行无 padding 的 RSA 加密
    const c = BigInt('0x' + fullBuffer.toString('hex'));
    const n = BigInt('0x' + this.modulus);
    const e = BigInt('0x010001'); // 65537

    const encryptedBigInt = this.modPow(c, e, n);
    const encryptedHex = encryptedBigInt.toString(16);

    return Buffer.from(encryptedHex.padStart(256, '0'), 'hex');
  }

  // 模幂运算
  modPow(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exponent = exponent >> 1n;
      base = (base * base) % modulus;
    }
    return result;
  }

  // API参数加密，严格按照 go-musicfox 的 ApiParamsEncode 函数
  apiParamsEncode(data) {
    const jsonData = Buffer.from(JSON.stringify(data), 'utf8');
    const [secretKey, secondSecretKey] = this.newLen16Rand();

    console.log('[DEBUG] 原始数据:', JSON.stringify(data));
    console.log('[DEBUG] JSON数据:', jsonData.toString());
    console.log('[DEBUG] 随机密钥:', secretKey.toString());
    console.log('[DEBUG] 反向密钥:', secondSecretKey.toString());

    // 第一次AES加密
    const firstCiphertext = this.aesEncryptCBC(
      jsonData,
      this.presetKey,
      this.iv
    );
    const firstCiphertextBase64 = firstCiphertext.toString('base64');

    console.log('[DEBUG] 第一次AES加密结果:', firstCiphertextBase64);

    // 第二次AES加密
    const secondCiphertext = this.aesEncryptCBC(
      Buffer.from(firstCiphertextBase64, 'utf8'),
      secondSecretKey,
      this.iv
    );
    const finalParams = secondCiphertext.toString('base64');

    console.log('[DEBUG] 第二次AES加密结果:', finalParams);

    // RSA加密
    const encryptedSecretKey = this.rsaEncrypt(secretKey, this.publicKey);
    const finalEncSecKey = encryptedSecretKey.toString('hex');

    console.log('[DEBUG] RSA加密结果:', finalEncSecKey);

    return {
      params: finalParams,
      encSecKey: finalEncSecKey,
    };
  }

  // 更新全局 cookies
  updateGlobalCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;

    setCookieHeaders.forEach(cookieStr => {
      const [nameValue] = cookieStr.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        // 移除已存在的同名cookie
        this.globalCookies = this.globalCookies.filter(
          c => c.name !== name.trim()
        );
        // 添加新cookie
        this.globalCookies.push({
          name: name.trim(),
          value: value.trim(),
        });
      }
    });
  }

  // HTTP请求，严格按照 go-musicfox 的 CallWeapi 逻辑
  async callWeapi(api, data) {
    const encodedParams = this.apiParamsEncode(data);

    console.log('\n[REQUEST] URL:', api);
    console.log('[REQUEST] 加密后的数据:', encodedParams);

    // 构建请求头，严格按照 go-musicfox 的逻辑
    const headers = {
      'User-Agent': this.userAgent,
      Referer: 'https://music.163.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    // 添加 sDeviceId cookie (必需)
    let cookieString = `sDeviceId=${this.sDeviceId}`;

    // 添加其他 cookies
    if (this.globalCookies.length > 0) {
      cookieString +=
        '; ' + this.globalCookies.map(c => `${c.name}=${c.value}`).join('; ');
    }

    // 如果是登录相关的 URL，添加 NMTID cookie
    if (api.includes('login')) {
      const nmtid = this.generateRandomHex(16);
      cookieString += `; NMTID=${nmtid}`;
    }

    headers.Cookie = cookieString;

    const config = {
      method: 'POST',
      url: api,
      headers: headers,
      data: new URLSearchParams(encodedParams).toString(),
      timeout: 30000,
      withCredentials: true,
      responseType: 'arraybuffer', // 获取原始二进制数据
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      },
    };

    try {
      const response = await axios(config);
      console.log('[RESPONSE] Status:', response.status);
      console.log(
        '[RESPONSE] Headers:',
        JSON.stringify(response.headers, null, 2)
      );

      // 手动处理压缩的响应数据
      const contentEncoding = response.headers['content-encoding'];
      console.log('[RESPONSE] Content-Encoding:', contentEncoding);

      let responseText;
      if (Buffer.isBuffer(response.data)) {
        responseText = this.decompressResponse(response.data, contentEncoding);
      } else {
        responseText =
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);
      }

      console.log('[RESPONSE] Decompressed Text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[JSON PARSE ERROR]', parseError.message);
        responseData = { error: 'JSON parse failed', raw: responseText };
      }

      console.log('[RESPONSE] Parsed Data:', responseData);

      // 更新全局cookies
      this.updateGlobalCookies(response.headers['set-cookie']);

      // 解析响应中的 code 字段
      let code = 200;
      if (responseData && typeof responseData.code === 'number') {
        code = responseData.code;
      }

      return {
        code: code,
        bodyBytes: Buffer.from(JSON.stringify(responseData)),
        error: null,
      };
    } catch (error) {
      console.error('[ERROR] 请求失败:', error.message);
      if (error.response) {
        console.error('[ERROR] Response status:', error.response.status);
        console.error('[ERROR] Response data:', error.response.data);
        return {
          code: error.response.status,
          bodyBytes: Buffer.from(JSON.stringify(error.response.data)),
          error: error,
        };
      }
      return {
        code: 0,
        bodyBytes: Buffer.from(''),
        error: error,
      };
    }
  }

  // 生成随机十六进制字符串
  generateRandomHex(length) {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 获取二维码unikey，严格按照 go-musicfox 的 LoginQRService.GetKey 逻辑
  async getQRKey() {
    const data = {
      type: 1,
      noCheckToken: true,
    };

    const api = 'https://music.163.com/weapi/login/qrcode/unikey';
    const result = await this.callWeapi(api, data);

    if (result.error) {
      throw new Error('网络请求失败: ' + result.error.message);
    }

    if (result.code !== 200) {
      throw new Error('获取二维码失败，状态码: ' + result.code);
    }

    const responseData = JSON.parse(result.bodyBytes.toString());
    if (!responseData.unikey) {
      throw new Error(
        '响应中缺少 unikey 字段: ' + JSON.stringify(responseData)
      );
    }

    // 生成 chainId，严格按照 go-musicfox 的逻辑
    const chainId = this.generateChainId();
    const qrcodeUrl = `http://music.163.com/login?codekey=${responseData.unikey}&chainId=${chainId}`;

    console.log('\n[SUCCESS] 获取二维码成功');
    console.log('[INFO] UniKey:', responseData.unikey);
    console.log('[INFO] ChainId:', chainId);
    console.log('[INFO] QR Code URL:', qrcodeUrl);

    // 保存 unikey 用于后续检查
    this.uniKey = responseData.unikey;

    return {
      unikey: responseData.unikey,
      qrcodeUrl: qrcodeUrl,
    };
  }

  // 检查二维码状态，严格按照 go-musicfox 的 LoginQRService.CheckQR 逻辑
  async checkQRStatus() {
    if (!this.uniKey) {
      return {
        code: 0,
        message: 'UniKey 为空',
      };
    }

    const data = {
      type: 1,
      noCheckToken: true,
      key: this.uniKey,
    };

    const api = 'https://music.163.com/weapi/login/qrcode/client/login';
    const result = await this.callWeapi(api, data);

    if (result.error) {
      console.error('[QR CHECK ERROR]', result.error.message);
      return {
        code: 0,
        message: '检查二维码状态失败: ' + result.error.message,
      };
    }

    const responseData = JSON.parse(result.bodyBytes.toString());

    console.log('\n[QR STATUS] Code:', responseData.code);
    console.log('[QR STATUS] Message:', responseData.message || '');

    return responseData;
  }

  // 获取用户账户信息，严格按照 go-musicfox 的 UserAccountService.AccountInfo 逻辑
  async getUserAccountInfo() {
    const data = {};
    const api = 'https://music.163.com/api/nuser/account/get';
    const result = await this.callWeapi(api, data);

    if (result.error) {
      console.error('[ACCOUNT INFO ERROR]', result.error.message);
      return {
        code: 0,
        message: '获取用户信息失败: ' + result.error.message,
      };
    }

    const responseData = JSON.parse(result.bodyBytes.toString());
    return responseData;
  }

  // 获取喜欢的音乐，严格按照 go-musicfox 的 LikeListService.LikeList 逻辑
  async getLikeList(uid) {
    const data = {
      uid: uid.toString(),
    };
    const api = 'https://music.163.com/weapi/song/like/get';
    const result = await this.callWeapi(api, data);

    if (result.error) {
      console.error('[LIKE LIST ERROR]', result.error.message);
      return {
        code: 0,
        message: '获取喜欢音乐失败: ' + result.error.message,
      };
    }

    const responseData = JSON.parse(result.bodyBytes.toString());
    return responseData;
  }

  // 获取用户歌单，严格按照 go-musicfox 的 UserPlaylistService.UserPlaylist 逻辑
  async getUserPlaylist(uid, limit = 30, offset = 0) {
    const data = {
      uid: uid.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    };
    const api = 'https://music.163.com/weapi/user/playlist';
    const result = await this.callWeapi(api, data);

    if (result.error) {
      console.error('[PLAYLIST ERROR]', result.error.message);
      return {
        code: 0,
        message: '获取用户歌单失败: ' + result.error.message,
      };
    }

    const responseData = JSON.parse(result.bodyBytes.toString());
    return responseData;
  }
}

// 测试函数
async function testQRLogin() {
  console.log('========== 网易云音乐二维码登录测试 ==========\n');
  console.log('严格按照 go-musicfox 逻辑实现\n');

  const api = new NeteaseAPITest();

  try {
    // 1. 获取二维码
    console.log('1. 获取二维码...');
    const qrResult = await api.getQRKey();

    // 2. 生成二维码图片并保存到文件
    console.log('\n2. 生成二维码图片...');

    // 输出到控制台
    const qrcodeTerminal = await QRCode.toString(qrResult.qrcodeUrl, {
      type: 'terminal',
      small: true,
    });
    console.log('\n请扫描以下二维码:');
    console.log(qrcodeTerminal);

    // 保存为 PNG 文件
    const qrcodePngPath = path.join(__dirname, 'qr.png');
    await QRCode.toFile(qrcodePngPath, qrResult.qrcodeUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    console.log(`\n二维码已保存到: ${qrcodePngPath}`);

    // 保存为 SVG 文件
    const qrcodeSvgPath = path.join(__dirname, 'qr.svg');
    await QRCode.toFile(qrcodeSvgPath, qrResult.qrcodeUrl, {
      type: 'svg',
      width: 300,
      margin: 2,
    });
    console.log(`二维码SVG已保存到: ${qrcodeSvgPath}`);

    // 3. 轮询检查状态
    console.log('\n3. 开始轮询检查状态...');
    console.log('请用网易云音乐APP扫描二维码并确认登录');

    let pollCount = 0;
    const maxPoll = 60; // 最多轮询60次，每次2秒，总共120秒

    while (pollCount < maxPoll) {
      try {
        const status = await api.checkQRStatus();

        switch (status.code) {
          case 801:
            console.log(`[${pollCount + 1}/${maxPoll}] 等待扫码...`);
            break;
          case 802:
            console.log(
              `[${pollCount + 1}/${maxPoll}] 已扫码，请在APP上确认登录...`
            );
            break;
          case 803: {
            console.log(`[${pollCount + 1}/${maxPoll}] 🎉 登录成功!`);
            console.log('\n===== 登录成功信息 =====');
            console.log('完整响应:', JSON.stringify(status, null, 2));
            console.log('\n===== Cookies 信息 =====');
            console.log('全局Cookies:', api.globalCookies);

            // 保存登录信息到文件
            const loginInfoPath = path.join(__dirname, 'login-success.json');
            fs.writeFileSync(
              loginInfoPath,
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  loginData: status,
                  cookies: api.globalCookies,
                },
                null,
                2
              )
            );
            console.log(`\n登录信息已保存到: ${loginInfoPath}`);

            return status;
          }
          case 800:
            console.log(
              `[${pollCount + 1}/${maxPoll}] ❌ 二维码已过期，请重新获取`
            );
            return null;
          default:
            console.log(
              `[${pollCount + 1}/${maxPoll}] ❓ 未知状态: ${status.code} - ${
                status.message || '无消息'
              }`
            );
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
        pollCount++;
      } catch (error) {
        console.error(`轮询第 ${pollCount + 1} 次时出错:`, error.message);
        pollCount++;
        if (pollCount >= maxPoll) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (pollCount >= maxPoll) {
      console.log('\n⏰ 轮询超时，测试结束');
      console.log('可能的原因:');
      console.log('1. 二维码已过期');
      console.log('2. 网络连接问题');
      console.log('3. 未及时扫码确认');
    }

    return null;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);

    // 保存错误信息到文件
    const errorPath = path.join(__dirname, 'error-log.json');
    fs.writeFileSync(
      errorPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
        },
        null,
        2
      )
    );
    console.error(`错误日志已保存到: ${errorPath}`);
  }
}

// 测试登录后获取喜欢的音乐
async function testUserLikedMusic() {
  console.log('========== 测试获取用户喜欢的音乐 ==========\n');

  const api = new NeteaseAPITest();

  try {
    // 首先检查是否有保存的登录信息
    const loginPath = path.join(__dirname, 'login-success.json');

    let loginData;
    try {
      const loginInfo = fs.readFileSync(loginPath, 'utf8');
      loginData = JSON.parse(loginInfo);
      console.log('✅ 从文件加载登录信息');
    } catch (error) {
      console.log('❌ 没有找到登录信息，请先运行二维码登录测试');
      return;
    }

    // 恢复 cookies
    if (loginData.cookies) {
      api.globalCookies = loginData.cookies;
      console.log('✅ 恢复了', api.globalCookies.length, '个cookies');
    }

    // 1. 获取用户账户信息
    console.log('\n1. 获取用户账户信息...');
    const accountResult = await api.getUserAccountInfo();

    if (accountResult.code && accountResult.code === 200) {
      console.log('✅ 用户账户信息获取成功');
      console.log('用户ID:', accountResult.account && accountResult.account.id);
      console.log(
        '用户名:',
        accountResult.account && accountResult.account.userName
      );
      console.log(
        '昵称:',
        accountResult.profile && accountResult.profile.nickname
      );

      const uid = accountResult.account && accountResult.account.id;
      if (!uid) {
        console.log('❌ 无法获取用户ID');
        return;
      }

      // 2. 获取用户歌单（包括"我喜欢的音乐"）
      console.log('\n2. 获取用户歌单...');
      const playlistResult = await api.getUserPlaylist(uid);

      if (playlistResult.code && playlistResult.code === 200) {
        console.log('✅ 用户歌单获取成功');
        console.log('歌单数量:', (playlistResult.playlist && playlistResult.playlist.length) || 0);

        // 找到"我喜欢的音乐"歌单（通常是第一个，并且creator.userId === uid）
        const likedPlaylist = playlistResult.playlist && playlistResult.playlist.find(
          p =>
            p.creator && p.creator.userId === uid &&
            (p.name === '我喜欢的音乐' || p.specialType === 5)
        );

        if (likedPlaylist) {
          console.log('✅ 找到"我喜欢的音乐"歌单');
          console.log('歌单ID:', likedPlaylist.id);
          console.log('歌单名称:', likedPlaylist.name);
          console.log('歌曲数量:', likedPlaylist.trackCount);
        } else {
          console.log('❌ 未找到"我喜欢的音乐"歌单');
        }

        // 显示前几个歌单
        console.log('\n用户歌单列表（前5个）:');
        if (playlistResult.playlist) {
          playlistResult.playlist
            .slice(0, 5)
            .forEach(function (playlist, index) {
              console.log(
                index +
                  1 +
                  '. ' +
                  playlist.name +
                  ' (' +
                  playlist.trackCount +
                  '首歌)'
              );
            });
        }
      } else {
        console.log('❌ 获取用户歌单失败:', playlistResult.message);
      }

      // 3. 获取喜欢的音乐ID列表
      console.log('\n3. 获取喜欢的音乐ID列表...');
      const likeListResult = await api.getLikeList(uid);

      if (likeListResult.code && likeListResult.code === 200) {
        console.log('✅ 喜欢的音乐ID列表获取成功');
        console.log(
          '喜欢的歌曲数量:',
          (likeListResult.ids && likeListResult.ids.length) || 0
        );

        if (likeListResult.ids && likeListResult.ids.length > 0) {
          console.log('前10个喜欢的歌曲ID:', likeListResult.ids.slice(0, 10));

          // 保存结果到文件
          const resultPath = path.join(__dirname, 'user-liked-music.json');
          fs.writeFileSync(
            resultPath,
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                userInfo: {
                  id: uid,
                  userName:
                    accountResult.account && accountResult.account.userName,
                  nickname:
                    accountResult.profile && accountResult.profile.nickname,
                },
                likedMusicIds: likeListResult.ids,
                likedMusicCount: likeListResult.ids.length,
              },
              null,
              2
            )
          );
          console.log(`📁 喜欢的音乐信息已保存到: ${resultPath}`);
        } else {
          console.log('😢 您还没有喜欢任何音乐');
        }
      } else {
        console.log(
          '❌ 获取喜欢的音乐列表失败:',
          likeListResult.message || '未知错误'
        );
      }
    } else {
      console.log(
        '❌ 获取用户账户信息失败:',
        accountResult.message || '可能需要重新登录'
      );
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 导出接口供主程序调用
async function generateQRCodeForLogin() {
  const api = new NeteaseAPITest();

  try {
    // 1. 获取二维码
    console.log('[QR LOGIN API] 获取二维码...');
    const qrResult = await api.getQRKey();

    // 2. 生成二维码 SVG
    const qrcodeSvg = await QRCode.toString(qrResult.qrcodeUrl, {
      type: 'svg',
      width: 192,
      margin: 0,
      color: {
        dark: '#335eea',
        light: '#00000000',
      },
    });

    console.log('[QR LOGIN API] 二维码生成成功');

    return {
      success: true,
      data: {
        unikey: qrResult.unikey,
        qrcodeUrl: qrResult.qrcodeUrl,
        qrcodeSvg: `data:image/svg+xml;utf8,${encodeURIComponent(qrcodeSvg)}`,
        api: api, // 返回 api 实例用于后续检查状态
      },
    };
  } catch (error) {
    console.error('[QR LOGIN API] 生成二维码失败:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function checkQRCodeStatus(api, unikey) {
  try {
    // 设置 uniKey
    if (unikey && !api.uniKey) {
      api.uniKey = unikey;
    }

    const status = await api.checkQRStatus();

    let result = {
      code: status.code,
      message: status.message || '',
    };

    // 如果登录成功（code === 803），返回必要的 cookies
    if (status.code === 803) {
      result.cookies = api.globalCookies;
      result.cookieString = api.globalCookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

      // 提取关键 cookies
      const musicU = api.globalCookies.find(c => c.name === 'MUSIC_U');
      const csrf = api.globalCookies.find(c => c.name === '__csrf');
      const musicAT = api.globalCookies.find(c => c.name === 'MUSIC_A_T');
      const musicRT = api.globalCookies.find(c => c.name === 'MUSIC_R_T');

      result.keyCookies = {
        MUSIC_U: musicU ? musicU.value : '',
        __csrf: csrf ? csrf.value : '',
        MUSIC_A_T: musicAT ? musicAT.value : '',
        MUSIC_R_T: musicRT ? musicRT.value : '',
      };

      console.log('[QR LOGIN API] 登录成功，提取关键cookies');
    }

    return result;
  } catch (error) {
    console.error('[QR LOGIN API] 检查状态失败:', error.message);
    return {
      code: 0,
      message: '检查状态失败: ' + error.message,
      error: error.message,
    };
  }
}

// 导出模块
module.exports = {
  NeteaseAPITest,
  generateQRCodeForLogin,
  checkQRCodeStatus,
  testQRLogin,
  testUserLikedMusic,
};

// 运行测试
if (require.main === module) {
  // 检查命令行参数
  const args = process.argv.slice(2);

  if (args.includes('--liked-music') || args.includes('-l')) {
    testUserLikedMusic();
  } else {
    testQRLogin();
  }
}
