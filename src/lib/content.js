import { calculateElapsedDays, elapsedParts } from './days.js';

export const CHAPTERS = [
  { id: 'beginning', title: '故事开始的地方', folder: '01-故事开始' },
  { id: 'everyday', title: '平凡日子也闪闪发光', folder: '02-平凡日常' },
  { id: 'journey', title: '一起走过的地方', folder: '03-一起走过' },
  { id: 'anniversary', title: '特别瞬间与纪念日', folder: '04-纪念日' },
];
export const safeSegment = (value) => typeof value === 'string' && /^[\p{L}\p{N}_-]+$/u.test(value);
export const safePhotoName = (value) => typeof value === 'string' && /^[\p{L}\p{N}_()-]+$/u.test(value);
const localMedia = (value) => typeof value === 'string' && /^\.\/media\/[\p{L}\p{N}_./-]+$/u.test(value) && !value.split('/').includes('..');

export function photoMediaPaths(chapterFolder, file) {
  if (!safeSegment(chapterFolder) || !safePhotoName(file)) throw new Error('照片目录或文件名无效');
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
  if (!Array.isArray(raw.chapters) && raw.photoSources == null) errors.push('chapters：请填写章节数组');
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
  const photos = raw.photoSources == null
    ? chapters.flatMap(({ folder, photos }) => photos.map((photo) => ({ ...photo, folder, source: 'originals' })))
    : [];
  const photoKeys = new Set();
  if (raw.photoSources != null && !Array.isArray(raw.photoSources)) errors.push('photoSources：请填写照片来源数组');
  for (const group of Array.isArray(raw.photoSources) ? raw.photoSources : []) {
    if (!safeSegment(group?.folder) || !Array.isArray(group.files)) {
      errors.push('photoSources：目录或文件列表无效');
      continue;
    }
    for (const entry of group.files) {
      const { file, caption, position } = typeof entry === 'string' ? { file: entry } : entry ?? {};
      const key = `${group.folder}/${file}`;
      if (!safePhotoName(file) || photoKeys.has(key)) {
        errors.push(`${group.folder}：照片名称无效或重复`);
        continue;
      }
      photoKeys.add(key);
      photos.push({ key, folder: group.folder, file, source: 'workspace',
        caption: typeof caption === 'string' ? caption : '',
        position: ['top', 'bottom', 'left', 'right'].includes(position) ? position : 'centre',
        ...photoMediaPaths(group.folder, file) });
    }
  }
  const coverSource = typeof raw.coverSource === 'string' && /^important\/[\p{L}\p{N}_()-]+\.(jpe?g|png)$/iu.test(raw.coverSource)
    ? raw.coverSource : null;
  if (raw.coverSource != null && !coverSource) errors.push('coverSource：请引用 important 下的图片');
  const startInstant = raw.startInstant ?? (startDate ? `${startDate}T00:00:00+08:00` : null);
  const validStart = elapsedParts(startInstant) !== null;
  if (raw.startInstant != null && !validStart) errors.push('startInstant：请填写包含时区的有效时刻');
  const opening = Array.isArray(raw.opening) ? raw.opening.filter(localMedia).slice(0, 3) : [];
  const timeline = (Array.isArray(raw.timeline) ? raw.timeline : []).filter((item) => typeof item?.title === 'string' && item.title.trim())
    .map(({ date, title, description }) => ({ date: typeof date === 'string' ? date : '', title,
      description: typeof description === 'string' ? description : '' }));
  const encryptedLetter = raw.encryptedLetter && typeof raw.encryptedLetter === 'object' && !Array.isArray(raw.encryptedLetter)
    ? raw.encryptedLetter : null;
  return { content: { startDate, timeZone, startInstant: validStart ? startInstant : null,
    coverSource, cover: coverSource ? './media/cover.jpg' : media('cover'),
    music: media('music'), opening, photos, chapters, timeline, encryptedLetter }, errors };
}
