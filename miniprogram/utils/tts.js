/**
 * 女童声旁白播放（PRD §3.6）
 *
 * - 全部英文语料构建期离线预生成 MP3，客户端按 ttsKey(text) 拼公开 URL 播放
 * - InnerAudioContext LRU 复用（上限 4 个实例）
 * - 两层自愈降级，不使用一次性全局闩锁：
 *   1) 按条降级：单条语料主 base 取不到时，只有该条退回下一个 base
 *   2) 整站降级带时间盒：连续 3 条不同文案失败才判定站点不可用，60s 后自动恢复
 * - 站点不可用期间 play() 返回 { silent: true }，调用方用估算节奏继续动画，
 *   阅读流程不被网络阻塞
 */
const config = require('./config');
const { ttsKey, normalize } = require('./tts-key');

const LRU_MAX = 4;
const lru = []; // [{ url, ctx }]，队尾最新

// 整站降级状态
let recentFailTexts = []; // 最近连续失败的不同文案 key
let siteDownUntil = 0;

function urlFor(text, baseIndex) {
  return config.TTS_BASES[baseIndex] + ttsKey(text) + '.mp3';
}

function takeCtx(url) {
  const i = lru.findIndex((e) => e.url === url);
  if (i >= 0) {
    const e = lru.splice(i, 1)[0];
    lru.push(e);
    return e.ctx;
  }
  const ctx = wx.createInnerAudioContext();
  ctx.obeyMuteSwitch = false;
  lru.push({ url, ctx });
  if (lru.length > LRU_MAX) {
    const old = lru.shift();
    try { old.ctx.destroy(); } catch (e) { /* ignore */ }
  }
  return ctx;
}

function noteSuccess(text) {
  recentFailTexts = [];
}

function noteFailure(text) {
  const key = ttsKey(text);
  if (recentFailTexts[recentFailTexts.length - 1] !== key) {
    recentFailTexts.push(key);
  }
  if (recentFailTexts.length >= config.SITE_DOWN_FAILS) {
    siteDownUntil = Date.now() + config.SITE_DOWN_RECOVER_MS;
    recentFailTexts = [];
  }
}

function siteDown() {
  return Date.now() < siteDownUntil;
}

/**
 * 播放一条语料。
 * handlers: { onCanplay(duration), onTimeUpdate(currentTime, duration), onEnded(), onError() }
 * 返回控制器 { stop(), silent }。
 * silent === true 表示当前处于整站降级期，未发起播放，由调用方自行走无声动画。
 */
function play(text, handlers) {
  handlers = handlers || {};
  if (siteDown()) {
    return { stop() {}, silent: true };
  }

  let stopped = false;
  let ctx = null;
  let baseIndex = 0;

  const cleanup = () => {
    if (!ctx) return;
    ctx.offCanplay();
    ctx.offTimeUpdate();
    ctx.offEnded();
    ctx.offError();
    try { ctx.stop(); } catch (e) { /* ignore */ }
    ctx = null;
  };

  const tryBase = (bi) => {
    if (stopped) return;
    if (bi >= config.TTS_BASES.length) {
      // 全部 base 失败 → 记一条失败，本条走无声降级
      noteFailure(text);
      if (handlers.onError) handlers.onError();
      return;
    }
    baseIndex = bi;
    const url = urlFor(text, bi);
    ctx = takeCtx(url);
    ctx.offCanplay();
    ctx.offTimeUpdate();
    ctx.offEnded();
    ctx.offError();
    ctx.src = url;

    ctx.onCanplay(() => {
      if (stopped) return;
      noteSuccess(text);
      if (handlers.onCanplay) handlers.onCanplay(ctx.duration || 0);
    });
    ctx.onTimeUpdate(() => {
      if (stopped || !ctx) return;
      if (handlers.onTimeUpdate) handlers.onTimeUpdate(ctx.currentTime || 0, ctx.duration || 0);
    });
    ctx.onEnded(() => {
      if (stopped) return;
      if (handlers.onEnded) handlers.onEnded();
    });
    ctx.onError(() => {
      if (stopped) return;
      const failed = ctx;
      ctx = null;
      try { failed.destroy(); } catch (e) { /* ignore */ }
      const i = lru.findIndex((e) => e.ctx === failed);
      if (i >= 0) lru.splice(i, 1);
      tryBase(bi + 1); // 按条降级：只有本条退回下一个 base
    });
    ctx.play();
  };

  tryBase(0);

  return {
    silent: false,
    stop() {
      stopped = true;
      cleanup();
    },
    /** 轮询用：当前播放位置与时长（PRD §3.5 句间静音裁剪需要轮询 currentTime） */
    position() {
      if (!ctx) return null;
      return { currentTime: ctx.currentTime || 0, duration: ctx.duration || 0 };
    },
  };
}

/** 简单播放一个词/短语（生词发音），随放随忘 */
function playWord(word, onDone) {
  return play(normalize(word), { onEnded: onDone });
}

/** 释放全部音频上下文（退出阅读器/切后台时调用，PRD §3.4 资源清理） */
function releaseAll() {
  while (lru.length) {
    const e = lru.pop();
    try { e.ctx.destroy(); } catch (err) { /* ignore */ }
  }
}

module.exports = { play, playWord, releaseAll, siteDown };
