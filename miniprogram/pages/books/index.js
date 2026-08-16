/**
 * 绘本馆 Tab —— 列表 ⇄ 阅读器（PRD §3.1 / §3.3 / §3.4）
 *
 * 列表与阅读器是**同一个页面的两种模式**，不走路由跳转。这样做的直接好处是
 * 返回列表时不必重建列表、滚动位置天然还原，代价是这个文件要同时管两套状态 ——
 * 所以画面、字幕、卡片都拆成了自定义组件，这里只留「编排」：
 * 谁该播、翻到第几页、视频订阅切给谁、生词落哪本。
 *
 * 渲染无关的东西一律挂在 this 上而不进 data：拆句结果、视频退订函数、
 * 失败过的视频 url。它们每次 setData 都要被序列化一遍，白白拖慢翻页。
 */
const { seriesMeta, seriesOrder } = require('../../content/series');
const { bookList, bookById } = require('../../content/catalog');
const { splitSentences, buildWordTiming } = require('../../core/cadence');
const { layoutCaption } = require('../../core/lexicon');
const { buildScene } = require('../../core/scenery');
const { createNarrator } = require('../../core/narrator');
const filmstrip = require('../../core/filmstrip');
const voice = require('../../core/voice');
const vault = require('../../core/vault');

/** 按系列分组：组序取自 seriesOrder，组内保持 catalog 里的书序 */
function groupBooks() {
  return seriesOrder
    .map((key) => ({ key: key, meta: seriesMeta[key], books: bookList.filter((b) => b.series === key) }))
    .filter((g) => g.meta && g.books.length > 0);
}

