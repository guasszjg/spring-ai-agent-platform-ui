<template>
  <div v-if="hasAnyMedia" class="fmg-root">
    <div class="fmg-header">
      <i class="fa-solid fa-paperclip"></i>
      <span>参考附件</span>
      <span v-if="validImages.length" class="fmg-count-pill">
        <i class="fa-regular fa-image"></i> {{ validImages.length }} 张图片
      </span>
      <span v-if="validVideos.length" class="fmg-count-pill fmg-count-video">
        <i class="fa-solid fa-film"></i> {{ validVideos.length }} 个视频
      </span>
    </div>

    <!-- 图片区：单图直显 / 多图自动轮播 -->
    <div
      v-if="validImages.length"
      class="fmg-image-section"
      @mouseenter="imageHovered = true"
      @mouseleave="imageHovered = false"
    >
      <div v-if="validImages.length === 1" class="fmg-single-image-wrap">
        <div v-if="brokenImages.has(validImages[0])" class="fmg-img-error">
          <i class="fa-regular fa-image"></i>
          <span>图片加载失败</span>
          <a :href="validImages[0]" target="_blank" rel="noopener" class="fmg-ext-link">新窗口打开</a>
        </div>
        <button
          v-else
          type="button"
          class="fmg-image-btn"
          title="点击查看大图"
          @click="openLightbox(0)"
        >
          <img
            :src="validImages[0]"
            alt="FAQ 回答附图"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="markImageBroken(validImages[0])"
          />
          <span class="fmg-zoom-badge"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
        </button>
      </div>

      <div v-else class="fmg-carousel">
        <div class="fmg-carousel-stage">
          <button
            type="button"
            class="fmg-carousel-nav fmg-nav-prev"
            title="上一张"
            aria-label="上一张"
            @click="prevImage"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <button
            type="button"
            class="fmg-carousel-slide"
            title="点击查看大图"
            @click="openLightbox(currentImageIndex)"
          >
            <Transition name="fmg-fade" mode="out-in">
              <div v-if="brokenImages.has(currentImageUrl)" :key="'err-' + currentImageIndex" class="fmg-img-error">
                <i class="fa-regular fa-image"></i>
                <span>图片加载失败</span>
                <a :href="currentImageUrl" target="_blank" rel="noopener" class="fmg-ext-link" @click.stop>新窗口打开</a>
              </div>
              <img
                v-else
                :key="currentImageUrl + '-' + currentImageIndex"
                :src="currentImageUrl"
                :alt="`FAQ 回答附图 ${currentImageIndex + 1}`"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="markImageBroken(currentImageUrl)"
              />
            </Transition>
            <span class="fmg-zoom-badge"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
          </button>

          <button
            type="button"
            class="fmg-carousel-nav fmg-nav-next"
            title="下一张"
            aria-label="下一张"
            @click="nextImage"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <span class="fmg-counter-badge">{{ currentImageIndex + 1 }} / {{ validImages.length }}</span>
          <div
            v-if="autoPlayImages && !imageHovered && !lightboxOpen"
            :key="progressRunKey"
            class="fmg-carousel-progress"
            :style="{ animationDuration: effectiveIntervalMs + 'ms' }"
          ></div>
        </div>

        <div class="fmg-carousel-controls">
          <div class="fmg-dots">
            <button
              v-for="(_, idx) in validImages"
              :key="idx"
              type="button"
              class="fmg-dot"
              :class="{ active: idx === currentImageIndex }"
              :title="`第 ${idx + 1} 张`"
              :aria-label="`切换到第 ${idx + 1} 张图片`"
              @click="goToImage(idx)"
            ></button>
          </div>

          <button
            type="button"
            class="fmg-auto-toggle"
            :class="{ active: autoPlayImages }"
            :title="autoPlayImages ? '暂停自动轮播' : '开启自动轮播'"
            @click="autoPlayImages = !autoPlayImages"
          >
            <i :class="autoPlayImages ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
            <span>{{ autoPlayImages ? '自动轮播' : '已暂停' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 视频区：单视频自动播放 / 多视频主播放器 + 自动连播切换条 -->
    <div v-if="validVideos.length" class="fmg-video-section">
      <div class="fmg-video-player-box">
        <video
          ref="videoRef"
          :key="currentVideoUrl + '-' + currentVideoIndex"
          :src="currentVideoUrl"
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
        <div v-if="videoLoadFailed" class="fmg-video-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>视频加载失败，可能因格式不兼容或外链限制</span>
          <a :href="currentVideoUrl" target="_blank" rel="noopener" class="fmg-ext-link">新窗口打开</a>
        </div>
      </div>

      <div class="fmg-video-bar">
        <div v-if="validVideos.length > 1" class="fmg-video-playlist">
          <button
            type="button"
            class="fmg-vid-arrow"
            title="上一个视频"
            @click="selectVideo((currentVideoIndex - 1 + validVideos.length) % validVideos.length, true)"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <button
            v-for="(vUrl, idx) in validVideos"
            :key="vUrl + idx"
            type="button"
            class="fmg-vid-pill"
            :class="{ active: idx === currentVideoIndex }"
            :title="videoLabel(vUrl, idx)"
            @click="selectVideo(idx, true)"
          >
            <i :class="idx === currentVideoIndex ? 'fa-solid fa-circle-play' : 'fa-regular fa-circle-play'"></i>
            <span>视频 {{ idx + 1 }}</span>
          </button>

          <button
            type="button"
            class="fmg-vid-arrow"
            title="下一个视频"
            @click="selectVideo((currentVideoIndex + 1) % validVideos.length, true)"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div v-else class="fmg-video-single-label">
          <i class="fa-solid fa-film"></i>
          <span>{{ videoLabel(currentVideoUrl, 0) }}</span>
        </div>

        <div class="fmg-video-actions">
          <button
            v-if="validVideos.length > 1"
            type="button"
            class="fmg-auto-toggle"
            :class="{ active: autoSwitchVideos }"
            :title="autoSwitchVideos ? '当前：播完自动切下一个' : '当前：播完不自动切换'"
            @click="autoSwitchVideos = !autoSwitchVideos"
          >
            <i class="fa-solid fa-forward-step"></i>
            <span>{{ autoSwitchVideos ? '自动连播' : '手动切换' }}</span>
          </button>
          <a
            :href="currentVideoUrl"
            target="_blank"
            rel="noopener"
            class="fmg-open-link"
            title="在新窗口打开视频"
          >
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
        </div>
      </div>
    </div>

    <!-- 图片大图灯箱 -->
    <Teleport to="body">
      <div v-if="lightboxOpen" class="fmg-lightbox" @click="closeLightbox">
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
  autoIntervalMs: { type: Number, default: 3000 },
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
const hasAnyMedia = computed(() => validImages.value.length > 0 || validVideos.value.length > 0)
const effectiveIntervalMs = computed(() => Math.max(1500, props.autoIntervalMs))

// 图片轮播状态
const currentImageIndex = ref(0)
const autoPlayImages = ref(true)
const imageHovered = ref(false)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const progressRunKey = ref(0)
const brokenImages = ref(new Set())
let imageTimer = null

function markImageBroken(url) {
  if (!url) return
  const next = new Set(brokenImages.value)
  next.add(url)
  brokenImages.value = next
}

const currentImageUrl = computed(() => validImages.value[currentImageIndex.value] || '')

function startImageTimer() {
  stopImageTimer()
  if (validImages.value.length <= 1 || !autoPlayImages.value) return
  progressRunKey.value += 1
  imageTimer = setInterval(() => {
    if (!imageHovered.value && !lightboxOpen.value && validImages.value.length > 1) {
      currentImageIndex.value = (currentImageIndex.value + 1) % validImages.value.length
      progressRunKey.value += 1
    }
  }, effectiveIntervalMs.value)
}

function stopImageTimer() {
  if (imageTimer) {
    clearInterval(imageTimer)
    imageTimer = null
  }
}

function prevImage() {
  if (!validImages.value.length) return
  currentImageIndex.value = (currentImageIndex.value - 1 + validImages.value.length) % validImages.value.length
  startImageTimer()
}

function nextImage() {
  if (!validImages.value.length) return
  currentImageIndex.value = (currentImageIndex.value + 1) % validImages.value.length
  startImageTimer()
}

function goToImage(idx) {
  currentImageIndex.value = idx
  startImageTimer()
}

function openLightbox(idx) {
  lightboxIndex.value = idx
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
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

// 视频播放器状态
const currentVideoIndex = ref(0)
const autoSwitchVideos = ref(true)
const videoRef = ref(null)
const videoLoadFailed = ref(false)
const mutedFallbackActive = ref(false)
let pendingAutoPlay = false

const currentVideoUrl = computed(() => validVideos.value[currentVideoIndex.value] || '')

function videoLabel(url, idx) {
  if (!url) return `视频 ${idx + 1}`
  try {
    const clean = url.split('?')[0].split('#')[0]
    const seg = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1))
    if (seg && seg.length <= 36) return seg
  } catch { /* 忽略解析失败 */ }
  return `视频 ${idx + 1}`
}

async function tryAutoPlayVideo() {
  const el = videoRef.value
  if (!el || !currentVideoUrl.value || videoLoadFailed.value) return
  pendingAutoPlay = false
  try {
    // 优先尝试带声音自动播放（用户刚点击发送/回车时多数浏览器允许）
    el.muted = false
    await el.play()
    mutedFallbackActive.value = false
  } catch {
    // 浏览器限制有声自动播放时，自动降级为静音自动播放并显示一键开声提示
    try {
      el.muted = true
      await el.play()
      mutedFallbackActive.value = true
    } catch {
      /* 极端环境下仍无法播放，保持原生播放按钮可用 */
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
  if (el && !el.muted) {
    mutedFallbackActive.value = false
  }
}

function onVideoCanPlay() {
  if (pendingAutoPlay) {
    tryAutoPlayVideo()
  }
}

function onOtherVideoPlay(e) {
  if (e?.detail && e.detail !== instanceId && videoRef.value && !videoRef.value.paused) {
    try { videoRef.value.pause() } catch { /* ignore */ }
  }
}

function selectVideo(idx, autoPlay) {
  if (idx < 0 || idx >= validVideos.value.length) return
  if (videoRef.value && !videoRef.value.paused) {
    try { videoRef.value.pause() } catch { /* ignore */ }
  }
  videoLoadFailed.value = false
  currentVideoIndex.value = idx
  if (autoPlay) {
    pendingAutoPlay = true
    nextTick(() => {
      if (videoRef.value) {
        videoRef.value.currentTime = 0
        tryAutoPlayVideo()
      }
    })
  }
}

function onVideoEnded() {
  if (!autoSwitchVideos.value || validVideos.value.length <= 1) return
  const nextIdx = (currentVideoIndex.value + 1) % validVideos.value.length
  selectVideo(nextIdx, true)
}

function onVideoError() {
  videoLoadFailed.value = true
  pendingAutoPlay = false
}

watch(validImages, (list) => {
  if (currentImageIndex.value >= list.length) currentImageIndex.value = 0
  startImageTimer()
}, { immediate: true })

watch(autoPlayImages, () => {
  startImageTimer()
})

watch(imageHovered, (hovered) => {
  if (!hovered) startImageTimer()
})

watch(validVideos, (list) => {
  if (currentVideoIndex.value >= list.length) currentVideoIndex.value = 0
  videoLoadFailed.value = false
  if (list.length > 0 && props.autoPlayVideo) {
    pendingAutoPlay = true
    nextTick(() => tryAutoPlayVideo())
  }
}, { immediate: true })

onMounted(() => {
  startImageTimer()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener(PLAY_EVENT_NAME, onOtherVideoPlay)
  if (validVideos.value.length > 0 && props.autoPlayVideo) {
    pendingAutoPlay = true
    nextTick(() => tryAutoPlayVideo())
  }
})

onUnmounted(() => {
  stopImageTimer()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener(PLAY_EVENT_NAME, onOtherVideoPlay)
})
</script>

<style scoped>
.fmg-root {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 520px;
  width: 100%;
}

.fmg-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.fmg-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.fmg-count-video {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.22);
}

/* 单图卡片 */
.fmg-single-image-wrap {
  display: inline-flex;
}

.fmg-image-btn {
  position: relative;
  display: inline-flex;
  padding: 0;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-input, #f8fafc);
  cursor: zoom-in;
  max-width: 100%;
}

.fmg-image-btn img {
  display: block;
  max-width: 100%;
  max-height: 260px;
  width: auto;
  height: auto;
  object-fit: contain;
}

.fmg-img-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 28px;
  border-radius: 10px;
  border: 1px dashed var(--border-color, #cbd5e1);
  background: var(--bg-input, #f8fafc);
  color: var(--text-muted, #64748b);
  font-size: 12px;
}

.fmg-zoom-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.fmg-image-btn:hover .fmg-zoom-badge,
.fmg-carousel-slide:hover .fmg-zoom-badge {
  opacity: 1;
}

/* 多图自动轮播 */
.fmg-carousel {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-input, #f8fafc);
}

.fmg-carousel-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.04);
  height: 240px;
}

.fmg-carousel-slide {
  position: relative;
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

.fmg-carousel-slide img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.fmg-carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(15, 23, 42, 0.52);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.18s ease;
}

.fmg-carousel-nav:hover {
  background: rgba(15, 23, 42, 0.8);
}

.fmg-nav-prev { left: 8px; }
.fmg-nav-next { right: 8px; }

.fmg-counter-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.fmg-carousel-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2.5px;
  width: 0;
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
  transition: opacity 0.28s ease;
}

.fmg-fade-enter-from,
.fmg-fade-leave-to {
  opacity: 0;
}

.fmg-unmute-pill {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.18s ease;
}

.fmg-unmute-pill:hover {
  background: rgba(59, 130, 246, 0.88);
}

.fmg-carousel-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #ffffff);
}

