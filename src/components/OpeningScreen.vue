<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ cover: String, days: Number, ending: Boolean, letter: String });
defineEmits(['enter', 'replay']);
const coverFailed = ref(false);
watch(() => props.cover, () => { coverFailed.value = false; });
</script>

<template>
  <section class="opening" :class="{ ending }" aria-labelledby="opening-title">
    <img v-if="cover && !coverFailed" class="cover-image" :src="cover" alt="" @error="coverFailed = true">
    <div class="cover-shade" aria-hidden="true"></div>
    <div class="opening-content">
      <p class="eyebrow">{{ ending ? 'TO BE CONTINUED' : 'A FILM OF US · SINCE 2025.12.14' }}</p>
      <h1 id="opening-title">Our First<br><em>Anniversary</em></h1>
      <p class="opening-subtitle">{{ ending ? '故事未完，往后都是我们。' : '把平凡的每一天，放映成我们的电影。' }}</p>
      <p v-if="days !== null" class="day-count" aria-live="polite"><strong>{{ days }}</strong><span>天 / TOGETHER</span></p>
      <p v-if="ending && letter.trim()" class="letter">{{ letter }}</p>
      <button class="primary-button" @click="$emit(ending ? 'replay' : 'enter')">
        {{ ending ? '重新观看' : '开启我们的回忆' }}<span aria-hidden="true"> ↗</span>
      </button>
    </div>
    <div class="opening-footnote" aria-hidden="true"><span>ONE YEAR. COUNTLESS MOMENTS.</span><span>{{ ending ? 'THE STORY GOES ON' : 'THE FIRST CHAPTER' }}</span></div>
  </section>
</template>
