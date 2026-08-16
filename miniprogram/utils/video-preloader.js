/**
 * 串行预下载队列（PRD §3.7）
 *
 * - 同一时刻只下载一个视频，避免抢占带宽拖慢当前页
 * - promote(url)：用户翻到的页立即提到队首
 * - 下载中回调真实进度；失败置 failed，由调用方回落降级画面，不弹错误
 * - 注意：downloadFile 受小程序后台合法域名约束，未配置时会静默失败
 *   （开发者工具需勾选"不校验合法域名"）
 */

const cache = {}; // url -> { status: 'queued'|'loading'|'done'|'failed', path, progress }
const subs = {};  // url -> [cb]
let queue = [];
let activeUrl = null;

function stateOf(url) {
  return cache[url] || null;
}

function notify(url) {
  const list = subs[url] || [];
  const st = cache[url];
  list.forEach((cb) => cb(url, st));
}

function subscribe(url, cb) {
  if (!subs[url]) subs[url] = [];
  subs[url].push(cb);
  if (cache[url]) cb(url, cache[url]);
}

function unsubscribeAll(url) {
  delete subs[url];
}

function enqueue(urls) {
  urls.filter(Boolean).forEach((url) => {
    if (cache[url]) return;
    cache[url] = { status: 'queued', path: '', progress: 0 };
    queue.push(url);
  });
  pump();
}

function promote(url) {
  if (!url || !cache[url]) return;
  if (cache[url].status !== 'queued') return;
  queue = queue.filter((u) => u !== url);
  queue.unshift(url);
}

function pump() {
  if (activeUrl) return;
  const url = queue.shift();
  if (!url) return;
  activeUrl = url;
  cache[url].status = 'loading';
  notify(url);

  const task = wx.downloadFile({
    url,
    success(res) {
      if (res.statusCode === 200 && res.tempFilePath) {
        cache[url].status = 'done';
        cache[url].path = res.tempFilePath;
        cache[url].progress = 100;
      } else {
        cache[url].status = 'failed';
      }
    },
    fail() {
      cache[url].status = 'failed';
    },
    complete() {
      notify(url);
      activeUrl = null;
      pump();
    },
  });

  if (task && task.onProgressUpdate) {
    task.onProgressUpdate((res) => {
      if (cache[url].status !== 'loading') return;
      cache[url].progress = res.progress || 0;
      notify(url);
    });
  }
}

module.exports = { enqueue, promote, subscribe, unsubscribeAll, stateOf };
