import test from 'node:test';
import assert from 'node:assert/strict';
import { lyricAt, parseLyrics } from '../src/lib/lyrics.js';

test('LRC combines simultaneous bilingual lines, sorts timestamps and preserves blank cues', () => {
  const cues = parseLyrics('[ti:Song]\r\n[00:20.25]中文\r\n[00:10.00][00:20.25]English\n[00:20.25]中文\n[00:30.00] \n[00:99.00]invalid');
  assert.deepEqual(cues, [{ time: 10, text: 'English' }, { time: 20.25, text: '中文\nEnglish' }, { time: 30, text: '' }]);
  assert.equal(lyricAt(cues, 9), '');
  assert.equal(lyricAt(cues, 20.25), '中文\nEnglish');
  assert.equal(lyricAt(cues, 30), '');
  assert.equal(lyricAt(cues, 10), 'English');
  assert.equal(lyricAt(cues, 0), '');
  assert.equal(lyricAt(cues, NaN), '');
  assert.equal(lyricAt([], 10), '');
});

test('LRC applies millisecond offsets and safely handles an empty file', () => {
  assert.deepEqual(parseLyrics('[offset:-500]\n[00:00.20]Intro\n[01:00.75]Verse'), [
    { time: 0, text: 'Intro' }, { time: 60.25, text: 'Verse' },
  ]);
  assert.deepEqual(parseLyrics(''), []);
});
