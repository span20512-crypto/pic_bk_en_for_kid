/**
 * 生词本 Tab（PRD §3.8）
 *
 * 阅读中点开过释义的词自动入库，这里按绘本筛选、逐条复习。
 *
 * 「一键复习」直接复用 core/narrator —— 它本来就是「按顺序播一串英文、
 * 中间留出呼吸」的东西，绘本旁白和单词复习是同一件事的两种粒度。
 * 复用的好处不只是省代码：句间停顿、尾静音裁剪、音源自愈这些日后调一次，
 * 两个场景一起受益。
 */
const vault = require('../../core/vault');
const voice = require('../../core/voice');
const { createNarrator } = require('../../core/narrator');

Page({
  data: {
    words: [],        // 当前筛选下的词条
    filters: [],      // [{ id, label, count }]，id 为 '' 表示全部
    activeFilter: '',
    reviewing: false,
    reviewIndex: -1,  // 复习时高亮到第几条
    empty: true,
  },

  narrator: null,
  all: [],
  handle: null,

  onLoad() {
    this.narrator = createNarrator();
  },

  onShow() {
    this.reload();
  },

  onHide() { this.stopReview(); },
  onUnload() { this.stopReview(); },

  reload() {
    this.all = vault.glossaryBook();

    // 按出处绘本聚合成筛选条
    const counts = {};
    this.all.forEach((w) => {
      if (!counts[w.bookId]) counts[w.bookId] = { id: w.bookId, label: w.bookTitle, count: 0 };
      counts[w.bookId].count++;
    });
    const filters = [{ id: '', label: '全部', count: this.all.length }]
      .concat(Object.keys(counts).map((k) => counts[k]));

    // 筛选的书被清空后，回落到「全部」
    const active = filters.some((f) => f.id === this.data.activeFilter) ? this.data.activeFilter : '';

    this.setData({
      filters: filters,
      activeFilter: active,
      empty: this.all.length === 0,
    }, () => this.applyFilter());
  },

  applyFilter() {
    const key = this.data.activeFilter;
    const words = (key ? this.all.filter((w) => w.bookId === key) : this.all)
      .map((w) => ({ word: w.word, cn: w.cn, bookId: w.bookId, bookTitle: w.bookTitle }));
    this.setData({ words: words, reviewIndex: -1 });
  },

  onPickFilter(e) {
    this.stopReview();
    this.setData({ activeFilter: e.currentTarget.dataset.id }, () => this.applyFilter());
  },

  // ---------- 单词发音 ----------

  onTapWord(e) {
    this.stopReview();
    const word = e.currentTarget.dataset.word;
    if (!word) return;
    if (this.handle) this.handle.stop();
    this.handle = voice.speak(word, {});
  },

  onLongPress(e) {
    const { word, book } = e.currentTarget.dataset;
    wx.showModal({
      title: '移出生词本',
      content: '把「' + word + '」从生词本里移出？',
      confirmColor: '#FF8C42',
      success: (res) => {
        if (!res.confirm) return;
        vault.removeWord(word, book);
        this.reload();
      },
    });
  },

  // ---------- 一键复习 ----------

  onToggleReview() {
    if (this.data.reviewing) { this.stopReview(); return; }
    const list = this.data.words.map((w) => w.word);
    if (list.length === 0) return;

    this.setData({ reviewing: true, reviewIndex: 0 });
    this.narrator.play(list, {
      onSentence: (i) => this.setData({ reviewIndex: i }),
      onDone: () => this.setData({ reviewing: false, reviewIndex: -1 }),
    });
  },

  stopReview() {
    if (this.narrator) this.narrator.stop();
    if (this.handle) { this.handle.stop(); this.handle = null; }
    this.setData({ reviewing: false, reviewIndex: -1 });
  },

  onGoRead() {
    wx.switchTab({ url: '/pages/books/index' });
  },
});
