export function createTextureQueue(load, onLoad, {
  concurrency = 4, attempts = 3, timeoutMs = 8000, retryDelayMs = 400,
} = {}) {
  const tasks = new Map();
  let pending = [], active = 0, disposed = false;

  function pump() {
    while (!disposed && active < concurrency && pending.length) {
      const task = pending.shift();
      task.state = 'loading';
      task.attempt++;
      active++;
      const controller = new AbortController();
      task.controller = controller;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      Promise.resolve().then(() => load(task.url, controller.signal, task.attempt)).then((texture) => {
        if (disposed) { texture.dispose(); return; }
        task.state = 'ready';
        onLoad(task.url, texture);
      }, () => {
        if (disposed) return;
        task.state = task.attempt < attempts ? 'waiting' : 'failed';
        if (task.state === 'waiting') {
          task.retry = setTimeout(() => {
            if (disposed) return;
            task.state = 'queued';
            pending.unshift(task);
            pump();
          }, retryDelayMs * task.attempt);
        }
      }).finally(() => {
        clearTimeout(timeout);
        task.controller = null;
        active--;
        pump();
      });
    }
  }

  return {
    request(urls) {
      if (disposed) return;
      const wanted = new Set(urls);
      for (const url of wanted) {
        if (!tasks.has(url) || tasks.get(url).state === 'failed') {
          tasks.set(url, { url, state: 'queued', attempt: 0 });
        }
      }
      pending = [...wanted].map((url) => tasks.get(url)).filter((task) => task.state === 'queued')
        .concat(pending.filter((task) => !wanted.has(task.url)));
      pump();
    },
    dispose() {
      disposed = true;
      pending = [];
      for (const task of tasks.values()) {
        clearTimeout(task.retry);
        task.controller?.abort();
      }
      tasks.clear();
    },
  };
}
