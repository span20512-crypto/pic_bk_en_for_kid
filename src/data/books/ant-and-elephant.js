/**
 * 《小蚂蚁和大象》The Ant and the Elephant —— 故事类首本（Level 1 · 伙伴互助）
 *
 * 选题出处：小红书 @快乐学英语008《小蚂蚁和大象》（仅溯源，见 catalog.js 的 source 字段）
 * 台词为面向 3-8 岁重新编写的原创简化文本（PRD §2.2），蚂蚁莫莫 × 大象波波的互助故事。
 *
 * 本地原版参考素材：暂缺。此前 media/ 里那段视频经画面核对实为《很没耐心的毛毛虫》，
 * 已改配给 wait-caterpillar；拿到真正的《小蚂蚁和大象》原片后，放入 media/ 并给每页
 * 加 local: { file, clip: [起, 止] } 即可（参考 wait-caterpillar.js 的写法）。
 *
 * ⚠️ 改动任何 en 字段后必须重跑 `npm run gen:tts` 补语料。
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
    cn: '"快爬到我背上来吧！"波波说。他驮着莫莫过了河。',
    glossary: [
      { word: 'climb', cn: '爬' },
      { word: 'back', cn: '背；后背' },
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
      { word: 'each other', cn: '互相' },
    ],
  },
];
