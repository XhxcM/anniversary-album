export function createPhotoPool(photos, targetCount, seed) {
  const indices = photos.map((_, index) => index);
  const repeatCount = Math.min(photos.length, Math.max(0, Math.floor(targetCount) - photos.length));
  let state = seed >>> 0;
  const pool = photos.map((photo) => ({ ...photo, sourceKey: photo.key, key: `${photo.key}#1` }));
  for (let index = 0; index < repeatCount; index++) {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
    const pick = index + Math.floor(random * (indices.length - index));
    [indices[index], indices[pick]] = [indices[pick], indices[index]];
    const photo = photos[indices[index]];
    pool.push({ ...photo, sourceKey: photo.key, key: `${photo.key}#2` });
  }
  return pool;
}
