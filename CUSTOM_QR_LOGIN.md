# 自定义二维码登录实现总结

## 实现内容

### 1. 核心模块
- **位置**: `src/utils/qrLogin/index.js`
- **功能**: 实现了网易云音乐的自定义二维码登录逻辑
- **特点**: 
  - 严格按照 go-musicfox 的实现方式
  - 完整的加密和签名算法
  - 支持二维码生成和状态轮询
  - 自动提取并返回必要的 cookies

### 2. 桥接模块
- **位置**: `src/api/qrLoginBridge.js`
- **功能**: 在渲染进程中调用 Electron IPC 与主进程通信
- **特点**: 
  - 自动检测 Electron 环境
  - 非 Electron 环境抛出错误（不再回退到默认 API）
  - 提供清理 API 实例的方法

### 3. IPC 处理器
- **位置**: `src/electron/ipcMain.js`
- **功能**: 在主进程中处理二维码登录请求
- **接口**:
  - `qr-login-generate`: 生成二维码
  - `qr-login-check`: 检查二维码状态
  - `qr-login-clear`: 清除缓存

### 4. 登录页面集成
- **位置**: `src/views/loginAccount.vue`
- **修改**: 
  - 移除了原有的 QRCode 库导入
  - 移除了 `loginQrCodeKey` 和 `loginQrCodeCheck` API 调用
  - 强制使用自定义二维码登录接口
  - 删除了回退到默认 API 的逻辑

## 工作流程

1. 用户进入登录页面，自动触发 `getQrCodeKey()`
2. 调用 `generateQRCodeForLogin()` 生成二维码
3. IPC 通信到主进程，调用 `src/utils/qrLogin/index.js`
4. 返回二维码 SVG 和 unikey
5. 启动轮询，每秒调用 `checkQRCodeStatus()`
6. 用户扫码确认后，返回状态 803 和 cookies
7. 提取关键 cookies (MUSIC_U, __csrf, MUSIC_A_T, MUSIC_R_T)
8. 调用 `handleLoginResponse()` 完成登录

## 关键 Cookies

登录成功后返回的关键 cookies:
- **MUSIC_U**: 用户认证令牌
- **__csrf**: CSRF 保护令牌
- **MUSIC_A_T**: 访问令牌
- **MUSIC_R_T**: 刷新令牌

这些 cookies 会被自动提取并通过 `setCookies()` 设置到应用中。

## 特点

1. **完全自定义**: 不使用原有的网易云 API
2. **强制执行**: 失败时不回退到默认 API，而是显示错误
3. **兼容性好**: 使用 ES5 兼容语法，避免可选链等现代特性
4. **完整日志**: 包含详细的调试日志

## 测试

可以使用以下命令测试模块:
```bash
nvm use 16 && node test/qr-login-test.js
```

或者直接运行 Electron 应用:
```bash
nvm use 16 && yarn electron:serve
```
