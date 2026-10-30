<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { normalizeAlbumContent } from './lib/content.js';
import { calculateElapsedDays, millisecondsUntilNextMidnight } from './lib/days.js';
import { nextChapterIndex, horizontalSwipeDirection } from './lib/navigation.js';
import OpeningScreen from './components/OpeningScreen.vue';
import LandscapeGate from './components/LandscapeGate.vue';
import Lightbox from './components/Lightbox.vue';
import FallbackGallery from './components/FallbackGallery.vue';

const { content, errors } = normalizeAlbumContent(window.ALBUM_CONTENT);
const entered = ref(false), index = ref(0), locked = ref(false), hidden = ref(document.hidden), orientationBlocked = ref(false);
const fallback = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const fallbackReason = ref('');
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = ref(reducedQuery.matches);
const AlbumStage = defineAsyncComponent({ loader: () => import('./components/AlbumStage.vue'),
  onError(error, retry, fail) { useFallback('照片舞台加载失败，已切换照片墙'); fail(); } });
const days = ref(null);
const chapter = computed(() => content.chapters[Math.min(index.value, content.chapters.length - 1)]);
const ending = computed(() => entered.value && index.value === content.chapters.length);
const allPhotos = content.chapters.flatMap((item) => item.photos);
const photos = computed(() => index.value === 3 ? allPhotos : chapter.value.photos);
const formation = computed(() => ['river', 'river', 'infinity', 'doubleHeart'][index.value] ?? 'river');
const musicAvailable = ref(false), muted = ref(false);
const selectedIndex = ref(-1);
const lightboxOpen = computed(() => selectedIndex.value >= 0);
let audio, dayTimer, transitionTimer, idleTimer, idleIsCallback = false, touchStart, lastWheel = -Infinity;
const baseVolume = 0.55;
let fadeFrame;
const stagePaused = computed(() => hidden.value || orientationBlocked.value || lightboxOpen.value);
function openPhoto(photo) { if (!locked.value) selectedIndex.value = photos.value.findIndex((item) => item.key === photo.key); }

function updateDays() {
  days.value = calculateElapsedDays(content.startDate, new Date(), content.timeZone);
  clearTimeout(dayTimer);
  dayTimer = setTimeout(updateDays, millisecondsUntilNextMidnight(new Date(), content.timeZone) + 30);
}
function useFallback(reason) { fallback.value = true; fallbackReason.value = reason; locked.value = false; }
function preload(photosToLoad) { for (const photo of photosToLoad) { const image = new Image(); image.src = photo.thumb; } }
function cancelPreload() {
  if (idleIsCallback) window.cancelIdleCallback?.(idleTimer);
  else clearTimeout(idleTimer);
}
function transitionEnd() {
  locked.value = false;
  cancelPreload();
  const nextPhotos = content.chapters[index.value + 1]?.photos ?? [];
  idleIsCallback = Boolean(window.requestIdleCallback);
  idleTimer = idleIsCallback ? window.requestIdleCallback(() => preload(nextPhotos), { timeout: 2000 }) : setTimeout(() => preload(nextPhotos), 500);
}
function enter() {
  if (entered.value) return;
  if (content.music) {
    audio = new Audio(content.music);
    audio.loop = true; audio.volume = baseVolume;
    audio.addEventListener('error', () => { musicAvailable.value = false; });
    audio.play().then(() => { musicAvailable.value = true; }).catch(() => { musicAvailable.value = false; });
  }
  entered.value = true;
  locked.value = !fallback.value;
  if (fallback.value) transitionEnd();
}
function fadeVolume(target) {
  cancelAnimationFrame(fadeFrame);
  if (!audio) return;
  const from = audio.volume, start = performance.now();
  const fade = (now) => {
    const progress = Math.min(1, (now - start) / 1000);
    audio.volume = from + (target - from) * progress;
    if (progress < 1) fadeFrame = requestAnimationFrame(fade);
  };
  fadeFrame = requestAnimationFrame(fade);
}
function navigate(direction) {
  if (!entered.value || orientationBlocked.value || lightboxOpen.value) return;
  const next = nextChapterIndex(index.value, direction, content.chapters.length + 1, locked.value);
  if (next === index.value) return;
  cancelPreload();
  index.value = next; locked.value = true;
  if (ending.value) fadeVolume(baseVolume * 0.35); else fadeVolume(baseVolume);
  if (fallback.value || ending.value) {
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(transitionEnd, reduced.value ? 150 : 1000);
  }
}
function replay() {
  if (locked.value) return;
  index.value = 0; locked.value = !fallback.value; fadeVolume(baseVolume);
  if (fallback.value) transitionEnd();
  nextTick(() => document.querySelector('.chapter-title')?.focus());
}
function wheel(event) {
  if (event.target.closest('button, details, .fallback-gallery, .config-errors, .letter')) return;
  const now = performance.now(), separateGesture = now - lastWheel > 180;
  lastWheel = now;
  if (Math.abs(event.deltaY) < 10 || !separateGesture) return;
  navigate(Math.sign(event.deltaY));
}
function keydown(event) {
  if (lightboxOpen.value || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target.closest('summary, input, textarea')) return;
  const direction = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
  if (direction) { event.preventDefault(); navigate(direction); }
}
function touchEnd(event) {
  const point = event.changedTouches[0];
  const direction = horizontalSwipeDirection(touchStart, { x: point.clientX, y: point.clientY });
  touchStart = null;
  if (direction && !event.target.closest('button, details, .fallback-gallery')) navigate(direction);
}
function visibility() { hidden.value = document.hidden; if (!hidden.value) updateDays(); }
function motionChange(event) { reduced.value = event.matches; if (event.matches) useFallback('已按系统偏好减少动态效果'); }
function toggleMusic() { muted.value = !muted.value; if (audio) audio.muted = muted.value; }
watch(fallback, () => { if (fallback.value) transitionEnd(); });
onMounted(() => {
  updateDays(); preload(content.chapters[0].photos);
  document.addEventListener('keydown', keydown); document.addEventListener('visibilitychange', visibility);
  reducedQuery.addEventListener('change', motionChange);
});
onBeforeUnmount(() => {
  clearTimeout(dayTimer); clearTimeout(transitionTimer); cancelPreload(); cancelAnimationFrame(fadeFrame);
  audio?.pause();
  document.removeEventListener('keydown', keydown); document.removeEventListener('visibilitychange', visibility);
  reducedQuery.removeEventListener('change', motionChange);
});
</script>

