// import store, { state, dispatch, commit } from "@/store";
import { isAccountLoggedIn, isLooseLoggedIn, getCookie } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getPlaylistDetail } from '@/api/playlist';
import { getTrackDetail } from '@/api/track';
import {
  userPlaylist,
  userPlayHistory,
  userLikedSongsIDs,
  likedAlbums,
  likedArtists,
  likedMVs,
  cloudDisk,
  userAccount,
} from '@/api/user';

export default {
  showToast({ state, commit }, text) {
    if (state.toast.timer !== null) {
      clearTimeout(state.toast.timer);
      commit('updateToast', { show: false, text: '', timer: null });
    }
    commit('updateToast', {
      show: true,
      text,
      timer: setTimeout(() => {
        commit('updateToast', {
          show: false,
          text: state.toast.text,
          timer: null,
        });
      }, 3200),
    });
  },
  likeATrack({ state, commit, dispatch }, id) {
    if (!isAccountLoggedIn()) {
      dispatch('showToast', '此操作需要登录网易云账号');
      return;
    }
    let like = true;
    if (state.liked.songs.includes(id)) like = false;
    likeATrack({ id, like })
      .then(() => {
        if (like === false) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: state.liked.songs.filter(d => d !== id),
          });
        } else {
          let newLikeSongs = state.liked.songs;
          newLikeSongs.push(id);
          commit('updateLikedXXX', {
            name: 'songs',
            data: newLikeSongs,
          });
        }
        dispatch('fetchLikedSongsWithDetails');
      })
      .catch(() => {
        dispatch('showToast', '操作失败，专辑下架或版权锁定');
      });
  },
  fetchLikedSongs: ({ state, commit }) => {
    if (!isLooseLoggedIn()) return;
    if (isAccountLoggedIn()) {
      const uid =
        state.data.user && (state.data.user.userId || state.data.user.id);
      return userLikedSongsIDs({ uid: uid }).then(result => {
        if (result.ids) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: result.ids,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedSongsWithDetails: ({ state, commit }) => {
    return getPlaylistDetail(state.data.likedSongPlaylistID, true).then(
      result => {
        if (
          result.playlist &&
          result.playlist.trackIds &&
          result.playlist.trackIds.length === 0
        ) {
          return new Promise(resolve => {
            resolve();
          });
        }
        return getTrackDetail(
          result.playlist.trackIds
            .slice(0, 12)
            .map(t => t.id)
            .join(',')
        ).then(result => {
          commit('updateLikedXXX', {
            name: 'songsWithDetails',
            data: result.songs,
          });
        });
      }
    );
  },
  fetchLikedPlaylist: ({ state, commit }) => {
    if (!isLooseLoggedIn()) return;
    if (isAccountLoggedIn()) {
      // 兼容两种数据结构：profile.userId 或 account.id
      const uid =
        state.data.user && (state.data.user.userId || state.data.user.id);

      if (!uid) {
        console.error('[fetchLikedPlaylist] 无法获取用户ID');
        return Promise.reject(new Error('用户ID不存在'));
      }

      return userPlaylist({
        uid: uid,
        limit: 2000, // 最多只加载2000个歌单（等有用户反馈问题再修）
        timestamp: new Date().getTime(),
      }).then(result => {
        if (result.playlist) {
          commit('updateLikedXXX', {
            name: 'playlists',
            data: result.playlist,
          });
          // 更新用户”喜欢的歌曲“歌单ID
          commit('updateData', {
            key: 'likedSongPlaylistID',
            value: result.playlist[0].id,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedAlbums: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedAlbums({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'albums',
          data: result.data,
        });
      }
    });
  },
  fetchLikedArtists: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedArtists({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'artists',
          data: result.data,
        });
      }
    });
  },
  fetchLikedMVs: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return likedMVs({ limit: 1000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'mvs',
          data: result.data,
        });
      }
    });
  },
  fetchCloudDisk: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    // FIXME: #1242
    return cloudDisk({ limit: 1000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'cloudDisk',
          data: result.data,
        });
      }
    });
  },
  fetchPlayHistory: ({ state, commit }) => {
    if (!isAccountLoggedIn()) return;
    const uid =
      state.data.user && (state.data.user.userId || state.data.user.id);
    return Promise.all([
      userPlayHistory({
        uid: uid,
        type: 0,
      }),
      userPlayHistory({
        uid: uid,
        type: 1,
      }),
    ]).then(result => {
      const data = {};
      const dataType = { 0: 'allData', 1: 'weekData' };
      if (result[0] && result[1]) {
        for (let i = 0; i < result.length; i++) {
          const songData = result[i][dataType[i]].map(item => {
            const song = item.song;
            song.playCount = item.playCount;
            return song;
          });
          data[[dataType[i]]] = songData;
        }
        commit('updateLikedXXX', {
          name: 'playHistory',
          data: data,
        });
      }
    });
  },
  fetchUserProfile: ({ commit, state }) => {
    console.log('[fetchUserProfile] 开始获取用户信息');
    console.log('[fetchUserProfile] 当前登录状态检查:', {
      isAccountLoggedIn: isAccountLoggedIn(),
      loginMode: state.data.loginMode,
      hasMUSIC_U: !!getCookie('MUSIC_U'),
    });

    if (!isAccountLoggedIn()) {
      console.warn('[fetchUserProfile] 用户未登录，跳过获取用户信息');
      return Promise.reject(new Error('用户未登录'));
    }

    console.log('[fetchUserProfile] 调用 userAccount API');
    return userAccount()
      .then(result => {
        console.log('[fetchUserProfile] userAccount API 响应:', {
          code: result.code,
          hasAccount: !!result.account,
          hasProfile: !!result.profile,
          accountKeys: result.account ? Object.keys(result.account) : [],
          profileKeys: result.profile ? Object.keys(result.profile) : [],
          userId: result.profile?.userId || result.account?.id,
          nickname: result.profile?.nickname || result.account?.userName,
        });

        if (result.code === 200) {
          console.log('[fetchUserProfile] 用户信息获取成功，更新 store');
          // 后端API返回的数据结构：{ code: 200, account: {...}, profile: {...} }
          // 优先使用 profile，如果不存在则使用 account
          const userProfile = result.profile || result.account;

          if (!userProfile) {
            console.error('[fetchUserProfile] 返回数据中没有用户信息');
            throw new Error('用户信息为空');
          }

          commit('updateData', { key: 'user', value: userProfile });
          return result;
        } else {
          console.error(
            '[fetchUserProfile] API 返回错误码:',
            result.code,
            result.msg || result.message
          );
          throw new Error(
            `API 错误: ${result.code} - ${result.msg || result.message}`
          );
        }
      })
      .catch(error => {
        console.error('[fetchUserProfile] 获取用户信息失败:', error);
        throw error;
      });
  },
};
