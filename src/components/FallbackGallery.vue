<script setup>
import { ref } from 'vue';
defineProps({ photos: Array });
defineEmits(['photo-select']);
const failed = ref(new Set());
</script>

<template>
  <div v-if="photos.length" class="fallback-gallery" aria-label="本章照片墙" tabindex="0">
    <button v-for="(photo, index) in photos" :key="photo.key" class="photo-tile" :aria-label="`放大照片 ${index + 1}`" @click="$emit('photo-select', photo)">
      <span v-if="failed.has(photo.key)" class="tile-placeholder">A MEMORY<small>照片暂不可用</small></span>
      <img v-else :src="photo.thumb" alt="" loading="lazy" @error="failed.add(photo.key)">
      <span class="photo-number">{{ String(index + 1).padStart(2, '0') }}</span>
    </button>
  </div>
  <div v-else class="empty-chapter"><span class="empty-frame" aria-hidden="true"></span><p>这一幕，等我们的照片入场</p></div>
</template>
