/**
 * 逐词高亮节奏（PRD §3.5）
 * 不使用固定毫秒定时器：由音频进度回调驱动，
 * 配合按词长与标点计算的权重表定位当前词。
 */

export interface WordTiming {
  tokens: string[]
  weights: number[]
  cum: number[]
  total: number
}

export function tokenize(sentence: string): string[] {
  return String(sentence).trim().split(/\s+/).filter(Boolean)
}

/** 权重 = 有效字母数（下限 2）+ 标点停顿加成（, ; : +2 / . ! ? +3） */
export function buildWordTiming(sentence: string): WordTiming {
  const tokens = tokenize(sentence)
  const weights = tokens.map((tok) => {
    const letters = tok.replace(/[^A-Za-z']/g, '').length
    let w = Math.max(2, letters)
    if (/[,;:]["'”’]?$/.test(tok)) w += 2
    if (/[.!?]["'”’]?$/.test(tok)) w += 3
    return w
  })
  const cum: number[] = []
  let total = 0
  for (const w of weights) {
    total += w
    cum.push(total)
  }
  return { tokens, weights, cum, total }
}

/** 给定已播进度（去掉前导静音后的秒数）与有效发声时长，返回当前词下标 */
export function wordIndexAt(elapsed: number, timing: WordTiming, effectiveDur: number): number {
  if (!timing || !timing.total || effectiveDur <= 0) return 0
  const frac = Math.min(1, Math.max(0, elapsed / effectiveDur))
  const target = frac * timing.total
  for (let i = 0; i < timing.cum.length; i++) {
    if (target <= timing.cum[i]) return i
  }
  return timing.cum.length - 1
}
