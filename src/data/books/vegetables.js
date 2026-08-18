/**
 * 《蔬菜认知篇》Vegetables —— V1.0 首个可读绘本
 *
 * 选题出处：小红书 @阿可英语绘《vegetables 蔬菜认知篇 英文绘本》
 * （2025-08-06 发布的**图文**笔记，非视频；仅溯源，见 catalog.js 的 source 字段）
 *
 * ⚠️ 内容政策（PRD §2.2）：
 *   原笔记正文在登录墙后、每页英文写在图片里，本产品**没有也不需要**读取它 ——
 *   台词一律原创改写。这里从源素材借用的只有两样：**选题（蔬菜认知）**与
 *   **体例（每页聚焦一种蔬菜）**。画面用免版权实拍短片（Mixkit 360p）占位。
 *
 * 认知篇的写法与故事篇不同，句式刻意高度重复（This is a … / It is …），
 * 让 3-8 岁的孩子在换词不换句的节奏里把句型坐实，只有名词和形容词在变。
 * 每页第 2 句给一条可感知的线索（形状、颜色、味道、长在哪儿），
 * 不是干巴巴地报名字。
 *
 * 分级：Level 1 —— 每页 2 句、单句 ≤ 10 词、一般现在时、每页 3 个生词（PRD §3.2）。
 *
 * ⚠️ 改动任何 en 字段后必须重跑 `node scripts/gen-tts.mjs` 补语料。
 */

module.exports = [
  {
    emoji: '🥕',
    decor: ['🌱', '☀️'],
    scene: 'garden',
    accent: '#FB923C',
    // Hands harvesting wild carrots
    videoUrl: 'https://assets.mixkit.co/videos/6800/6800-360.mp4',
    en: 'This is a carrot. It is long and orange.',
    cn: '这是一根胡萝卜。它又长又橙。',
    glossary: [
      { word: 'carrot', cn: '胡萝卜' },
      { word: 'long', cn: '长的' },
      { word: 'orange', cn: '橙色的' },
    ],
  },
  {
    emoji: '🍅',
    decor: ['🥗', '✨'],
    scene: 'kitchen',
    accent: '#EF4444',
    // Tomatoes falling through water
    videoUrl: 'https://assets.mixkit.co/videos/15939/15939-360.mp4',
    en: 'This is a tomato. It is round and red.',
    cn: '这是一个西红柿。它又圆又红。',
    glossary: [
      { word: 'tomato', cn: '西红柿' },
      { word: 'round', cn: '圆的' },
      { word: 'red', cn: '红色的' },
    ],
  },
  {
    emoji: '🥦',
    decor: ['🌳', '💚'],
    scene: 'garden',
    accent: '#22C55E',
    // Presentation of a spinning broccoli
    videoUrl: 'https://assets.mixkit.co/videos/9289/9289-360.mp4',
    en: 'This is broccoli. It looks like a little tree.',
    cn: '这是西兰花。它看起来像一棵小树。',
    glossary: [
      { word: 'broccoli', cn: '西兰花' },
      { word: 'looks', cn: '看起来' },
      { word: 'tree', cn: '树' },
    ],
  },
  {
    emoji: '🌽',
    decor: ['🌾', '☀️'],
    scene: 'field',
    accent: '#FBBF24',
    // Corn growing in a field
    videoUrl: 'https://assets.mixkit.co/videos/15385/15385-360.mp4',
    en: 'This is corn. It is yellow and very sweet.',
    cn: '这是玉米。它黄黄的，非常甜。',
    glossary: [
      { word: 'corn', cn: '玉米' },
      { word: 'yellow', cn: '黄色的' },
      { word: 'sweet', cn: '甜的' },
    ],
  },
  {
    emoji: '🥔',
    decor: ['🌱', '🤎'],
    // 土层剖面：这一页讲「长在地下」，burrow 模板的地表 + 土层结构正好对上
    scene: 'burrow',
    accent: '#A16207',
    // Harvesting potato crops
    videoUrl: 'https://assets.mixkit.co/videos/22656/22656-360.mp4',
    en: 'This is a potato. It grows under the ground.',
    cn: '这是一个土豆。它长在地下。',
    glossary: [
      { word: 'potato', cn: '土豆' },
      { word: 'grows', cn: '生长' },
      { word: 'ground', cn: '地面；泥土' },
    ],
  },
  {
    emoji: '🥗',
    decor: ['🥕', '🍅'],
    scene: 'kitchen',
    accent: '#34D399',
    // Mixing a fresh salad with oil
    videoUrl: 'https://assets.mixkit.co/videos/21529/21529-360.mp4',
    en: 'Now we make a salad. Yummy! Eat your vegetables!',
    cn: '现在我们来做一份沙拉。真好吃！要多吃蔬菜哦！',
    glossary: [
      { word: 'salad', cn: '沙拉' },
      { word: 'yummy', cn: '好吃的' },
      { word: 'vegetables', cn: '蔬菜' },
    ],
  },
];
