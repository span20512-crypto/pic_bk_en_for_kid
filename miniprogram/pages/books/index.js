const { seriesMeta, seriesOrder, bookList } = require('./data');
const store = require('../../utils/store');
const tts = require('../../utils/tts');
const timing = require('../../utils/timing');
const preloader = require('../../utils/video-preloader');
const config = require('../../utils/config');
const { splitSentences } = require('../../utils/tts-key');

// 生词标注：把句子 token 与本页生词做匹配（支持 match 词形与多词短语）
function buildWordViews(sentence, glossary) {
  const tokens = timing.tokenize(sentence);
  const norm = tokens.map((t) => t.replace(/[^A-Za-z']/g, '').toLowerCase());
  const views = tokens.map((t) => ({ t, g: -1 }));
  (glossary || []).forEach((entry, gi) => {
    const target = (entry.match || entry.word).toLowerCase().split(/\s+/);
    for (let i = 0; i + target.length <= norm.length; i++) {
      let hit = true;
      for (let j = 0; j < target.length; j++) {
        if (norm[i + j] !== target[j]) { hit = false; break; }
      }
      if (hit) {
        for (let j = 0; j < target.length; j++) views[i + j].g = gi;
        break;
      }
    }
  });
  return views;
}

Page({
  data: {
    mode: 'list', // 'list' | 'reader'，同页钻取无路由跳转（PRD §1.2）
    groups: [],
    book: null,
    current: 0,
    pageCount: 0,
    reader: { playing: false, sentIdx: -1, wordIdx: -1, showCn: false, sentences: [] },
    video: { ready: false, failed: true, src: '', progress: 0, loading: false },
    gloss: null,
  },

  playSeq: 0,
  curCtl: null,
  pollTimer: null,
  gapTimer: null,
  cnTimer: null,
  silentTimer: null,
  listScrollTop: 0,
  savedScrollTop: 0,

  onLoad() {
    this.buildGroups();
  },

  onShow() {
    if (this.data.mode === 'list') this.buildGroups();
  },

  onHide() {
    this.stopPlayback();
    tts.releaseAll();
  },

  onUnload() {
    this.stopPlayback();
    tts.releaseAll();
  },

  onPageScroll(e) {
    if (this.data.mode === 'list') this.listScrollTop = e.scrollTop;
  },

  // ---------- 列表 ----------

  buildGroups() {
    const groups = seriesOrder.map((key) => {
      const books = bookList.filter((b) => b.series === key).map((b) => {
        let progressText = '敬请期待';
        let done = false;
        if (b.released) {
          done = store.isDone(b.id);
          if (done) {
            progressText = '✓ 已读完';
          } else {
            const p = store.getProgress(b.id);
            progressText = p > 0 ? '读到第 ' + (p + 1) + ' 页' : '还没开始读';
          }
        }
        return {
          id: b.id, title: b.title, titleCn: b.titleCn, tag: b.tag,
          emoji: b.emoji, cover: b.cover, level: b.level,
          released: b.released, progressText, done,
        };
      });
      const doneCount = books.filter((x) => x.done).length;
      return { key, meta: seriesMeta[key], books, doneCount, total: books.length };
    });
    this.setData({ groups });
  },

  openBook(e) {
    const id = e.currentTarget.dataset.id;
    const book = bookList.find((b) => b.id === id);
    if (!book) return;
    if (!book.released) {
      wx.showToast({ title: '敬请期待 🐾', icon: 'none' });
      return;
    }
    this.savedScrollTop = this.listScrollTop;
    store.recordReadDay();

    const current = Math.min(store.getProgress(id), book.pages.length - 1);
    this.setData({ mode: 'reader', book, pageCount: book.pages.length, current }, () => {
      this.preparePage();
    });

    // 进入本书即整本排队串行预下载，当前页插队优先（PRD §3.3 / §3.7）
    const urls = book.pages.map((p) => p.videoUrl).filter(Boolean);
    preloader.enqueue(urls);
    const curUrl = book.pages[current] && book.pages[current].videoUrl;
    if (curUrl) preloader.promote(curUrl);
    urls.forEach((u) => preloader.subscribe(u, this.onVideoState.bind(this)));
  },

  closeReader() {
    this.stopPlayback();
    tts.releaseAll();
    if (this.data.book) {
      this.data.book.pages.forEach((p) => p.videoUrl && preloader.unsubscribeAll(p.videoUrl));
    }
    this.setData({ mode: 'list', book: null, gloss: null });
    this.buildGroups();
    wx.pageScrollTo({ scrollTop: this.savedScrollTop || 0, duration: 0 });
  },

  // ---------- 阅读器：翻页 ----------

  onSwiperChange(e) {
    this.goPage(e.detail.current);
  },

  goPage(idx) {
    if (idx === this.data.current) return; // 滑动与按钮两条路径只处理一次
    this.stopPlayback();
    this.setData({ current: idx, gloss: null });
    const { book, pageCount } = this.data;
    if (idx < pageCount) {
      store.setProgress(book.id, idx);
      store.recordPageRead(book.id, idx);
      this.preparePage();
      const url = book.pages[idx].videoUrl;
      if (url) preloader.promote(url);
    } else {
      // 末页后附 The End 庆祝页，读完打 ✓（PRD §3.3）
      store.markDone(book.id);
    }
  },

  prevPage() {
    if (this.data.current > 0) this.goPage(this.data.current - 1);
  },

  nextPage() {
    if (this.data.current <= this.data.pageCount - 1) {
      this.goPage(this.data.current + 1);
    }
  },

  restartBook() {
    this.goPage(0);
  },

  // ---------- 阅读器：页面准备 ----------

  currentPage() {
    const { book, current, pageCount } = this.data;
    if (!book || current >= pageCount) return null;
    return book.pages[current];
  },

  preparePage() {
    const page = this.currentPage();
    if (!page) return;
    const sentences = splitSentences(page.en).map((s) => ({
      text: s,
      words: buildWordViews(s, page.glossary),
    }));
    this.setData({
      reader: { playing: false, sentIdx: -1, wordIdx: -1, showCn: false, sentences },
    });
    this.refreshVideoState();
  },

  // videoState 必须携带其所属页的 url，避免上一页视频"就绪态"闪现（PRD §3.4）
  onVideoState(url) {
    const page = this.currentPage();
    if (!page || page.videoUrl !== url) return;
    this.refreshVideoState();
  },

  refreshVideoState() {
    const page = this.currentPage();
    if (!page) return;
    const url = page.videoUrl;
    const st = url ? preloader.stateOf(url) : null;
    this.setData({
      video: {
        ready: !!(st && st.status === 'done'),
        failed: !url || !!(st && st.status === 'failed'),
        src: (st && st.path) || '',
        progress: (st && st.progress) || 0,
        loading: !!(st && (st.status === 'loading' || st.status === 'queued')),
      },
    });
  },

  // ---------- 播放绘本（PRD §3.4 / §3.5）----------

  togglePlay() {
    if (this.data.reader.playing) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  },

  startPlayback() {
    const page = this.currentPage();
    if (!page) return;
    const token = ++this.playSeq;
    this.setData({ 'reader.playing': true, 'reader.sentIdx': 0, 'reader.wordIdx': -1 });
    // 中文字幕延迟 200ms 淡入（PRD §3.5）
    this.cnTimer = setTimeout(() => {
      if (token === this.playSeq) this.setData({ 'reader.showCn': true });
    }, config.CN_DELAY_MS);
    this.playSentence(0, token);
  },

  playSentence(i, token) {
    if (token !== this.playSeq) return;
    const { sentences } = this.data.reader;
    if (i >= sentences.length) {
      // 旁白读完停在本页，视频继续静音循环（PRD §3.4）
      this.setData({ 'reader.playing': false, 'reader.sentIdx': -1, 'reader.wordIdx': -1 });
      return;
    }
    this.setData({ 'reader.sentIdx': i, 'reader.wordIdx': -1 });

    const text = sentences[i].text;
    const wt = timing.buildWordTiming(text);
    let cutDone = false;

    const cut = () => {
      if (cutDone || token !== this.playSeq) return;
      cutDone = true;
      this.clearPoll();
      if (this.curCtl) { this.curCtl.stop(); this.curCtl = null; }
      // 句间停顿 STORY_GAP_MS（PRD §3.4）
      this.gapTimer = setTimeout(() => this.playSentence(i + 1, token), config.STORY_GAP_MS);
    };

    const onProgress = (t, dur) => {
      if (cutDone || token !== this.playSeq || !dur) return;
      // 句间静音裁剪：在 max(dur - TAIL, 0.6*dur) 处切段（PRD §3.5）
      const cutoff = Math.max(dur - config.TAIL_S, 0.6 * dur);
      if (t >= cutoff) { cut(); return; }
      const elapsed = t - config.LEAD_S;
      const wi = timing.wordIndexAt(elapsed, wt, cutoff - config.LEAD_S);
      if (elapsed >= 0 && wi !== this.data.reader.wordIdx) {
        this.setData({ 'reader.wordIdx': wi });
      }
    };

    const ctl = tts.play(text, {
      onTimeUpdate: onProgress, // 音频 onProgress 回调驱动逐词高亮，不用固定定时器
      onEnded: cut,
      onError: () => this.silentAnimate(i, token, wt.tokens.length),
    });
    this.curCtl = ctl;

    if (ctl.silent) {
      // 整站降级期：无声动画，阅读流程不被网络阻塞（PRD §3.6）
      this.silentAnimate(i, token, wt.tokens.length);
      return;
    }

    // 兜底轮询 currentTime（个别机型 onTimeUpdate 触发过疏时保证能切段）
    this.pollTimer = setInterval(() => {
      if (!this.curCtl || token !== this.playSeq) return;
      const pos = this.curCtl.position && this.curCtl.position();
      if (pos && pos.duration > 0) onProgress(pos.currentTime, pos.duration);
    }, 80);
  },

  silentAnimate(i, token, wordCount) {
    if (token !== this.playSeq) return;
    this.clearPoll();
    let wi = 0;
    const step = () => {
      if (token !== this.playSeq) return;
      if (wi >= wordCount) {
        this.gapTimer = setTimeout(() => this.playSentence(i + 1, token), config.STORY_GAP_MS);
        return;
      }
      this.setData({ 'reader.wordIdx': wi });
      wi += 1;
      this.silentTimer = setTimeout(step, config.SILENT_WORD_MS);
    };
    step();
  },

  clearPoll() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  },

  stopPlayback() {
    this.playSeq += 1;
    this.clearPoll();
    if (this.gapTimer) { clearTimeout(this.gapTimer); this.gapTimer = null; }
    if (this.cnTimer) { clearTimeout(this.cnTimer); this.cnTimer = null; }
    if (this.silentTimer) { clearTimeout(this.silentTimer); this.silentTimer = null; }
    if (this.curCtl) { this.curCtl.stop(); this.curCtl = null; }
    if (this.data.reader.playing) {
      this.setData({ 'reader.playing': false, 'reader.sentIdx': -1, 'reader.wordIdx': -1 });
    }
  },

  // ---------- 生词查义（PRD §3.3 / §3.4）----------

  onWordTap(e) {
    const gi = e.currentTarget.dataset.g;
    if (gi === undefined || gi === null || gi < 0) return;
    const page = this.currentPage();
    if (!page || !page.glossary[gi]) return;
    // 点击时先停止旁白再展开释义
    this.stopPlayback();
    const entry = page.glossary[gi];
    this.setData({ gloss: { word: entry.word, cn: entry.cn } });
    tts.playWord(entry.word);
    store.addGlossaryWord({
      word: entry.word, cn: entry.cn,
      bookId: this.data.book.id, bookTitle: this.data.book.title,
    });
  },

  glossReplay() {
    if (this.data.gloss) tts.playWord(this.data.gloss.word);
  },

  closeGloss() {
    this.setData({ gloss: null });
  },
});
