export function createFrameBudget() {
  let elapsed = 0;
  let frames = 0;
  let state = 'normal';
  return {
    addFrame(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0 || state === 'fallback') return state;
      elapsed += deltaMs;
      frames++;
      if (elapsed >= 3000) {
        if (frames * 1000 / elapsed < 24 - 1e-8) state = state === 'normal' ? 'reduced' : 'fallback';
        elapsed = 0;
        frames = 0;
      }
      return state;
    },
    reset() { elapsed = 0; frames = 0; state = 'normal'; },
  };
}
