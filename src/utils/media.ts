/**
 * 本地媒体服务器探测（开发期专用）
 *
 * 原版参考素材（小红书原视频，版权内容）只存在于开发机 media/ 目录，
 * 由 scripts/serve-media.mjs 在局域网提供；探测成功才切换到原版画面，
 * 否则照常走 Mixkit 免版权占位 + 降级场景（PRD §2.2 的约束不受影响）。
 */
import Taro from '@tarojs/taro'
import config from './config'

let available = false
let probed = false

export function localMediaAvailable(): boolean {
  return available
}

export function localMediaUrl(file: string): string {
  return config.LOCAL_MEDIA_BASE + file
}

export function probeLocalMedia(cb?: (ok: boolean) => void) {
  Taro.request({
    url: config.LOCAL_MEDIA_BASE + 'ping',
    timeout: 1500,
    success: (res) => {
      available = res.statusCode === 200
      probed = true
      cb && cb(available)
    },
    fail: () => {
      available = false
      probed = true
      cb && cb(false)
    },
  })
}

export function probedOnce(): boolean {
  return probed
}
