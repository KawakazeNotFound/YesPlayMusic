<template>
  <div class="player" @click="toggleLyrics">
    <div
      class="progress-bar"
      :class="{
        nyancat: settings.nyancatStyle,
        'nyancat-stop': settings.nyancatStyle && !player.playing,
      }"
      @click.stop
    >
      <vue-slider
        v-model="player.progress"
        :min="0"
        :max="player.currentTrackDuration"
        :interval="1"
        :drag-on-click="true"
        :duration="0"
        :dot-size="12"
        :height="2"
        :tooltip-formatter="formatTrackTime"
        :lazy="true"
        :silent="true"
      ></vue-slider>
    </div>
    <div class="controls">
      <div class="playing">
        <div class="container" @click.stop>
          <img
            :src="currentTrack.al && currentTrack.al.picUrl | resizeImage(224)"
            loading="lazy"
            @click="goToAlbum"
          />
          <div class="track-info" :title="audioSource">
            <div
              :class="['name', { 'has-list': hasList() }]"
              @click="hasList() && goToList()"
            >
              {{ currentTrack.name }}
            </div>
            <div class="artist">
              <span
                v-for="(ar, index) in currentTrack.ar"
                :key="ar.id"
                @click="ar.id && goToArtist(ar.id)"
              >
                <span :class="{ ar: ar.id }"> {{ ar.name }} </span
                ><span v-if="index !== currentTrack.ar.length - 1">, </span>
              </span>
            </div>
          </div>
          <div class="like-button">
            <button-icon
              :title="
                player.isCurrentTrackLiked
                  ? $t('player.unlike')
                  : $t('player.like')
              "
              @click.native="likeATrack(player.currentTrack.id)"
            >
              <svg-icon
                v-show="!player.isCurrentTrackLiked"
                icon-class="heart"
              ></svg-icon>
              <svg-icon
                v-show="player.isCurrentTrackLiked"
                icon-class="heart-solid"
              ></svg-icon>
            </button-icon>
          </div>
        </div>
        <div class="blank"></div>
      </div>
      <div class="middle-control-buttons">
        <div class="blank"></div>
        <div class="container" @click.stop>
          <button-icon
            v-show="!player.isPersonalFM"
            :title="$t('player.previous')"
            @click.native="playPrevTrack"
            ><svg-icon icon-class="previous"
          /></button-icon>
          <button-icon
            v-show="player.isPersonalFM"
            title="不喜欢"
            @click.native="moveToFMTrash"
            ><svg-icon icon-class="thumbs-down"
          /></button-icon>
          <button-icon
            class="play"
            :title="$t(player.playing ? 'player.pause' : 'player.play')"
            @click.native="playOrPause"
          >
            <svg-icon :icon-class="player.playing ? 'pause' : 'play'"
          /></button-icon>
          <button-icon :title="$t('player.next')" @click.native="playNextTrack"
            ><svg-icon icon-class="next"
          /></button-icon>
        </div>
        <div class="blank"></div>
      </div>
      <div class="right-control-buttons">
        <div class="blank"></div>
        <div class="container" @click.stop>
          <button-icon
            :title="$t('player.nextUp')"
            :class="{
              active: $route.name === 'next',
              disabled: player.isPersonalFM,
            }"
            @click.native="goToNextTracksPage"
            ><svg-icon icon-class="list"
          /></button-icon>
          <!-- 私人FM按钮 -->
          <button-icon
            :class="{ active: player.isPersonalFM }"
            title="私人FM"
            @click.native="togglePersonalFM"
          >
            <svg-icon icon-class="fm" />
          </button-icon>
          <!-- 心动模式按钮 - 只在播放歌单时显示 -->
          <button-icon
            v-if="isPlaylistPlaying"
            :class="{ disabled: player.isPersonalFM }"
            :title="$t('contextMenu.cardiacMode')"
            @click.native="startIntelligenceMode"
          >
            <svg-icon icon-class="intelligence" />
          </button-icon>
          <!-- 统一的播放模式切换按钮(不包含私人FM) -->
          <button-icon
            :class="{
              active: currentPlayMode.name !== 'order',
              disabled: player.isPersonalFM,
            }"
            :title="currentPlayMode.label"
            @click.native="cyclePlayMode"
          >
            <svg-icon :icon-class="currentPlayMode.icon" />
          </button-icon>
          <button-icon
            v-if="settings.enableReversedMode && !player.isPersonalFM"
            :class="{ active: player.reversed }"
            :title="$t('player.reversed')"
            @click.native="switchReversed"
            ><svg-icon icon-class="sort-up"
          /></button-icon>
          <div class="volume-control">
            <button-icon :title="$t('player.mute')" @click.native="mute">
              <svg-icon v-show="volume > 0.5" icon-class="volume" />
              <svg-icon v-show="volume === 0" icon-class="volume-mute" />
              <svg-icon
                v-show="volume <= 0.5 && volume !== 0"
                icon-class="volume-half"
              />
            </button-icon>
            <div class="volume-bar">
              <vue-slider
                v-model="volume"
                :min="0"
                :max="1"
                :interval="0.01"
                :drag-on-click="true"
                :duration="0"
                tooltip="none"
                :dot-size="12"
              ></vue-slider>
            </div>
          </div>

          <button-icon
            class="lyrics-button"
            title="歌词"
            style="margin-left: 12px"
            @click.native="toggleLyrics"
            ><svg-icon icon-class="arrow-up"
          /></button-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import '@/assets/css/slider.css';

