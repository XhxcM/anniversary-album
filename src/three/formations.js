export function selectEvenly(items, limit) {
  const count = Math.max(0, Math.floor(limit));
  if (items.length <= count) return [...items];
  if (count === 0) return [];
  if (count === 1) return [items[0]];
  return Array.from({ length: count }, (_, index) => items[Math.round(index * (items.length - 1) / (count - 1))]);
}

export function createFormation(name, count, viewport = { width: 16, height: 9 }) {
  const height = viewport.height;
  const compact = viewport.compact === true;
  const width = compact ? viewport.width * 0.97 : Math.min(viewport.width, height * 2.55);
  const cardSize = name === 'matrix' ? 3.77 : 4;
  const scale = Math.min(compact ? 1.3 : 0.95, Math.max(0.34, (compact ? 6.5 : cardSize) / Math.sqrt(Math.max(1, count))));
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
  const size = scale * ({ doubleHeart: 1.76, matrix: 1.91, sphere: 2, river: 1.83, ring: 1.82, cylinder: 2 }[name] ?? 1);
  const edgeInset = Math.min(width * 0.1, Math.max(0, size - 0.78) * 0.62);
  return Array.from({ length: count }, (_, index) => {
    const angle = (index + 0.25) / Math.max(1, count) * Math.PI * 2;
    let x, y, z = Math.sin(index * 2.4) * 0.32, rotationY = 0;
    if (name === 'river') {
      const columns = Math.ceil(count / (compact ? Math.min(2, count) : Math.min(5, Math.ceil(count / 10))));
      const column = columns === 1 ? 0.5 : (index % columns) / (columns - 1);
      x = (column - 0.5) * (width * 0.74 - 2 * edgeInset);
      const row = Math.floor(index / columns) - (Math.ceil(count / columns) - 1) / 2;
      y = Math.sin(column * Math.PI * 2) * height * (compact ? 0.1 : 0.115) + row * Math.max(height * 0.083, size * 1.14);
      z = Math.cos(column * Math.PI * 2) * 1.15;
      rotationY = Math.sin(column * Math.PI * 2) * 0.42;
    } else if (name === 'infinity') {
      x = Math.cos(angle) * width * 0.36;
      y = Math.sin(2 * angle) * height * 0.26;
    } else if (name === 'doubleHeart') {
      ({ x, y } = hearts[index]);
    } else if (name === 'matrix') {
      const columns = compact ? Math.ceil(count / Math.min(3, count)) : Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      const row = Math.floor(index / columns);
      const rowLength = Math.min(columns, count - row * columns);
      x = (index % columns - (rowLength - 1) / 2) * (compact ? width * 0.87 : Math.min(width * 0.78, height * 0.91)) / columns;
      y = ((rows - 1) / 2 - row) * height * (compact ? 0.92 : 0.95) / rows;
      z = 0;
    } else if (name === 'sphere') {
      const vertical = 1 - 2 * (index + 0.5) / count;
      const radius = Math.sqrt(1 - vertical ** 2);
      const longitude = index * Math.PI * (3 - Math.sqrt(5));
      x = Math.cos(longitude) * radius * (compact ? width * 0.36 : Math.min(width * 0.32, height * 0.43));
      y = vertical * (height * (compact ? 0.35 : 0.36) - Math.min(height * 0.1, edgeInset * 0.66));
      z = Math.sin(longitude) * radius * 2.2;
      rotationY = compact ? Math.sin(longitude) * 0.35 : x / height * 1.35;
    } else if (name === 'ring') {
      const bands = Math.min(3, Math.ceil(count / 20));
      const band = index % bands - (bands - 1) / 2;
      const longitude = (Math.floor(index / bands) + (band + 1) * 0.28) / Math.ceil(count / bands) * Math.PI * 2;
      x = Math.sin(longitude) * (width * (compact ? 0.36 : 0.32) + band * 0.15);
      y = Math.cos(longitude) * height * (compact ? 0.15 : 0.18) + band * height * (compact ? 0.075 : 0.087);
      z = Math.cos(longitude) * 2 + band * 0.22;
      rotationY = Math.sin(longitude) * 0.48;
    } else if (name === 'cylinder') {
      const columns = Math.ceil(count / (compact ? Math.min(2, count) : Math.min(5, Math.ceil(count / 10))));
      const longitude = columns === 1 ? 0 : (index % columns / (columns - 1) - 0.5) * Math.PI * 0.87;
      x = Math.sin(longitude) * (width * 0.37 - edgeInset);
      y = (Math.floor(index / columns) - (Math.ceil(count / columns) - 1) / 2) * Math.max(height * 0.13, size * 1.17);
      z = (1 - Math.cos(longitude)) * 2.5 - 0.8;
      rotationY = -longitude * 0.72;
    } else { throw new Error(`Unknown formation: ${name}`); }
    return { x, y, z, rotationY, rotationZ: name === 'matrix' || name === 'cylinder' ? 0 : Math.sin(index * 1.7) * 0.08,
      scale: size };
  });
}
