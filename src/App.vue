<script setup>
import { normalizeAlbumContent } from './lib/content.js';
const { content, errors } = normalizeAlbumContent(window.ALBUM_CONTENT);
</script>

<template>
  <main>
    <h1>Our First Anniversary</h1>
    <p v-for="error in errors" :key="error">{{ error }}</p>
    <p>{{ content.chapters[0].title }}</p>
  </main>
</template>
