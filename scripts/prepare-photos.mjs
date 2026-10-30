import { mkdir, readdir, realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import sharp from 'sharp';
import { normalizeAlbumContent, safeSegment } from '../src/lib/content.js';

const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};
async function physicalPath(file) {
  try { return await realpath(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return path.join(await physicalPath(path.dirname(file)), path.basename(file));
  }
}

export async function preparePhotos({ sourceDir, outputDir, chapters, coverFile = null, dryRun = false }) {
  const source = await physicalPath(path.resolve(sourceDir));
  const output = await physicalPath(path.resolve(outputDir));
  if (inside(source, output) || inside(output, source)) throw new Error('输出目录必须与原图目录分离，不能覆盖原图');
  const failures = [];
  let processed = 0;
  async function convert(relative, destinations) {
    try {
      const input = await realpath(path.resolve(source, relative));
      if (!inside(source, input)) throw new Error('原图路径超出目录');
      if (!/\.(jpe?g|png)$/i.test(input)) throw new Error('不支持此格式，请将 HEIC 等格式先导出为 JPG');
      if (!dryRun) {
        for (const [name, size, format] of destinations) {
          const target = await physicalPath(path.join(output, name));
          if (!inside(output, target) || inside(source, target)) throw new Error('输出路径超出目录');
          await mkdir(path.dirname(target), { recursive: true });
          await sharp(input).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
            .toFormat(format, { quality: format === 'webp' ? 84 : 88 }).toFile(target);
        }
      }
      processed++;
    } catch (error) {
      failures.push(`${relative}：${error.code === 'ENOENT' ? '找不到原图' : error.message}`);
    }
  }
  for (const chapter of chapters ?? []) {
    if (!safeSegment(chapter.folder)) { failures.push('章节目录无效'); continue; }
    let files = [];
    try { files = await readdir(path.join(source, chapter.folder)); } catch { /* Missing files reported individually below. */ }
    for (const photo of chapter.photos ?? []) {
      if (!safeSegment(photo.file)) { failures.push(`${chapter.folder}：照片文件名无效`); continue; }
      const candidates = files.filter((name) => path.parse(name).name === photo.file);
      const supported = candidates.filter((name) => /\.(jpe?g|png)$/i.test(name));
      if (supported.length > 1) { failures.push(`${chapter.folder}/${photo.file}：存在多个同名原图，请只保留一个版本`); continue; }
      const name = supported[0] ?? candidates[0] ?? `${photo.file}.jpg`;
      await convert(path.join(chapter.folder, name), [
        [`photos/${chapter.folder}/thumb/${photo.file}.webp`, 512, 'webp'],
        [`photos/${chapter.folder}/full/${photo.file}.webp`, 1920, 'webp'],
      ]);
    }
  }
  if (coverFile) await convert(coverFile, [['cover.jpg', 2400, 'jpeg']]);
  return { processed, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const context = { window: {} };
    vm.runInNewContext(await readFile('public/content.js', 'utf8'), context, { timeout: 1000 });
    const { content, errors } = normalizeAlbumContent(context.window.ALBUM_CONTENT);
    const dryRun = process.argv.includes('--dry-run');
    const result = await preparePhotos({ sourceDir: 'originals', outputDir: 'public/media',
      chapters: content.chapters, coverFile: 'cover.jpg', dryRun });
    console.log(`${dryRun ? '预览（不写入文件）' : '素材处理'}：${result.processed} 项可处理`);
    for (const issue of [...errors, ...result.failures]) console.log(`- ${issue}`);
    if (!content.chapters.some((chapter) => chapter.photos.length)) console.log('- 章节照片尚未填写，请先编辑 public/content.js');
    if (!dryRun && (errors.length || result.failures.length)) process.exitCode = 1;
  } catch (error) { console.error(`素材处理失败：${error.message}`); process.exitCode = 1; }
}
