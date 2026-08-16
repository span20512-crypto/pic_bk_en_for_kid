/**
 * 生词释义条（PRD §3.3「生词点击查义」）
 *
 * 点击字幕里的生词后从阅读器下方展开：词 + 中文 + 🔊 女童声发音。
 * 释义条出现的同时该词已自动入生词本（由页面负责写库），这里只提示状态。
 */
Component({
  properties: {
    /** { word, cn } | null，null 时整条不渲染 */
    gloss: { type: Object, value: null },
    /** 是否是这次阅读新收进生词本的词，用来给一句轻提示 */
    justSaved: { type: Boolean, value: false },
  },

  methods: {
    onPlay() { this.triggerEvent('play'); },
    onClose() { this.triggerEvent('close'); },
  },
});
