import { mkdir, readdir, realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import sharp from 'sharp';
import { normalizeAlbumContent, safePhotoName, safeSegment } from '../src/lib/content.js';

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

export async function preparePhotos({ sourceDir, outputDir, chapters, coverFile = null, dryRun = false, portrait = false }) {
  const source = await physicalPath(path.resolve(sourceDir));
  const output = await physicalPath(path.resolve(outputDir));
  if (inside(source, output) || inside(output, source)) throw new Error('输出目录必须与原图目录分离，不能覆盖原图');
  const failures = [];
  let processed = 0;
  async function convert(relative, destinations, position) {
    try {
      const input = await realpath(path.resolve(source, relative));
      if (!inside(source, input)) throw new Error('原图路径超出目录');
      if (!/\.(jpe?g|png)$/i.test(input)) throw new Error('不支持此格式，请将 HEIC 等格式先导出为 JPG');
      if (dryRun) await sharp(input).metadata();
      else {
        for (const [name, size, format] of destinations) {
          const target = await physicalPath(path.join(output, name));
          if (!inside(output, target) || inside(source, target)) throw new Error('输出路径超出目录');
          await mkdir(path.dirname(target), { recursive: true });
          const image = sharp(input).rotate();
          const dimensions = portrait && format === 'webp'
            ? { width: size * 3 / 4, height: size, fit: 'cover', position: position ?? 'centre' }
            : { width: size, height: size, fit: 'inside', withoutEnlargement: true };
          await image.resize(dimensions).toFormat(format, { quality: format === 'webp' ? 84 : 88 }).toFile(target);
        }
      }
      processed++;
    } catch (error) {
      failures.push(`${relative}：${error.code === 'ENOENT' ? '找不到原图' : error.message}`);
    }
  }
  for (const chapter of chapters ?? []) {
    if (!safeSegment(chapter.folder)) { failures.push('章节目录无效'); continue; }
    const inputFolder = chapter.atRoot ? '' : chapter.folder;
    let files = [];
    try { files = await readdir(path.join(source, inputFolder)); } catch { /* Missing files reported individually below. */ }
    for (const photo of chapter.photos ?? []) {
      if (!safePhotoName(photo.file)) { failures.push(`${chapter.folder}：照片文件名无效`); continue; }
      const candidates = files.filter((name) => path.parse(name).name === photo.file);
      const supported = candidates.filter((name) => /\.(jpe?g|png)$/i.test(name));
      if (supported.length > 1) { failures.push(`${chapter.folder}/${photo.file}：存在多个同名原图，请只保留一个版本`); continue; }
      const name = supported[0] ?? candidates[0] ?? `${photo.file}.jpg`;
      await convert(path.join(inputFolder, name), [
        [`photos/${chapter.folder}/thumb/${photo.file}.webp`, 512, 'webp'],
        [`photos/${chapter.folder}/full/${photo.file}.webp`, 1920, 'webp'],
      ], photo.position);
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
    const groups = Map.groupBy(content.photos, (photo) => photo.folder);
    const options = { outputDir: 'public/media', dryRun, portrait: true };
    const results = [];
    const workspace = await realpath('.');
    if (!inside(workspace, await physicalPath(path.resolve(options.outputDir)))) throw new Error('输出目录超出工作区');
    async function processSource(sourceDir, chapters, coverFile) {
      if (!inside(workspace, await physicalPath(path.resolve(sourceDir)))) {
        errors.push(`${sourceDir}：素材目录超出工作区`);
        return;
      }
      results.push(await preparePhotos({ ...options, sourceDir, chapters, coverFile }));
    }
    for (const [folder, photos] of groups) {
      const atRoot = photos[0].source === 'workspace';
      await processSource(atRoot ? folder : 'originals', [{ folder, photos, atRoot }]);
    }
    if (content.coverSource) await processSource('important', [], path.basename(content.coverSource));
    else if (content.cover === './media/cover.jpg') await processSource('originals', [], 'cover.jpg');
    const processed = results.reduce((sum, result) => sum + result.processed, 0);
    const issues = [...errors, ...results.flatMap((result) => result.failures)];
    console.log(`${dryRun ? '预览（不写入文件）' : '素材处理'}：${processed} 项`);
    for (const issue of issues) console.log(`- ${issue}`);
    if (!content.photos.length) console.log('- 相册照片尚未填写，请先编辑 public/content.js');
    if (!dryRun && issues.length) process.exitCode = 1;
  } catch (error) { console.error(`素材处理失败：${error.message}`); process.exitCode = 1; }
}
