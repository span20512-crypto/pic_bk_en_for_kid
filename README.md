# pic_bk_en_for_kid

picture book for kid in English

面向 3-8 岁儿童的英语视频绘本微信小程序：看动画 + 听女童声旁白 + 视频内双语字幕逐词高亮。
**技术栈：Taro 4（React 18 + TypeScript）→ 编译到微信小程序。**

- 📄 产品需求文档：[PRD.md](PRD.md)
- 🎬 绘本选题来源：小红书 [@快乐学英语008](https://xhslink.cn/m/9X1YJ9nPOOc)「小动物成长系列绘本动画 / 趣味英语故事」
- ⚠️ 内容政策：只借用题材，台词与画面全部原创改写，原视频不搬运、不嵌入、不入库（详见 PRD §2.2）

## 当前状态（MVP · V1.1）

首本绘本《The Ant and the Elephant · 小蚂蚁和大象》完整可读（Level 1，6 页），其余 29 本「敬请期待」占位。V1.1 从原生小程序迁移到 Taro 4，功能与 V1.0 等价：

- 绘本馆：系列分组卡片流、吸顶标题、进度徽章，列表 → 阅读器同页钻取
- 阅读器：Swiper 翻页 + 每页视频插画（串行预下载 / 当前页插队 / 失败降级矢量场景）
- 播放绘本：女童声旁白（en-US-AnaNeural -15%）+ 视频内双语字幕，逐词高亮由音频进度驱动
- 生词查义 + 生词本（筛选 / 一键复习）+ 阅读统计
- **开发期本地素材注入**：原版参考素材放 `media/`（gitignore），经 `npm run serve:media` 局域网提供，客户端探活成功后阅读器按每页 `local.clip` 分段静音循环原版画面；探活失败自动回落 Mixkit 免版权占位

### 关于「Flutter 渲染引擎」

微信小程序内部由微信自身渲染（WebView / Skyline），**Flutter 无法作为微信端渲染引擎**。
Taro 4 的 Flutter 渲染引擎只服务于**鸿蒙（HarmonyOS）编译目标**——本工程已按 Taro 标准结构组织，
未来接入鸿蒙时在 `config/index.ts` 追加 harmony 配置并用 DevEco 构建即可，微信端代码零改动。

## 快速开始

```bash
npm install --legacy-peer-deps   # 安装依赖
npm run build:weapp              # 编译产物到 dist/（开发用 npm run dev:weapp 持续监听）
npm run serve:media              # 可选：启动本地媒体服务器（media/ 素材注入）
```

用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 导入**仓库根目录**（`project.config.json` 已指向 `dist/`），AppID 用测试号，
详情 → 本地设置 → 勾选「不校验合法域名」，编译即可试读。

真机联调本地素材：手机电脑同一 Wi-Fi，把 `src/utils/config.ts` 的 `LOCAL_MEDIA_BASE` 改成 serve:media 打印的局域网 IP。

## 内容管线

```bash
pip install edge-tts   # 首次
npm run gen:tts        # 旁白语料幂等增量生成（--dry 只体检）；改台词后必须重跑
npm run verify         # 静态自查：页面三件套 / 数据完整性 / 分级句长 / 语料齐备
```

- 旁白 MP3 存 `assets/audio/`（按 `ttsKey(text)` 散列命名），客户端经 jsDelivr 直接播放
- 视频与台词集中在 `src/data/books.js`，正版授权落地后只需替换每页 `videoUrl` 与台词并重跑 gen:tts

## 目录结构

```
├── PRD.md                    # 产品需求文档
├── project.config.json       # 开发者工具配置（miniprogramRoot: dist/）
├── config/index.ts           # Taro 编译配置（px 原样输出、webpack5）
├── assets/audio/             # 离线预生成女童声旁白 MP3（jsDelivr 充当公开桶）
├── media/                    # 开发期本地素材（版权内容，gitignore，仅 README 入库）
├── scripts/
│   ├── gen-tts.mjs           # 旁白语料生成（edge-tts / en-US-AnaNeural）
│   ├── serve-media.mjs       # 本地媒体服务器（/ping 探活 + Range 流式）
│   └── verify.js             # 静态自查
└── src/
    ├── app.ts / app.config.ts / app.scss
    ├── styles/utils.scss     # 原子类对照表（全局）
    ├── data/books.js         # 全部绘本内容（CJS，与 node 脚本共享）
    ├── utils/
    │   ├── config.ts         # TTS 公开桶、本地媒体地址、播放节奏参数
    │   ├── tts-key.js        # 语料散列键 + 拆句规则（客户端与脚本三端共享）
    │   ├── tts.ts            # 旁白播放：LRU + 按条降级 + 整站降级时间盒
    │   ├── timing.ts         # 逐词高亮权重表
    │   ├── video-preloader.ts# 串行预下载队列（当前页插队）
    │   ├── media.ts          # 本地媒体服务器探活
    │   ├── store.ts          # 本地存储：进度 / 生词本 / 统计
    │   └── session.ts        # 登录 / 游客态
    └── pages/
        ├── books/            # 绘本馆（列表 + 阅读器同页钻取）
        ├── glossary/         # 生词本
        └── profile/          # 我的
```

## 上线前待办（摘自 PRD §7）

- [ ] 真机验证「静音视频 + 旁白」音频会话并行（PRD §3.4 技术风险）
- [ ] 小程序后台配置 downloadFile 合法域名（assets.mixkit.co）
- [ ] 其余 29 本台词撰写 + 视频选配 + 语料生成
- [ ] 提审前版权自查；正式包**必须确认不含任何 media/ 素材与本地服务器地址依赖**
