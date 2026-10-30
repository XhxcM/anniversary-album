<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { AlbumScene } from '../three/album-scene.js';

const props = defineProps({ photos: Array, formation: String, paused: Boolean, reducedMotion: Boolean });
const emit = defineEmits(['photo-select', 'transition-end', 'fallback']);
const canvas = ref(null);
let scene, observer, down;
function point(event, select = false) {
  const rect = canvas.value.getBoundingClientRect();
  scene?.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2, select);
}
function select(event) {
  if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 12) point(event, true);
  down = null;
}
onMounted(() => {
  try {
    scene = new AlbumScene(canvas.value, { onSelect: (photo) => emit('photo-select', photo),
      onTransitionEnd: () => emit('transition-end'), onFallback: (reason) => emit('fallback', reason) });
    scene.setChapter(props.photos, props.formation);
    scene.setPaused(props.paused);
    scene.setReducedMotion(props.reducedMotion);
    observer = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas.value);
  } catch { scene?.dispose(); emit('fallback', '此浏览器不支持照片舞台，已切换照片墙'); }
});
watch(() => [props.photos, props.formation], () => scene?.setChapter(props.photos, props.formation));
watch(() => props.paused, (value) => scene?.setPaused(value));
watch(() => props.reducedMotion, (value) => scene?.setReducedMotion(value));
onBeforeUnmount(() => { observer?.disconnect(); scene?.dispose(); });
</script>

<template>
  <div class="album-stage">
    <canvas ref="canvas" aria-hidden="true" @pointermove="point" @pointerleave="scene?.setPointer(3, 3)"
      @pointerdown="down = { x: $event.clientX, y: $event.clientY }" @pointerup="select" />
    <details v-if="photos.length" class="photo-access">
      <summary>浏览本章照片 · {{ photos.length }}</summary>
      <div class="photo-access-list">
        <button v-for="(photo, index) in photos" :key="photo.key" @click="emit('photo-select', photo)">照片 {{ index + 1 }}</button>
      </div>
    </details>
    <div v-else class="empty-chapter"><span class="empty-frame" aria-hidden="true"></span><p>这一幕，等我们的照片入场</p></div>
  </div>
</template>
