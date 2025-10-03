// extract from NeteasyCloudMusicAPI/generateConfig.js and avoid bugs in there (generateConfig require main.js but the main.js has bugs)
// 只在Node.js环境（Electron主进程）中运行，浏览器环境跳过
if (
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  process.versions &&
  process.versions.node
) {
  // Node.js环境
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  try {
    const tokenPath = path.resolve(os.tmpdir(), 'anonymous_token');

    // 确保临时目录存在
    const tmpDir = os.tmpdir();
    if (!fs.existsSync(tmpDir)) {
      console.warn('[checkAuthToken] 临时目录不存在:', tmpDir);
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // 检查并创建 anonymous_token 文件
    if (!fs.existsSync(tokenPath)) {
      console.log('[checkAuthToken] 创建 anonymous_token 文件:', tokenPath);
      fs.writeFileSync(tokenPath, '', 'utf-8');
    }
  } catch (error) {
    console.warn(
      '[checkAuthToken] 无法创建 anonymous_token 文件:',
      error.message
    );
    console.warn('[checkAuthToken] 这不会影响直接API调用功能');
    // 不抛出错误，因为我们现在使用直接API调用，不需要这个文件
  }
} else {
  // 浏览器环境，跳过文件操作
  console.log('[checkAuthToken] 浏览器环境，跳过 anonymous_token 文件创建');
}
