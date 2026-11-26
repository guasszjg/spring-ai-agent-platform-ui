<template>
  <div v-if="mediaItems.length" class="fmg-root">
    <!-- 顶部紧凑统计头 -->
    <div class="fmg-header">
      <div class="fmg-header-left">
        <i class="fa-solid fa-photo-film"></i>
        <span>参考附件</span>
        <span v-if="validImages.length" class="fmg-count-pill">
          <i class="fa-regular fa-image"></i> {{ validImages.length }} 张图片
        </span>
        <span v-if="validVideos.length" class="fmg-count-pill fmg-count-video">
          <i class="fa-solid fa-film"></i> {{ validVideos.length }} 个视频
        </span>
      </div>
      <div class="fmg-header-right">
        <button
          v-if="mediaItems.length > 1"
          type="button"
          class="fmg-auto-toggle"
          :class="{ active: autoPlay }"
          :title="autoPlay ? '当前：图片自动轮播、视频播完自动切换，点击暂停' : '当前：已暂停自动切换，点击恢复'"
          @click="toggleAutoPlay"
        >
          <i :class="autoPlay ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
          <span>{{ autoPlay ? '自动轮播中' : '已暂停轮播' }}</span>
        </button>
      </div>
    </div>

    <!-- 统一 16:9 大号多媒体主舞台（图片与视频共用，高度稳定零抖动） -->
    <div
      class="fmg-player-card"
      @mouseenter="stageHovered = true"
      @mouseleave="stageHovered = false"
    >
      <div class="fmg-stage">
        <!-- 左上角媒体类型标签 -->
        <div class="fmg-stage-badge" :class="'badge-' + currentItem.type">
          <i :class="currentItem.type === 'video' ? 'fa-solid fa-film' : 'fa-regular fa-image'"></i>
          <span>{{ currentItem.type === 'video' ? `视频 ${currentItem.typeIndex + 1}/${validVideos.length}` : `图片 ${currentItem.typeIndex + 1}/${validImages.length}` }}</span>
        </div>

        <!-- 右上角总序号 + 操作 -->
        <div class="fmg-stage-top-right">
          <span v-if="mediaItems.length > 1" class="fmg-counter-badge">
            {{ currentIndex + 1 }} / {{ mediaItems.length }}
          </span>
          <button
            v-if="currentItem.type === 'image' && !brokenImages.has(currentItem.url)"
            type="button"
            class="fmg-stage-icon-btn"
            title="全屏查看大图"
            @click="openLightbox(currentItem.typeIndex)"
          >
            <i class="fa-solid fa-expand"></i>
          </button>
          <a
            :href="currentItem.url"
            target="_blank"
            rel="noopener"
            class="fmg-stage-icon-btn"
            :title="currentItem.type === 'video' ? '新窗口打开视频' : '新窗口查看原图'"
          >
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
        </div>

        <!-- 左右切换箭头（垂直居中偏上，避开底部原生视频控制条） -->
        <button
          v-if="mediaItems.length > 1"
          type="button"
          class="fmg-nav-btn fmg-nav-prev"
          title="上一项"
          aria-label="上一项"
          @click="prevItem"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <!-- 主画面：图片或视频 -->
        <Transition name="fmg-fade" mode="out-in">
          <div
            v-if="currentItem.type === 'image'"
            :key="'img-' + currentIndex + '-' + currentItem.url"
            class="fmg-media-frame fmg-image-frame"
          >
            <div v-if="brokenImages.has(currentItem.url)" class="fmg-media-error">
              <i class="fa-regular fa-image"></i>
              <span>图片加载失败</span>
              <a :href="currentItem.url" target="_blank" rel="noopener" class="fmg-ext-link">新窗口打开</a>
            </div>
            <button
              v-else
              type="button"
              class="fmg-image-trigger"
              title="点击放大查看原图"
              @click="openLightbox(currentItem.typeIndex)"
            >
              <img
                :src="currentItem.url"
                :alt="`FAQ 回答附图 ${currentItem.typeIndex + 1}`"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="markImageBroken(currentItem.url)"
              />
            </button>
          </div>

          <div
            v-else
            :key="'vid-' + currentIndex + '-' + currentItem.url"
            class="fmg-media-frame fmg-video-frame"
          >
            <video
              ref="videoRef"
              :src="currentItem.url"
              class="fmg-video-el"
              controls
              autoplay
              preload="auto"
              playsinline
              @play="onVideoPlay"
              @volumechange="onVideoVolumeChange"
              @ended="onVideoEnded"
              @error="onVideoError"
              @loadedmetadata="videoLoadFailed = false"
              @canplay="onVideoCanPlay"
            ></video>
            <button
              v-if="mutedFallbackActive && !videoLoadFailed"
              type="button"
              class="fmg-unmute-pill"
              title="点击取消静音"
              @click="unmuteVideo"
            >
              <i class="fa-solid fa-volume-xmark"></i>
              <span>已静音自动播放 · 点击开启声音</span>
            </button>
            <div v-if="videoLoadFailed" class="fmg-media-error">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>视频加载失败，可能因格式不兼容或外链限制</span>
              <a :href="currentItem.url" target="_blank" rel="noopener" class="fmg-ext-link">新窗口打开</a>
            </div>
          </div>
        </Transition>

        <button
          v-if="mediaItems.length > 1"
          type="button"
          class="fmg-nav-btn fmg-nav-next"
          title="下一项"
          aria-label="下一项"
          @click="nextItem"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <!-- 图片自动轮播底部进度条 -->
        <div
          v-if="currentItem.type === 'image' && mediaItems.length > 1 && autoPlay && !stageHovered && !lightboxOpen"
          :key="progressRunKey"
          class="fmg-stage-progress"
          :style="{ animationDuration: effectiveIntervalMs + 'ms' }"
        ></div>
      </div>

      <!-- 底部可视化缩略图导航条（多项时展示） -->
      <div v-if="mediaItems.length > 1" class="fmg-thumb-bar">
        <div class="fmg-thumb-strip">
          <button
            v-for="(item, idx) in mediaItems"
            :key="item.type + '-' + idx + '-' + item.url"
            type="button"
            class="fmg-thumb-item"
            :class="['thumb-' + item.type, { active: idx === currentIndex }]"
            :title="item.label"
            @click="goToItem(idx)"
          >
            <template v-if="item.type === 'image'">
              <img
                v-if="!brokenImages.has(item.url)"
                :src="item.url"
                :alt="item.label"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="markImageBroken(item.url)"
              />
              <span v-else class="fmg-thumb-fallback"><i class="fa-regular fa-image"></i></span>
              <span class="fmg-thumb-index">{{ item.typeIndex + 1 }}</span>
            </template>
            <template v-else>
              <video :src="item.url" muted preload="metadata" class="fmg-thumb-video"></video>
              <span class="fmg-thumb-video-overlay">
                <i class="fa-solid fa-play"></i>
                <small>视频{{ item.typeIndex + 1 }}</small>
              </span>
            </template>
          </button>
        </div>
        <div class="fmg-thumb-caption" :title="currentItem.url">
          {{ currentItem.label }}
        </div>
      </div>

      <!-- 单项时简洁底部信息条 -->
      <div v-else class="fmg-single-bar">
        <span class="fmg-single-label" :title="currentItem.url">
          <i :class="currentItem.type === 'video' ? 'fa-solid fa-film' : 'fa-regular fa-image'"></i>
          {{ currentItem.label }}
        </span>
      </div>
    </div>

    <!-- 图片大图灯箱 -->
    <Teleport to="body">
      <div v-if="lightboxOpen && validImages.length" class="fmg-lightbox" @click="closeLightbox">
        <div class="fmg-lightbox-inner" @click.stop>
          <button
            v-if="validImages.length > 1"
            type="button"
            class="fmg-lb-nav fmg-lb-prev"
            title="上一张 (←)"
            @click="lightboxPrev"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <img
            :src="validImages[lightboxIndex]"
            :alt="`FAQ 附图 ${lightboxIndex + 1}`"
            class="fmg-lb-img"
            referrerpolicy="no-referrer"
          />

          <button
            v-if="validImages.length > 1"
            type="button"
            class="fmg-lb-nav fmg-lb-next"
            title="下一张 (→)"
            @click="lightboxNext"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <div class="fmg-lb-toolbar">
            <span v-if="validImages.length > 1" class="fmg-lb-counter">
              {{ lightboxIndex + 1 }} / {{ validImages.length }}
            </span>
            <a
              :href="validImages[lightboxIndex]"
              target="_blank"
              rel="noopener"
              class="fmg-lb-action"
              title="新窗口查看原图"
            >
              <i class="fa-solid fa-up-right-from-square"></i> 原图
            </a>
            <button type="button" class="fmg-lb-action fmg-lb-close" title="关闭 (Esc)" @click="closeLightbox">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  videos: { type: Array, default: () => [] },
  autoIntervalMs: { type: Number, default: 3500 },
  autoPlayVideo: { type: Boolean, default: true }
})

