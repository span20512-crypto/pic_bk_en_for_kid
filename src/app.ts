import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { login } from './utils/session'
import { probeLocalMedia } from './utils/media'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    login()
    // 探测本地媒体服务器（开发期注入原版素材用，见 scripts/serve-media.mjs）
    probeLocalMedia()
  })

  return children
}

export default App
