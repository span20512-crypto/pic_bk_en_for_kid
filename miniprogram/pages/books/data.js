/**
 * 绘本内容（PRD §3.2 / §4）
 *
 * - 台词与生词均为面向 3-8 岁重新编写的原创简化文本，不使用原视频脚本（PRD §2.2）
 * - source 字段仅作选题溯源，不在 UI 展示
 * - videoUrl 为免版权实拍短视频（Mixkit 360p）占位，正版授权后只需替换本文件
 * - glossary 条目可带 match 字段标注台词中的实际词形（如 carry → carries）
 * - 换视频 CDN / 替换正版素材只需改此文件（PRD §5）
 */

const seriesMeta = {
  friends: { title: '小动物交朋友', subtitle: '和小伙伴互相帮助', emoji: '🐾' },
  dreams:  { title: '大大的梦想',   subtitle: '小身体里的大梦想', emoji: '🌟' },
  habits:  { title: '好习惯养成',   subtitle: '一起养成好习惯',   emoji: '🪥' },
  sharing: { title: '分享与善良',   subtitle: '分享让快乐加倍',   emoji: '💝' },
  nature:  { title: '自然小百科',   subtitle: '大自然的小秘密',   emoji: '🔍' },
};

// —— MVP 首本：小蚂蚁和大象（Level 1，伙伴互助）——
const antAndElephantPages = [
  {
    emoji: '🐜',
    decor: ['🌳', '🌼'],
    scene: 'meadow',
    accent: '#22C55E',
    videoUrl: 'https://assets.mixkit.co/videos/30263/30263-360.mp4', // Ants working near their anthill
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
    videoUrl: 'https://assets.mixkit.co/videos/11088/11088-360.mp4', // Elephant drinking from a lake
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
    videoUrl: 'https://assets.mixkit.co/videos/47948/47948-360.mp4', // Rain falling on the water of a lake
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
    videoUrl: 'https://assets.mixkit.co/videos/11062/11062-360.mp4', // Elephants walking on the savanna
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
    videoUrl: 'https://assets.mixkit.co/videos/7421/7421-360.mp4', // Ants at the entrance of an anthill
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
    videoUrl: 'https://assets.mixkit.co/videos/11059/11059-360.mp4', // Elephants grazing in the wild
    en: 'Push, push! The ants help Bobo out. Friends always help each other.',
    cn: '推呀，推呀！蚂蚁们把波波推了出来。好朋友总是互相帮助。',
    glossary: [
      { word: 'push', cn: '推' },
      { word: 'help', cn: '帮助' },
      { word: 'each other', cn: '互相' },
    ],
  },
];

// 未上线绘本的占位构造器
function up(id, series, title, titleCn, tag, emoji, cover, level, source) {
  return { id, series, title, titleCn, tag, emoji, cover, level, released: false, source, pages: [] };
}

