/**
 * 本地存储层（PRD §5）
 *
 * 这个应用刻意**不依赖后端**：绘本内容硬编码在 content/，阅读痕迹全部落在
 * wx.setStorageSync。好处是首屏零网络（PRD §6 要求 < 1s），坏处是换设备不同步 ——
 * 接自有后端后，把本模块换成「本地写 + 异步上行」即可，调用方不用改。
 *
 * key 一览：
 *   book_progress_{id}  number   读到的页码下标
 *   glossary_book       array    生词本（词 + 中文 + 出处绘本）
 *   pages_read          number   累计阅读页数（去重到「每本每页只记一次」）
 *   pages_seen_{id}     array    该本已计过数的页码，供上面去重
 *   read_streak         object   { last: 'YYYY-MM-DD', days }
 */

const PROGRESS = (id) => 'book_progress_' + id;
const SEEN = (id) => 'pages_seen_' + id;
const GLOSSARY = 'glossary_book';
const PAGES_READ = 'pages_read';
const STREAK = 'read_streak';

function get(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(key, value) {
  try { wx.setStorageSync(key, value); } catch (e) { /* 存储满了也不该打断阅读 */ }
}

const dayStamp = (offsetDays) => {
  const d = new Date(Date.now() - (offsetDays || 0) * 86400000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
};

// ---------- 阅读进度 ----------

/** 读到第几页（下标）。等于总页数表示读完 */
function progressOf(bookId) {
  const v = get(PROGRESS(bookId), 0);
  return typeof v === 'number' && v > 0 ? v : 0;
}

function saveProgress(bookId, pageIndex) {
  set(PROGRESS(bookId), pageIndex);
}

/**
 * 记一次「翻到某页」。同一本的同一页只计一次，避免来回翻页把统计刷爆。
 * 返回是否是新页（调用方据此决定要不要顺便记连续天数）。
 */
function markPageSeen(bookId, pageIndex) {
  const seen = get(SEEN(bookId), []);
  if (!Array.isArray(seen)) return false;
  if (seen.indexOf(pageIndex) !== -1) return false;
  seen.push(pageIndex);
  set(SEEN(bookId), seen);
  set(PAGES_READ, (get(PAGES_READ, 0) || 0) + 1);
  return true;
}

// ---------- 生词本 ----------

/** 生词本全量（新词在前，便于「最近查过的」一眼可见） */
function glossaryBook() {
  const list = get(GLOSSARY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * 收录一个生词。按「词 + 出处绘本」去重 —— 同一个词在不同绘本里出现时
 * 语境不同，值得各留一条；同一本里重复点击则只留一条。
 */
function collectWord(entry) {
  const list = glossaryBook();
  const dup = list.some((w) => w.word === entry.word && w.bookId === entry.bookId);
  if (dup) return false;
  list.unshift({
    word: entry.word,
    cn: entry.cn,
    bookId: entry.bookId,
    bookTitle: entry.bookTitle,
    at: Date.now(),
  });
  set(GLOSSARY, list);
  return true;
}

function removeWord(word, bookId) {
  set(GLOSSARY, glossaryBook().filter((w) => !(w.word === word && w.bookId === bookId)));
}

// ---------- 连续阅读天数 ----------

/** 记一次今天的阅读行为，维护连续天数 */
function touchStreak() {
  const saved = get(STREAK, null);
  const today = dayStamp(0);
  if (saved && saved.last === today) return;
  const days = saved && saved.last === dayStamp(1) ? (saved.days || 0) + 1 : 1;
  set(STREAK, { last: today, days: days });
}

function streakDays() {
  const saved = get(STREAK, null);
  if (!saved) return 0;
  // 昨天之前就断了的连续记录已失效
  return saved.last === dayStamp(0) || saved.last === dayStamp(1) ? saved.days || 0 : 0;
}

// ---------- 汇总（个人中心，PRD §3.8）----------

function summary(books) {
  let booksDone = 0;
  books.forEach((b) => {
    if (b.released && b.pages.length > 0 && progressOf(b.id) >= b.pages.length) booksDone++;
  });
  return {
    booksDone: booksDone,
    pagesRead: get(PAGES_READ, 0) || 0,
    streakDays: streakDays(),
    wordCount: glossaryBook().length,
  };
}

module.exports = {
  progressOf,
  saveProgress,
  markPageSeen,
  glossaryBook,
  collectWord,
  removeWord,
  touchStreak,
  streakDays,
  summary,
};
