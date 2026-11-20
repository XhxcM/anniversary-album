import { OPENING_MS } from '../three/loop-timeline.js';

export function albumPhase(entered, portrait, elapsed) {
  if (!entered) return 'waiting';
  if (portrait) return 'landscape';
  return elapsed < OPENING_MS ? 'opening' : 'loop';
}