<template>
  <LandscapeGate @blocking="orientationBlocked = $event" />
  <main :inert="orientationBlocked || lightboxOpen || undefined" :aria-hidden="orientationBlocked || lightboxOpen || undefined"
    @wheel.passive="wheel" @touchstart.passive="touchStart = { x: $event.touches[0].clientX, y: $event.touches[0].clientY }" @touchend.passive="touchEnd">
    <div class="film-edges" aria-hidden="true"></div>
    <header class="masthead"><a href="./" aria-label="回到开场">OUR FIRST ANNIVERSARY</a><span>2025.12.14 — FOREVER</span></header>
    <OpeningScreen v-if="!entered || ending" :cover="content.cover" :days="days" :ending="ending" :letter="content.letter" @enter="enter" @replay="replay" />
    <section v-else class="chapter" aria-labelledby="chapter-title" :aria-busy="locked">
      <header class="chapter-heading"><p class="eyebrow">CHAPTER {{ String(index + 1).padStart(2, '0') }} / 04</p><h1 id="chapter-title" class="chapter-title" tabindex="-1">{{ chapter.title }}</h1></header>
      <div class="stage-wrap">
        <FallbackGallery v-if="fallback" :photos="photos" @photo-select="openPhoto" />
        <AlbumStage v-else :photos="photos" :formation="formation" :paused="stagePaused" :reduced-motion="reduced" @photo-select="openPhoto" @transition-end="transitionEnd" @fallback="useFallback" />
        <p v-if="index === 3 && days !== null" class="climax-days" :class="{ 'gallery-days': fallback }"><strong>{{ days }}</strong><span>天，未完待续</span></p>
      </div>
      <footer class="chapter-controls">
        <button :disabled="index === 0 || locked" @click="navigate(-1)">← 上一幕</button>
        <p aria-live="polite">{{ String(index + 1).padStart(2, '0') }}<span> / 04</span><small>{{ locked ? '回忆正在入场' : '滚动 · 方向键 · 横向滑动' }}</small></p>
        <button :disabled="locked" @click="navigate(1)">{{ index === 3 ? '未完待续' : '下一幕' }} →</button>
      </footer>
      <p v-if="fallback" class="fallback-note" role="status">{{ fallbackReason || '轻量照片墙 · 已减少动态效果' }}</p>
    </section>
    <button v-if="musicAvailable" class="music-button" :aria-pressed="muted" @click="toggleMusic">{{ muted ? '开启音乐' : '静音音乐' }}</button>
    <details v-if="errors.length" class="config-errors"><summary>相册配置提示 · {{ errors.length }}</summary><ul><li v-for="error in errors" :key="error">{{ error }}</li></ul></details>
  </main>
  <Lightbox v-if="lightboxOpen && !orientationBlocked" :photos="photos" :index="selectedIndex" @change="selectedIndex = $event" @close="selectedIndex = -1" />
</template>
