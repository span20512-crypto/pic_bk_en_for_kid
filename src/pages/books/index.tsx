/**
 * 绘本馆：列表 + 阅读器同页钻取（PRD §1.2 / §3.1 / §3.3 / §3.4 / §3.5）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useDidHide, usePageScroll, useUnload } from '@tarojs/taro'
import { View, Text, Swiper, SwiperItem, Video } from '@tarojs/components'
import config from '../../utils/config'
import * as store from '../../utils/store'
import * as tts from '../../utils/tts'
import * as preloader from '../../utils/video-preloader'
import { buildWordTiming, tokenize, wordIndexAt } from '../../utils/timing'
import { localMediaAvailable, localMediaBase, localMediaUrl, noteBaseFailed, probeLocalMedia } from '../../utils/media'
import './index.scss'

const { seriesMeta, seriesOrder, bookList } = require('../../data/books')
const { splitSentences } = require('../../utils/tts-key')

interface WordView { t: string; g: number }
interface SentenceView { text: string; words: WordView[] }

// 生词标注：句子 token 与本页生词匹配（支持 match 词形与多词短语）
function buildWordViews(sentence: string, glossary: any[]): WordView[] {
  const tokens = tokenize(sentence)
  const norm = tokens.map((t) => t.replace(/[^A-Za-z']/g, '').toLowerCase())
  const views: WordView[] = tokens.map((t) => ({ t, g: -1 }))
  ;(glossary || []).forEach((entry, gi) => {
    const target = (entry.match || entry.word).toLowerCase().split(/\s+/)
    for (let i = 0; i + target.length <= norm.length; i++) {
      let hit = true
      for (let j = 0; j < target.length; j++) {
        if (norm[i + j] !== target[j]) { hit = false; break }
      }
      if (hit) {
        for (let j = 0; j < target.length; j++) views[i + j].g = gi
        break
      }
    }
  })
  return views
}

function buildGroups() {
  return seriesOrder.map((key: string) => {
    const books = bookList
      .filter((b: any) => b.series === key)
      .map((b: any) => {
        let progressText = '敬请期待'
        let done = false
        if (b.released) {
          done = store.isDone(b.id)
          if (done) {
            progressText = '✓ 已读完'
          } else {
            const p = store.getProgress(b.id)
            progressText = p > 0 ? `读到第 ${p + 1} 页` : '还没开始读'
          }
        }
        return { ...b, progressText, done }
      })
    const doneCount = books.filter((x: any) => x.done).length
    return { key, meta: seriesMeta[key], books, doneCount, total: books.length }
  })
}

export default function Books() {
  const [mode, setMode] = useState<'list' | 'reader'>('list')
  const [groups, setGroups] = useState(buildGroups)
  const [book, setBook] = useState<any>(null)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [sentIdx, setSentIdx] = useState(-1)
  const [wordIdx, setWordIdx] = useState(-1)
  const [showCn, setShowCn] = useState(false)
  const [gloss, setGloss] = useState<any>(null)
  const [videoTick, setVideoTick] = useState(0) // 预下载状态变化触发重渲染

  const playSeq = useRef(0)
  const ctlRef = useRef<tts.PlayController | null>(null)
  const pollTimer = useRef<any>(null)
  const gapTimer = useRef<any>(null)
  const cnTimer = useRef<any>(null)
  const silentTimer = useRef<any>(null)
  const listScrollTop = useRef(0)
  const savedScrollTop = useRef(0)
  const videoProgressed = useRef(false) // 当前页视频是否真的在走（看门狗与播放兜底共用）

  const pageCount = book ? book.pages.length : 0
  const page = book && current < pageCount ? book.pages[current] : null

  // en 支持两种写法：整段字符串（按 §3.5 拆句规则切）或已逐句切好的数组
  // （verbatim 书用数组，因为引号内的多句台词拆句正则切不准，且要与 cn 一一配对）
  const sentences: SentenceView[] = useMemo(() => {
    if (!page) return []
    const lines: string[] = Array.isArray(page.en) ? page.en : splitSentences(page.en)
    return lines.map((s: string) => ({
      text: s,
      words: buildWordViews(s, page.glossary),
    }))
  }, [page])

  // verbatim（原片直录）书：台词照搬原片，句数不受 §3.2 分级约束
  const verbatimLayout = !!(book && book.verbatim)

  /**
   * 字幕渲染范围：整页 1-2 句时同屏显示（当前句高亮、其余降透明，PRD §3.5）；
   * 超过 2 句就只渲染当前句（未播放时给第 1 句作预览）—— 多句同屏会把字幕块撑得
   * 比画面还高，也不符合原片「一次一句」的呈现。verbatim 书每页 3-5 句，恒走单句。
   */
  const visibleSentences = useMemo(() => {
    const all = sentences.map((s, si) => ({ s, si }))
    if (all.length <= 2) return all
    const at = sentIdx >= 0 ? Math.min(sentIdx, all.length - 1) : 0
    return all.slice(at, at + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences, sentIdx])

  /**
   * 中文字幕：cn 为数组时与 en 逐句配对 —— 只显示当前英文句对应的那句，
   * 与 visibleSentences 的取句保持同步；cn 为字符串时整段显示（既有行为）。
   */
  const cnText = useMemo(() => {
    if (!page) return ''
    if (!Array.isArray(page.cn)) return page.cn
    // 单句模式跟着当前朗读句走；多句同屏时把整页中文拼起来，
    // 否则中文会一直停在第 1 句、与正在读的英文对不上
    if (visibleSentences.length === 1) {
      const at = visibleSentences[0].si
      return page.cn[Math.min(at, page.cn.length - 1)] || ''
    }
    return page.cn.join('')
  }, [page, visibleSentences])

  /**
   * verbatim 模式的字幕时间轴：把本页 clip 时长按各句的词权重之和切成归一化区段
   * （[0,1) 上首尾相接）。原声语速大体均匀，按权重分配比按句数平均更贴合。
   */
  const sentSpans = useMemo(() => {
    const timings = sentences.map((s) => buildWordTiming(s.text))
    const total = timings.reduce((n, t) => n + t.total, 0) || 1
    let acc = 0
    return timings.map((t, idx) => {
      const start = acc / total
      acc += t.total
      return { idx, start, end: acc / total, timing: t }
    })
  }, [sentences])

  // 本页视频源：本地原版素材（开发期）优先，其次 Mixkit 预下载，失败回落降级场景
  const video = useMemo(() => {
    const none = { kind: 'none', ready: false, failed: true, src: '', progress: 0, loading: false, clip: null as null | number[], base: '' }
    if (!page) return none
    // 本地素材：探活确认或仍有待试错的候选时都尝试（真机预览探活必失败，见 utils/media）
    if (page.local && localMediaAvailable()) {
      return {
        kind: 'local', ready: true, failed: false, loading: false, progress: 100,
        src: localMediaUrl(page.local.file), clip: page.local.clip, base: localMediaBase(),
      }
    }
    // 网络视频：**直接播 https 直链**，预下载只作加速。
    // 真机上 downloadFile 受合法域名白名单约束（未配置则静默失败），若像从前那样
    // 非等下载完才给 src，真机就永远没有画面；而 <video> 的 src 不受该约束（PRD §3.7）。
    const st = page.videoUrl ? preloader.stateOf(page.videoUrl) : null
    const cached = st && st.status === 'done' ? st.path : ''
    return {
      kind: 'remote',
      ready: !!page.videoUrl,
      failed: !page.videoUrl,
      loading: !cached && !!(st && (st.status === 'loading' || st.status === 'queued')),
      progress: (st && st.progress) || 0,
      src: cached || page.videoUrl || '',
      clip: null,
      base: '',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, videoTick])

  usePageScroll((e) => {
    if (mode === 'list') listScrollTop.current = e.scrollTop
  })

  const clearTimers = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
    if (gapTimer.current) { clearTimeout(gapTimer.current); gapTimer.current = null }
    if (cnTimer.current) { clearTimeout(cnTimer.current); cnTimer.current = null }
    if (silentTimer.current) { clearTimeout(silentTimer.current); silentTimer.current = null }
  }

  const stopPlayback = useCallback(() => {
    playSeq.current += 1
    clearTimers()
    if (ctlRef.current) { ctlRef.current.stop(); ctlRef.current = null }
    setPlaying(false)
    setSentIdx(-1)
    setWordIdx(-1)
  }, [])

  useDidHide(() => { stopPlayback(); tts.releaseAll() })
  useUnload(() => { stopPlayback(); tts.releaseAll() })

  // ---------- 播放绘本（PRD §3.4 / §3.5） ----------

  const playSentence = useCallback((i: number, token: number, sents: SentenceView[]) => {
    if (token !== playSeq.current) return
    if (i >= sents.length) {
      // 旁白读完停在本页，视频继续静音循环
      setPlaying(false); setSentIdx(-1); setWordIdx(-1)
      return
    }
    setSentIdx(i); setWordIdx(-1)

    const text = sents[i].text
    const wt = buildWordTiming(text)
    let cutDone = false
    let lastWord = -1

    const cut = () => {
      if (cutDone || token !== playSeq.current) return
      cutDone = true
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
      if (ctlRef.current) { ctlRef.current.stop(); ctlRef.current = null }
      gapTimer.current = setTimeout(() => playSentence(i + 1, token, sents), config.STORY_GAP_MS)
    }

    const silentAnimate = () => {
      if (token !== playSeq.current) return
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
      let wi = 0
      const step = () => {
        if (token !== playSeq.current) return
        if (wi >= wt.tokens.length) {
          gapTimer.current = setTimeout(() => playSentence(i + 1, token, sents), config.STORY_GAP_MS)
          return
        }
        setWordIdx(wi)
        wi += 1
        silentTimer.current = setTimeout(step, config.SILENT_WORD_MS)
      }
      step()
    }

    const onProgress = (t: number, dur: number) => {
      if (cutDone || token !== playSeq.current || !dur) return
      // 句间静音裁剪：在 max(dur - TAIL, 0.6*dur) 处切段（PRD §3.5）
      const cutoff = Math.max(dur - config.TAIL_S, 0.6 * dur)
      if (t >= cutoff) { cut(); return }
      const elapsed = t - config.LEAD_S
      const wi = wordIndexAt(elapsed, wt, cutoff - config.LEAD_S)
      if (elapsed >= 0 && wi !== lastWord) {
        lastWord = wi
        setWordIdx(wi)
      }
    }

    const ctl = tts.play(text, {
      onTimeUpdate: onProgress, // 音频进度回调驱动逐词高亮，不用固定定时器
      onEnded: cut,
      onError: silentAnimate,
    })
    ctlRef.current = ctl

    if (ctl.silent) { silentAnimate(); return }

    // 兜底轮询 currentTime（个别机型 onTimeUpdate 触发过疏时保证能切段）
    pollTimer.current = setInterval(() => {
      if (!ctlRef.current || token !== playSeq.current) return
      const pos = ctlRef.current.position && ctlRef.current.position()
      if (pos && pos.duration > 0) onProgress(pos.currentTime, pos.duration)
    }, 80)
  }, [])

  /**
   * verbatim（原片直录）+ 本地素材：朗读由原片自带声轨承担，不启 TTS。
   * 逐词高亮改由视频进度驱动 —— 把本页 clip 时长按各句权重切成区段，
   * onVideoTime 里按 currentTime 落在哪一段来定位句/词（见 onVideoTime）。
   */
  const verbatimVoice = !!(book && book.verbatim && video.kind === 'local' && video.clip)

  const startPlayback = useCallback(() => {
    if (!sentences.length) return
    const token = ++playSeq.current
    setPlaying(true); setSentIdx(0); setWordIdx(-1)
    cnTimer.current = setTimeout(() => {
      if (token === playSeq.current) setShowCn(true)
    }, config.CN_DELAY_MS)
    if (verbatimVoice) {
      // 从本页分段起点重放，字幕跟着视频走
      const ctx = Taro.createVideoContext('stage-video')
      ctx.seek(video.clip![0])
      ctx.play()
      // 兜底：verbatim 的字幕推进完全依赖视频 onTimeUpdate，视频若根本没动起来
      // （真机常见：局域网 http 被 iOS 拦掉），按钮会永远停在"播放中…"。
      // 给它一个时限，没动就改走字幕自走，保证阅读流程不被卡住（PRD §6）。
      gapTimer.current = setTimeout(() => {
        if (token !== playSeq.current || videoProgressed.current) return
        playSentence(0, token, sentences)
      }, 2500)
      return
    }
    playSentence(0, token, sentences)
  }, [sentences, playSentence, verbatimVoice, video.clip])

  const togglePlay = () => (playing ? stopPlayback() : startPlayback())

  // ---------- 翻页 ----------

  // currentRef 镜像 current，供 goPage 同步判重——副作用不能放进 setState updater
  // （React 可能重复调用 updater，进度写入/预下载插队会被双跑）
  const currentRef = useRef(0)

  const goPage = useCallback((idx: number) => {
    if (!book || idx === currentRef.current) return
    currentRef.current = idx
    stopPlayback()
    setGloss(null)
    setShowCn(false)
    setCurrent(idx)
    if (idx < book.pages.length) {
      store.setProgress(book.id, idx)
      store.recordPageRead(book.id, idx)
      const url = book.pages[idx].videoUrl
      if (url) preloader.promote(url)
    } else {
      store.markDone(book.id) // The End 页：读完打 ✓
    }
  }, [book, stopPlayback])

  const onSwiperChange = (e: any) => goPage(e.detail.current)

  // ---------- 进出阅读器 ----------

  const openBook = (b: any) => {
    if (!b.released) {
      Taro.showToast({ title: '敬请期待 🐾', icon: 'none' })
      return
    }
    savedScrollTop.current = listScrollTop.current
    store.recordReadDay()
    // 每次进书重探本地媒体服务器；结果回来后必须触发重渲染，
    // 否则探活成功也切不到原版画面（localMediaAvailable 不是响应式状态）
    probeLocalMedia((ok) => setVideoTick((t) => t + 1))
    const full = bookList.find((x: any) => x.id === b.id)
    const cur = Math.min(store.getProgress(b.id), full.pages.length - 1)
    currentRef.current = cur
    setBook(full)
    setCurrent(cur)
    setShowCn(false)
    setMode('reader')

    // 进入本书即整本排队串行预下载，当前页插队优先（PRD §3.3 / §3.7）
    const urls = full.pages.map((p: any) => p.videoUrl).filter(Boolean)
    preloader.enqueue(urls)
    const curUrl = full.pages[cur] && full.pages[cur].videoUrl
    if (curUrl) preloader.promote(curUrl)
    // 先清旧订阅再订阅，重复进同一本书不累积回调
    urls.forEach((u: string) => {
      preloader.unsubscribeAll(u)
      preloader.subscribe(u, () => setVideoTick((t) => t + 1))
    })
  }

  const closeReader = () => {
    stopPlayback()
    tts.releaseAll()
    if (book) book.pages.forEach((p: any) => p.videoUrl && preloader.unsubscribeAll(p.videoUrl))
    setMode('list')
    setBook(null)
    setGloss(null)
    setGroups(buildGroups())
    Taro.pageScrollTo({ scrollTop: savedScrollTop.current || 0, duration: 0 })
  }

  // ---------- 本地原版素材：分段循环播放 ----------

  const videoCtxSeekGuard = useRef(0)
  const onVideoTime = (e: any) => {
    videoProgressed.current = true
    if (video.kind !== 'local' || !video.clip) return
    const t = e.detail.currentTime
    const [start, end] = video.clip

    // verbatim 模式：用视频进度驱动字幕（原声在念这页台词），播放到段尾即停
    if (verbatimVoice && playing) {
      if (t >= end) { stopPlayback(); return }
      const frac = Math.min(1, Math.max(0, (t - start) / Math.max(0.1, end - start)))
      const hit = sentSpans.find((sp) => frac < sp.end) || sentSpans[sentSpans.length - 1]
      if (hit) {
        const inner = (frac - hit.start) / Math.max(0.001, hit.end - hit.start)
        const wi = wordIndexAt(inner * hit.timing.total, hit.timing, hit.timing.total)
        if (hit.idx !== sentIdx) setSentIdx(hit.idx)
        if (wi !== wordIdx) setWordIdx(wi)
      }
    }

    if (t < start - 0.5 || t > end) {
      const now = Date.now()
      if (now - videoCtxSeekGuard.current < 400) return // 防抖：seek 后事件回涌
      videoCtxSeekGuard.current = now
      Taro.createVideoContext('stage-video').seek(start)
    }
  }
  /**
   * 本地素材加载看门狗。
   * 真机上局域网 http 地址常因 iOS ATS / 本地网络权限被静默拒绝 —— 既不触发 onError
   * 也永远不 onTimeUpdate，画面就一直黑着。这里给它一个时限：迟迟没有播放进展就
   * 判定该候选不通，淘汰后触发重渲染，最终回落到网络视频/降级画面。
   */
  useEffect(() => {
    if (mode !== 'reader' || video.kind !== 'local' || !video.src) return
    videoProgressed.current = false
    const timer = setTimeout(() => {
      if (videoProgressed.current) return
      noteBaseFailed(video.base)
      setVideoTick((t) => t + 1)
    }, 3500)
    return () => clearTimeout(timer)
  }, [mode, current, video.kind, video.src, video.base])

  // 本地素材加载失败：淘汰该候选地址，改试下一个（全部失败则回落 Mixkit）
  const onVideoError = () => {
    if (video.kind !== 'local') return
    noteBaseFailed(video.base)
    setVideoTick((t) => t + 1)
  }

  // 切页后把本地素材定位到该页分段起点
  const clipStart = video.kind === 'local' && video.clip ? video.clip[0] : -1
  useEffect(() => {
    if (mode !== 'reader' || clipStart < 0) return
    const timer = setTimeout(() => {
      Taro.createVideoContext('stage-video').seek(clipStart)
    }, 120)
    return () => clearTimeout(timer)
  }, [mode, current, clipStart])

  // ---------- 开发期调试桥 ----------
  // miniprogram-automator 的元素/data 查询在 Taro 运行时下会挂起（页面 data 只有
  // 虚拟树 root），自动化用例改由逻辑层 evaluate 调 getApp().__debug 驱动页面。
  useEffect(() => {
    const app = Taro.getApp() as any
    app.__debug = {
      openBookById: (id: string) => {
        const b = bookList.find((x: any) => x.id === id)
        if (b) openBook(b)
      },
      goPage,
      togglePlay,
      closeReader,
      state: () => ({
        mode, current, playing, sentIdx, wordIdx,
        videoKind: video.kind, videoReady: video.ready, videoFailed: video.failed,
        videoSrc: String(video.src).slice(0, 60),
        localMedia: localMediaAvailable(),
      }),
    }
  })

  // ---------- 生词查义（PRD §3.3 / §3.4） ----------

  const onWordTap = (g: number) => {
    if (g < 0 || !page || !page.glossary[g]) return
    stopPlayback() // 点击时先停止旁白再展开释义
    const entry = page.glossary[g]
    setGloss({ word: entry.word, cn: entry.cn })
    tts.playWord(entry.word)
    store.addGlossaryWord({
      word: entry.word, cn: entry.cn,
      bookId: book.id, bookTitle: book.title,
    })
  }

  // ==================== 渲染 ====================

  if (mode === 'list') {
    return (
      <View className='list-wrap'>
        <View className='banner'>
          <Text className='banner-emoji'>📚</Text>
          <View className='flex-col'>
            <Text className='banner-title'>一座随身的小动物绘本馆</Text>
            <Text className='banner-sub'>看动画 · 听故事 · 学英语</Text>
          </View>
        </View>

        {groups.map((grp: any) => (
          <View key={grp.key} className='series'>
            <View className='series-head'>
              <Text className='series-emoji'>{grp.meta.emoji}</Text>
              <View className='flex-col flex-1'>
                <Text className='series-title'>{grp.meta.title}</Text>
                <Text className='series-sub'>{grp.meta.subtitle}</Text>
              </View>
              <Text className='series-count'>{grp.doneCount}/{grp.total} 本</Text>
            </View>

            {grp.books.map((b: any) => (
              <View
                key={b.id}
                className={`book-card ${b.released ? '' : 'book-card-locked'}`}
                hoverClass='press'
                hoverStayTime={80}
                onClick={() => openBook(b)}
              >
                <View className='cover' style={{ background: b.cover }}>
                  <Text className='cover-emoji'>{b.emoji}</Text>
                </View>
                <View className='info flex-col flex-1'>
                  <View className='flex items-center'>
                    <Text className='btitle flex-1'>{b.title}</Text>
                    <Text className={`badge-level badge-level-${b.level}`}>Lv{b.level}</Text>
                  </View>
                  <Text className='bsub'>{b.titleCn} · {b.tag}</Text>
                  <Text className={`bprog ${b.done ? 'bprog-done' : ''}`}>{b.progressText}</Text>
                </View>
                {b.done && <Text className='done-mark'>✓</Text>}
              </View>
            ))}
          </View>
        ))}

        <View className='list-foot'>🌱 更多绘本正在赶来的路上…</View>
      </View>
    )
  }

  return (
    <View className='reader-wrap'>
      <View className='reader-head'>
        <View className='back-btn' hoverClass='press-dim' onClick={closeReader}>‹ 书架</View>
        <View className='flex-col items-center flex-1'>
          <Text className='reader-title'>{book.title}</Text>
          <Text className='reader-sub'>{book.titleCn}</Text>
        </View>
        <Text className='page-no'>{current < pageCount ? `${current + 1}/${pageCount}` : '🎉'}</Text>
      </View>

      <Swiper className='reader-swiper' current={current} onChange={onSwiperChange} duration={280}>
        {book.pages.map((p: any, index: number) => (
          <SwiperItem key={index}>
            <View className='stage-outer'>
              <View className={`stage scene-${p.scene} ${index === current && video.kind === 'local' ? 'stage-local' : ''}`}>
                {/* 仅当前页挂载 video（PRD §3.7） */}
                {index === current && video.ready && !video.failed ? (
                  <Video
                    id='stage-video'
                    className='stage-video'
                    src={video.src}
                    autoplay
                    loop
                    // verbatim 模式用原片自带声轨当旁白：仅在「播放绘本」期间出声，
                    // 其余时间（含画面静音循环）一律静音（PRD §3.4）
                    muted={!(verbatimVoice && playing)}
                    controls={false}
                    showCenterPlayBtn={false}
                    // 本地参考素材已裁成 1.7:1 宽幅（剔除了原片字幕与推广横幅），
                    // 用 contain 完整显示，避免 cover 放大裁切破坏构图；Mixkit 竖幅仍用 cover
                    objectFit={video.kind === 'local' ? 'contain' : 'cover'}
                    onTimeUpdate={onVideoTime}
                    onError={onVideoError}
                  />
                ) : (
                  <View className='fallback'>
                    <View className='blob' style={{ background: p.accent }} />
                    <Text className='fb-main'>{p.emoji}</Text>
                    <Text className='fb-decor fb-decor-tl'>{p.decor[0]}</Text>
                    <Text className='fb-decor fb-decor-br'>{p.decor[1]}</Text>
                  </View>
                )}

                {index === current && video.loading && !video.ready && (
                  <View className='video-loading'>🎬 视频加载中 {video.progress}%</View>
                )}
                {index === current && video.kind === 'local' && (
                  <View className='video-loading'>
                    {verbatimVoice ? '🧪 原版素材 · 原声朗读（本地）' : '🧪 原版参考素材（本地）'}
                  </View>
                )}
                {/* 开发期提示：本页配了本地素材但媒体服务器不可达 */}
                {index === current && video.kind !== 'local' && p.local && (
                  <View className='video-loading video-hint'>⚠ 本地素材未连接：电脑跑 serve:media，真机需同一 Wi-Fi</View>
                )}

              </View>

              {/* 双语字幕：独立卡片置于画面正下方，不再叠加遮挡画面（PRD §3.5） */}
              {index === current && (
                  <View className={`subs ${playing ? 'subs-breathing' : ''}`}>
                    <View className='sub-en'>
                      {visibleSentences.map(({ s, si }) => (
                        <View key={si} className={`sent ${playing && si !== sentIdx ? 'sent-dim' : ''}`}>
                          {s.words.map((w, wi) => (
                            <Text
                              key={wi}
                              className={`word ${w.g > -1 ? 'word-gloss' : ''} ${si === sentIdx && wi === wordIdx ? 'word-hot' : ''}`}
                              onClick={(e) => { e.stopPropagation(); onWordTap(w.g) }}
                            >{w.t}</Text>
                          ))}
                        </View>
                      ))}
                    </View>
                    <View className={`sub-cn ${showCn ? 'sub-cn-show' : ''}`}>{cnText}</View>
                  </View>
                )}
            </View>
          </SwiperItem>
        ))}

        {/* The End 庆祝页（PRD §3.3） */}
        <SwiperItem>
          <View className='end-page'>
            <Text className='end-emoji'>🎉</Text>
            <Text className='end-title'>The End</Text>
            <Text className='end-sub'>你读完了《{book.titleCn}》，真棒！</Text>
            <View className='end-btn end-btn-primary' hoverClass='press' onClick={() => goPage(0)}>再读一遍</View>
            <View className='end-btn end-btn-ghost' hoverClass='press-dim' onClick={closeReader}>返回书架</View>
          </View>
        </SwiperItem>
      </Swiper>

      <View className='dots'>
        {book.pages.map((_: any, index: number) => (
          <View key={index} className={`dot ${index === current ? 'dot-on' : ''}`} />
        ))}
        <View className={`dot dot-star ${current === pageCount ? 'dot-on' : ''}`}>★</View>
      </View>

      {current < pageCount && (
        <View className='controls'>
          <View className={`ctl-btn ${current === 0 ? 'ctl-disabled' : ''}`} hoverClass='press-dim' onClick={() => current > 0 && goPage(current - 1)}>上一页</View>
          <View
            className={`play-btn ${playing ? 'play-btn-on' : ''}`}
            hoverClass='press'
            onClick={togglePlay}
          >{playing ? '播放中…' : '▶ 播放绘本'}</View>
          <View className='ctl-btn' hoverClass='press-dim' onClick={() => goPage(current + 1)}>下一页</View>
        </View>
      )}

      {gloss && (
        <View className='gloss-bar card-base'>
          <View className='flex-col flex-1'>
            <Text className='gloss-word'>{gloss.word}</Text>
            <Text className='gloss-cn'>{gloss.cn}</Text>
          </View>
          <View className='gloss-play' hoverClass='press-dim' onClick={() => tts.playWord(gloss.word)}>🔊</View>
          <View className='gloss-close' hoverClass='press-dim' onClick={() => setGloss(null)}>✕</View>
        </View>
      )}
    </View>
  )
}
