/**
 * 女童声旁白播放（PRD §3.6）——Taro 移植版
 *
 * - 全部英文语料构建期离线预生成 MP3，客户端按 ttsKey(text) 拼公开 URL 播放
 * - InnerAudioContext LRU 复用（上限 4 个实例）
 * - 两层自愈降级，不使用一次性全局闩锁：
 *   1) 按条降级：单条语料主 base 取不到时，只有该条退回下一个 base
 *   2) 整站降级带时间盒：连续 3 条不同文案失败才判定站点不可用，60s 后自动恢复
 * - 站点不可用期间 play() 返回 { silent: true }，调用方用估算节奏继续动画
 */
import Taro from '@tarojs/taro'
import config from './config'

const { ttsKey, normalize } = require('./tts-key')

export interface PlayHandlers {
  onCanplay?: (duration: number) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: () => void
}

export interface PlayController {
  silent: boolean
  stop: () => void
  position?: () => { currentTime: number; duration: number } | null
}

const LRU_MAX = 4
const lru: Array<{ url: string; ctx: Taro.InnerAudioContext }> = []

let recentFailTexts: string[] = []
let siteDownUntil = 0

function urlFor(text: string, baseIndex: number): string {
  return config.TTS_BASES[baseIndex] + ttsKey(text) + '.mp3'
}

function takeCtx(url: string): Taro.InnerAudioContext {
  const i = lru.findIndex((e) => e.url === url)
  if (i >= 0) {
    const e = lru.splice(i, 1)[0]
    lru.push(e)
    return e.ctx
  }
  const ctx = Taro.createInnerAudioContext()
  ctx.obeyMuteSwitch = false
  lru.push({ url, ctx })
  if (lru.length > LRU_MAX) {
    const old = lru.shift()
    try { old && old.ctx.destroy() } catch (e) { /* ignore */ }
  }
  return ctx
}

function noteFailure(text: string) {
  const key = ttsKey(text)
  if (recentFailTexts[recentFailTexts.length - 1] !== key) {
    recentFailTexts.push(key)
  }
  if (recentFailTexts.length >= config.SITE_DOWN_FAILS) {
    siteDownUntil = Date.now() + config.SITE_DOWN_RECOVER_MS
    recentFailTexts = []
  }
}

export function siteDown(): boolean {
  return Date.now() < siteDownUntil
}

export function play(text: string, handlers: PlayHandlers = {}): PlayController {
  if (siteDown()) {
    return { stop() {}, silent: true }
  }

  let stopped = false
  let ctx: Taro.InnerAudioContext | null = null

  const cleanup = () => {
    if (!ctx) return
    ctx.offCanplay()
    ctx.offTimeUpdate()
    ctx.offEnded()
    ctx.offError()
    try { ctx.stop() } catch (e) { /* ignore */ }
    ctx = null
  }

  const tryBase = (bi: number) => {
    if (stopped) return
    if (bi >= config.TTS_BASES.length) {
      noteFailure(text)
      handlers.onError && handlers.onError()
      return
    }
    const url = urlFor(text, bi)
    ctx = takeCtx(url)
    ctx.offCanplay()
    ctx.offTimeUpdate()
    ctx.offEnded()
    ctx.offError()
    ctx.src = url

    ctx.onCanplay(() => {
      if (stopped || !ctx) return
      recentFailTexts = []
      handlers.onCanplay && handlers.onCanplay(ctx.duration || 0)
    })
    ctx.onTimeUpdate(() => {
      if (stopped || !ctx) return
      handlers.onTimeUpdate && handlers.onTimeUpdate(ctx.currentTime || 0, ctx.duration || 0)
    })
    ctx.onEnded(() => {
      if (stopped) return
      handlers.onEnded && handlers.onEnded()
    })
    ctx.onError(() => {
      if (stopped) return
      const failed = ctx
      ctx = null
      try { failed && failed.destroy() } catch (e) { /* ignore */ }
      const i = lru.findIndex((e) => e.ctx === failed)
      if (i >= 0) lru.splice(i, 1)
      tryBase(bi + 1) // 按条降级：只有本条退回下一个 base
    })
    ctx.play()
  }

  tryBase(0)

  return {
    silent: false,
    stop() {
      stopped = true
      cleanup()
    },
    position() {
      if (!ctx) return null
      return { currentTime: ctx.currentTime || 0, duration: ctx.duration || 0 }
    },
  }
}

/** 简单播放一个词/短语（生词发音） */
export function playWord(word: string, onDone?: () => void): PlayController {
  return play(normalize(word), { onEnded: onDone })
}

/** 释放全部音频上下文（退出阅读器/切后台时调用，PRD §3.4 资源清理） */
export function releaseAll() {
  while (lru.length) {
    const e = lru.pop()
    try { e && e.ctx.destroy() } catch (err) { /* ignore */ }
  }
}