.fmg-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.fmg-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: var(--border-hover, #cbd5e1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fmg-dot.active {
  width: 18px;
  background: var(--accent-blue, #3b82f6);
}

.fmg-auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: transparent;
  color: var(--text-muted, #64748b);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.fmg-auto-toggle.active {
  color: var(--accent-blue, #3b82f6);
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
}

/* 视频区 */
.fmg-video-section {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-card, #ffffff);
}

.fmg-video-player-box {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #0f172a;
}

.fmg-video-el {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #0f172a;
}

.fmg-video-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  font-size: 12.5px;
  text-align: center;
}

.fmg-ext-link {
  color: #60a5fa;
  text-decoration: underline;
}

.fmg-video-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  flex-wrap: wrap;
}

.fmg-video-playlist {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.fmg-vid-arrow {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: transparent;
  color: var(--text-secondary, #475569);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
}

.fmg-vid-arrow:hover {
  border-color: var(--accent-blue, #3b82f6);
  color: var(--accent-blue, #3b82f6);
}

.fmg-vid-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-input, #f8fafc);
  color: var(--text-secondary, #475569);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.fmg-vid-pill.active {
  background: var(--accent-blue, #3b82f6);
  border-color: var(--accent-blue, #3b82f6);
  color: #fff;
  font-weight: 600;
}

.fmg-video-single-label {
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

.fmg-video-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.fmg-open-link {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-muted, #64748b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  text-decoration: none;
}

.fmg-open-link:hover {
  color: var(--accent-blue, #3b82f6);
  border-color: var(--accent-blue, #3b82f6);
}

/* 图片大图灯箱 */
.fmg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
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
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fmg-lb-nav:hover { background: rgba(59, 130, 246, 0.85); }
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
</style>
