<template>
  <Modal
    :show="show"
    :close="close"
    :title="$t('modal.importCookie.title')"
    :click-outside-hide="false"
    width="600px"
  >
    <div class="cookie-import">
      <div class="description">
        {{ $t('modal.importCookie.description') }}
      </div>

      <div class="cookie-inputs">
        <div class="input-group">
          <label for="music_u">MUSIC_U</label>
          <input
            id="music_u"
            v-model="cookies.MUSIC_U"
            type="text"
            :placeholder="$t('modal.importCookie.required')"
          />
          <span class="required-mark">*</span>
        </div>

        <div class="input-group">
          <label for="csrf">__csrf</label>
          <input
            id="csrf"
            v-model="cookies.__csrf"
            type="text"
            :placeholder="$t('modal.importCookie.optional')"
          />
        </div>

        <div class="input-group">
          <label for="music_a_t">MUSIC_A_T</label>
          <input
            id="music_a_t"
            v-model="cookies.MUSIC_A_T"
            type="text"
            :placeholder="$t('modal.importCookie.optional')"
          />
        </div>

        <div class="input-group">
          <label for="music_r_t">MUSIC_R_T</label>
          <input
            id="music_r_t"
            v-model="cookies.MUSIC_R_T"
            type="text"
            :placeholder="$t('modal.importCookie.optional')"
          />
        </div>
      </div>

      <div class="tips">
        <div class="tip-title">{{ $t('modal.importCookie.tips.title') }}</div>
        <ol>
          <li v-html="$t('modal.importCookie.tips.step1')"></li>
          <li v-html="$t('modal.importCookie.tips.step2')"></li>
          <li v-html="$t('modal.importCookie.tips.step3')"></li>
          <li v-html="$t('modal.importCookie.tips.step4')"></li>
        </ol>
      </div>
    </div>

    <template #footer>
      <button class="cancel" @click="close">
        {{ $t('modal.importCookie.cancel') }}
      </button>
      <button class="primary" @click="importCookies">
        {{ $t('modal.importCookie.confirm') }}
      </button>
    </template>
  </Modal>
</template>

<script>
import Modal from '@/components/Modal.vue';
import { setCookies } from '@/utils/auth';

