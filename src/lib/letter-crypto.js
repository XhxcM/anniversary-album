const ITERATIONS = 600000;
const MAX_CIPHERTEXT = 1_048_576;
const encode = (bytes) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const decode = (value) => {
  if (typeof value !== 'string' || value.length > MAX_CIPHERTEXT * 2 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('信件密文格式无效');
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
};

async function derive(password, salt, usage) {
  if (typeof password !== 'string' || !password || !globalThis.crypto?.subtle) throw new Error('无法生成信件密钥');
  const input = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    input, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export async function encryptLetter(text, password) {
  const body = new TextEncoder().encode(text);
  if (!body.length || body.length + 16 > MAX_CIPHERTEXT) throw new Error('请使用非空且小于 1 MiB 的信件正文');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, body);
  return { version: 1, kdf: 'PBKDF2-SHA-256', cipher: 'AES-GCM', iterations: ITERATIONS,
    salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}

export async function decryptLetter(payload, password) {
  if (payload?.version !== 1 || payload.kdf !== 'PBKDF2-SHA-256' ||
      payload.cipher !== 'AES-GCM' || payload.iterations !== ITERATIONS) throw new Error('信件算法参数无效');
  const salt = decode(payload.salt);
  const iv = decode(payload.iv);
  const ciphertext = decode(payload.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length <= 16 || ciphertext.length > MAX_CIPHERTEXT) {
    throw new Error('信件密文长度无效');
  }
  const key = await derive(password, salt, 'decrypt');
  const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder('utf-8', { fatal: true }).decode(result);
}
