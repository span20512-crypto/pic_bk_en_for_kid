/**
 * 绘本页画面舞台（PRD §3.3 / §3.4 / §3.7）
 *
 * 一页画面从上到下是三层，永远都在，只是可见性不同：
 *   底层  矢量场景（core/scenery 生成的 SVG）—— 永远铺着，所以任何时刻都有画面
 *   中层  实拍短视频 —— 只有「当前页 且 已下载完」时才挂载 <video>
 *   顶层  Emoji 拼画 + 字幕条 —— Emoji 在视频就位后让位，字幕条始终在最上
 *
 * 「只有当前页挂 <video>」是硬要求：swiper 会同时保留相邻页的节点，六页各挂一个
 * 视频解码器，低端机直接卡死。视频不可用（下载中/失败）时退回场景 + Emoji，
 * 阅读流程一点都不等网络。
 */
Component({
  properties: {
    /** 本页数据：{ emoji, decor, sceneSrc, tokens, cn } */
    page: { type: Object, value: null },
    /** 是不是 swiper 当前页 —— 决定要不要挂视频 */
    active: { type: Boolean, value: false },
    /** 已下载到本地的视频路径；空字符串表示还不能播 */
    videoSrc: { type: String, value: '' },
    /** 正在下载（用于显示真实进度） */
    loading: { type: Boolean, value: false },
    percent: { type: Number, value: 0 },
    /** 朗读态，透传给字幕 */
    playing: { type: Boolean, value: false },
    si: { type: Number, value: -1 },
    wi: { type: Number, value: -1 },
  },

  methods: {
    onTapWord(e) {
      this.triggerEvent('tapword', e.detail);
    },

    /** 解码失败：交给页面标记这条 url 不可用，画面退回矢量场景 */
    onVideoError(e) {
      this.triggerEvent('videoerror', { detail: e && e.detail });
    },
  },
});