export default {
  name: 'ModalImportCookie',
  components: {
    Modal,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    close: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      cookies: {
        MUSIC_U: '',
        __csrf: '',
        MUSIC_A_T: '',
        MUSIC_R_T: '',
      },
    };
  },
  methods: {
    async importCookies() {
      console.log('[Cookie Import] ===== 开始 Cookie 导入流程 =====');
      console.log('[Cookie Import] 步骤 1: 验证输入数据');

      // 验证必填项
      if (!this.cookies.MUSIC_U.trim()) {
        console.error('[Cookie Import] 验证失败: MUSIC_U 为空');
        alert(this.$t('modal.importCookie.musicURequired'));
        return;
      }
      console.log('[Cookie Import] 验证通过: MUSIC_U 已填写');

      console.log('[Cookie Import] 步骤 2: 构建 Cookie 字符串');
      console.log('[Cookie Import] 输入的 Cookie 数据:', {
        MUSIC_U: this.cookies.MUSIC_U ? '***已填写***' : '未填写',
        __csrf: this.cookies.__csrf ? '***已填写***' : '未填写',
        MUSIC_A_T: this.cookies.MUSIC_A_T ? '***已填写***' : '未填写',
        MUSIC_R_T: this.cookies.MUSIC_R_T ? '***已填写***' : '未填写',
      });

      // 构建 cookie 字符串，格式需要与网易云 API 返回的格式一致
      // 注意：在非 music.163.com 域名下，document.cookie 无法设置跨域 cookie
      // 但 localStorage 可以正常使用，getCookie 函数会从 localStorage 读取
      // 所以只需要构建格式正确的 cookie 字符串给 setCookies 处理即可
      const cookieArray = [];

      if (this.cookies.MUSIC_U.trim()) {
        const musicUCookie = `MUSIC_U=${this.cookies.MUSIC_U.trim()}; Path=/`;
        cookieArray.push(musicUCookie);
        console.log('[Cookie Import] 添加 MUSIC_U Cookie');
      }
      if (this.cookies.__csrf.trim()) {
        const csrfCookie = `__csrf=${this.cookies.__csrf.trim()}; Path=/`;
        cookieArray.push(csrfCookie);
        console.log('[Cookie Import] 添加 __csrf Cookie');
      }
      if (this.cookies.MUSIC_A_T.trim()) {
        const musicATCookie = `MUSIC_A_T=${this.cookies.MUSIC_A_T.trim()}; Path=/`;
        cookieArray.push(musicATCookie);
        console.log('[Cookie Import] 添加 MUSIC_A_T Cookie');
      }
      if (this.cookies.MUSIC_R_T.trim()) {
        const musicRTCookie = `MUSIC_R_T=${this.cookies.MUSIC_R_T.trim()}; Path=/`;
        cookieArray.push(musicRTCookie);
        console.log('[Cookie Import] 添加 MUSIC_R_T Cookie');
      }

      // 使用 ;; 分隔符设置 cookies
      const cookieString = cookieArray.join(';;');
      console.log(
        '[Cookie Import] 构建的 Cookie 字符串长度:',
        cookieString.length
      );
      console.log('[Cookie Import] Cookie 数组长度:', cookieArray.length);

      try {
        console.log('[Cookie Import] 步骤 3: 设置 Cookie');
        console.log('[Cookie Import] 当前页面域名:', window.location.hostname);
        console.log('[Cookie Import] 当前页面协议:', window.location.protocol);

        // 记录设置前的状态
        console.log(
          '[Cookie Import] 设置前的 document.cookie:',
          document.cookie
        );
        console.log('[Cookie Import] 设置前的 localStorage 相关项:', {
          'cookie-MUSIC_U': localStorage.getItem('cookie-MUSIC_U'),
          'cookie-__csrf': localStorage.getItem('cookie-__csrf'),
          'cookie-MUSIC_A_T': localStorage.getItem('cookie-MUSIC_A_T'),
          'cookie-MUSIC_R_T': localStorage.getItem('cookie-MUSIC_R_T'),
        });

        // 设置 cookies
        setCookies(cookieString);
        console.log('[Cookie Import] setCookies 函数调用完成');

        // 验证 Cookie 是否设置成功
        console.log('[Cookie Import] 步骤 4: 验证 Cookie 设置结果');
        const cookieCheck = {
          MUSIC_U: document.cookie.includes('MUSIC_U'),
          __csrf: document.cookie.includes('__csrf'),
          MUSIC_A_T: document.cookie.includes('MUSIC_A_T'),
          MUSIC_R_T: document.cookie.includes('MUSIC_R_T'),
        };
        console.log('[Cookie Import] Cookie 验证结果:', cookieCheck);
        console.log(
          '[Cookie Import] 设置后的 document.cookie:',
          document.cookie
        );

        // 检查 localStorage
        const localStorageCheck = {
          'cookie-MUSIC_U': localStorage.getItem('cookie-MUSIC_U'),
          'cookie-__csrf': localStorage.getItem('cookie-__csrf'),
          'cookie-MUSIC_A_T': localStorage.getItem('cookie-MUSIC_A_T'),
          'cookie-MUSIC_R_T': localStorage.getItem('cookie-MUSIC_R_T'),
        };
        console.log(
          '[Cookie Import] 设置后的 localStorage 检查:',
          localStorageCheck
        );

        console.log('[Cookie Import] 步骤 5: 手动补充 localStorage 设置');
        // 如果 MUSIC_U 没有设置成功，直接设置localStorage
        if (!cookieCheck.MUSIC_U && this.cookies.MUSIC_U.trim()) {
          console.warn(
            '[Cookie Import] MUSIC_U Cookie 设置失败，使用 localStorage 备份'
          );
          localStorage.setItem(`cookie-MUSIC_U`, this.cookies.MUSIC_U.trim());
        } else {
          console.log('[Cookie Import] MUSIC_U Cookie 设置成功');
        }

        if (!cookieCheck.__csrf && this.cookies.__csrf.trim()) {
          console.warn(
            '[Cookie Import] __csrf Cookie 设置失败，使用 localStorage 备份'
          );
          localStorage.setItem(`cookie-__csrf`, this.cookies.__csrf.trim());
        }

        // 手动设置localStorage 作为备份
        if (this.cookies.MUSIC_A_T.trim()) {
          localStorage.setItem(
            `cookie-MUSIC_A_T`,
            this.cookies.MUSIC_A_T.trim()
          );
          console.log('[Cookie Import] MUSIC_A_T 已备份到 localStorage');
        }
        if (this.cookies.MUSIC_R_T.trim()) {
          localStorage.setItem(
            `cookie-MUSIC_R_T`,
            this.cookies.MUSIC_R_T.trim()
          );
          console.log('[Cookie Import] MUSIC_R_T 已备份到 localStorage');
        }

        console.log('[Cookie Import] 步骤 6: 更新应用登录状态');
        console.log(
          '[Cookie Import] 当前登录模式:',
          this.$store.state.data.loginMode
        );

        // 更新登录状态（必须在 Cookie 设置之后）
        this.$store.commit('updateData', {
          key: 'loginMode',
          value: 'account',
        });
        console.log('[Cookie Import] 登录状态已更新为: account');

        // 验证 getCookie 函数是否能正确读取
        console.log('[Cookie Import] 测试 getCookie 函数:');
        const { getCookie } = require('@/utils/auth');
        console.log(
          '[Cookie Import] getCookie(MUSIC_U):',
          getCookie('MUSIC_U') ? '***存在***' : '不存在'
        );
        console.log(
          '[Cookie Import] getCookie(__csrf):',
          getCookie('__csrf') ? '***存在***' : '不存在'
        );

        console.log('[Cookie Import] 步骤 7: 获取用户信息');
        // 获取用户信息（通过原项目的后端API）
        this.$store
          .dispatch('fetchUserProfile')
          .then(result => {
            console.log('[Cookie Import] fetchUserProfile 返回结果:', result);
            console.log('[Cookie Import] 用户信息获取成功');
            console.log(
              '[Cookie Import] 用户数据:',
              this.$store.state.data.user
            );

            // 确保用户信息已经加载
            if (
              !this.$store.state.data.user ||
              !this.$store.state.data.user.userId
            ) {
              const errorMsg = `用户信息加载失败 - user: ${!!this.$store.state
                .data.user}, userId: ${this.$store.state.data.user?.userId}`;
              console.error('[Cookie Import]', errorMsg);
              throw new Error(errorMsg);
            }

            console.log(
              '[Cookie Import] 用户验证通过, userId:',
              this.$store.state.data.user.userId
            );
            console.log('[Cookie Import] 步骤 8: 获取用户歌单');

            // 获取喜欢的歌单
            return this.$store.dispatch('fetchLikedPlaylist');
          })
          .then(playlistResult => {
            console.log(
              '[Cookie Import] fetchLikedPlaylist 返回结果:',
              playlistResult
            );
            console.log('[Cookie Import] 歌单获取成功');
            console.log('[Cookie Import] 步骤 9: 导入完成，准备跳转');

            // 导入成功后跳转到音乐库
            this.$router.push({ path: '/library' });
            this.close();

            console.log('[Cookie Import] 步骤 10: 重置表单');
            // 重置输入框
            this.cookies = {
              MUSIC_U: '',
              __csrf: '',
              MUSIC_A_T: '',
              MUSIC_R_T: '',
            };

            console.log('[Cookie Import] ===== Cookie 导入流程完成 =====');
            alert('Cookie 导入成功！');
          })
          .catch(error => {
            console.error('[Cookie Import] 步骤失败 - 错误详情:', {
              name: error.name,
              message: error.message,
              stack: error.stack,
              response: error.response,
            });

            // 如果是网络请求错误，显示更详细的信息
            if (error.response) {
              console.error('[Cookie Import] HTTP 响应错误:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                headers: error.response.headers,
              });
            }

            console.error('[Cookie Import] ===== Cookie 导入流程失败 =====');
            alert(
              this.$t('modal.importCookie.importFailed') + ': ' + error.message
            );
          });
      } catch (error) {
        console.error('[Cookie Import] 捕获异常:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
        console.error('[Cookie Import] ===== Cookie 导入流程异常结束 =====');
        alert(this.$t('modal.importCookie.importFailed'));
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cookie-import {
  .description {
    font-size: 14px;
    color: var(--color-text);
    margin-bottom: 24px;
    line-height: 1.6;
    opacity: 0.88;
  }

  .cookie-inputs {
    margin-bottom: 24px;

    .input-group {
      margin-bottom: 16px;
      position: relative;

      label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 8px;
      }

      input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        font-size: 14px;
        background: var(--color-secondary-bg-for-transparent);
        color: var(--color-text);
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          background: var(--color-primary-bg-for-transparent);
        }

        &::placeholder {
          color: var(--color-text);
          opacity: 0.38;
        }
      }

      .required-mark {
        position: absolute;
        right: 12px;
        top: 38px;
        color: #ef4444;
        font-weight: bold;
      }
    }
  }

  .tips {
    background: var(--color-secondary-bg-for-transparent);
    padding: 16px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--color-text);
    opacity: 0.88;

    .tip-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--color-primary);
    }

    ol {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 6px;
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

button {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &.cancel {
    background: transparent;
    color: var(--color-text);
    opacity: 0.68;
    margin-right: 12px;

    &:hover {
      opacity: 1;
      background: var(--color-secondary-bg-for-transparent);
    }
  }

  &.primary {
    background: var(--color-primary);
    color: white;

    &:hover {
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.98);
    }
  }
}
</style>
