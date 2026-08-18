/**
 * 本地存储（PRD §5）——Taro 移植版
 */
import Taro from '@tarojs/taro'

export interface GlossaryEntry {
  word: string
  cn: string
  bookId: string
  bookTitle: string
  ts?: number
}

function get<T>(key: string, fallback: T): T {
  try {
    const v = Taro.getStorageSync(key)
    return v === '' || v === null || v === undefined ? fallback : (v as T)
  } catch (e) {
    return fallback
  }
}

function set(key: string, value: any) {
  try { Taro.setStorageSync(key, value) } catch (e) { /* ignore */ }
}

// ---- 阅读进度 ----

export function getProgress(bookId: string): number {
  return get('book_progress_' + bookId, 0)
}

export function setProgress(bookId: string, pageIndex: number) {
  set('book_progress_' + bookId, pageIndex)
}

export function markDone(bookId: string) {
  set('book_done_' + bookId, true)
}

export function isDone(bookId: string): boolean {
  return !!get('book_done_' + bookId, false)
}

// ---- 生词本 ----

export function getGlossary(): GlossaryEntry[] {
  return get<GlossaryEntry[]>('glossary_book', [])
}

export function addGlossaryWord(entry: GlossaryEntry): boolean {
  const list = getGlossary()
  const dup = list.some((e) => e.word === entry.word && e.bookId === entry.bookId)
  if (dup) return false
  list.push({ ...entry, ts: Date.now() })
  set('glossary_book', list)
  return true
}

// ---- 阅读统计 ----

export function recordPageRead(bookId: string, pageIndex: number) {
  const key = 'read_pages_' + bookId
  const pages = get<number[]>(key, [])
  if (pages.indexOf(pageIndex) < 0) {
    pages.push(pageIndex)
    set(key, pages)
  }
}

function dayStr(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function recordReadDay() {
  const days = get<string[]>('read_days', [])
  const t = dayStr(new Date())
  if (days.indexOf(t) < 0) {
    days.push(t)
    set('read_days', days)
  }
}

export function streakDays(): number {
  const days = get<string[]>('read_days', [])
  if (!days.length) return 0
  const setDays: Record<string, boolean> = {}
  days.forEach((d) => { setDays[d] = true })
  let streak = 0
  const cur = new Date()
  for (;;) {
    if (!setDays[dayStr(cur)]) break
    streak += 1
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export function getStats(bookList: Array<{ id: string; released: boolean }>) {
  const released = (bookList || []).filter((b) => b.released)
  let booksDone = 0
  let pagesRead = 0
  released.forEach((b) => {
    if (isDone(b.id)) booksDone += 1
    pagesRead += get<number[]>('read_pages_' + b.id, []).length
  })
  return {
    booksDone,
    pagesRead,
    streak: streakDays(),
    words: getGlossary().length,
  }
}

// ---- 游客态 ----

export function guestSession() {
  let id = get('guest_id', '')
  if (!id) {
    id = 'g' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
    set('guest_id', id)
  }
  return { userId: id, nickname: '游客小朋友', guest: true }
}
