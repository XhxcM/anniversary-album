<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { normalizeAlbumContent } from './lib/content.js';
import { elapsedParts } from './lib/days.js';
import { albumPhase } from './lib/navigation.js';
import { createPhotoPool } from './lib/photo-pool.js';
import { lyricAt, parseLyrics } from './lib/lyrics.js';
import { createPlaybackClock, FORMATIONS, loopState, OPENING_MS } from './three/loop-timeline.js';
import AlbumDialog from './components/AlbumDialog.vue';
import FallbackGallery from './components/FallbackGallery.vue';
import LandscapeGate from './components/LandscapeGate.vue';
import OpeningScreen from './components/OpeningScreen.vue';

const AlbumStage = defineAsyncComponent({
  loader: () => import('./components/AlbumStage.vue'),
  onError: (error, retry, fail, attempts) => attempts < 2 ? retry() : fail(),
  errorComponent: { mounted() { useFallback('照片舞台加载失败，已切换照片墙'); }, render: () => null },
});

const { content, errors } = normalizeAlbumContent(window.ALBUM_CONTENT);
const pool = createPhotoPool(content.photos, 100, 20251214);
const playback = createPlaybackClock();
const portraitQuery = matchMedia('(orientation: portrait)');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const portrait = ref(portraitQuery.matches);
const reduced = ref(reducedQuery.matches);
const hidden = ref(document.hidden);
const entered = ref(false);
const stageStarted = ref(false);
const stageReady = ref(false);
const fallbackReason = ref('');
const elapsed = ref(0);
const parts = ref(elapsedParts(content.startInstant));
const audio = ref(null);
const playing = ref(false);
const audioError = ref('');
const lyrics = ref([]);
const audioTime = ref(0);
const lyricRequest = new AbortController();
const currentLyric = computed(() => lyricAt(lyrics.value, audioTime.value));
const modal = ref(null);
const particles = ref(null);
const sparkles = [
  [5, 21, 15, -4], [12, 76, 19, -1], [18, 42, 11, -6], [25, 12, 14, -3],
  [30, 87, 12, -6], [37, 29, 17, -1], [56, 12, 11, -4], [62, 79, 15, -2],
  [72, 24, 18, -5], [80, 87, 13, -3], [86, 49, 22, -1], [94, 67, 14, -6],
];
let trigger, timer, captionTimer, lastParticle = -Infinity;

const phase = computed(() => albumPhase(entered.value, portrait.value, elapsed.value));
const blocked = computed(() => phase.value === 'landscape');
const fallback = computed(() => reduced.value || fallbackReason.value || !pool.length);
const paused = computed(() => hidden.value || blocked.value);
const ready = computed(() => stageStarted.value && (stageReady.value || Boolean(fallback.value)));
const state = computed(() => loopState(elapsed.value - OPENING_MS));
const caption = computed(() => {
  const current = state.value;
  const amount = current.progress ** 2 * (3 - 2 * current.progress);
  return { from: FORMATIONS.find(({ name }) => name === current.formation).line,
    to: FORMATIONS.find(({ name }) => name === current.nextFormation).line, amount };
});
const digits = (value) => String(value).padStart(2, '0');

function useFallback(reason) { fallbackReason.value = reason; }
function updateClock() { parts.value = elapsedParts(content.startInstant); }
function updatePlayback() { elapsed.value = playback.elapsed(performance.now()); }

watch([entered, portrait, hidden], ([started, narrow, inactive]) => {
  if (started && !narrow && !inactive) stageStarted.value = true;
}, { flush: 'sync' });

watch([ready, paused], ([available, stopped]) => {
  playback.setRunning(available && !stopped, performance.now());
  updatePlayback();
}, { flush: 'sync' });

watch(blocked, (value) => { if (value && modal.value) closeModal(); });

function playMusic() {
  if (!audio.value) return;
  audioError.value = '';
  audio.value.play()?.catch(() => { audioError.value = '音乐暂时无法播放，轻触按钮重试。'; });
}

function toggleMusic() {
  if (audio.value && !audio.value.paused) audio.value.pause();
  else playMusic();
}

function updateAudioTime() { audioTime.value = audio.value?.currentTime ?? 0; }

async function requestLandscape() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  try { await document.documentElement.requestFullscreen?.(); } catch { /* Keep manual rotation available. */ }
  try { await screen.orientation?.lock?.('landscape'); } catch { /* Keep manual rotation available. */ }
}

function enter() {
  if (entered.value) return;
  entered.value = true;
  playMusic();
  void requestLandscape();
}

function openModal(kind, event) {
  trigger = event.currentTarget;
  modal.value = kind;
}

async function closeModal() {
  modal.value = null;
  await nextTick();
  if (!blocked.value) trigger?.focus();
  trigger = null;
}

function heart(event, burst = false) {
  if (!particles.value || reduced.value || hidden.value || blocked.value || modal.value ||
      event.target.closest?.('button:not(.opening), input, summary, a, [tabindex]') ||
      !Element.prototype.animate) return;
  const now = performance.now();
  if (!burst && now - lastParticle < 65) return;
  lastParticle = now;
  for (let index = 0; index < (burst ? 5 : 1); index++) {
    const node = document.createElement('span');
    node.textContent = '♥';
    node.style.left = `${event.clientX}px`;
    node.style.top = `${event.clientY}px`;
    particles.value.append(node);
    while (particles.value.childElementCount > 20) particles.value.firstElementChild.remove();
    const dx = (Math.random() - 0.5) * (burst ? 95 : 25);
    const animation = node.animate([{ opacity: 0.8, transform: 'translate(-50%, -50%) scale(.8)' },
      { opacity: 0, transform: `translate(${dx}px, -54px) scale(.4)` }], { duration: 720, easing: 'ease-out' });
    animation.onfinish = () => node.remove();
  }
}

