export function nextChapterIndex(index, direction, count, locked = false) {
  if (count <= 0) return -1;
  if (locked) return index;
  return Math.min(count - 1, Math.max(0, index + Math.sign(direction)));
}

export function horizontalSwipeDirection(start, end, minDistance = 50) {
  if (!start || !end) return 0;
  const dx = end.x - start.x, dy = end.y - start.y;
  if (Math.abs(dx) < minDistance || Math.abs(dx) <= Math.abs(dy) * 1.2) return 0;
  return dx > 0 ? -1 : 1;
}

export function stepPhotoIndex(index, direction, count) {
  if (count <= 0) return -1;
  return ((index + Math.sign(direction)) % count + count) % count;
}
