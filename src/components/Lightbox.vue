<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { stepPhotoIndex, horizontalSwipeDirection } from '../lib/navigation.js';
const props = defineProps({ photos: Array, index: Number });
const emit = defineEmits(['close', 'change']);
const dialog = ref(null), closeButton = ref(null), failed = ref(false);
const photo = computed(() => props.photos[props.index]);
let trigger, touchStart;
function change(direction) { emit('change', stepPhotoIndex(props.index, direction, props.photos.length)); }
function keydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); emit('close'); }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) change(event.key === 'ArrowRight' ? 1 : -1);
  }
  if (event.key === 'Tab') {
    const buttons = [...dialog.value.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (!dialog.value.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
  }
}
function touchEnd(event) {
  const end = event.changedTouches[0];
  const direction = horizontalSwipeDirection(touchStart, { x: end.clientX, y: end.clientY });
  if (direction) change(direction);
  touchStart = null;
}
watch(() => props.index, () => {
  failed.value = false;
  const next = props.photos[stepPhotoIndex(props.index, 1, props.photos.length)];
  if (next && next !== photo.value) { const image = new Image(); image.src = next.full; }
}, { immediate: true });
onMounted(() => {
  trigger = document.activeElement;
  closeButton.value.focus();
  document.addEventListener('keydown', keydown, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', keydown, true);
  nextTick(() => {
    const target = trigger?.isConnected && trigger !== document.body ? trigger : document.querySelector('.photo-access summary, .chapter-controls button:not(:disabled)');
    target?.focus();
  });
});
</script>

<template>
  <div ref="dialog" class="lightbox" role="dialog" aria-modal="true" aria-label="照片放大查看" @click.self="$emit('close')"
    @touchstart.passive="touchStart = { x: $event.touches[0].clientX, y: $event.touches[0].clientY }" @touchend.passive="touchEnd">
    <header class="lightbox-header"><span aria-live="polite">{{ index + 1 }} / {{ photos.length }}</span><button ref="closeButton" @click="$emit('close')">关闭 ×</button></header>
    <button class="lightbox-prev" :disabled="photos.length < 2" aria-label="上一张照片" @click="change(-1)">←</button>
    <figure v-if="photo" class="lightbox-photo">
      <div v-if="failed" class="broken-photo" role="img" aria-label="这张照片暂时无法载入"><span>THIS MEMORY IS STILL HERE</span><p>照片暂时无法载入</p></div>
      <img v-else :key="photo.key" :src="photo.full" :alt="`回忆照片 ${index + 1}`" @error="failed = true">
      <figcaption v-if="photo.caption">{{ photo.caption }}</figcaption>
    </figure>
    <button class="lightbox-next" :disabled="photos.length < 2" aria-label="下一张照片" @click="change(1)">→</button>
    <p class="lightbox-hint">左右滑动或使用方向键 · Esc 关闭</p>
  </div>
</template>
