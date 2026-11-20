<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { decryptLetter } from '../lib/letter-crypto.js';

const props = defineProps({ kind: String, timeline: Array, encryptedLetter: Object });
const emit = defineEmits(['close']);
const dialog = ref(null);
const password = ref('');
const body = ref('');
const error = ref('');
const busy = ref(false);
let active = true;

onMounted(() => {
  if (dialog.value.showModal) dialog.value.showModal();
  else dialog.value.setAttribute('open', '');
  dialog.value.querySelector('[autofocus]')?.focus();
});

onBeforeUnmount(() => {
  active = false;
  password.value = '';
  body.value = '';
  dialog.value.close?.();
});

async function unlock() {
  if (!password.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const pending = decryptLetter(props.encryptedLetter, password.value);
  password.value = '';
  try {
    const result = await pending;
    if (!active) return;
    body.value = result;
    await nextTick();
    dialog.value?.querySelector('.letter-body')?.focus();
  } catch {
    if (active) error.value = '密码不对，再想想看';
  } finally {
    if (active) busy.value = false;
  }
}

function keydown(event) {
  if (event.key !== 'Tab') return;
  const items = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
</script>

<template>
  <dialog ref="dialog" class="album-dialog" aria-modal="true" aria-labelledby="album-dialog-title"
    @cancel.prevent="emit('close')" @keydown.esc.stop.prevent="emit('close')" @keydown="keydown"
    @click.self="emit('close')">
    <article class="dialog-panel">
      <header>
        <h2 id="album-dialog-title">{{ kind === 'timeline' ? '我们的时间线' : '写给你' }}</h2>
        <button class="close-dialog" type="button" :autofocus="kind === 'timeline' || !encryptedLetter"
          aria-label="关闭弹窗" @click="emit('close')">×</button>
      </header>
      <div v-if="kind === 'timeline'" class="dialog-content">
        <ol v-if="timeline.length" class="timeline">
          <li v-for="(item, index) in timeline" :key="index">
            <span class="timeline-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <p v-if="item.date" class="timeline-date">{{ item.date }}</p>
              <h3>{{ item.title }}</h3>
              <p v-if="item.description">{{ item.description }}</p>
            </div>
          </li>
        </ol>
        <p v-else>时间线还在准备中。</p>
      </div>
      <div v-else class="dialog-content">
        <p v-if="!encryptedLetter">信件还在准备中。</p>
        <p v-else-if="body" class="letter-body" tabindex="0">{{ body }}</p>
        <form v-else class="letter-form" @submit.prevent="unlock">
          <label for="letter-password">信件口令</label>
          <div>
            <input id="letter-password" v-model="password" type="password" autocomplete="off" autofocus required>
            <button type="submit" :disabled="busy">{{ busy ? '正在打开' : '打开信件' }}</button>
          </div>
          <p v-if="error" role="alert">{{ error }}</p>
        </form>
      </div>
    </article>
  </dialog>
</template>
