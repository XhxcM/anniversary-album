import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAlbumContent, photoMediaPaths } from '../src/lib/content.js';

test('missing or malformed root yields safe usable content and readable errors', () => {
  for (const raw of [undefined, null, {}, [], 'bad', { chapters: 'bad' }, { chapters: [null, { photos: {} }] }]) {
    const { content, errors } = normalizeAlbumContent(raw);
    assert.equal(content.chapters.length, 4);
    assert.ok(errors.length);
  }
});
test('blank letter is valid, absent music is null and captions remain literal text', () => {
  const { content, errors } = normalizeAlbumContent({ startDate: '2025-12-14', letter: '',
    chapters: [{ id: 'beginning', folder: '01-故事开始', photos: [{ file: '01', caption: '<b>hello</b>' }, { file: '02', caption: '' }] }] });
  assert.equal(content.encryptedLetter, null);
  assert.equal(content.music, null);
  assert.equal(content.chapters[0].photos[0].caption, '<b>hello</b>');
  assert.equal(content.chapters[0].photos[1].caption, '');
  assert.equal(errors.length, 0);
});
test('invalid dates, unsafe paths and duplicate keys are rejected', () => {
  const { content, errors } = normalizeAlbumContent({ startDate: '2025-02-30',
    cover: 'javascript:alert(1)', music: 'https://example.com/tracker',
    chapters: [{ folder: 'safe', photos: [{ file: '../bad' }, { file: '01' }, { file: '01' }, null] }] });
  assert.ok(errors.some((error) => error.includes('startDate')));
  assert.equal(content.startDate, null);
  assert.equal(content.music, null);
  assert.equal(content.chapters[0].photos.length, 1);
});
test('media paths derive thumb/full from folder and basename', () => {
  assert.deepEqual(photoMediaPaths('01-故事开始', '01'), {
    thumb: './media/photos/01-故事开始/thumb/01.webp', full: './media/photos/01-故事开始/full/01.webp',
  });
});
test('replacement chapter ids remain unique when supplied ids match fallback ids', () => {
  const { content, errors } = normalizeAlbumContent({ startDate: '2025-12-14', chapters: [
    { id: 'everyday-1', folder: 'a', photos: [{ file: '01' }] },
    { id: 'everyday-1', folder: 'b', photos: [{ file: '01' }] },
    { id: 'everyday-1-1', folder: 'c', photos: [{ file: '01' }] },
    { id: 'everyday-1-1', folder: 'd', photos: [{ file: '01' }] },
  ] });
  assert.ok(errors.length);
  assert.equal(new Set(content.chapters.map((chapter) => chapter.id)).size, 4);
  const keys = content.chapters.flatMap((chapter) => chapter.photos.map((photo) => photo.key));
  assert.equal(new Set(keys).size, keys.length);
});

test('album sources support the supplied directories and migrate legacy lists in order', () => {
  const { content, errors } = normalizeAlbumContent({
    startDate: '2025-12-14', coverSource: 'important/cover.jpg',
    photoSources: [{ folder: 'pictures', files: ['moving_photo(1)', '../invalid'] }],
    chapters: [{ folder: 'a', photos: [{ file: '01' }] }, { folder: 'b', photos: [{ file: '01' }] }],
  });
  assert.equal(errors.length, 1);
  assert.deepEqual(content.photos.map(({ source, folder, file }) => [source, folder, file]), [
    ['workspace', 'pictures', 'moving_photo(1)'],
  ]);
  const legacy = normalizeAlbumContent({ startDate: '2025-12-14',
    chapters: [{ folder: 'a', photos: [{ file: '01' }] }, { folder: 'b', photos: [{ file: '01' }] }] });
  assert.deepEqual(legacy.content.photos.map(({ source, folder, file }) => [source, folder, file]), [
    ['originals', 'a', '01'], ['originals', 'b', '01'],
  ]);
  assert.equal(content.coverSource, 'important/cover.jpg');
  assert.equal(content.cover, './media/cover.jpg');
  assert.equal(content.startInstant, '2025-12-14T00:00:00+08:00');
});
