/**
 * 讲述节奏模型（PRD §3.5）
 *
 * 负责两件事，都是纯计算、不碰音频：
 *   1. 拆句 —— 台词按句末标点切成独立句子，朗读与字幕都以句为单位。
 *   2. 逐词时间轴 —— 给出每个词在本句人声里的起始占比，供字幕跟随真实语速高亮。
 *
 * 为什么不用固定 ms/词：同一套语料里，"Oh no!" 与 "He carries Momo across the
 * river." 的单词平均时长能差一倍以上。固定节拍必然跑偏 —— 要么读到句尾字幕
 * 早就停住，要么字幕抢在人声前面。所以这里只产出**相对占比**，绝对时间由
 * narrator 用音频的真实 currentTime 喂进来。
 */

/**
 * 音节数估算：元音簇个数，去掉结尾哑音 e。
 * 音节比字母数更接近发音时长 —— "through"(7 字母 1 音节) 与 "any"(3 字母 2 音节)
 * 用字母数估会正好估反。
 */
function syllables(token) {
  const w = token.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  // 结尾哑音 e：make / like 记 1 音节，而 the / be 不能减到 0
  if (n > 1 && /[^aeiouy]e$/.test(w)) n -= 1;
  return n < 1 ? 1 : n;
}

/**
 * 单词权重 = 起音开销 + 音节时长 + 标点停顿。
 * 三个系数按参考动画的实测语速（句子中位 1.80s / 语音占比 70%）调出来，
 * 只影响高亮的疏密分布，不影响总时长（总时长由音频决定）。
 */
function weightOf(token) {
  let w = 0.55 + syllables(token) * 0.85;
  if (/[,;:]["'”’]?$/.test(token)) w += 0.6; // 句中停顿
  if (/[.!?]["'”’]?$/.test(token)) w += 1.0; // 句末落板
  return w;
}

/**
 * 拆句：按句末标点切分，保留标点与紧跟其后的引号。
 * 不用 lookbehind 正则 —— iOS 旧版 JavaScriptCore 不支持 `(?<=...)`，
 * 会在**解析期**直接抛语法错误，整个页面都起不来（不是运行期降级）。
 */
function splitSentences(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  const matched = t.match(/[^.!?]+[.!?]+["'”’]?/g);
  return (matched || [t]).map((s) => s.trim()).filter(Boolean);
}

/**
 * 建立一句话的逐词时间轴。
 * @returns {{tokens: string[], starts: number[]}} starts[i] ∈ [0,1)，第 i 个词的起始占比
 */
function buildWordTiming(sentence) {
  const tokens = String(sentence).split(/\s+/).filter(Boolean);
  const weights = tokens.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const starts = [];
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    starts.push(acc / total);
    acc += weights[i];
  }
  return { tokens, starts };
}

/** 按人声进度占比定位当前该高亮到第几个词 */
function wordIndexAt(starts, ratio) {
  let idx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (ratio >= starts[i]) idx = i;
  }
  return idx;
}

/**
 * 无音频时的兜底时长估算（整站降级期，PRD §3.6 要求阅读流程不被网络阻塞）。
 * 用权重和换算成秒，让字幕仍以接近真人的疏密走完，而不是齐刷刷跳完。
 */
function estimateDuration(sentence) {
  const { tokens } = buildWordTiming(sentence);
  let syl = 0;
  for (let i = 0; i < tokens.length; i++) syl += syllables(tokens[i]);
  return Math.max(1.2, syl * 0.26 + tokens.length * 0.1);
}

module.exports = { splitSentences, buildWordTiming, wordIndexAt, estimateDuration, syllables };
