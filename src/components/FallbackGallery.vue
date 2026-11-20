<script setup>
import { ref } from 'vue';
defineProps({ photos: Array });
const failed = ref(new Set());
</script>

<template>
  <div v-if="photos.length" class="fallback-gallery" aria-label="照片墙" tabindex="0">
    <figure v-for="(photo, index) in photos" :key="photo.key" class="photo-tile">
      <span v-if="failed.has(photo.key)" class="tile-placeholder">照片暂不可用</span>
      <img v-else :src="photo.thumb" :alt="photo.caption || `照片 ${index + 1}`" loading="lazy" @error="failed.add(photo.key)">
    </figure>
  </div>
  <p v-else class="empty-gallery">照片还在准备中</p>
</template>