const bookList = [
  // ———— 系列一 · 小动物交朋友 🐾 ————
  {
    id: 'ant-and-elephant',
    series: 'friends',
    title: 'The Ant and the Elephant',
    titleCn: '小蚂蚁和大象',
    tag: '伙伴互助',
    emoji: '🐜',
    cover: 'linear-gradient(135deg, #A7F3D0 0%, #34D399 100%)',
    level: 1,
    released: true,
    source: '《小蚂蚁和大象》',
    pages: antAndElephantPages,
  },
  up('wolf-new-friend', 'friends', "The Wolf's New Friend", '小狼的新朋友', '交朋友', '🐺',
    'linear-gradient(135deg, #C7D2FE 0%, #818CF8 100%)', 1, '《小狼的新朋友》'),
  up('lamb-and-wolf', 'friends', 'The Lamb and the Little Wolf', '小羊与小狼', '友爱包容', '🐑',
    'linear-gradient(135deg, #FBCFE8 0%, #F472B6 100%)', 1, '《小羊与小狼》'),
  up('mouse-and-lion', 'friends', 'The Mouse and the Lion', '小老鼠和狮子', '知恩图报', '🦁',
    'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 1, '《小老鼠和狮子》'),
  up('rabbit-and-wolf', 'friends', 'The Rabbit and the Grey Wolf', '小兔子和大灰狼', '机智勇敢', '🐰',
    'linear-gradient(135deg, #E9D5FF 0%, #A78BFA 100%)', 1, '《小兔子和大灰狼》'),
  up('duck-and-beavers', 'friends', 'The Duck and the Three Beavers', '小鸭子和三只河狸', '齐心协力', '🦆',
    'linear-gradient(135deg, #A5F3FC 0%, #22D3EE 100%)', 2, '《小鸭子和三只河狸》'),

  // ———— 系列二 · 大大的梦想 🌟 ————
  up('ant-big-strength', 'dreams', "The Ant's Big Strength", '小蚂蚁的大力量', '团结的力量', '🐜',
    'linear-gradient(135deg, #BBF7D0 0%, #4ADE80 100%)', 1, '《小蚂蚁的大力量》'),
  up('crocodile-dream', 'dreams', "The Crocodile's Big Dream", '小鳄鱼的大梦想', '追梦不放弃', '🐊',
    'linear-gradient(135deg, #99F6E4 0%, #14B8A6 100%)', 2, '《小鳄鱼的大梦想》'),
  up('wolf-wanted-moon', 'dreams', 'The Wolf Who Wanted the Moon', '想要月亮的小狼', '想象力', '🌙',
    'linear-gradient(135deg, #C7D2FE 0%, #6366F1 100%)', 2, '《偷月亮的小狼》'),
  up('bragging-caterpillar', 'dreams', 'The Bragging Caterpillar', '爱吹牛的毛毛虫', '谦虚', '🐛',
    'linear-gradient(135deg, #D9F99D 0%, #84CC16 100%)', 2, '《爱吹牛的毛毛虫》'),
  up('wait-caterpillar', 'dreams', 'Wait, Little Caterpillar', '等一等，小毛毛虫', '耐心等待', '🦋',
    'linear-gradient(135deg, #FBCFE8 0%, #EC4899 100%)', 2, '《很没耐心的毛毛虫》（改题）'),
  up('mouse-proved-it', 'dreams', 'The Mouse Who Proved It', '小老鼠的证明', '相信自己', '🐭',
    'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)', 2, '《小老鼠的证明》'),

  // ———— 系列三 · 好习惯养成 🪥 ————
  up('one-more-minute', 'habits', 'One More Minute', '再睡一分钟', '早睡早起', '🐧',
    'linear-gradient(135deg, #BFDBFE 0%, #60A5FA 100%)', 1, '《再睡一分钟》'),
  up('pig-hated-baths', 'habits', 'The Pig Who Hated Baths', '不爱洗澡的小猪', '爱干净', '🐷',
    'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)', 1, '《不爱洗澡的小猪》'),
  up('greedy-caterpillar', 'habits', 'The Greedy Caterpillar', '贪吃的毛毛虫', '适可而止', '🍎',
    'linear-gradient(135deg, #FECACA 0%, #F87171 100%)', 1, '《贪吃的毛毛虫》（改题）'),
  up('tummy-helpers', 'habits', 'The Tummy Helpers', '肚子里的小精灵', '好好吃饭', '🧚',
    'linear-gradient(135deg, #FDE68A 0%, #FBBF24 100%)', 2, '《肚子里的小精灵》'),
  up('monkey-tomorrow', 'habits', 'The Monkey Waits for Tomorrow', '小猴子等明天', '不拖延', '🐵',
    'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)', 2, '《小猴子等明天》'),
  up('who-ate-the-dark', 'habits', 'Who Ate the Dark?', '谁吃掉了黑暗', '不怕黑', '👾',
    'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)', 2, '《爱吃黑暗的小怪兽》（改题）'),

  // ———— 系列四 · 分享与善良 💝 ————
  up('pig-yummy-pie', 'sharing', "The Pig's Yummy Pie", '小猪的美味大饼', '分享食物', '🥧',
    'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 1, '《小猪的美味大饼》'),
  up('reaching-moon', 'sharing', 'Reaching for the Moon', '够月亮', '合作', '🌙',
    'linear-gradient(135deg, #BFDBFE 0%, #3B82F6 100%)', 1, '《月亮的味道》（改题）'),
  up('fox-sweet-magic', 'sharing', "The Fox's Sweet Magic", '小狐狸的甜蜜魔法', '分享甜蜜', '🦊',
    'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)', 2, '《小狐狸的甜蜜魔法》'),
  up('octopus-umbrella', 'sharing', 'The Octopus Umbrella Shop', '小章鱼的雨伞店', '助人为乐', '🐙',
    'linear-gradient(135deg, #A5F3FC 0%, #06B6D4 100%)', 2, '《小章鱼的雨伞店》'),
  up('fox-leaf-castle', 'sharing', "The Fox's Leaf Castle", '小狐狸的叶子城堡', '邀请朋友', '🍂',
    'linear-gradient(135deg, #FDE68A 0%, #D97706 100%)', 2, '《小狐狸的叶子城堡》'),
  up('mice-move-egg', 'sharing', 'The Mice Move an Egg', '小老鼠搬蛋记', '想办法', '🥚',
    'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)', 2, '《小老鼠搬蛋记》'),

  // ———— 系列五 · 自然小百科 🔍 ————
  up('going-to-rain', 'nature', "It's Going to Rain!", '要下雨了！', '天气认知', '🌧️',
    'linear-gradient(135deg, #BFDBFE 0%, #64748B 100%)', 1, '《要下雨了！》'),
  up('clever-turtle', 'nature', 'The Clever Turtle', '聪明的小乌龟', '观察思考', '🐢',
    'linear-gradient(135deg, #BBF7D0 0%, #22C55E 100%)', 1, '《聪明的小乌龟》'),
  up('monkey-red-bottom', 'nature', "Why Monkey's Bottom Is Red", '小猴子的红屁股', '趣味科普', '🐵',
    'linear-gradient(135deg, #FECACA 0%, #EF4444 100%)', 1, '《小猴子的红屁股》'),
  up('fox-and-grapes', 'nature', 'The Fox and the Grapes', '小狐狸和葡萄', '伊索寓言', '🍇',
    'linear-gradient(135deg, #E9D5FF 0%, #8B5CF6 100%)', 1, '《小狐狸和葡萄》'),
  up('animal-poop', 'nature', 'Amazing Animal Poop', '神奇的动物便便', '动物科普', '💩',
    'linear-gradient(135deg, #FDE68A 0%, #A16207 100%)', 2, '《神奇的动物便便》'),
  up('animal-meeting', 'nature', 'The Animal Kingdom Meeting', '动物王国开大会', '认识动物', '🐯',
    'linear-gradient(135deg, #FED7AA 0%, #EA580C 100%)', 2, '《动物王国开大会》'),
];

const seriesOrder = ['friends', 'dreams', 'habits', 'sharing', 'nature'];

module.exports = { seriesMeta, seriesOrder, bookList };
