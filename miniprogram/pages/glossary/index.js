const store = require('../../utils/store');
const tts = require('../../utils/tts');
const { bookList } = require('../books/data');

Page({
  data: {
    entries: [],      // 当前筛选下展示的生词
    filters: [],      // [{ id, label }]
    activeFilter: 'all',
    reviewing: false, // 一键复习中
    reviewIdx: -1,
  },

  reviewSeq: 0,
  reviewCtl: null,
  reviewTimer: null,

  onShow() {
    this.reload();
  },

  onHide() {
    this.stopReview();
    tts.releaseAll();
  },

  onUnload() {
    this.stopReview();
    tts.releaseAll();
  },

  reload() {
    const all = store.getGlossary().slice().reverse(); // 新词在前
    const bookIds = [];
    all.forEach((e) => { if (bookIds.indexOf(e.bookId) < 0) bookIds.push(e.bookId); });
    const filters = [{ id: 'all', label: '全部' }].concat(
      bookIds.map((id) => {
        const b = bookList.find((x) => x.id === id);
        return { id, label: (b && b.titleCn) || id };
      })
    );
    this.setData({ filters }, () => this.applyFilter(this.data.activeFilter, all));
  },

  applyFilter(fid, allCached) {
    const all = allCached || store.getGlossary().slice().reverse();
    const entries = fid === 'all' ? all : all.filter((e) => e.bookId === fid);
    this.setData({ activeFilter: fid, entries, reviewIdx: -1 });
  },

  onFilterTap(e) {
    this.stopReview();
    this.applyFilter(e.currentTarget.dataset.id);
  },

  onPlayTap(e) {
    this.stopReview();
    const idx = e.currentTarget.dataset.idx;
    const entry = this.data.entries[idx];
    if (entry) tts.playWord(entry.word);
  },

  // 一键复习：顺序播放全部发音（PRD §3.8）
  toggleReview() {
    if (this.data.reviewing) {
      this.stopReview();
    } else {
      this.startReview();
    }
  },

  startReview() {
    if (!this.data.entries.length) return;
    const token = ++this.reviewSeq;
    this.setData({ reviewing: true });
    this.reviewNext(0, token);
  },

  reviewNext(i, token) {
    if (token !== this.reviewSeq) return;
    if (i >= this.data.entries.length) {
      this.setData({ reviewing: false, reviewIdx: -1 });
      return;
    }
    this.setData({ reviewIdx: i });
    const advance = () => {
      this.reviewTimer = setTimeout(() => this.reviewNext(i + 1, token), 400);
    };
    this.reviewCtl = tts.playWord(this.data.entries[i].word, advance);
    if (this.reviewCtl && this.reviewCtl.silent) advance();
  },

  stopReview() {
    this.reviewSeq += 1;
    if (this.reviewTimer) { clearTimeout(this.reviewTimer); this.reviewTimer = null; }
    if (this.reviewCtl) { this.reviewCtl.stop(); this.reviewCtl = null; }
    if (this.data.reviewing) this.setData({ reviewing: false, reviewIdx: -1 });
  },
});