import ButtonIcon from '@/components/ButtonIcon.vue';
import VueSlider from 'vue-slider-component';
import { goToListSource, hasListSource } from '@/utils/playList';
import { formatTrackTime } from '@/utils/common';

export default {
  name: 'Player',
  components: {
    ButtonIcon,
    VueSlider,
  },
  computed: {
    ...mapState(['player', 'settings', 'data']),
    currentTrack() {
      return this.player.currentTrack;
    },
    volume: {
      get() {
        return this.player.volume;
      },
      set(value) {
        this.player.volume = value;
      },
    },
    playing() {
      return this.player.playing;
    },
    audioSource() {
      return this.player._howler?._src.includes('kuwo.cn')
        ? '音源来自酷我音乐'
        : '';
    },
    // 当前播放模式信息
    currentPlayMode() {
      if (this.player.isPersonalFM) {
        return {
          name: 'personalFM',
          icon: 'fm',
          label: '私人FM',
        };
      }
      if (this.player.shuffle) {
        return {
          name: 'shuffle',
          icon: 'shuffle',
          label: this.$t('player.shuffle'),
        };
      }
      if (this.player.repeatMode === 'one') {
        return {
          name: 'repeat-one',
          icon: 'repeat-1',
          label: this.$t('player.repeatTrack'),
        };
      }
      if (this.player.repeatMode === 'on') {
        return {
          name: 'repeat-on',
          icon: 'repeat',
          label: this.$t('player.repeat'),
        };
      }
      // 默认：顺序播放
      return {
        name: 'order',
        icon: 'play-in-order',
        label: '顺序播放',
      };
    },
    // 判断当前是否在播放歌单（用于显示心动模式按钮）
    isPlaylistPlaying() {
      return (
        !this.player.isPersonalFM &&
        this.player.playlistSource?.type === 'playlist' &&
        this.player.playlistSource?.id
      );
    },
  },
  mounted() {
    this.setupMediaControls();
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    ...mapMutations(['toggleLyrics']),
    ...mapActions(['showToast', 'likeATrack']),
    playPrevTrack() {
      this.player.playPrevTrack();
    },
    playOrPause() {
      this.player.playOrPause();
    },
    playNextTrack() {
      if (this.player.isPersonalFM) {
        this.player.playNextFMTrack();
      } else {
        this.player.playNextTrack();
      }
    },
    goToNextTracksPage() {
      if (this.player.isPersonalFM) return;
      this.$route.name === 'next'
        ? this.$router.go(-1)
        : this.$router.push({ name: 'next' });
    },
    formatTrackTime(value) {
      return formatTrackTime(value);
    },
    hasList() {
      return hasListSource();
    },
    goToList() {
      goToListSource();
    },
    goToAlbum() {
      if (this.player.currentTrack.al.id === 0) return;
      this.$router.push({ path: '/album/' + this.player.currentTrack.al.id });
    },
    goToArtist(id) {
      this.$router.push({ path: '/artist/' + id });
    },
    moveToFMTrash() {
      this.player.moveToFMTrash();
    },
    switchRepeatMode() {
      this.player.switchRepeatMode();
    },
    switchShuffle() {
      this.player.switchShuffle();
    },
    switchReversed() {
      this.player.switchReversed();
    },
    mute() {
      this.player.mute();
    },
    cyclePlayMode() {
      // 如果当前是私人FM，不允许通过此按钮切换模式
      if (this.player.isPersonalFM) {
        this.showToast('请先退出私人FM');
        return;
      }

      const currentMode = this.currentPlayMode.name;

      // 播放模式切换顺序：顺序播放 -> 列表循环 -> 单曲循环 -> 随机播放 -> 顺序播放
      switch (currentMode) {
        case 'order':
          // 顺序播放 -> 列表循环
          this.player.repeatMode = 'on';
          this.showToast(this.$t('player.repeat'));
          break;
        case 'repeat-on':
          // 列表循环 -> 单曲循环
          this.player.repeatMode = 'one';
          this.showToast(this.$t('player.repeatTrack'));
          break;
        case 'repeat-one':
          // 单曲循环 -> 随机播放
          this.player.repeatMode = 'off';
          this.player.shuffle = true;
          this.showToast(this.$t('player.shuffle'));
          break;
        case 'shuffle':
          // 随机播放 -> 顺序播放
          this.player.shuffle = false;
          this.player.repeatMode = 'off';
          this.showToast('顺序播放');
          break;
        default:
          // 默认切换到顺序播放
          this.player.repeatMode = 'off';
          this.player.shuffle = false;
          this.showToast('顺序播放');
          break;
      }
    },
    togglePersonalFM() {
      if (this.player.isPersonalFM) {
        // 退出私人FM，恢复到普通播放模式
        this.player._isPersonalFM = false;
        // 如果有播放列表，继续播放列表中的歌曲
        if (this.player.list.length > 0) {
          this.player.playOrPause();
        }
        this.showToast('已退出私人FM');
      } else {
        // 进入私人FM
        this.player.playPersonalFM();
        this.showToast('私人FM');
      }
    },
    startIntelligenceMode() {
      if (this.player.isPersonalFM) {
        this.showToast('私人FM模式下无法使用心动模式');
        return;
      }
      if (!this.isPlaylistPlaying) {
        this.showToast('请先播放歌单');
        return;
      }
      // 基于当前歌单生成心动模式播放列表
      const playlistId = this.player.playlistSource.id;
      this.player.playIntelligenceListById(
        playlistId,
        this.player.currentTrackID
      );
      this.showToast(this.$t('contextMenu.cardiacMode'));
    },

    setupMediaControls() {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          this.playOrPause();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.playOrPause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.playPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.playNextTrack();
        });
      }
    },

    handleKeydown(event) {
      switch (event.code) {
        case 'MediaPlayPause':
          this.playOrPause();
          break;
        case 'MediaTrackPrevious':
          this.playPrevTrack();
          break;
        case 'MediaTrackNext':
          this.playNextTrack();
          break;
        default:
          break;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.player {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 64px;
  backdrop-filter: saturate(180%) blur(30px);
  // background-color: rgba(255, 255, 255, 0.86);
  background-color: var(--color-navbar-bg);
  z-index: 100;
}

@supports (-moz-appearance: none) {
  .player {
    background-color: var(--color-body-bg);
  }
}

.progress-bar {
  margin-top: -6px;
  margin-bottom: -6px;
  width: 100%;
}

.controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 100%;
  padding: {
    right: 10vw;
    left: 10vw;
  }
}

@media (max-width: 1336px) {
  .controls {
    padding: 0 5vw;
  }
}

.blank {
  flex-grow: 1;
}

.playing {
  display: flex;
}

.playing .container {
  display: flex;
  align-items: center;
  img {
    height: 46px;
    border-radius: 5px;
    box-shadow: 0 6px 8px -2px rgba(0, 0, 0, 0.16);
    cursor: pointer;
    user-select: none;
  }
  .track-info {
    height: 46px;
    margin-left: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    .name {
      font-weight: 600;
      font-size: 16px;
      opacity: 0.88;
      color: var(--color-text);
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
      word-break: break-all;
    }
    .has-list {
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }
    .artist {
      font-size: 12px;
      opacity: 0.58;
      color: var(--color-text);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
      word-break: break-all;
      span.ar {
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.middle-control-buttons {
  display: flex;
}

.middle-control-buttons .container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  .button-icon {
    margin: 0 8px;
  }
  .play {
    height: 42px;
    width: 42px;
    .svg-icon {
      width: 24px;
      height: 24px;
    }
  }
}

.right-control-buttons {
  display: flex;
}

.right-control-buttons .container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  .expand {
    margin-left: 24px;
    .svg-icon {
      height: 24px;
      width: 24px;
    }
  }
  .active .svg-icon {
    color: var(--color-primary);
  }
  .volume-control {
    margin-left: 4px;
    display: flex;
    align-items: center;
    .volume-bar {
      width: 84px;
    }
  }
}

.like-button {
  margin-left: 16px;
}

.button-icon.disabled {
  cursor: default;
  opacity: 0.38;
  &:hover {
    background: none;
  }
  &:active {
    transform: unset;
  }
}
</style>
