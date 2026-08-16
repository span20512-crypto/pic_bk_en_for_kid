/**
 * 《小蚂蚁和大象》The Ant and the Elephant —— V1.0 首个可读绘本
 *
 * 选题出处：小红书 @快乐学英语008《小蚂蚁和大象》🐜🐘（仅溯源，见 catalog.js 的 source 字段）
 *
 * ⚠️ 内容政策（PRD §2.2，三条硬约束都体现在本文件里）：
 *   1. 只借用题材，不搬运脚本。下面 6 页的英文/中文台词是面向 3-8 岁**重新编写**的
 *      原创简化文本，没有使用原视频的旁白脚本、画面或配音。故事骨架取自
 *      「大小悬殊的两个朋友互相搭救」这个公有母题（伊索《狮子与老鼠》一脉）。
 *   2. 画面用免版权素材占位。每页 videoUrl 是主题匹配的 Mixkit 360p 实拍短片，
 *      正版授权落地后**只需替换 videoUrl 与台词**即可切换，其余代码不动。
 *   3. 标题不撞版：The Ant and the Elephant 为通用描述性题名。
 *
 * 分级：Level 1 —— 每页 2 句、单句 ≤ 10 词、一般现在时为主、每页 3 个生词（PRD §3.2）。
 *
 * ⚠️ 改动任何 en 字段后必须重跑 `node scripts/gen-tts.mjs` 补语料，
 * 否则改动过的句子没有女童声音频，只能走静默降级。
 */

module.exports = [
  {
    emoji: '🐜',
    decor: ['🌳', '🌼'],
    scene: 'meadow',
    accent: '#22C55E',
    // Ants working near their anthill
    videoUrl: 'https://assets.mixkit.co/videos/30263/30263-360.mp4',
    en: 'Momo is a little ant. She lives under a green tree.',
    cn: '莫莫是一只小蚂蚁。她住在一棵绿绿的大树下。',
    glossary: [
      { word: 'ant', cn: '蚂蚁' },
      { word: 'little', cn: '小的' },
      { word: 'tree', cn: '树' },
    ],
  },
  {
    emoji: '🐘',
    decor: ['💦', '☀️'],
    scene: 'river',
    accent: '#38BDF8',
    // Elephant drinking from a lake
    videoUrl: 'https://assets.mixkit.co/videos/11088/11088-360.mp4',
    en: 'Bobo is a big elephant. He plays in the river every day.',
    cn: '波波是一头大象。他每天都在小河里玩水。',
    glossary: [
      { word: 'elephant', cn: '大象' },
      { word: 'big', cn: '大的' },
      { word: 'river', cn: '小河' },
    ],
  },
  {
    emoji: '🌧️',
    decor: ['🐜', '💧'],
    scene: 'rain',
    accent: '#64748B',
    // Rain falling on the water of a lake
    videoUrl: 'https://assets.mixkit.co/videos/47948/47948-360.mp4',
    en: 'Drip, drip! Rain falls down. Momo cannot cross the big river.',
    cn: '滴答，滴答！下雨啦。莫莫过不了大河了。',
    glossary: [
      { word: 'rain', cn: '雨' },
      { word: 'cross', cn: '渡过；穿过' },
      { word: 'cannot', cn: '不能' },
    ],
  },
  {
    emoji: '🐘',
    decor: ['🐜', '🌈'],
    scene: 'river',
    accent: '#2DD4BF',
    // Elephants walking on the savanna
    videoUrl: 'https://assets.mixkit.co/videos/11062/11062-360.mp4',
    en: 'Come and climb on my back, says Bobo. He carries Momo across the river.',
    cn: '“快爬到我背上来吧！”波波说。他驮着莫莫过了河。',
    glossary: [
      { word: 'climb', cn: '爬' },
      { word: 'back', cn: '背；后背' },
      // match：台词里是变形 carries，释义仍按原形展示
      { word: 'carry', cn: '驮着；搬运', match: 'carries' },
    ],
  },
  {
    emoji: '🐜',
    decor: ['🐘', '🍃'],
    scene: 'forest',
    accent: '#A16207',
    // Ants at the entrance of an anthill
    videoUrl: 'https://assets.mixkit.co/videos/7421/7421-360.mp4',
    en: 'Oh no! Bobo is stuck in the mud. Momo calls all her ant friends.',
    cn: '哎呀！波波陷进泥巴里了。莫莫叫来了她所有的蚂蚁朋友。',
    glossary: [
      { word: 'stuck', cn: '陷住了' },
      { word: 'mud', cn: '泥巴' },
      { word: 'friend', cn: '朋友', match: 'friends' },
    ],
  },
  {
    emoji: '🐘',
    decor: ['🐜', '🌈'],
    scene: 'meadow',
    accent: '#FF8C42',
    // Elephants grazing in the wild
    videoUrl: 'https://assets.mixkit.co/videos/11059/11059-360.mp4',
    en: 'Push, push! The ants help Bobo out. Friends always help each other.',
    cn: '推呀，推呀！蚂蚁们把波波推了出来。好朋友总是互相帮助。',
    glossary: [
      { word: 'push', cn: '推' },
      { word: 'help', cn: '帮助' },
      // 词组生词：字幕里要连着两个词一起下划线、一起可点
      { word: 'each other', cn: '互相' },
    ],
  },
];
