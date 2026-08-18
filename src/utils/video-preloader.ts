/**
 * 串行预下载队列（PRD §3.7）——Taro 移植版
 * - 同一时刻只下载一个视频；promote(url) 把用户翻到的页提到队首
 * - downloadFile 受小程序后台合法域名约束，未配置时静默失败 → 回落降级画面
 * - 本地媒体服务器（http://127.0.0.1）直接流式播放，不进本队列
 */
import Taro from '@tarojs/taro'

export interface VideoState {
  status: 'queued' | 'loading' | 'done' | 'failed'
  path: string
  progress: number
}

type Cb = (url: string, st: VideoState) => void

const cache: Record<string, VideoState> = {}
const subs: Record<string, Cb[]> = {}
let queue: string[] = []
let activeUrl: string | null = null

export function stateOf(url: string): VideoState | null {
  return cache[url] || null
}

function notify(url: string) {
  const list = subs[url] || []
  list.forEach((cb) => cb(url, cache[url]))
}

export function subscribe(url: string, cb: Cb) {
  if (!subs[url]) subs[url] = []
  subs[url].push(cb)
  if (cache[url]) cb(url, cache[url])
}

export function unsubscribeAll(url: string) {
  delete subs[url]
}

export function enqueue(urls: string[]) {
  urls.filter(Boolean).forEach((url) => {
    if (cache[url]) return
    cache[url] = { status: 'queued', path: '', progress: 0 }
    queue.push(url)
  })
  pump()
}

export function promote(url: string) {
  if (!url || !cache[url]) return
  if (cache[url].status !== 'queued') return
  queue = queue.filter((u) => u !== url)
  queue.unshift(url)
}

function pump() {
  if (activeUrl) return
  const url = queue.shift()
  if (!url) return
  activeUrl = url
  cache[url].status = 'loading'
  notify(url)

  const task = Taro.downloadFile({
    url,
    success(res) {
      if (res.statusCode === 200 && res.tempFilePath) {
        cache[url].status = 'done'
        cache[url].path = res.tempFilePath
        cache[url].progress = 100
      } else {
        cache[url].status = 'failed'
      }
    },
    fail() {
      cache[url].status = 'failed'
    },
    complete() {
      notify(url)
      activeUrl = null
      pump()
    },
  })

  if (task && task.onProgressUpdate) {
    task.onProgressUpdate((res) => {
      if (cache[url].status !== 'loading') return
      cache[url].progress = res.progress || 0
      notify(url)
    })
  }
}
