# pic_bk_en_for_kid · 英语绘本馆

面向 3-8 岁儿童的英语视频绘本微信小程序：看动画 + 听女童声旁白 + 视频内双语字幕逐词高亮。

- 📄 产品需求文档：[PRD.md](PRD.md)
- 🎬 绘本选题来源（两个小红书创作者）：
  - [@阿可英语绘](https://www.xiaohongshu.com/explore/6893454d0000000025022291)「英文绘本 · 认知篇」— 认知类
  - [@快乐学英语008](https://xhslink.cn/m/9X1YJ9nPOOc)「小动物成长系列绘本动画 / 趣味英语故事」— 故事类
- ⚠️ 内容政策：只借用题材与体例，台词与画面全部原创改写，原作不搬运、不嵌入（详见 [PRD §2.2](PRD.md)）

当前进度：**V1.1** —— 3 Tab 框架完成，36 本书目已排入书架，首发《蔬菜认知篇》完整可读；
《小蚂蚁和大象》台词与语料齐备，处于「内容已就绪、暂不首发」状态（`released: false`）。

---

## 快速开始

原生微信小程序，**没有构建步骤**，开发者工具导入即跑。

```bash
# 1. 用微信开发者工具导入本仓库根目录（miniprogramRoot 已指向 miniprogram/）
# 2. 静态自查（唯一的「编译期」）
node scripts/check.mjs
```

`project.config.json` 里的 `appid` 是 `touristappid`（游客模式）。换成自己的 AppID 即可真机预览。

---

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss    入口、路由与主题令牌
├── core/                           与界面无关的引擎层
│   ├── hash.js         语料寻址契约（ttsKey，已冻结）
│   ├── cadence.js      拆句 + 逐词时间轴（音节估算）
│   ├── voice.js        女童声音源 + 两层自愈降级
│   ├── narrator.js     逐句朗读编排（裁静音 / 补停顿 / 进度回调）
│   ├── lexicon.js      字幕排版与生词标注（支持词组）
│   ├── scenery.js      8 个矢量场景模板（视频降级画面）
│   ├── filmstrip.js    视频串行预下载队列
│   ├── vault.js        本地存储：进度 / 生词本 / 统计
│   └── settings.js     运行期配置（音源地址、节奏常量）
├── content/                        绘本内容，一本一个文件
│   ├── series.js       系列元数据
│   ├── catalog.js      30 本书目 + released 上线开关
│   └── books/          已上线绘本的台词、生词、场景、视频
├── components/                     自定义组件
│   ├── book-card/      绘本卡（含「敬请期待」占位态）
│   ├── story-stage/    画面舞台：视频 / 矢量场景 / Emoji 三层
│   ├── story-caption/  视频内双语字幕
│   └── gloss-bar/      生词释义条
└── pages/
    ├── books/          绘本馆：列表 ⇄ 阅读器同页钻取
    ├── glossary/       生词本
    └── index/          我的

assets/audio/                       女童声语料（不进小程序包，走 CDN）
scripts/
├── check.mjs           静态自查
├── gen-tts.mjs         语料离线生成
└── make-icons.py       tabBar 图标生成
```

分层的意思是：`core/` 不认识绘本，`content/` 不认识渲染，`components/` 不认识音频。
加第 2 本绘本只需要动 `content/`；调朗读节奏只需要动 `core/settings.js`。

---

## 新增一本绘本

1. 在 `miniprogram/content/books/` 下按 `ant-and-elephant.js` 的形状写 6 页台词与生词。
2. 在 `content/catalog.js` 里把对应条目的 `soon(...)` 换成完整对象，`released: true`。
3. 跑 `node scripts/gen-tts.mjs` 生成新台词的女童声语料（幂等增量，已有的自动跳过）。
4. 跑 `node scripts/check.mjs`，它会校验分级规则、生词能否在台词里匹配上、语料是否齐全。

> ⚠️ **改动任何会被朗读的英文文案后必须重跑 `gen-tts.mjs`**，否则那句话没有语料，
> 只能走静默降级（字幕照走，但没有声音）。`check.mjs` 会把这种情况报出来。

---

## 语音与视频

**旁白**：全部英文语料在构建期用 `en-US-AnaNeural`（微软女童声，语速 -15%）离线生成，
提交在 `assets/audio/`，客户端按 `ttsKey(文本)` 直接拼 URL 播放。
MVP 阶段用本仓库 + jsDelivr CDN 充当「公开对象存储桶」，换自建 OSS 只改 `core/settings.js` 的 `VOICE_BASES`。

降级链的每一环都指向**同一批语料的不同镜像**，而不是退到别家 TTS ——
PRD §6 要求全应用同一女童声、不允许混音色，所以镜像全挂时宁可静默（字幕按估算节奏走完），也不换嗓子。

**视频**：每页配一段主题匹配的 Mixkit 免版权 360p 短片，串行预下载完再播，
未就绪 / 失败时退回矢量场景 + Emoji，阅读流程不被网络阻塞。

---

## 上线前必办

| # | 事项 | 说明 |
|---|---|---|
| 1 | mp 后台配置 **downloadFile 合法域名** | 加入 `assets.mixkit.co`。不配会让视频预下载在真机上**静默失败**、每页退回矢量场景，而开发者工具勾了「不校验合法域名」看不出来。（音频/视频/图片的 `src` 不受此白名单约束，只有 request/downloadFile 受约束） |
| 2 | **真机验证音视频并行** | PRD §3.4 的技术风险注记：小程序端 `<video>` 与 `InnerAudioContext` 并行播放存在音频会话抢占风险。个别机型冲突时降级为「旁白期间暂停视频画面但保留视频内字幕」。 |
| 3 | 版权自查 | 逐本核对标题 / 台词 / 画面三项。「我的 → 素材来源与授权状态」页已内置声明。 |
