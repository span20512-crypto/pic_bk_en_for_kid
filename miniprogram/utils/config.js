/**
 * 全局配置
 *
 * TTS_BASES：旁白语料所在的公开存储地址（PRD §3.6）。
 * MVP 阶段用 GitHub 仓库 assets/audio/ + jsDelivr CDN 充当公开桶；
 * 正式对象存储就绪后只需替换这里的 base URL。
 * 多个 base 构成按条降级链：第 1 个取不到时该条退回第 2 个。
 */
const REPO = 'span20512-crypto/pic_bk_en_for_kid';

module.exports = {
  TTS_BASES: [
    'https://cdn.jsdelivr.net/gh/' + REPO + '@main/assets/audio/',
    'https://raw.githubusercontent.com/' + REPO + '/main/assets/audio/',
  ],

  // 登录端点。留空则走本地游客态（PRD §1.1 / §5）
  LOGIN_ENDPOINT: '',

  // ---- 播放节奏（PRD §3.4 / §3.5）----
  STORY_GAP_MS: 700,   // 句间停顿中位值
  LEAD_S: 0.18,        // 语料 MP3 前导静音
  TAIL_S: 0.85,        // 尾部静音裁剪量：在 max(dur - TAIL_S, 0.6 * dur) 处切段
  CN_DELAY_MS: 200,    // 中文字幕延迟淡入
  SILENT_WORD_MS: 320, // 无音频降级时每词步进间隔

  // ---- 整站降级时间盒（PRD §3.6）----
  SITE_DOWN_FAILS: 3,      // 连续 N 条不同文案失败才判定站点不可用
  SITE_DOWN_RECOVER_MS: 60000, // 降级状态 60s 后自动恢复重试
};
