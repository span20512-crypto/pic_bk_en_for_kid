/**
 * 旁白编排（PRD §3.4 / §3.5）
 *
 * 把「一页台词」变成一段有呼吸感的朗读：逐句播放，句间停 STORY_GAP_MS，
 * 同时按真实人声进度回调逐词高亮位置。视频那边是静音循环，与本模块并行，
 * 互不等待 —— 这正是 PRD「两者并行启动」的含义。
 *
 * ── 为什么不能只等 onEnded ────────────────────────────────
 * 每条语料自带 ~0.18s 前导 + ~1.05s 尾部静音。纯靠 onEnded 衔接，句间真实停顿
 * = 尾部静音 + 下一条前导 ≈ 1.23s，明显拖沓（参考动画实测中位数只有 0.70s）。
 * 所以这里轮询 currentTime，在尾部静音开始后就切段，只补足到目标停顿：
 *
 *     实际观感停顿 = 已播的残余尾静音 (TAIL−TRIM) + 补等 wait + 下条前导 LEAD
 *     wait = STORY_GAP_MS − (TAIL−TRIM) − LEAD
 *
 * ── 一个 tick 干两件事 ──────────────────────────────────
 * 同一个轮询器既驱动逐词高亮，又负责判定切段点。分开写会出现「高亮还在句中、
 * 段已经切走」的错位，而且两个定时器在翻页时更容易漏清。
 */
const settings = require('./settings');
const voice = require('./voice');
const { buildWordTiming, wordIndexAt, estimateDuration } = require('./cadence');

/** 裁剪掉尾静音后，还需要补等多久才凑够目标停顿 */
const TRIMMED_WAIT_MS = Math.max(
  0,
  settings.STORY_GAP_MS
    - (settings.TAIL_S - settings.TRIM_S) * 1000
    - settings.LEAD_S * 1000,
);

function createNarrator() {
  let generation = 0;   // 自增代号：翻页/停止后，旧回调一律作废
  let ticker = null;
  let guard = null;
  let handle = null;

  const clearTimers = () => {
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (guard) { clearTimeout(guard); guard = null; }
  };

  const release = () => {
    clearTimers();
    if (handle) { handle.stop(); handle = null; }
  };

  /**
   * 朗读一页台词。
   * @param {string[]} sentences 已拆好的句子
   * @param {{onSentence?:(i:number)=>void,
   *          onWord?:(i:number, w:number)=>void,
   *          onDone?:()=>void}} hooks
   */
  function play(sentences, hooks) {
    stop();
    const gen = ++generation;
    const on = hooks || {};
    const timings = sentences.map(buildWordTiming);

    const alive = () => gen === generation;

    const speakAt = (i) => {
      if (!alive()) return;
      if (i >= sentences.length) {
        release();
        if (on.onDone) on.onDone();
        return;
      }

      const sentence = sentences[i];
      const { starts } = timings[i];
      if (on.onSentence) on.onSentence(i);
      if (on.onWord) on.onWord(i, 0);

      let settled = false;
      // 静默模式：镜像全挂或整站降级，用估算时长把字幕正常走完
      let silent = false;
      let silentElapsed = 0;
      const silentTotal = estimateDuration(sentence) * 1000;
      let lastWord = 0;

      /** @param {boolean} trimmed 是否是「切掉尾静音」式结束，决定补等多久 */
      const advance = (trimmed) => {
        if (settled || !alive()) return;
        settled = true;
        clearTimers();
        if (handle) { handle.stop(); handle = null; }
        const wait = trimmed ? TRIMMED_WAIT_MS : settings.STORY_GAP_MS;
        setTimeout(() => { if (alive()) speakAt(i + 1); }, wait);
      };

      handle = voice.speak(sentence, {
        onEnded: () => advance(false), // 完整放完（没触发切段）：补满整段停顿
        onSilent: () => { silent = true; },
      });
      if (handle.silent) silent = true;

      ticker = setInterval(() => {
        if (settled || !alive()) return;

        if (silent) {
          silentElapsed += settings.TICK_MS;
          const ratio = Math.min(1, silentElapsed / silentTotal);
          const w = wordIndexAt(starts, ratio);
          if (w !== lastWord && on.onWord) { lastWord = w; on.onWord(i, w); }
          if (silentElapsed >= silentTotal) advance(false);
          return;
        }

        const pos = handle && handle.position();
        if (!pos || pos.total <= 0) return; // 元数据还没就绪 / 正在换镜像

        // 人声区间 = 掐掉头尾静音的部分，逐词高亮按它分配
        const spokenTotal = Math.max(0.01, pos.total - settings.LEAD_S - settings.TAIL_S);
        const spokenAt = Math.min(spokenTotal, Math.max(0, pos.at - settings.LEAD_S));
        const w = wordIndexAt(starts, spokenAt / spokenTotal);
        if (w !== lastWord && on.onWord) { lastWord = w; on.onWord(i, w); }

        // 切点取「固定裁剪量」与「时长比例下限」里较晚的那个：
        // 极短句（如 "Oh no!"）尾静音占比高，只用固定量会逼近人声结尾；
        // 0.6×总时长这个下限把余量拉回来。总时长本就短于 2×裁剪量时干脆不裁。
        const cutAt = Math.max(pos.total - settings.TRIM_S, pos.total * 0.6);
        if (pos.total > settings.TRIM_S * 2 && pos.at >= cutAt) advance(true);
      }, settings.TICK_MS);

      // 兜底：加载慢或事件不触发时，别把整页朗读卡死在这一句
      guard = setTimeout(() => advance(false), settings.SEGMENT_TIMEOUT_MS);
    };

    speakAt(0);
  }

  /** 停止朗读并释放本次的音频句柄（不销毁 voice 的上下文池） */
  function stop() {
    generation++;
    release();
  }

  return { play, stop };
}

module.exports = { createNarrator, TRIMMED_WAIT_MS };
