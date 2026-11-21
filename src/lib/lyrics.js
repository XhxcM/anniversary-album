export function parseLyrics(source) {
  const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  const cues = new Map();
  for (const line of source.split(/\r?\n/)) {
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    for (const match of line.matchAll(/\[(\d+):([0-5]?\d(?:\.\d+)?)\]/g)) {
      const time = Math.max(0, Number(match[1]) * 60 + Number(match[2]) + offset);
      if (!cues.has(time)) cues.set(time, []);
      if (text && !cues.get(time).includes(text)) cues.get(time).push(text);
    }
  }
  return [...cues].map(([time, lines]) => ({ time, text: lines.join('\n') })).sort((a, b) => a.time - b.time);
}

export function lyricAt(cues, time) {
  return Number.isFinite(time) ? cues.findLast((cue) => cue.time <= time)?.text ?? '' : '';
}