const PLAY_EVENT_NAME = 'faq-media-gallery:play'
const instanceId = `fmg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const validImages = computed(() =>
  (Array.isArray(props.images) ? props.images : []).filter(u => typeof u === 'string' && u.trim())
)
const validVideos = computed(() =>
  (Array.isArray(props.videos) ? props.videos : []).filter(u => typeof u === 'string' && u.trim())
)

function extractName(url, fallback) {
  if (!url) return fallback
  try {
    const clean = url.split('?')[0].split('#')[0]
    const seg = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1))
    if (seg && seg.length <= 42) return seg
  } catch { /* ignore */ }
  return fallback
}

// 统一媒体播放列表：先全部图片，再全部视频，依次循环
const mediaItems = computed(() => {
  const list = []
  validImages.value.forEach((url, idx) => {
    list.push({
      type: 'image',
      url,
      typeIndex: idx,
      label: extractName(url, `图片 ${idx + 1}`)
    })
  })
  validVideos.value.forEach((url, idx) => {
    list.push({
      type: 'video',
      url,
      typeIndex: idx,
      label: extractName(url, `视频 ${idx + 1}`)
    })
  })
  return list
})

const effectiveIntervalMs = computed(() => Math.max(1800, props.autoIntervalMs))

const currentIndex = ref(0)
const autoPlay = ref(true)
const stageHovered = ref(false)
const progressRunKey = ref(0)
const brokenImages = ref(new Set())
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const videoRef = ref(null)
const videoLoadFailed = ref(false)
const mutedFallbackActive = ref(false)
let imageTimer = null
let pendingAutoPlayVideo = false

const currentItem = computed(() => mediaItems.value[currentIndex.value] || mediaItems.value[0] || { type: 'image', url: '', typeIndex: 0, label: '' })

function markImageBroken(url) {
  if (!url) return
  const next = new Set(brokenImages.value)
  next.add(url)
  brokenImages.value = next
}

function stopImageTimer() {
  if (imageTimer) {
    clearTimeout(imageTimer)
    imageTimer = null
  }
}

function scheduleImageAdvance() {
  stopImageTimer()
  if (mediaItems.value.length <= 1 || !autoPlay.value) return
  if (currentItem.value?.type !== 'image') return
  if (stageHovered.value || lightboxOpen.value) return
  progressRunKey.value += 1
  imageTimer = setTimeout(() => {
    if (currentItem.value?.type === 'image' && autoPlay.value && !stageHovered.value && !lightboxOpen.value) {
      goToItem((currentIndex.value + 1) % mediaItems.value.length)
    }
  }, effectiveIntervalMs.value)
}

async function tryAutoPlayVideo() {
  const el = videoRef.value
  if (!el || currentItem.value?.type !== 'video' || videoLoadFailed.value) return
  pendingAutoPlayVideo = false
  try {
    el.muted = false
    await el.play()
    mutedFallbackActive.value = false
  } catch {
    try {
      el.muted = true
      await el.play()
      mutedFallbackActive.value = true
    } catch {
      /* 保持原生播放控件可用 */
    }
  }
}

function unmuteVideo() {
  const el = videoRef.value
  if (!el) return
  el.muted = false
  mutedFallbackActive.value = false
  if (el.paused) {
    el.play().catch(() => {})
  }
}

function onVideoPlay() {
  window.dispatchEvent(new CustomEvent(PLAY_EVENT_NAME, { detail: instanceId }))
}

function onVideoVolumeChange() {
  const el = videoRef.value
  if (el && !el.muted) mutedFallbackActive.value = false
}

function onVideoCanPlay() {
  if (pendingAutoPlayVideo) {
    tryAutoPlayVideo()
  }
}

function onOtherVideoPlay(e) {
  if (e?.detail && e.detail !== instanceId && videoRef.value && !videoRef.value.paused) {
    try { videoRef.value.pause() } catch { /* ignore */ }
  }
}

function onVideoEnded() {
  if (!autoPlay.value) return
  if (mediaItems.value.length > 1) {
    goToItem((currentIndex.value + 1) % mediaItems.value.length)
  } else if (videoRef.value) {
    // 单视频自动循环播放
    videoRef.value.currentTime = 0
    tryAutoPlayVideo()
  }
}

function onVideoError() {
  videoLoadFailed.value = true
  pendingAutoPlayVideo = false
}

function activateCurrentSlide(shouldAutoPlayVideo = true) {
  stopImageTimer()
  videoLoadFailed.value = false
  mutedFallbackActive.value = false
  const item = currentItem.value
  if (!item || !item.url) return
  if (item.type === 'image') {
    scheduleImageAdvance()
  } else if (shouldAutoPlayVideo && props.autoPlayVideo) {
    pendingAutoPlayVideo = true
    nextTick(() => tryAutoPlayVideo())
  }
}

function goToItem(idx) {
  if (!mediaItems.value.length) return
  if (videoRef.value && !videoRef.value.paused) {
    try { videoRef.value.pause() } catch { /* ignore */ }
  }
  const safeIdx = ((idx % mediaItems.value.length) + mediaItems.value.length) % mediaItems.value.length
  currentIndex.value = safeIdx
  activateCurrentSlide(true)
}

function prevItem() {
  goToItem(currentIndex.value - 1)
}

function nextItem() {
  goToItem(currentIndex.value + 1)
}

function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value
  if (autoPlay.value) {
    if (currentItem.value?.type === 'image') {
      scheduleImageAdvance()
    } else if (videoRef.value && videoRef.value.paused) {
      tryAutoPlayVideo()
    }
  } else {
    stopImageTimer()
  }
}

function openLightbox(imgIdx) {
  if (!validImages.value.length) return
  lightboxIndex.value = Math.max(0, Math.min(validImages.value.length - 1, imgIdx))
  lightboxOpen.value = true
  stopImageTimer()
}

function closeLightbox() {
  lightboxOpen.value = false
  scheduleImageAdvance()
}

function lightboxPrev() {
  if (!validImages.value.length) return
  lightboxIndex.value = (lightboxIndex.value - 1 + validImages.value.length) % validImages.value.length
}

function lightboxNext() {
  if (!validImages.value.length) return
  lightboxIndex.value = (lightboxIndex.value + 1) % validImages.value.length
}

function onKeydown(e) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') lightboxPrev()
  else if (e.key === 'ArrowRight') lightboxNext()
}

watch(mediaItems, (list) => {
  if (currentIndex.value >= list.length) currentIndex.value = 0
  activateCurrentSlide(true)
}, { immediate: true })

watch(stageHovered, (hovered) => {
  if (currentItem.value?.type !== 'image') return
  if (hovered) stopImageTimer()
  else scheduleImageAdvance()
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener(PLAY_EVENT_NAME, onOtherVideoPlay)
  activateCurrentSlide(true)
})

onUnmounted(() => {
  stopImageTimer()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener(PLAY_EVENT_NAME, onOtherVideoPlay)
})
</script>

<style scoped>
.fmg-root {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 680px;
}

.fmg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.fmg-header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted, #64748b);
}

.fmg-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fmg-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.fmg-count-video {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.24);
}

.fmg-auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #ffffff);
  color: var(--text-muted, #64748b);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.fmg-auto-toggle.active {
  color: var(--accent-blue, #3b82f6);
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
}

/* 统一卡片容器 */
.fmg-player-card {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-card, #ffffff);
  box-shadow: 0 10px 30px -14px rgba(15, 23, 42, 0.22);
}

/* 16:9 影院主舞台 */
.fmg-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 280px;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.fmg-media-frame {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fmg-image-trigger {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fmg-image-trigger img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.fmg-video-el {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}

/* 顶部浮层角标与按钮 */
.fmg-stage-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.fmg-stage-badge.badge-video {
  background: rgba(109, 40, 217, 0.78);
  border-color: rgba(196, 181, 253, 0.32);
}

.fmg-stage-top-right {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fmg-counter-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.fmg-stage-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(15, 23, 42, 0.65);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  backdrop-filter: blur(6px);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.fmg-stage-icon-btn:hover {
  background: rgba(59, 130, 246, 0.85);
  border-color: rgba(147, 197, 253, 0.5);
}

/* 左右切换按钮（偏上 46%，避免遮挡底部视频控制栏） */
.fmg-nav-btn {
  position: absolute;
  top: 46%;
  transform: translateY(-50%);
  z-index: 4;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  backdrop-filter: blur(6px);
  transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.fmg-nav-btn:hover {
  background: rgba(59, 130, 246, 0.88);
  transform: translateY(-50%) scale(1.06);
}

.fmg-nav-prev { left: 12px; }
.fmg-nav-next { right: 12px; }

/* 图片自动轮播底部进度条 */
.fmg-stage-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 0;
  z-index: 4;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  animation-name: fmg-progress-fill;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  pointer-events: none;
}

@keyframes fmg-progress-fill {
  from { width: 0%; }
  to { width: 100%; }
}

.fmg-fade-enter-active,
.fmg-fade-leave-active {
  transition: opacity 0.26s ease;
}

.fmg-fade-enter-from,
.fmg-fade-leave-to {
  opacity: 0;
}

.fmg-unmute-pill {
  position: absolute;
  top: 46px;
  left: 12px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s ease;
}

.fmg-unmute-pill:hover {
  background: rgba(59, 130, 246, 0.9);
}

.fmg-media-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #cbd5e1;
  font-size: 13px;
  text-align: center;
}

.fmg-ext-link {
  color: #60a5fa;
  text-decoration: underline;
}

/* 底部可视化缩略图条 */
.fmg-thumb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #ffffff);
}

.fmg-thumb-strip {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
  flex: 1;
  min-width: 0;
}

.fmg-thumb-item {
  position: relative;
  width: 62px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 7px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  background: #0f172a;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.fmg-thumb-item:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.fmg-thumb-item.active {
  opacity: 1;
  border-color: var(--accent-blue, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.fmg-thumb-item.thumb-video.active {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.22);
}

.fmg-thumb-item img,
.fmg-thumb-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fmg-thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}

.fmg-thumb-index {
  position: absolute;
  right: 3px;
  bottom: 2px;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 9.5px;
  line-height: 1.4;
}

.fmg-thumb-video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  background: rgba(15, 23, 42, 0.5);
  color: #fff;
  font-size: 10px;
}

.fmg-thumb-video-overlay small {
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
}

.fmg-thumb-caption {
  max-width: 170px;
  font-size: 11.5px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.fmg-single-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #ffffff);
}

.fmg-single-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, #475569);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 图片大图灯箱 */
.fmg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.fmg-lightbox-inner {
  position: relative;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fmg-lb-img {
  max-width: 88vw;
  max-height: 82vh;
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  object-fit: contain;
  background: #0f172a;
}

.fmg-lb-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fmg-lb-nav:hover { background: rgba(59, 130, 246, 0.88); }
.fmg-lb-prev { left: 20px; }
.fmg-lb-next { right: 20px; }

.fmg-lb-toolbar {
  position: fixed;
  top: 18px;
  right: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fmg-lb-counter {
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  font-size: 12.5px;
}

.fmg-lb-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 12.5px;
  text-decoration: none;
  cursor: pointer;
}

.fmg-lb-action:hover { background: rgba(255, 255, 255, 0.16); }
.fmg-lb-close { padding: 6px 10px; }

@media (max-width: 640px) {
  .fmg-stage {
    min-height: 200px;
  }
  .fmg-thumb-caption {
    display: none;
  }
  .fmg-thumb-item {
    width: 52px;
    height: 32px;
  }
}
</style>
