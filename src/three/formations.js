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
  function heartPoints(size, side) {
    const curve = Array.from({ length: 513 }, (_, index) => {
      const t = index / 512 * Math.PI * 2;
      return { x: side * width * 0.205 + Math.sin(t) ** 3 * width * 0.17,
        y: (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * height * 0.31 };
    });
    const lengths = [0];
    for (let i = 1; i < curve.length; i++) lengths.push(lengths[i - 1] + Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y));
    return Array.from({ length: size }, (_, index) => {
      const distance = (index + 0.25) / size * lengths.at(-1);
      const next = lengths.findIndex((length) => length >= distance);
      const amount = (distance - lengths[next - 1]) / (lengths[next] - lengths[next - 1]);
      return { x: curve[next - 1].x + (curve[next].x - curve[next - 1].x) * amount,
        y: curve[next - 1].y + (curve[next].y - curve[next - 1].y) * amount };
    });
  }
  const hearts = name === 'doubleHeart' ? [...heartPoints(Math.ceil(count / 2), -1), ...heartPoints(Math.floor(count / 2), 1)] : [];
  const points = Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const angle = (index + 0.25) / Math.max(1, count) * Math.PI * 2;
    let x, y;
    if (name === 'river') {
      x = (progress - 0.5) * width * 0.78;
      y = Math.sin(progress * Math.PI * 2) * height * 0.23;
    } else if (name === 'infinity') {
      x = Math.cos(angle) * width * 0.36;
      y = Math.sin(2 * angle) * height * 0.26;
    } else if (name === 'doubleHeart') {
      ({ x, y } = hearts[index]);
    } else { throw new Error(`Unknown formation: ${name}`); }
    return { x, y, z: Math.sin(index * 2.4) * 0.32, rotationZ: Math.sin(index * 1.7) * 0.09, scale };
  });
  for (const point of points) {
    for (const other of points) {
      if (other === point) continue;
      // Leave room for the warm border and small rotation at tight turns.
      point.scale = Math.min(point.scale, Math.max(Math.abs(point.x - other.x) / 1.5, Math.abs(point.y - other.y) / 1.25) * 0.9);
    }
  }
  return points;
}
