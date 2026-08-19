/**
 * 本地媒体服务器探测（开发期专用）
 *
 * 原版参考素材（版权内容）只存在于开发机 media/ 目录，由 scripts/serve-media.mjs
 * 在局域网提供。候选地址见 config.LOCAL_MEDIA_BASES：开发者工具命中 127.0.0.1，
 * 真机（与电脑同一 Wi-Fi）命中开发机局域网 IP。
 *
 * 为什么是「探活 + 试错」双通道：
 * 真机预览时 request 受小程序合法域名校验拦截（http 的局域网地址不可能进白名单），
 * 探活必然失败；但 <video> 的 src 不受该白名单约束（PRD §3.7），照样能播。
 * 所以探活只用来快速确认（模拟器场景），探不通时不放弃，仍让 video 逐个试候选地址，
 * 由 onError 推进游标；全部候选失败才判定不可用，回落 Mixkit 免版权占位。
 *
 * 正式环境不含 local 字段，本模块不参与（PRD §2.2）。
 */
import Taro from '@tarojs/taro'
import config from './config'

let confirmedBase = ''   // 探活确认可用的地址
let candidateIdx = 0     // 试错游标
let exhausted = false    // 全部候选均已失败
let probeSeq = 0

/** 当前应使用的地址：探活确认的优先，否则给出待试错的候选 */
export function localMediaBase(): string {
  if (confirmedBase) return confirmedBase
  if (exhausted) return ''
  return config.LOCAL_MEDIA_BASES[candidateIdx] || ''
}

export function localMediaAvailable(): boolean {
  return !!localMediaBase()
}

export function localMediaUrl(file: string): string {
  const base = localMediaBase()
  // 带版本号：素材换了但 URL 不变时，微信会沿用缓存的旧视频（见 config 注释）
  return base ? `${base}${file}?v=${config.LOCAL_MEDIA_VERSION}` : ''
}

/** video 加载失败时调用：淘汰该地址，推进到下一个候选 */
export function noteBaseFailed(base: string) {
  if (!base) return
  if (confirmedBase === base) confirmedBase = ''
  const i = config.LOCAL_MEDIA_BASES.indexOf(base)
  if (i >= 0 && i >= candidateIdx) candidateIdx = i + 1
  if (candidateIdx >= config.LOCAL_MEDIA_BASES.length) exhausted = true
}

function ping(base: string): Promise<boolean> {
  return new Promise((resolve) => {
    Taro.request({
      url: base + 'ping',
      timeout: 1500,
      success: (res) => resolve(res.statusCode === 200),
      fail: () => resolve(false),
    })
  })
}

/**
 * 并发探活全部候选，按候选顺序取第一个应答的。
 * 探不通不代表不可用（见文件头注释），因此只重置试错游标，不判定 exhausted。
 */
export function probeLocalMedia(cb?: (ok: boolean) => void) {
  const seq = ++probeSeq
  Promise.all(config.LOCAL_MEDIA_BASES.map(ping)).then((results) => {
    if (seq !== probeSeq) return // 已有更新一轮探活，本轮作废
    const hit = config.LOCAL_MEDIA_BASES.find((_, i) => results[i])
    if (hit) {
      confirmedBase = hit
      candidateIdx = config.LOCAL_MEDIA_BASES.indexOf(hit)
      exhausted = false
    }
    cb && cb(!!hit)
  })
}
