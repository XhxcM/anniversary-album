<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
defineProps({ photos: Array });
const failed = ref(new Set());
const attempts = ref(new Map());
const retries = new Map();

function photoSource(photo) {
  const attempt = attempts.value.get(photo.key) ?? 0;
  return photo.thumb + (attempt ? `${photo.thumb.includes('?') ? '&' : '?'}retry=${attempt}` : '');
}

function retryPhoto(photo) {
  const attempt = attempts.value.get(photo.key) ?? 0;
  if (attempt >= 2) { failed.value.add(photo.key); return; }
  if (retries.has(photo.key)) return;
  retries.set(photo.key, setTimeout(() => {
    retries.delete(photo.key);
    attempts.value.set(photo.key, attempt + 1);
  }, 400 * (attempt + 1)));
}

function onOnline() {
  for (const key of failed.value) attempts.value.delete(key);
  failed.value.clear();
}

onMounted(() => window.addEventListener('online', onOnline));
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline);
  for (const timer of retries.values()) clearTimeout(timer);
});
</script>

<template>
  <div v-if="photos.length" class="fallback-gallery" aria-label="照片墙" tabindex="0">
    <figure v-for="(photo, index) in photos" :key="photo.key" class="photo-tile">
      <span v-if="failed.has(photo.key)" class="tile-placeholder">照片暂不可用</span>
      <img v-else :src="photoSource(photo)" :alt="photo.caption || `照片 ${index + 1}`" loading="lazy" decoding="async" @error="retryPhoto(photo)">
    </figure>
  </div>
  <p v-else class="empty-gallery">照片还在准备中</p>
</template>
