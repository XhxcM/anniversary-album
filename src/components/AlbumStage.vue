<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { AlbumScene } from '../three/album-scene.js';

const props = defineProps({ photos: Array, elapsed: Function, paused: Boolean });
const emit = defineEmits(['ready', 'fallback']);
const canvas = ref(null);
let scene, observer;

onMounted(() => {
  try {
    scene = new AlbumScene(canvas.value, { photos: props.photos, elapsed: props.elapsed,
      onFallback: (reason) => emit('fallback', reason) });
    observer = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas.value);
    scene.setPaused(props.paused);
    emit('ready');
  } catch {
    scene?.dispose();
    emit('fallback', '此浏览器不支持照片舞台，已切换照片墙');
  }
});
watch(() => props.paused, (value) => scene?.setPaused(value));
onBeforeUnmount(() => {
  observer?.disconnect();
  scene?.dispose();
});
</script>

<template>
  <div class="album-stage" role="img" aria-label="照片组成不断变换的立体造型">
    <canvas ref="canvas" aria-hidden="true" />
  </div>
</template>
