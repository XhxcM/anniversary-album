export function selectEvenly(items, limit) {
  const count = Math.max(0, Math.floor(limit));
  if (items.length <= count) return [...items];
  if (count === 0) return [];
  if (count === 1) return [items[0]];
  return Array.from({ length: count }, (_, index) => items[Math.round(index * (items.length - 1) / (count - 1))]);
}

export function createFormation(name, count, viewport = { width: 16, height: 9 }) {
  const width = viewport.width;
  const height = viewport.height;
  const scale = Math.min(0.95, Math.max(0.34, 3.6 / Math.sqrt(Math.max(1, count))));
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const angle = index / Math.max(1, count) * Math.PI * 2;
    let x, y;
    if (name === 'river') {
      x = (progress - 0.5) * width * 0.78;
      y = Math.sin(progress * Math.PI * 2) * height * 0.23;
    } else if (name === 'infinity') {
      x = Math.cos(angle) * width * 0.36;
      y = Math.sin(2 * angle) * height * 0.26;
    } else if (name === 'doubleHeart') {
      const firstCount = Math.ceil(count / 2);
      const side = index < firstCount ? -1 : 1;
      const localIndex = side === -1 ? index : index - firstCount;
      const localCount = side === -1 ? firstCount : count - firstCount;
      const t = (localIndex + 0.25) / Math.max(1, localCount) * Math.PI * 2;
      x = side * width * 0.205 + Math.sin(t) ** 3 * width * 0.17;
      y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * height * 0.31;
    } else { throw new Error(`Unknown formation: ${name}`); }
    return { x, y, z: Math.sin(index * 2.4) * 0.32, rotationZ: Math.sin(index * 1.7) * 0.09, scale };
  });
}
