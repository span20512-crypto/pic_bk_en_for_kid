/**
 * 《等一等，小毛毛虫》Wait, Little Caterpillar —— 故事类（Level 2 · 耐心等待）
 *
 * 选题出处：小红书 @快乐学英语008《很没耐心的毛毛虫》（仅溯源，见 catalog.js 的 source 字段）。
 * ⚠️ 改题改写（PRD §2.2）：原题与 Ross Burach《The Very Impatient Caterpillar》撞版，
 * 本书改题并重写情节 —— 毛毛虫奇奇学会等待，台词为原创简化文本，不使用原视频脚本。
 *
 * 分级：Level 2 —— 每页 2-3 句、单句 ≤ 14 词、可含并列句，每页 3 个生词（PRD §3.2）。
 *
 * local 字段：开发期本地媒体服务器上的原版参考素材（版权内容，不进包不进仓库），
 * clip: [起, 止]（秒）—— 91.2s 整片按 6 页均分，可手动微调。
 * 仅 serve-media 探活成功时启用；正式环境恒走 videoUrl 的免版权占位（PRD §2.2）。
 *
 * ⚠️ 改动任何 en 字段后必须重跑 `npm run gen:tts` 补语料。
 */

module.exports = [
  {
    emoji: '🐛',
    decor: ['🍃', '🌼'],
    scene: 'meadow',
    accent: '#84CC16',
    // Yellow caterpillar walking on a leaf
    videoUrl: 'https://assets.mixkit.co/videos/6961/6961-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [0, 15.2] },
    en: 'Kiki is a little green caterpillar. She wants to be a butterfly right now.',
    cn: '奇奇是一条绿色的小毛毛虫。她现在就想变成蝴蝶。',
    glossary: [
      { word: 'caterpillar', cn: '毛毛虫' },
      { word: 'butterfly', cn: '蝴蝶' },
      { word: 'want', cn: '想要', match: 'wants' },
    ],
  },
  {
    emoji: '🌳',
    decor: ['🐛', '❓'],
    scene: 'forest',
    accent: '#16A34A',
    // Huge trees in a large green forest
    videoUrl: 'https://assets.mixkit.co/videos/5040/5040-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [15.2, 30.4] },
    en: 'Kiki asks the big tree, when can I fly? Wait, little Kiki, says the tree.',
    cn: '奇奇问大树：我什么时候才能飞呀？大树说：等一等，小奇奇。',
    glossary: [
      { word: 'ask', cn: '问', match: 'asks' },
      { word: 'fly', cn: '飞' },
      { word: 'wait', cn: '等一等' },
    ],
  },
  {
    emoji: '🍃',
    decor: ['🐛', '☀️'],
    scene: 'meadow',
    accent: '#22C55E',
    // Sunshine through green leaves
    videoUrl: 'https://assets.mixkit.co/videos/16185/16185-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [30.4, 45.6] },
    en: 'Munch, munch! Kiki eats many green leaves. She grows bigger and bigger.',
    cn: '啊呜，啊呜！奇奇吃了好多绿叶子。她长得越来越大。',
    glossary: [
      { word: 'eat', cn: '吃', match: 'eats' },
      { word: 'leaf', cn: '叶子', match: 'leaves' },
      { word: 'grow', cn: '生长', match: 'grows' },
    ],
  },
  {
    emoji: '🌙',
    decor: ['🐛', '⭐'],
    scene: 'night',
    accent: '#6366F1',
    // Dark Starry Night
    videoUrl: 'https://assets.mixkit.co/videos/4148/4148-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [45.6, 60.8] },
    en: 'Now Kiki sleeps in a little cocoon. It is dark, but she is not afraid.',
    cn: '现在奇奇睡在一个小小的茧里。里面黑黑的，但她一点也不害怕。',
    glossary: [
      { word: 'sleep', cn: '睡觉', match: 'sleeps' },
      { word: 'cocoon', cn: '茧' },
      { word: 'dark', cn: '黑暗的' },
    ],
  },
  {
    emoji: '⏳',
    decor: ['🌳', '🍂'],
    scene: 'forest',
    accent: '#A16207',
    // Tree branches in the breeze
    videoUrl: 'https://assets.mixkit.co/videos/1188/1188-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [60.8, 76.0] },
    en: 'Kiki waits and waits inside the cocoon. One day, the cocoon opens slowly.',
    cn: '奇奇在茧里等呀等。有一天，茧慢慢地打开了。',
    glossary: [
      { word: 'inside', cn: '在…里面' },
      { word: 'open', cn: '打开', match: 'opens' },
      { word: 'slowly', cn: '慢慢地' },
    ],
  },
  {
    emoji: '🦋',
    decor: ['🌈', '🌼'],
    scene: 'meadow',
    accent: '#FF8C42',
    // Monarch butterfly takes flight
    videoUrl: 'https://assets.mixkit.co/videos/4276/4276-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [76.0, 91.1] },
    en: 'Wow! Kiki has two big beautiful wings. Now she can fly high in the sky.',
    cn: '哇！奇奇有了两只又大又美的翅膀。现在她可以在天空中高高地飞啦。',
    glossary: [
      { word: 'wing', cn: '翅膀', match: 'wings' },
      { word: 'beautiful', cn: '美丽的' },
      { word: 'sky', cn: '天空' },
    ],
  },
];
