import { calculateElapsedDays } from './days.js';

export const CHAPTERS = [
  { id: 'beginning', title: '故事开始的地方', folder: '01-故事开始' },
  { id: 'everyday', title: '平凡日子也闪闪发光', folder: '02-平凡日常' },
  { id: 'journey', title: '一起走过的地方', folder: '03-一起走过' },
  { id: 'anniversary', title: '特别瞬间与纪念日', folder: '04-纪念日' },
];
export const safeSegment = (value) => typeof value === 'string' && /^[\p{L}\p{N}_-]+$/u.test(value);
const localMedia = (value) => typeof value === 'string' && /^\.\/media\/[\p{L}\p{N}_./-]+$/u.test(value) && !value.split('/').includes('..');

export function photoMediaPaths(chapterFolder, file) {
  if (!safeSegment(chapterFolder) || !safeSegment(file)) throw new Error('照片目录或文件名无效');
  const base = `./media/photos/${chapterFolder}`;
  return { thumb: `${base}/thumb/${file}.webp`, full: `${base}/full/${file}.webp` };
}

export function normalizeAlbumContent(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push('content.js：内容缺失或格式无效'); raw = {}; }
  const startDate = calculateElapsedDays(raw.startDate) === null ? null : raw.startDate;
  if (!startDate) errors.push('startDate：请填写有效日期，例如 2025-12-14');
  let timeZone = raw.timeZone ?? 'Asia/Shanghai';
  try { new Intl.DateTimeFormat('en', { timeZone }); }
  catch { errors.push('timeZone：时区无效，已使用 Asia/Shanghai'); timeZone = 'Asia/Shanghai'; }
  const media = (field) => {
    if (raw[field] == null || raw[field] === '') return null;
    if (localMedia(raw[field])) return raw[field];
    errors.push(`${field}：请使用 ./media/ 下的本地文件`);
    return null;
  };
  if (!Array.isArray(raw.chapters)) errors.push('chapters：请填写章节数组');
  const ids = new Set();
  const chapters = CHAPTERS.map((defaults, index) => {
    const supplied = Array.isArray(raw.chapters) ? raw.chapters[index] : undefined;
    let chapter = supplied;
    if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) {
      if (supplied !== undefined) errors.push(`chapters[${index}]：章节格式无效`);
      chapter = {};
    }
    let id = safeSegment(chapter.id) ? chapter.id : defaults.id;
    if (ids.has(id)) { errors.push(`chapters[${index}]：id 重复`); id = `${defaults.id}-${index}`; }
    let suffix = 1;
    while (ids.has(id)) id = `${defaults.id}-${index}-${suffix++}`;
    ids.add(id);
    const folder = safeSegment(chapter.folder) ? chapter.folder : defaults.folder;
    if (chapter.folder != null && !safeSegment(chapter.folder)) errors.push(`${id}：目录名称无效`);
    if (supplied && !Array.isArray(chapter.photos)) errors.push(`${id}.photos：请填写照片数组`);
    const files = new Set();
    const photos = [];
    for (const photo of Array.isArray(chapter.photos) ? chapter.photos : []) {
      if (!photo || !safeSegment(photo.file) || files.has(photo.file)) { errors.push(`${id}：照片条目无效或文件名重复`); continue; }
      files.add(photo.file);
      photos.push({ file: photo.file, caption: typeof photo.caption === 'string' ? photo.caption : '',
        key: `${id}/${photo.file}`, chapterId: id, ...photoMediaPaths(folder, photo.file) });
    }
    return { id, folder, title: typeof chapter.title === 'string' && chapter.title.trim() ? chapter.title : defaults.title, photos };
  });
  return { content: { startDate, timeZone, cover: media('cover'), music: media('music'),
    letter: typeof raw.letter === 'string' ? raw.letter : '', chapters }, errors };
}
