<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
const emit = defineEmits(['continue-portrait', 'blocking']);
const portrait = window.matchMedia('(orientation: portrait)');
const mobile = window.matchMedia('(max-width: 900px)');
const isPortrait = ref(portrait.matches && mobile.matches);
const bypassed = ref(false);
const blocked = computed(() => isPortrait.value && !bypassed.value);
function update() { isPortrait.value = portrait.matches && mobile.matches; }
function proceed() { bypassed.value = true; emit('continue-portrait'); }
watch(blocked, (value) => emit('blocking', value), { immediate: true });
onMounted(() => { portrait.addEventListener('change', update); mobile.addEventListener('change', update); });
onBeforeUnmount(() => { portrait.removeEventListener('change', update); mobile.removeEventListener('change', update); });
</script>

<template>
  <section v-if="blocked" class="landscape-gate" role="dialog" aria-modal="true" aria-labelledby="rotate-title">
    <div class="rotate-device" aria-hidden="true"></div>
    <p class="eyebrow">A WIDER VIEW OF US</p>
    <h2 id="rotate-title">横过来，<br>让回忆慢慢展开。</h2>
    <p>横屏观看，能看到更完整的照片舞台。</p>
    <button class="primary-button" @click="proceed">仍然继续</button>
  </section>
</template>
