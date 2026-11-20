export const FORMATIONS = [
  { name: 'doubleHeart', line: '我的每一次心跳，都在悄悄靠近你' },
  { name: 'matrix', line: '那些普通的日子，因为有你才值得收藏' },
  { name: 'sphere', line: '零散的瞬间，慢慢围成了我们的世界' },
  { name: 'river', line: '一起走过的路，回头看全是温柔' },
  { name: 'ring', line: '时间绕过一圈又一圈，我还是最喜欢你' },
  { name: 'cylinder', line: '故事没有终点，我们还会拍下许多个明天' },
];

const HOLD_MS = 6000;
const TRANSITION_MS = 2500;
const STEP_MS = HOLD_MS + TRANSITION_MS;
export const OPENING_MS = 3000;

export function loopState(elapsedMs) {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) % (STEP_MS * FORMATIONS.length) : 0;
  const index = Math.floor(time / STEP_MS);
  return {
    formation: FORMATIONS[index].name,
    nextFormation: FORMATIONS[(index + 1) % FORMATIONS.length].name,
    progress: Math.max(0, (time % STEP_MS - HOLD_MS) / TRANSITION_MS),
  };
}

export function photoBatch(elapsedMs, total, limit) {
  if (total <= limit) return { start: 0, count: total };
  // Neighboring batches must fit without sharing a mesh during a turn.
  const count = Math.min(limit, Math.floor(total / 2));
  const step = Math.floor(Math.max(0, elapsedMs) / STEP_MS);
  return { start: (step * count) % total, count };
}

export function createPlaybackClock() {
  let accumulated = 0;
  let startedAt = null;
  return {
    setRunning(running, now) {
      if (running && startedAt === null) startedAt = now;
      if (!running && startedAt !== null) {
        accumulated += now - startedAt;
        startedAt = null;
      }
    },
    elapsed(now) { return accumulated + (startedAt === null ? 0 : now - startedAt); },
  };
}
