/**
 * 女童声音源层（PRD §3.6）
 *
 * 只做一件事：给定一句英文，把它变成一个正在播放的音频句柄，并在取不到时
 * 诚实地降级。朗读的编排（句序、停顿、逐词高亮）在 narrator.js，不在这里。
 *
 * ── 降级链为什么是「多镜像」而不是「换音源」──────────────────────
 * PRD §3.6 要求有降级链，§6 又要求「全应用英文发音必须为同一女童声，不允许
 * 混音色」。这两条只有一种解法：降级链的每一环都指向**同一批 AnaNeural 语料**
 * 的不同镜像（jsDelivr → raw.githubusercontent），而不是退到别家 TTS。
 * 全部镜像都取不到时宁可**静默**（narrator 用估算节奏走完字幕），也不换嗓子 ——
 * 换嗓子正是历史上最难定位的那类体验事故：少量语料缺口被放大成全程成年女声。
 *
 * ── 两层自愈，都不是一次性闩锁 ──────────────────────────────
 *   · 按条降级：某条取不到 → 只有这条往下一个镜像走，其余照旧用第一镜像。
 *   · 整站降级：连续 SITE_DOWN_FAILS 条**不同**文案全链失败 → 判定音源站挂了，
 *     SITE_DOWN_RECOVER_MS 后自动恢复重试。带时间盒，不是永久单向。
 */
const settings = require('./settings');
const { normalize, ttsKey } = require('./hash');

/** InnerAudioContext 实例数有限，LRU 复用并设上限 */
const CTX_LIMIT = 6;
const pool = []; // [{ url, ctx }]，队尾最新

/** 整站降级状态 */
const site = {
  downUntil: 0,
  failedTexts: [], // 最近连续全链失败的**不同**文案
};

const urlOf = (text, mirror) => settings.VOICE_BASES[mirror] + ttsKey(text) + '.mp3';

function detach(ctx) {
  try { ctx.offCanplay(); } catch (e) { /* noop */ }
  try { ctx.offTimeUpdate(); } catch (e) { /* noop */ }
  try { ctx.offEnded(); } catch (e) { /* noop */ }
  try { ctx.offError(); } catch (e) { /* noop */ }
}

function discard(ctx) {
  const i = pool.findIndex((e) => e.ctx === ctx);
  if (i >= 0) pool.splice(i, 1);
  detach(ctx);
  try { ctx.destroy(); } catch (e) { /* noop */ }
}

/** 取（或新建）某个 URL 的音频上下文，命中即提到队尾 */
function acquire(url) {
  const i = pool.findIndex((e) => e.url === url);
  if (i >= 0) {
    const entry = pool.splice(i, 1)[0];
    pool.push(entry);
    detach(entry.ctx);
    return entry.ctx;
  }
  const ctx = wx.createInnerAudioContext();
  // 静音键按下时仍要出声：绘本是「看+听」，没声音等于功能缺失
  ctx.obeyMuteSwitch = false;
  ctx.src = url;
  pool.push({ url, ctx });
  while (pool.length > CTX_LIMIT) {
    const oldest = pool.shift();
    detach(oldest.ctx);
    try { oldest.ctx.destroy(); } catch (e) { /* noop */ }
  }
  return ctx;
}

function noteSuccess() {
  // 真的出声了：清掉连败计数，别让偶发抖动累积成整站降级
  site.failedTexts = [];
}

function noteAllMirrorsFailed(text) {
  const key = ttsKey(text);
  if (site.failedTexts.indexOf(key) === -1) site.failedTexts.push(key);
  if (site.failedTexts.length >= settings.SITE_DOWN_FAILS) {
    site.downUntil = Date.now() + settings.SITE_DOWN_RECOVER_MS;
    site.failedTexts = [];
    console.warn('[voice] 连续取不到语料，整站降级；' +
      settings.SITE_DOWN_RECOVER_MS / 1000 + 's 后自动重试');
  }
}

/** 当前是否处于整站降级期 */
function isSiteDown() {
  return Date.now() < site.downUntil;
}

/**
 * 播放一句语料。
 *
 * @param {string} raw 台词文本
 * @param {{onReady?:(dur:number)=>void, onEnded?:()=>void, onSilent?:()=>void}} hooks
 * @returns {{silent:boolean, stop:()=>void, position:()=>{at:number,total:number}|null}}
 *          silent === true 表示压根没发起播放（整站降级期），调用方须自行走估算节奏。
 */
function speak(raw, hooks) {
  const text = normalize(raw);
  const on = hooks || {};

  if (isSiteDown()) {
    if (on.onSilent) on.onSilent();
    return { silent: true, stop() {}, position() { return null; } };
  }

  let stopped = false;
  let current = null;

  const tryMirror = (mirror) => {
    if (stopped) return;
    if (mirror >= settings.VOICE_BASES.length) {
      // 全链耗尽：本条转静默，但**不换音色**（见文件头）
      noteAllMirrorsFailed(text);
      current = null;
      if (on.onSilent) on.onSilent();
      return;
    }

    const ctx = acquire(urlOf(text, mirror));
    current = ctx;

    ctx.onCanplay(() => {
      if (stopped || current !== ctx) return;
      if (on.onReady) on.onReady(ctx.duration || 0);
    });
    ctx.onEnded(() => {
      if (stopped || current !== ctx) return;
      noteSuccess();
      if (on.onEnded) on.onEnded();
    });
    ctx.onError(() => {
      if (stopped || current !== ctx) return;
      discard(ctx); // 失败的上下文不复用，下次重建
      tryMirror(mirror + 1);
    });

    try { ctx.seek(0); } catch (e) { /* noop */ }
    ctx.play();
  };

  tryMirror(0);

  return {
    get silent() { return current === null; },
    stop() {
      stopped = true;
      if (current) {
        detach(current);
        try { current.stop(); } catch (e) { /* noop */ }
        current = null;
      }
    },
    /** 轮询用：句间静音裁剪与逐词高亮都要真实播放位置 */
    position() {
      if (!current) return null;
      const at = current.currentTime || 0;
      const total = current.duration || 0;
      if (at > 0) noteSuccess(); // 确认出声
      return { at: at, total: total };
    },
  };
}

/** 预热：提前建好上下文触发音频预加载（进入绘本时对整本台词调用） */
function prime(texts) {
  if (isSiteDown()) return;
  texts.slice(0, CTX_LIMIT).forEach((t) => acquire(urlOf(normalize(t), 0)));
}

/** 释放全部音频上下文（退出阅读器 / 切后台，PRD §3.4 资源清理） */
function releaseAll() {
  while (pool.length) {
    const entry = pool.pop();
    detach(entry.ctx);
    try { entry.ctx.destroy(); } catch (e) { /* noop */ }
  }
}

module.exports = { speak, prime, releaseAll, isSiteDown };
