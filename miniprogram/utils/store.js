/**
 * 本地存储（PRD §5）
 * - 阅读进度：book_progress_{id} 存当前页下标
 * - 生词本：glossary_book 数组，按 词+来源绘本 去重
 * - 阅读统计：read_pages_{id} 已读页下标集合；read_days 阅读日期列表
 */

function get(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(key, value) {
  try { wx.setStorageSync(key, value); } catch (e) { /* ignore */ }
}

// ---- 阅读进度 ----

function getProgress(bookId) {
  return get('book_progress_' + bookId, 0);
}

function setProgress(bookId, pageIndex) {
  set('book_progress_' + bookId, pageIndex);
}

function markDone(bookId) {
  set('book_done_' + bookId, true);
}

function isDone(bookId) {
  return !!get('book_done_' + bookId, false);
}

// ---- 生词本 ----

function getGlossary() {
  return get('glossary_book', []);
}

function addGlossaryWord(entry) {
  // entry: { word, cn, bookId, bookTitle }
  const list = getGlossary();
  const dup = list.some((e) => e.word === entry.word && e.bookId === entry.bookId);
  if (dup) return false;
  list.push({ word: entry.word, cn: entry.cn, bookId: entry.bookId, bookTitle: entry.bookTitle, ts: Date.now() });
  set('glossary_book', list);
  return true;
}

// ---- 阅读统计 ----

function recordPageRead(bookId, pageIndex) {
  const key = 'read_pages_' + bookId;
  const pages = get(key, []);
  if (pages.indexOf(pageIndex) < 0) {
    pages.push(pageIndex);
    set(key, pages);
  }
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function recordReadDay() {
  const days = get('read_days', []);
  const t = todayStr();
  if (days.indexOf(t) < 0) {
    days.push(t);
    set('read_days', days);
  }
}

function streakDays() {
  const days = get('read_days', []);
  if (!days.length) return 0;
  const setDays = {};
  days.forEach((d) => { setDays[d] = true; });
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const key = cur.getFullYear() + '-' + mm + '-' + dd;
    if (!setDays[key]) break;
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function getStats(bookList) {
  const released = (bookList || []).filter((b) => b.released);
  let booksDone = 0;
  let pagesRead = 0;
  released.forEach((b) => {
    if (isDone(b.id)) booksDone += 1;
    pagesRead += get('read_pages_' + b.id, []).length;
  });
  return {
    booksDone,
    pagesRead,
    streak: streakDays(),
    words: getGlossary().length,
  };
}

// ---- 游客态 ----

function guestSession() {
  let id = get('guest_id', '');
  if (!id) {
    id = 'g' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    set('guest_id', id);
  }
  return { userId: id, nickname: '游客小朋友', guest: true };
}

module.exports = {
  getProgress, setProgress, markDone, isDone,
  getGlossary, addGlossaryWord,
  recordPageRead, recordReadDay, getStats,
  guestSession,
};
