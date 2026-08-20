# pic_bk_en_for_kid · 英语绘本馆

面向 3-8 岁儿童的英语视频绘本微信小程序：看动画 + 听女童声旁白 + 双语字幕逐词高亮。
**技术栈：Taro 4（React 18 + TypeScript）→ 编译到微信小程序（产物 `dist/`）。**

- 📄 产品需求文档：[PRD.md](PRD.md)
- 🎬 绘本选题来源（两个小红书创作者）：
  - [@阿可英语绘](https://www.xiaohongshu.com/explore/6893454d0000000025022291)「英文绘本 · 认知篇」— 认知类
  - [@快乐学英语008](https://xhslink.cn/m/9X1YJ9nPOOc)「小动物成长系列绘本动画 / 趣味英语故事」— 故事类
- ⚠️ 内容政策：只借用题材与体例，台词与画面全部原创改写，原作不搬运、不嵌入、不入库（详见 PRD §2.2）

当前进度：**V1.4** —— 3 Tab 框架完成，36 本书目已排入书架，三本可读：
《蔬菜认知篇》（Level 1 认知体例）+《小蚂蚁和大象》（Level 1 故事）+《等一等，小毛毛虫》（Level 2 首个样例）。
本地参考素材经画面核对为《很没耐心的毛毛虫》原片，配属 wait-caterpillar；语料与视频逐条验证可访问。
V1.4 起字幕移至画面正下方的独立卡片（原为叠加在画面内，会遮住画面），视频改为直接播 https 直链
——此前"预下载完成才给 src"在真机上被 downloadFile 合法域名白名单拦死，导致黑屏，详见 PRD §3.7 事故记录。

### 关于「Flutter 渲染引擎」

微信小程序内部由微信自身渲染（WebView / Skyline），**Flutter 无法作为微信端渲染引擎**。
Taro 4 的 Flutter 渲染引擎只服务于**鸿蒙（HarmonyOS）编译目标**——本工程已按 Taro 标准结构组织，
未来接入鸿蒙时在 `config/index.ts` 追加 harmony 配置并用 DevEco 构建即可，微信端代码零改动。

## 快速开始

```bash
npm install --legacy-peer-deps   # 安装依赖
npm run build:weapp              # 编译到 dist/（开发用 npm run dev:weapp 持续监听）
npm run serve:media              # 可选：本地媒体服务器（media/ 原版参考素材注入）
```

用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 导入**仓库根目录**（`project.config.json` 已指向 `dist/`），
详情 → 本地设置 → 勾选「不校验合法域名」，编译即可试读。

**开发期本地素材注入**：原版参考素材（版权内容）放 `media/`（已 gitignore，不进包不进仓库），
`npm run serve:media` 后客户端探活 `/ping` 成功即按每页 `local.clip` 分段静音循环原版画面，
失败自动回落 Mixkit 免版权占位。

**真机上通常看不到本地素材，这是正常的**：iOS 对小程序内加载明文 http + 局域网地址有 ATS 与
「本地网络」权限两道限制，同一 Wi-Fi 也多半过不去。客户端会并发探活 `LOCAL_MEDIA_BASES` 的候选
地址，2.5s 无播放进展即回落到免版权视频 —— **真机看到的就是上线后的样子**（正式包本来也不含
`media/` 素材）。换网络导致电脑 IP 变化时，把 `serve:media` 打印的新 IP 填进该数组即可。

## 目录结构

```
├── PRD.md                    # 产品需求文档
├── project.config.json       # 开发者工具配置（miniprogramRoot: dist/）
├── config/index.ts           # Taro 编译配置（px 原样输出、webpack5）
├── assets/audio/             # 离线预生成女童声旁白 MP3（jsDelivr 充当公开桶，不进包）
├── media/                    # 开发期本地素材（版权内容，gitignore，仅 README 入库）
├── scripts/
│   ├── gen-tts.mjs           # 旁白语料生成（edge-tts / en-US-AnaNeural）
│   ├── serve-media.mjs       # 本地媒体服务器（/ping 探活 + Range 流式）
│   ├── verify.js             # 静态自查（数据完整性 / 分级句长 / 语料齐备）
│   └── make-icons.py         # tabBar 图标生成
└── src/
    ├── app.ts / app.config.ts / app.scss
    ├── assets/tab/           # tabBar 图标
    ├── styles/utils.scss     # 原子类对照表（全局注入）
    ├── data/                 # 绘本内容层（CJS，与 node 脚本共享）
    │   ├── series.js         # 系列元数据（6 系列）
    │   ├── catalog.js        # 36 本书目 + released 上线开关
    │   ├── books/            # 已写台词的绘本，一本一个文件
    │   └── books.js          # 聚合出口（供页面与脚本 require）
    ├── utils/                # 引擎层（不认识具体绘本）
    │   ├── config.ts         # TTS 公开桶、本地媒体地址、播放节奏参数
    │   ├── tts-key.js        # 语料散列键 + 拆句规则（客户端与脚本共享，已冻结）
    │   ├── tts.ts            # 旁白播放：LRU + 按条降级 + 整站降级时间盒
    │   ├── timing.ts         # 逐词高亮权重表
    │   ├── video-preloader.ts# 视频串行预下载队列（当前页插队）
    │   ├── media.ts          # 本地媒体服务器探活
    │   ├── store.ts          # 本地存储：进度 / 生词本 / 统计
    │   └── session.ts        # 登录 / 游客态
    └── pages/
        ├── books/            # 绘本馆（列表 ⇄ 阅读器同页钻取）
        ├── glossary/         # 生词本
        └── profile/          # 我的
```

分层的意思是：`utils/` 不认识绘本，`data/` 不认识渲染。
加第 2 本绘本只动 `data/`；调朗读节奏只动 `utils/config.ts`。

## 新增一本绘本

1. 在 `src/data/books/` 下按 `ant-and-elephant.js` 的形状写 6 页台词与生词
2. 在 `src/data/catalog.js` 里把对应条目的 `soon(...)` 换成完整对象，`released: true`
3. `npm run gen:tts` 生成新台词语料（幂等增量，已有的自动跳过）
4. `npm run verify` 校验分级规则、生词匹配、语料齐备

> ⚠️ **改动任何会被朗读的英文文案后必须重跑 gen:tts**，否则那句话没有语料只能走静默降级。
> `released` 与「内容是否写好」是两件事：verify 与 gen:tts 只看有没有 `pages`、不看 `released`，
> 一本书临时下架不会让语料变孤儿。

## 语音与视频

**旁白**：全部英文语料构建期用 `en-US-AnaNeural`（微软女童声，语速 -15%）离线生成，
提交在 `assets/audio/`，客户端按 `ttsKey(文本)` 直接拼 URL 播放（jsDelivr 充当公开桶）。
降级链每一环指向**同一批语料的不同镜像**，不退别家 TTS —— PRD §6 要求全应用同一女童声，
镜像全挂时宁可静默（字幕按估算节奏走完），也不换嗓子。

**视频**：每页一段主题匹配的 Mixkit 免版权 360p 短片。**src 直接用 https 直链**，进页即可播；
串行预下载只作加速，下好了再换用本地临时文件。没有可用源或解码失败时退回矢量场景 + Emoji，
阅读流程不被网络阻塞。
> 别把能直链播放的资源绑在 `downloadFile` 的成功上 —— 真机的 downloadFile 受合法域名白名单
> 约束，早期"下完才给 src"的写法在真机上直接黑屏（PRD §3.7 事故记录）。

## 上线前必办

| # | 事项 | 说明 |
|---|---|---|
| 1 | mp 后台配置 **downloadFile 合法域名** | 加入 `assets.mixkit.co`。**已非阻塞**：V1.4 改直链播放后不配也有画面，配了只是预下载加速更流畅 |
| 2 | **真机验证音视频并行** | PRD §3.4 技术风险：`<video>` 与 `InnerAudioContext` 并行播放存在音频会话抢占风险，冲突机型降级为「旁白期间暂停视频画面但保留字幕」 |
| 3 | 版权自查 | 逐本核对标题 / 台词 / 画面三项；正式包**必须确认不含任何 media/ 素材与本地服务器地址依赖** |
