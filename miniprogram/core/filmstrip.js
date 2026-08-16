/**
 * 视频预下载队列（PRD §3.7）
 *
 * 绘本的主画面是短视频，「不卡顿」靠三条规则保证：
 *   1. 先下完再播。用 downloadFile 整段落到本地临时文件再交给 <video>，
 *      从根上消灭边下边播的缓冲卡顿。
 *   2. 严格串行。同一时刻只下一个，多个大文件并发会互相抢带宽，
 *      结果是当前页反而最慢。
 *   3. 当前页插队。用户翻到哪页，哪页立刻提到队首。
 *
 * 本模块**不阻塞任何流程**：下载中/失败时调用方自行显示矢量场景降级画面。
 *
 * ⚠️ downloadFile 受「服务器域名」白名单约束。视频源域名（当前 assets.mixkit.co）
 * 必须配进 mp 后台的 downloadFile 合法域名，否则真机整条链路静默失败、
 * 每页都退回矢量场景 —— 开发者工具勾了「不校验合法域名」看不出来。
 */

const CACHE_LIMIT = 24;      // 一本 6 页，够缓存 4 本来回翻
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;

/** url -> { status: 'idle'|'loading'|'ready'|'failed', percent, localPath } */
const states = new Map();
const order = [];            // 已就绪的 url，按放入顺序，用作 LRU
const queue = [];
const listeners = new Set();
const retries = new Map();
let active = null;

function stateOf(url) {
  return states.get(url) || { status: 'idle', percent: 0, localPath: null };
}

function publish(url) {
  const snapshot = stateOf(url);
  listeners.forEach((fn) => fn(url, snapshot));
}

function patch(url, next) {
  states.set(url, Object.assign(stateOf(url), next));
  publish(url);
}

/** 订阅下载状态变化，返回退订函数 */
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function remember(url, localPath) {
  patch(url, { status: 'ready', percent: 100, localPath: localPath });
  order.push(url);
  while (order.length > CACHE_LIMIT) {
    const oldest = order.shift();
    if (oldest !== url) states.delete(oldest);
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    const task = wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error('downloadFile ' + res.statusCode));
      },
      fail: reject,
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((res) => patch(url, { percent: res.progress || 0 }));
    }
  });
}

async function pump() {
  if (active) return;
  const url = queue.shift();
  if (!url) return;
  if (stateOf(url).status === 'ready') { pump(); return; }

  active = url;
  patch(url, { status: 'loading', percent: 0 });

  try {
    const localPath = await Promise.race([
      download(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    remember(url, localPath);
    retries.delete(url);
  } catch (err) {
    const attempt = (retries.get(url) || 0) + 1;
    if (attempt <= MAX_RETRIES) {
      retries.set(url, attempt);
      queue.unshift(url);
      patch(url, { status: 'idle', percent: 0 });
    } else {
      retries.delete(url);
      patch(url, { status: 'failed', percent: 0 });
      console.warn('[filmstrip] 放弃下载：', url, err && err.message);
    }
  }

  active = null;
  pump();
}

/** 按阅读顺序排队（已就绪 / 已在队里的自动跳过） */
function enqueue(urls) {
  urls.filter(Boolean).forEach((url) => {
    if (stateOf(url).status === 'ready') return;
    if (active === url || queue.indexOf(url) !== -1) return;
    queue.push(url);
  });
  pump();
}

/** 当前页插队到队首 */
function prioritize(url) {
  if (!url) return;
  if (stateOf(url).status === 'ready' || active === url) return;
  const i = queue.indexOf(url);
  if (i !== -1) queue.splice(i, 1);
  queue.unshift(url);
  // 之前判失败的，用户主动翻到了就再给一次机会
  if (stateOf(url).status === 'failed') {
    retries.delete(url);
    patch(url, { status: 'idle', percent: 0 });
  }
  pump();
}

module.exports = { subscribe, stateOf, enqueue, prioritize };
