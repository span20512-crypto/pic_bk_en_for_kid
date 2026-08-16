/**
 * 视频内双语字幕（PRD §3.5）
 *
 * 纯展示组件：拿到已经压平好的 token 序列（core/lexicon.layoutCaption 的产出）
 * 和「当前读到第几句第几个词」，负责把高亮、压暗、生词下划线画出来。
 * 它不认识音频、不认识绘本，所以既能被阅读器用，将来也能被复习/听力页复用。
 *
 * 高亮位置由外部喂进来（阅读器从 narrator 的真实人声进度算出），
 * 组件内部**不起任何定时器** —— 定时器一旦分散在组件里，翻页时的清理必漏。
 */
Component({
  properties: {
    /** [{ key, si, wi, text, isGloss, glossWord, glossCn }] */
    tokens: { type: Array, value: [] },
    /** 本页中文台词 */
    cn: { type: String, value: '' },
    /** 是否正在朗读：决定压暗与呼吸脉冲 */
    playing: { type: Boolean, value: false },
    /** 当前朗读到第几句 */
    si: { type: Number, value: -1 },
    /** 当前高亮到本句第几个词 */
    wi: { type: Number, value: -1 },
  },

  methods: {
    onTapToken(e) {
      const { word, cn } = e.currentTarget.dataset;
      if (!word) return; // 非生词不响应，避免误触打断朗读
      this.triggerEvent('tapword', { word: word, cn: cn });
    },
  },
});
