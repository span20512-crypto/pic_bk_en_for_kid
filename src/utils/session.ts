/**
 * 登录会话：LOGIN_ENDPOINT 留空则走本地游客态（PRD §1.1）
 */
import Taro from '@tarojs/taro'
import config from './config'
import { guestSession } from './store'

export interface Session {
  userId: string
  nickname: string
  guest: boolean
}

let session: Session | null = null

export function getSession(): Session {
  return session || guestSession()
}

export function login() {
  if (!config.LOGIN_ENDPOINT) {
    session = guestSession()
    return
  }
  Taro.login({
    success: (res) => {
      Taro.request({
        url: config.LOGIN_ENDPOINT,
        method: 'POST',
        data: { code: res.code },
        success: (r: any) => {
          session = (r.data && r.data.session) || guestSession()
        },
        fail: () => { session = guestSession() },
      })
    },
    fail: () => { session = guestSession() },
  })
}
