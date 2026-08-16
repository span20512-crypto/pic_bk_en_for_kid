# pic_bk_en_for_kid

picture book for kid in English

面向 3-8 岁儿童的英语视频绘本微信小程序：看动画 + 听女童声旁白 + 视频内双语字幕逐词高亮。

- 📄 产品需求文档：[PRD.md](PRD.md)
- 🎬 绘本选题来源：小红书 [@快乐学英语008](https://xhslink.cn/m/9X1YJ9nPOOc)「小动物成长系列绘本动画 / 趣味英语故事」
- ⚠️ 内容政策：只借用题材，台词与画面全部原创改写，原视频不搬运、不嵌入（详见 PRD §2.2）

## 当前状态（MVP）

首本绘本《The Ant and the Elephant · 小蚂蚁和大象》已可完整试读（Level 1，6 页），其余 29 本以「敬请期待」占位卡形式在列。已实现：

- 绘本馆 Tab：系列分组卡片流、吸顶系列标题、阅读进度徽章，列表 → 阅读器同页钻取
- 阅读器：Swiper 翻页 + 每页 Mixkit 免版权视频插画（串行预下载、当前页插队、失败降级矢量场景 + Emoji 拼画）
- 播放绘本：女童声旁白（en-US-AnaNeural，语速 -15%）+ 视频内双语字幕，英文逐词高亮由音频进度驱动，句间静音裁剪
- 生词查义：字幕内 3 生词/页 下划线高亮，点按发音 + 释义条，自动入生词本
- 生词本 Tab：按绘本筛选、一键复习顺序播放发音
- 我的 Tab：游客态 + 阅读统计（已读本数 / 页数 / 连续天数 / 生词数）
- 进度持久化 + The End 庆祝页 + 读完 ✓ 徽章

## 快速开始

1. 克隆本仓库，用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 导入仓库根目录（`project.config.json` 已指向 `miniprogram/`），AppID 用测试号即可
2. 详情 → 本地设置 → 勾选「不校验合法域名」（视频托管在 Mixkit、旁白 MP3 托管在 jsDelivr，尚未配置业务域名）
3. 编译即可试读《小蚂蚁和大象》

## 内容管线

- **旁白语料**：全部会被朗读的英文文案在构建期离线预生成 MP3，存于 `assets/audio/`（按 `ttsKey(text)` 散列命名），客户端经 jsDelivr 直接拼 URL 播放。新增/修改台词后必须运行：

  ```bash
  pip install edge-tts        # 首次
  node scripts/gen-tts.mjs    # 幂等增量生成（--dry 只体检不生成）
  ```

- **静态自查**：提交前运行

  ```bash
  node scripts/verify.js
  ```

  覆盖 JSON 合法性、页面四件套、require 图、绘本数据完整性（页数 / 分级句长 / 生词匹配 / ttsKey 冲突）、语料齐备性。

- **换素材**：视频与台词全部集中在 `miniprogram/pages/books/data.js`，正版授权落地后只需替换每页 `videoUrl` 与台词并重跑 gen-tts。

## 目录结构

```
├── PRD.md                     # 产品需求文档
├── project.config.json        # 开发者工具项目配置（miniprogramRoot: miniprogram/）
├── assets/audio/              # 离线预生成的女童声旁白 MP3（jsDelivr 充当公开桶）
├── scripts/
│   ├── gen-tts.mjs            # 旁白语料生成（edge-tts / en-US-AnaNeural）
│   └── verify.js              # 开发静态自查
└── miniprogram/
    ├── app.{js,json,wxss}
    ├── styles/utils.wxss      # 原子类对照表
    ├── utils/
    │   ├── config.js          # TTS 公开桶地址、播放节奏参数、登录端点
    │   ├── tts-key.js         # 语料散列键 + 拆句规则（三端共享）
    │   ├── tts.js             # 旁白播放：LRU 复用 + 按条降级 + 整站降级时间盒
    │   ├── timing.js          # 逐词高亮权重表（buildWordTiming / wordIndexAt）
    │   ├── video-preloader.js # 串行预下载队列（当前页插队）
    │   └── store.js           # 本地存储：进度 / 生词本 / 阅读统计
    └── pages/
        ├── books/             # 绘本馆（列表 + 阅读器同页钻取）+ data.js 全部绘本内容
        ├── glossary/          # 生词本
        └── index/             # 我的
```

## 上线前待办（摘自 PRD §7）

- [ ] 真机验证「静音视频 + 旁白」音频会话并行（PRD §3.4 技术风险）
- [ ] 小程序后台配置 downloadFile 合法域名（assets.mixkit.co），否则视频预下载静默失败、逐页退回降级画面
- [ ] 其余 29 本台词撰写 + 视频选配 + 语料生成
- [ ] 提审前版权自查（标题 / 台词 / 画面三项逐本核对），「关于」信息已在「我的」页脚标注素材来源
