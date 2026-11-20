import { readFile, writeFile } from 'node:fs/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { encryptLetter } from '../src/lib/letter-crypto.js';

function readHidden(prompt) {
  stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = stdin.isRaw;
    function finish() {
      stdin.off('keypress', onKey);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\n');
    }
    function onKey(text, key) {
      if (key.ctrl && ['c', 'd'].includes(key.name)) {
        finish();
        reject(new Error('已取消加密'));
      } else if (key.name === 'return' || key.name === 'enter') {
        finish();
        resolve(value);
      } else if (key.name === 'backspace') {
        value = [...value].slice(0, -1).join('');
      } else if (!key.ctrl && !key.meta && text && !/[\p{Cc}]/u.test(text)) {
        value += text;
      }
    }
    stdin.setRawMode(true);
    stdin.on('keypress', onKey);
    stdin.resume();
  });
}

try {
  if (!stdin.isTTY || !stdout.isTTY || process.argv.length !== 2) throw new Error('请在交互式终端运行，不附加参数');
  const body = await readFile('private/letter.txt', 'utf8');
  if (!body.trim()) throw new Error('private/letter.txt 为空');
  emitKeypressEvents(stdin);
  const password = await readHidden('信件口令（不回显）：');
  if (!password) throw new Error('口令不能为空');
  if (await readHidden('再次输入口令（不回显）：') !== password) throw new Error('两次输入不一致');
  const encrypted = await encryptLetter(body, password);
  await writeFile('private/letter.encrypted.json', JSON.stringify(encrypted, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  stdout.write('已生成 private/letter.encrypted.json，可将其中的对象填入 public/content.js 的 encryptedLetter。\n');
} catch (error) {
  const message = error.code === 'ENOENT' ? '请先创建 private/letter.txt' :
    error.code === 'EEXIST' ? '加密输出已存在，请先移走旧密文文件' : error.message;
  console.error(message);
  process.exitCode = 1;
}
