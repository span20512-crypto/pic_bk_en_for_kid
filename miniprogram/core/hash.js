/**
 * 语料寻址契约（PRD §3.6）
 *
 * 旁白语料是构建期离线预生成的 MP3，文件名 = ttsKey(台词文本)。客户端不查表、
 * 不请求索引，直接按散列拼出公开 URL —— 这是「首屏不依赖网络」的前提之一。
 *
 * ⚠️ 本文件的算法是**冻结**的。assets/audio/ 下已生成的语料全部以此命名，
 * 改动散列函数（哪怕只是 normalize 的空白处理）都会让所有既有音频失联，
 * 表现为「全程退回备用音源 = 成年女声」。真要换算法，必须连同整个语料库重新生成。
 *
 * 纯函数、不碰 wx，Node（scripts/）与小程序运行时共用同一份实现。
 */

/** 文本归一化：首尾空白裁掉、内部连续空白压成单个空格 */
function normalize(text) {
  return String(text).trim().replace(/\s+/g, ' ');
}

/**
 * FNV-1a 32 位散列，输出 `{8位十六进制}-{字符长度}`。
 * 附上长度作为第二维度：32 位散列在本项目量级（<1k 条短文本）本就难碰撞，
 * 再加长度约束后，冲突需要「同散列且同长度」，实际可忽略。
 * scripts/gen-tts.mjs 生成时仍会做全量冲突校验兜底。
 */
function ttsKey(text) {
  const t = normalize(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '-' + t.length;
}

module.exports = { normalize, ttsKey };
