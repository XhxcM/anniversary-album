export function createTransitionPlan(currentItems, nextPhotos, targets) {
  const remaining = new Map(currentItems.map((item) => [item.key, item]));
  const updates = [], creates = [];
  const seen = new Set();
  nextPhotos.forEach((photo, index) => {
    if (seen.has(photo.key)) return;
    seen.add(photo.key);
    const item = remaining.get(photo.key);
    const entry = { key: photo.key, photo, target: targets[index] };
    if (item) { updates.push({ ...entry, item }); remaining.delete(photo.key); }
    else creates.push(entry);
  });
  return { updates, creates, removes: [...remaining.values()] };
}
