/**
 * 全局配置
 *
 * TTS_BASES：旁白语料所在的公开存储地址（PRD §3.6）。
 * MVP 阶段用 GitHub 仓库 assets/audio/ + jsDelivr CDN 充当公开桶。
 *
 * LOCAL_MEDIA_BASES：开发期本地媒体服务器（scripts/serve-media.mjs）的候选地址，
 * 探活逐个尝试、用第一个应答的 —— 开发者工具命中 127.0.0.1，真机（与电脑同一
 * Wi-Fi）命中局域网 IP，无需手动切换。电脑换网后把局域网 IP 改成 serve:media
 * 启动时打印的新地址即可。
 * 原版参考素材（版权内容）只在本机注入，不进包、不进仓库、不进正式环境（PRD §2.2）。
 */
const REPO = 'span20512-crypto/pic_bk_en_for_kid'

export default {
  TTS_BASES: [
    `https://cdn.jsdelivr.net/gh/${REPO}@main/assets/audio/`,
    `https://raw.githubusercontent.com/${REPO}/main/assets/audio/`,
  ],

  LOCAL_MEDIA_BASES: [
    'http://127.0.0.1:8930/',      // 开发者工具模拟器
    'http://192.168.31.125:8930/', // 真机联调（开发机局域网 IP）
  ],

  // 登录端点。留空则走本地游客态（PRD §1.1 / §5）
  LOGIN_ENDPOINT: '',

  // ---- 播放节奏（PRD §3.4 / §3.5）----
  STORY_GAP_MS: 700,   // 句间停顿中位值
  LEAD_S: 0.18,        // 语料 MP3 前导静音
  TAIL_S: 0.85,        // 尾部静音裁剪：在 max(dur - TAIL_S, 0.6 * dur) 处切段
  CN_DELAY_MS: 200,    // 中文字幕延迟淡入
  SILENT_WORD_MS: 320, // 无音频降级时每词步进间隔

  // ---- 整站降级时间盒（PRD §3.6）----
  SITE_DOWN_FAILS: 3,
  SITE_DOWN_RECOVER_MS: 60000,
}
