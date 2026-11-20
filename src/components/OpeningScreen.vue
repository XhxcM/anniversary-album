<script setup>
import { ref } from 'vue';
defineProps({ cover: String, opening: Array, starting: Boolean });
defineEmits(['enter']);
const failed = ref(new Set());
</script>

<template>
  <button type="button" class="opening" :class="{ 'is-starting': starting }" :disabled="starting"
    aria-label="开启我们的照片相册" @click="$emit('enter')">
    <span class="cover-stack" aria-hidden="true">
      <span v-for="(src, index) in [opening[0], opening[1], opening[2], cover]" :key="index" class="cover-card">
        <img v-if="src && !failed.has(index)" :src="src" alt="" @error="failed.add(index)">
        <span v-else>{{ index === 3 ? 'OUR LITTLE UNIVERSE' : '✦' }}</span>
      </span>
    </span>
  </button>
</template>
