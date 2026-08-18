/**
 * 生词本（PRD §3.8）：按绘本筛选 + 一键复习顺序播放发音
 */
import { useRef, useState } from 'react'
import { useDidHide, useDidShow, useUnload } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import * as store from '../../utils/store'
import * as tts from '../../utils/tts'
import './index.scss'

const { bookList } = require('../../data/books')

export default function Glossary() {
  const [entries, setEntries] = useState<store.GlossaryEntry[]>([])
  const [filters, setFilters] = useState<Array<{ id: string; label: string }>>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [reviewing, setReviewing] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(-1)

  const reviewSeq = useRef(0)
  const reviewCtl = useRef<tts.PlayController | null>(null)
  const reviewTimer = useRef<any>(null)

  const allEntries = () => store.getGlossary().slice().reverse() // 新词在前

  const applyFilter = (fid: string) => {
    const all = allEntries()
    setActiveFilter(fid)
    setEntries(fid === 'all' ? all : all.filter((e) => e.bookId === fid))
    setReviewIdx(-1)
  }

  const reload = () => {
    const all = allEntries()
    const bookIds: string[] = []
    all.forEach((e) => { if (bookIds.indexOf(e.bookId) < 0) bookIds.push(e.bookId) })
    setFilters([{ id: 'all', label: '全部' }].concat(
      bookIds.map((id) => {
        const b = bookList.find((x: any) => x.id === id)
        return { id, label: (b && b.titleCn) || id }
      })
    ))
    applyFilter(activeFilter === 'all' || bookIds.includes(activeFilter) ? activeFilter : 'all')
  }

  const stopReview = () => {
    reviewSeq.current += 1
    if (reviewTimer.current) { clearTimeout(reviewTimer.current); reviewTimer.current = null }
    if (reviewCtl.current) { reviewCtl.current.stop(); reviewCtl.current = null }
    setReviewing(false)
    setReviewIdx(-1)
  }

  useDidShow(reload)
  useDidHide(() => { stopReview(); tts.releaseAll() })
  useUnload(() => { stopReview(); tts.releaseAll() })

  const reviewNext = (i: number, token: number, list: store.GlossaryEntry[]) => {
    if (token !== reviewSeq.current) return
    if (i >= list.length) {
      setReviewing(false); setReviewIdx(-1)
      return
    }
    setReviewIdx(i)
    const advance = () => {
      reviewTimer.current = setTimeout(() => reviewNext(i + 1, token, list), 400)
    }
    reviewCtl.current = tts.playWord(list[i].word, advance)
    if (reviewCtl.current && reviewCtl.current.silent) advance()
  }

  const toggleReview = () => {
    if (reviewing) { stopReview(); return }
    if (!entries.length) return
    const token = ++reviewSeq.current
    setReviewing(true)
    reviewNext(0, token, entries)
  }

  if (!entries.length && activeFilter === 'all') {
    return (
      <View className='wrap'>
        <View className='empty'>
          <Text className='empty-emoji'>🔤</Text>
          <Text className='empty-title'>生词本还是空的</Text>
          <Text className='empty-sub'>去绘本里点一点带下划线的单词吧</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='wrap'>
      <ScrollView scrollX className='filter-bar' enhanced showScrollbar={false}>
        {filters.map((f) => (
          <View
            key={f.id}
            className={`chip ${activeFilter === f.id ? 'chip-on' : ''}`}
            hoverClass='press-dim'
            onClick={() => { stopReview(); applyFilter(f.id) }}
          >{f.label}</View>
        ))}
      </ScrollView>

      <View
        className={`review-btn ${reviewing ? 'review-on' : ''}`}
        hoverClass='press'
        onClick={toggleReview}
      >{reviewing ? '⏹ 停止复习' : '🔁 一键复习（顺序播放发音）'}</View>

      {entries.map((e, index) => (
        <View key={`${e.bookId}-${e.word}`} className={`entry card-base ${reviewIdx === index ? 'entry-hot' : ''}`}>
          <View className='flex-col flex-1'>
            <Text className='e-word'>{e.word}</Text>
            <Text className='e-cn'>{e.cn}</Text>
            <Text className='e-src'>出自 {e.bookTitle}</Text>
          </View>
          <View className='e-play' hoverClass='press-dim' onClick={() => { stopReview(); tts.playWord(e.word) }}>🔊</View>
        </View>
      ))}
    </View>
  )
}
