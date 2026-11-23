import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { preparePhotos } from '../scripts/prepare-photos.mjs';

test('media copies strip metadata, respect dimensions, and never change originals', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'album-media-'));
  const sourceDir = path.join(root, 'originals');
  const outputDir = path.join(root, 'output');
  await mkdir(path.join(sourceDir, 'chapter'), { recursive: true });
  const source = path.join(sourceDir, 'chapter', '01.JPG');
  await sharp({ create: { width: 2000, height: 1200, channels: 3, background: '#bd824d' } })
    .withMetadata({ exif: { IFD0: { Artist: 'metadata fixture' } } }).jpeg().toFile(source);
  const before = await readFile(source);
  const result = await preparePhotos({ sourceDir, outputDir, coverFile: 'chapter/01.JPG',
    chapters: [{ folder: 'chapter', photos: [{ file: '01' }, { file: 'missing' }, { file: '02' }] }] });
  assert.equal(result.processed, 2);
  assert.ok(result.failures.some((line) => line.includes('missing')));
  assert.deepEqual(await readFile(source), before);
  for (const [relative, limit, format] of [['photos/chapter/thumb/01.webp', 512, 'webp'],
    ['photos/chapter/full/01.webp', 1920, 'webp'], ['cover.jpg', 2400, 'jpeg']]) {
    const metadata = await sharp(path.join(outputDir, relative)).metadata();
    assert.ok(Math.max(metadata.width, metadata.height) <= limit);
    assert.equal(metadata.format, format);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
  }
  await writeFile(path.join(sourceDir, 'chapter', '02.heic'), 'unsupported');
  const unsupported = await preparePhotos({ sourceDir, outputDir, chapters: [{ folder: 'chapter', photos: [{ file: '02' }] }] });
  assert.match(unsupported.failures.join(' '), /HEIC.*JPG/i);
});
test('dry run writes nothing and unsafe output cannot overwrite sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'album-dry-'));
  const outputDir = path.join(root, 'output');
  const result = await preparePhotos({ sourceDir: path.join(root, 'originals'), outputDir, chapters: [], coverFile: 'cover.jpg', dryRun: true });
  assert.ok(result.failures.length);
  await assert.rejects(access(outputDir));
  await assert.rejects(preparePhotos({ sourceDir: root, outputDir: path.join(root, 'copies'), chapters: [] }), /原图/);
  const traversal = await preparePhotos({ sourceDir: path.join(root, 'originals'), outputDir,
    chapters: [{ folder: '../escape', photos: [{ file: '01' }] }] });
  assert.ok(traversal.failures.length);
});
