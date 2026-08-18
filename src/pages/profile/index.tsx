/**
 * 我的（PRD §3.8）：游客态 + 阅读统计 + 已规划功能菜单
 */
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import * as store from '../../utils/store'
import { getSession } from '../../utils/session'
import './index.scss'

const { bookList } = require('../../data/books')

const MENU = [
  { icon: '⚙️', label: '阅读设置' },
  { icon: '📊', label: '阅读报告' },
  { icon: '🔔', label: '消息通知' },
  { icon: '💬', label: '帮助与反馈' },
  { icon: '🎁', label: '邀请好友' },
]

export default function Profile() {
  const [session, setSession] = useState({ userId: '…', nickname: '游客小朋友' })
  const [stats, setStats] = useState({ booksDone: 0, pagesRead: 0, streak: 0, words: 0 })

  useDidShow(() => {
    setSession(getSession())
    setStats(store.getStats(bookList))
  })

  const onMenuTap = () => {
    Taro.showToast({ title: '功能规划中，敬请期待', icon: 'none' })
  }

  return (
    <View className='wrap'>
      <View className='user card-base'>
        <View className='avatar'>🧒</View>
        <View className='flex-col flex-1'>
          <Text className='nick'>{session.nickname}</Text>
          <Text className='uid'>ID: {session.userId}</Text>
        </View>
      </View>

      <View className='stats card-base'>
        <View className='stat'>
          <Text className='stat-num'>{stats.booksDone}</Text>
          <Text className='stat-label'>已读绘本</Text>
        </View>
        <View className='stat'>
          <Text className='stat-num'>{stats.pagesRead}</Text>
          <Text className='stat-label'>累计页数</Text>
        </View>
        <View className='stat'>
          <Text className='stat-num'>{stats.streak}</Text>
          <Text className='stat-label'>连续天数</Text>
        </View>
        <View className='stat'>
          <Text className='stat-num'>{stats.words}</Text>
          <Text className='stat-label'>生词数</Text>
        </View>
      </View>

      <View className='menu card-base'>
        {MENU.map((m) => (
          <View key={m.label} className='menu-item' hoverClass='press-dim' onClick={onMenuTap}>
            <Text className='menu-icon'>{m.icon}</Text>
            <Text className='menu-label flex-1'>{m.label}</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        ))}
      </View>

      <View className='about'>
        <Text>英语绘本馆 · MVP（Taro 4 + React）</Text>
        <Text>绘本选题来自小红书 @快乐学英语008，台词与画面均为原创改写</Text>
        <Text>视频占位素材：Mixkit（免版权）· 语音：微软 en-US-AnaNeural</Text>
      </View>
    </View>
  )
}