function onOrientation() { portrait.value = portraitQuery.matches; }
function onMotion() {
  reduced.value = reducedQuery.matches;
  if (reduced.value) particles.value?.replaceChildren();
}
function onVisibility() {
  hidden.value = document.hidden;
  if (!hidden.value) updateClock();
}

onMounted(() => {
  if (content.music && content.lyrics) {
    fetch(content.lyrics, { signal: lyricRequest.signal }).then((response) => {
      if (!response.ok) throw new Error('Lyrics unavailable');
      return response.text();
    }).then((text) => { lyrics.value = parseLyrics(text); }).catch(() => { /* Keep formation captions if lyrics are unavailable. */ });
  }
  portraitQuery.addEventListener('change', onOrientation);
  reducedQuery.addEventListener('change', onMotion);
  document.addEventListener('visibilitychange', onVisibility);
  timer = setInterval(updateClock, 1000);
  captionTimer = setInterval(() => {
    if (ready.value && !paused.value) updatePlayback();
  }, 50);
});

onBeforeUnmount(() => {
  lyricRequest.abort();
  clearInterval(timer);
  clearInterval(captionTimer);
  portraitQuery.removeEventListener('change', onOrientation);
  reducedQuery.removeEventListener('change', onMotion);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <main v-show="!blocked" class="universe" :class="{ 'is-paused': paused }" :inert="!!modal"
    @pointermove.passive="heart($event)" @pointerdown.passive="heart($event, true)">
    <div class="starfield" aria-hidden="true">
      <div class="light-streams"></div>
      <span v-for="index in 6" :key="index">♥</span>
      <i v-for="([x, y, size, delay], index) in sparkles" :key="index" class="star-sparkle"
        :style="{ left: x + '%', top: y + '%', '--spark-size': size + 'px', animationDelay: delay + 's' }"></i>
      <div class="star-trails"></div>
    </div>
    <div ref="particles" class="particles" aria-hidden="true"></div>

    <header class="album-heading">
      <h1>OUR LITTLE UNIVERSE</h1>
      <p>从心动开始的每一秒</p>
      <dl v-if="parts" class="elapsed-time" aria-label="我们在一起的时间">
        <div v-for="(label, key) in { days: '天', hours: '时', minutes: '分', seconds: '秒' }" :key="key">
          <dt>{{ label }}</dt><dd>{{ digits(parts[key]) }}</dd>
        </div>
      </dl>
    </header>

    <div class="stage-wrap">
      <template v-if="stageStarted">
        <FallbackGallery v-if="fallback" :photos="content.photos" />
        <AlbumStage v-else :photos="pool" :elapsed="playback.elapsed" :paused="paused"
          @ready="stageReady = true" @fallback="useFallback" />
      </template>
    </div>
    <OpeningScreen v-if="!ready || elapsed < 650" :cover="content.cover" :opening="content.opening"
      :starting="entered" :class="{ 'cover-fade': ready }" @enter="enter" />

    <div class="album-caption" :data-formation="state.formation">
      <div class="waveform" :class="{ 'is-playing': playing }" aria-hidden="true">
        <i v-for="index in 11" :key="index" :style="{ '--bar': index }"></i>
      </div>
      <p v-if="currentLyric" class="song-lyrics">{{ currentLyric }}</p>
      <template v-else>
        <p :style="{ opacity: reduced ? 1 : 1 - caption.amount }">{{ caption.from }}</p>
        <p v-if="caption.amount > 0 && !reduced" aria-hidden="true" :style="{ opacity: caption.amount }">{{ caption.to }}</p>
      </template>
    </div>

    <audio v-if="content.music" ref="audio" :src="content.music" loop preload="none"
      @timeupdate="updateAudioTime" @seeked="updateAudioTime"
      @playing="playing = true; audioError = ''" @pause="playing = false" @error="playing = false; audioError = '音乐暂不可用。'" />
    <div v-if="ready" class="music-controls">
      <button v-if="content.music" class="glass-button" type="button" :aria-pressed="playing" @click="toggleMusic">
        <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▷' }}</span> {{ playing ? '暂停音乐' : '播放音乐' }}
      </button>
      <small v-if="audioError" role="status">{{ audioError }}</small>
    </div>
    <nav v-if="ready" class="album-actions" aria-label="相册内容">
      <button type="button" class="glass-button" @click="openModal('timeline', $event)">我们的时间线</button>
      <button type="button" class="glass-button" @click="openModal('letter', $event)">写给你</button>
    </nav>
    <details v-if="errors.length" class="config-errors">
      <summary>相册配置提示</summary><ul><li v-for="error in errors" :key="error">{{ error }}</li></ul>
    </details>
    <span v-if="fallbackReason" class="sr-only" role="status">{{ fallbackReason }}</span>
  </main>

  <LandscapeGate v-if="blocked" />
  <AlbumDialog v-if="modal" :kind="modal" :timeline="content.timeline" :encrypted-letter="content.encryptedLetter" @close="closeModal" />
</template>