Page({
  data: {
    mode: 'list',       // 'list' | 'reader'
    groups: [],
    scrollTop: 0,

    // ---- 阅读器 ----
    book: null,         // { id, title, titleCn, total }
    pages: [],          // 每页的展示模型（场景图 / Emoji / 字幕 token）
    pageIndex: 0,
    atEnd: false,
    dots: [],
    playing: false,
    si: -1,             // 正在读第几句
    wi: -1,             // 高亮到本句第几个词
    videoSrc: '',
    loading: false,
    percent: 0,
    gloss: null,
    justSaved: false,
  },

  // ---------- 非渲染态 ----------
  narrator: null,
  current: null,        // 当前绘本（content 里的原始对象）
  timings: [],          // [页][句] => { tokens, starts }
  sentences: [],        // [页] => string[]
  badVideos: null,      // 解码失败过的 url，不再重试挂载
  unsubVideo: null,
  listScrollTop: 0,
  wordHandle: null,     // 生词发音的音频句柄

  onLoad() {
    this.narrator = createNarrator();
    this.badVideos = {};
    this.refreshList();
  },

  onShow() {
    // 从生词本 Tab 切回来时进度可能变了（读完的书要显示 ✓）
    if (this.data.mode === 'list') this.refreshList();
  },

  /** 切走 Tab：立刻停旁白并退回列表（PRD §3.4 资源清理） */
  onHide() {
    if (this.data.mode === 'reader') this.exitReader();
  },

  onUnload() {
    this.stopAll();
    if (this.unsubVideo) { this.unsubVideo(); this.unsubVideo = null; }
  },

  // ==================== 列表 ====================

  refreshList() {
    const groups = groupBooks().map((g) => {
      const cards = g.books.map((b) => this.toCardModel(b));
      const readCount = cards.filter((c) => c.done).length;
      return {
        series: g.key,
        title: g.meta.title,
        subtitle: g.meta.subtitle,
        emoji: g.meta.emoji,
        readCount: readCount,
        total: cards.length,
        allRead: readCount === cards.length,
        books: cards,
      };
    });
    this.setData({ groups: groups });
  },

  /** content 里的书 → 卡片展示模型 */
  toCardModel(book) {
    const total = book.pages.length;
    const read = vault.progressOf(book.id);
    const done = book.released && total > 0 && read >= total;
    let progressText;
    if (!book.released) progressText = '筹备中';
    else if (done) progressText = '已读完';
    else if (read > 0) progressText = '读到第 ' + (read + 1) + ' 页';
    else progressText = total + ' 页';

    return {
      id: book.id,
      title: book.title,
      titleCn: book.titleCn,
      tag: book.tag,
      emoji: book.emoji,
      cover: book.cover,
      level: book.level,
      released: book.released,
      done: done,
      progressText: progressText,
    };
  },

  onListScroll(e) {
    // 只记不 setData：每帧 setData 会把滚动拖成幻灯片
    this.listScrollTop = e.detail.scrollTop;
  },

  // ==================== 进入 / 退出阅读器 ====================

  onOpenBook(e) {
    const book = bookById(e.detail.id);
    if (!book || !book.released || book.pages.length === 0) return;

    vault.touchStreak();
    this.current = book;
    this.badVideos = {};

    // 拆句 + 逐词时间轴：朗读与字幕共用这一份，保证「读到哪、亮到哪」永远一致
    this.sentences = book.pages.map((p) => splitSentences(p.en));
    this.timings = this.sentences.map((list) => list.map(buildWordTiming));

    const pages = book.pages.map((p, i) => ({
      emoji: p.emoji,
      decor: p.decor,
      cn: p.cn,
      sceneSrc: buildScene(p.scene, p.accent),
      tokens: layoutCaption(this.timings[i], p.glossary),
    }));

    // 读完的书再点进来从头开始，没读完的续读
    const saved = vault.progressOf(book.id);
    const start = saved >= book.pages.length ? 0 : saved;

    this.setData({
      mode: 'reader',
      book: { id: book.id, title: book.title, titleCn: book.titleCn, total: book.pages.length },
      pages: pages,
      gloss: null,
      justSaved: false,
    }, () => this.applyPage(start));

    // 整本台词预热音频上下文；整本视频按阅读顺序排队预下载
    const flatSentences = [];
    this.sentences.forEach((list) => list.forEach((s) => flatSentences.push(s)));
    voice.prime(flatSentences);
    filmstrip.enqueue(book.pages.map((p) => p.videoUrl).filter(Boolean));
  },

  exitReader() {
    this.stopAll();
    if (this.unsubVideo) { this.unsubVideo(); this.unsubVideo = null; }
    this.current = null;
    this.timings = [];
    this.sentences = [];
    this.setData({
      mode: 'list',
      book: null,
      pages: [],
      pageIndex: 0,
      atEnd: false,
      videoSrc: '',
      loading: false,
      percent: 0,
      gloss: null,
      justSaved: false,
      scrollTop: this.listScrollTop, // 还原钻取前的滚动位置（PRD §3.1）
    });
    this.refreshList();
  },

  // ==================== 翻页 ====================

  /** 应用页码：写进度、刷新页码点、把视频订阅切到这一页 */
  applyPage(index) {
    const book = this.current;
    if (!book) return;
    const total = book.pages.length;
    const next = Math.max(0, Math.min(total, index)); // == total 时是 The End 页

    vault.saveProgress(book.id, next);
    if (next < total) vault.markPageSeen(book.id, next);

    const dots = [];
    for (let i = 0; i <= total; i++) {
      dots.push({ wide: i === next, passed: i < next });
    }

    this.setData({ pageIndex: next, atEnd: next >= total, dots: dots });
    this.watchVideo(next);
  },

  /**
   * 订阅当前页视频的下载状态。
   * ⚠️ 回调里必须比对 url —— 翻页瞬间上一页的 ready 事件还可能在路上，
   * 不比对就会把上一页的视频挂到当前页，出现「翻页闪现前一段画面」。
   */
  watchVideo(index) {
    if (this.unsubVideo) { this.unsubVideo(); this.unsubVideo = null; }

    const book = this.current;
    const url = book && index < book.pages.length ? (book.pages[index].videoUrl || '') : '';
    if (!url) {
      this.setData({ videoSrc: '', loading: false, percent: 0 });
      return;
    }

    filmstrip.prioritize(url);
    this.paintVideo(url, filmstrip.stateOf(url));
    this.unsubVideo = filmstrip.subscribe((u, state) => {
      if (u !== url) return;
      this.paintVideo(url, state);
    });
  },

  paintVideo(url, state) {
    const failed = !!this.badVideos[url];
    const ready = !failed && state.status === 'ready' && !!state.localPath;
    this.setData({
      videoSrc: ready ? state.localPath : '',
      loading: !failed && (state.status === 'idle' || state.status === 'loading'),
      percent: state.percent || 0,
    });
  },

  onVideoError() {
    const book = this.current;
    const i = this.data.pageIndex;
    if (!book || i >= book.pages.length) return;
    const url = book.pages[i].videoUrl;
    if (url) this.badVideos[url] = true;
    // 退回矢量场景，不弹错误提示（PRD §3.7 失败降级）
    this.setData({ videoSrc: '', loading: false });
  },

  onSwiperChange(e) {
    const next = e.detail.current;
    if (!this.current || next === this.data.pageIndex) return;
    this.stopAll();
    this.setData({ gloss: null, justSaved: false });
    this.applyPage(next);
  },

  goPage(index) {
    if (!this.current) return;
    this.stopAll();
    this.setData({ gloss: null, justSaved: false });
    this.applyPage(index);
  },

  onPrev() { this.goPage(this.data.pageIndex - 1); },
  onNext() { this.goPage(this.data.pageIndex + 1); },
  onReadAgain() { this.goPage(0); },

  // ==================== 播放绘本 ====================

  /**
   * 「播放绘本」（PRD §3.4）：视频静音循环 + 女童声旁白**并行**，
   * 字幕逐词高亮跟随旁白真实节奏；再次点击停止。读完停在本页，不自动翻页。
   */
  onTogglePlay() {
    if (this.data.playing) { this.stopAll(); return; }

    const i = this.data.pageIndex;
    const list = this.sentences[i];
    if (!this.current || i >= this.current.pages.length || !list || list.length === 0) return;

    this.setData({ playing: true, si: 0, wi: 0 });
    this.narrator.play(list, {
      onSentence: (s) => this.setData({ si: s, wi: 0 }),
      onWord: (s, w) => {
        if (s !== this.data.si || w !== this.data.wi) this.setData({ si: s, wi: w });
      },
      onDone: () => this.setData({ playing: false, si: -1, wi: -1 }),
    });
  },

  /** 停掉旁白与单词发音，清掉高亮 */
  stopAll() {
    if (this.narrator) this.narrator.stop();
    if (this.wordHandle) { this.wordHandle.stop(); this.wordHandle = null; }
    this.setData({ playing: false, si: -1, wi: -1 });
  },

  // ==================== 生词查义 ====================

  /** 点字幕里的生词：先停旁白再展开释义（PRD §3.3） */
  onTapWord(e) {
    const { word, cn } = e.detail;
    if (!word) return;
    this.stopAll();

    const book = this.current;
    const saved = book
      ? vault.collectWord({ word: word, cn: cn, bookId: book.id, bookTitle: book.titleCn })
      : false;

    this.setData({ gloss: { word: word, cn: cn }, justSaved: saved });
    this.speakWord(word);
  },

  onPlayGloss() {
    const g = this.data.gloss;
    if (g) this.speakWord(g.word);
  },

  speakWord(word) {
    if (this.wordHandle) this.wordHandle.stop();
    this.wordHandle = voice.speak(word, {});
  },

  onCloseGloss() {
    if (this.wordHandle) { this.wordHandle.stop(); this.wordHandle = null; }
    this.setData({ gloss: null, justSaved: false });
  },
});
