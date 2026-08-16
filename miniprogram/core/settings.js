/**
 * 运行期配置 —— 所有「换环境要改的东西」集中在这里。
 *
 * 域名白名单提醒（微信官方框架规则，很容易踩）：
 *   受「服务器域名」白名单约束的只有 request / uploadFile / downloadFile /
 *   connectSocket。InnerAudioContext、<video>、<image> 的 src **不受**约束。
 *   所以旁白音频不用配域名，而 filmstrip.js 的视频预下载走 downloadFile，
 *   视频源域名**必须**配进 mp 后台的 downloadFile 合法域名，否则真机上整条
 *   预下载链路静默失败、每页退回矢量场景 —— 而开发者工具勾了「不校验合法域名」
 *   完全看不出来。
 */

const REPO = 'span20512-crypto/pic_bk_en_for_kid';

module.exports = {
  /**
   * 旁白语料的公开读地址（PRD §3.6），按顺序构成**按条降级链**：
   * 第 1 个取不到时，只有那一条退到第 2 个，不影响其余语料。
   *
   * MVP 用本仓库的 assets/audio/ + jsDelivr CDN 充当「公开对象存储桶」，
   * 换成自建 OSS/COS 只改这一处；文件名规则见 core/hash.js（已冻结）。
   */
  VOICE_BASES: [
    'https://cdn.jsdelivr.net/gh/' + REPO + '@main/assets/audio/',
    'https://raw.githubusercontent.com/' + REPO + '/main/assets/audio/',
  ],

  /** 登录换 openid 的后端接口。留空走本地游客态（PRD §1.1 / §5） */
  LOGIN_ENDPOINT: '',

  // ---- 讲述节奏（PRD §3.5，改这几个数就是在改全局呼吸感）----
  /** 句间目标停顿：取自参考动画实测中位值 0.70s */
  STORY_GAP_MS: 700,
  /** 语料 MP3 的前导静音实测值，逐词高亮要把它掐掉 */
  LEAD_S: 0.18,
  /** 语料 MP3 的尾部静音实测值（AnaNeural @ -15% 全库离散度很小） */
  TAIL_S: 1.05,
  /**
   * 尾部裁剪量：在 max(dur - TRIM_S, 0.6 × dur) 处切段。
   * 刻意小于实测尾部静音 TAIL_S，保证永远切不到人声。
   */
  TRIM_S: 0.85,
  /** 进度轮询间隔。onTimeUpdate 只有 ~4Hz，逐词高亮不够跟手，得自己轮询 */
  TICK_MS: 100,
  /** 单句兜底超时：加载 + 播放都算在内，超时直接推进，避免卡死在某一句 */
  SEGMENT_TIMEOUT_MS: 12000,
  /** 中文字幕延迟淡入（PRD §3.5） */
  CN_DELAY_MS: 200,

  // ---- 音源自愈降级（PRD §3.6，明确禁止一次性全局闩锁）----
  /** 连续多少条**不同**文案失败，才判定音源站点不可用 */
  SITE_DOWN_FAILS: 3,
  /** 整站降级的时间盒，到点自动恢复重试 */
  SITE_DOWN_RECOVER_MS: 60000,
};
