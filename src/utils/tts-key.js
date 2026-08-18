/**
 * 语料散列键（PRD §3.6）：客户端按 ttsKey(text) 拼公开 URL 播放。
 * 同一实现被三处共享：客户端 tts.js、scripts/gen-tts.mjs、scripts/verify.js，
 * 任何改动必须三端同步（其实只改这一个文件即可）。
 *
 * 纯函数、无 wx 依赖，Node 与小程序环境通用。
 */

function normalize(text) {
  return String(text).trim().replace(/\s+/g, ' ');
}

// FNV-1a 32-bit，尾部附长度做冲突保险
function ttsKey(text) {
  const t = normalize(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '-' + t.length;
}

/**
 * 拆句规则（PRD §3.5）：按句末标点拆分为独立句子。
 * 不用 lookbehind 正则——iOS 旧版 JavaScriptCore 不支持，会在解析期直接报错。
 */
function splitSentences(text) {
  const m = normalize(text).match(/[^.!?]+[.!?]+["'”’]?/g);
  return (m || [normalize(text)]).map((s) => s.trim()).filter(Boolean);
}

module.exports = { normalize, ttsKey, splitSentences };
