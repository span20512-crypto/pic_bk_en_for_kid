/**
 * 书目总表（PRD §3.2 / §4.2）
 *
 * V1.0 规划 36 本 × 每本 6 页，分 6 个系列。`released` 控制分批上线：
 * 未发布的书在列表里显示「敬请期待」占位卡，点不进去（PRD §3.2 上线批次）。
 *
 * 写好台词的书从 books/ 目录里逐本引入 —— 刻意一本一个文件而不是堆在一起：
 * 满编时台词加起来近四千行，单文件会变成谁都不敢动的巨石。
 *
 * `released` 与「内容是否写好」是**两件事**：有 pages 但 released=false 表示
 * 「内容已就绪、暂不首发」。内容检查（verify.js）与语料生成（gen-tts.mjs）
 * 都只看有没有 pages，不看 released —— 否则一本书下架就会把它的语料判成孤儿。
 *
 * `source` 是小红书原作标题，仅供内部选题溯源与版权自查，**不在 UI 展示**。
 */
const vegetables = require('./books/vegetables');
const antAndElephant = require('./books/ant-and-elephant');

/** 未上线占位（pages 为空，released = false） */
function soon(id, series, title, titleCn, tag, emoji, cover, level, source) {
  return {
    id, series, title, titleCn, tag, emoji, cover, level,
    released: false, source, pages: [],
  };
}

const bookList = [
  // ———— 认知启蒙 🥕（素材来源：小红书 @阿可英语绘）————
  {
    id: 'vegetables',
    series: 'basics',
    title: 'Vegetables',
    titleCn: '蔬菜认知篇',
    tag: '蔬菜认知',
    emoji: '🥕',
    cover: 'linear-gradient(135deg, #BBF7D0 0%, #FB923C 100%)',
    level: 1,
    released: true,
    source: '@阿可英语绘《vegetables 蔬菜认知篇 英文绘本》',
    pages: vegetables,
  },
  soon('fruits', 'basics', 'Fruits', '水果认知篇', '水果认知', '🍎',
    'linear-gradient(135deg, #FECACA 0%, #F87171 100%)', 1, '@阿可英语绘 认知篇系列'),
  soon('colors', 'basics', 'Colors', '颜色认知篇', '颜色认知', '🎨',
    'linear-gradient(135deg, #DDD6FE 0%, #A78BFA 100%)', 1, '@阿可英语绘 认知篇系列'),
  soon('numbers', 'basics', 'Numbers', '数字认知篇', '数字认知', '🔢',
    'linear-gradient(135deg, #BFDBFE 0%, #60A5FA 100%)', 1, '@阿可英语绘 认知篇系列'),
  soon('shapes', 'basics', 'Shapes', '形状认知篇', '形状认知', '🔷',
    'linear-gradient(135deg, #A5F3FC 0%, #22D3EE 100%)', 1, '@阿可英语绘 认知篇系列'),
  soon('farm-animals', 'basics', 'Farm Animals', '农场动物篇', '动物认知', '🐄',
    'linear-gradient(135deg, #FDE68A 0%, #FBBF24 100%)', 1, '@阿可英语绘 认知篇系列'),

  // ———— 系列一 · 小动物交朋友 🐾（素材来源：小红书 @快乐学英语008）————
  {
    id: 'ant-and-elephant',
    series: 'friends',
    title: 'The Ant and the Elephant',
    titleCn: '小蚂蚁和大象',
    tag: '伙伴互助',
    emoji: '🐜',
    cover: 'linear-gradient(135deg, #A7F3D0 0%, #34D399 100%)',
    level: 1,
    // V1.2 恢复上架，与《蔬菜认知篇》双首发：本书同时是开发期本地素材注入
    // 链路（media/ + serve-media + local.clip 分段）的验证载体
    released: true,
    source: '《小蚂蚁和大象》',
    pages: antAndElephant,
  },
  soon('wolf-new-friend', 'friends', "The Wolf's New Friend", '小狼的新朋友', '交朋友', '🐺',
    'linear-gradient(135deg, #C7D2FE 0%, #818CF8 100%)', 1, '《小狼的新朋友》'),
  soon('lamb-and-wolf', 'friends', 'The Lamb and the Little Wolf', '小羊与小狼', '友爱包容', '🐑',
    'linear-gradient(135deg, #FBCFE8 0%, #F472B6 100%)', 1, '《小羊与小狼》'),
  soon('mouse-and-lion', 'friends', 'The Mouse and the Lion', '小老鼠和狮子', '知恩图报', '🦁',
    'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 1, '《小老鼠和狮子》'),
  soon('rabbit-and-wolf', 'friends', 'The Rabbit and the Grey Wolf', '小兔子和大灰狼', '机智勇敢', '🐰',
    'linear-gradient(135deg, #E9D5FF 0%, #A78BFA 100%)', 1, '《小兔子和大灰狼》'),
  soon('duck-and-beavers', 'friends', 'The Duck and the Three Beavers', '小鸭子和三只河狸', '齐心协力', '🦆',
    'linear-gradient(135deg, #A5F3FC 0%, #22D3EE 100%)', 2, '《小鸭子和三只河狸》'),

  // ———— 系列二 · 大大的梦想 🌟 ————
  soon('ant-big-strength', 'dreams', "The Ant's Big Strength", '小蚂蚁的大力量', '团结的力量', '🐜',
    'linear-gradient(135deg, #BBF7D0 0%, #4ADE80 100%)', 1, '《小蚂蚁的大力量》'),
  soon('crocodile-dream', 'dreams', "The Crocodile's Big Dream", '小鳄鱼的大梦想', '追梦不放弃', '🐊',
    'linear-gradient(135deg, #99F6E4 0%, #14B8A6 100%)', 2, '《小鳄鱼的大梦想》'),
  soon('wolf-wanted-moon', 'dreams', 'The Wolf Who Wanted the Moon', '想要月亮的小狼', '想象力', '🌙',
    'linear-gradient(135deg, #C7D2FE 0%, #6366F1 100%)', 2, '《偷月亮的小狼》'),
  soon('bragging-caterpillar', 'dreams', 'The Bragging Caterpillar', '爱吹牛的毛毛虫', '谦虚', '🐛',
    'linear-gradient(135deg, #D9F99D 0%, #84CC16 100%)', 2, '《爱吹牛的毛毛虫》'),
  soon('wait-caterpillar', 'dreams', 'Wait, Little Caterpillar', '等一等，小毛毛虫', '耐心等待', '🦋',
    'linear-gradient(135deg, #FBCFE8 0%, #EC4899 100%)', 2, '《很没耐心的毛毛虫》（改题）'),
  soon('mouse-proved-it', 'dreams', 'The Mouse Who Proved It', '小老鼠的证明', '相信自己', '🐭',
    'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)', 2, '《小老鼠的证明》'),

  // ———— 系列三 · 好习惯养成 🪥 ————
  soon('one-more-minute', 'habits', 'One More Minute', '再睡一分钟', '早睡早起', '🐧',
    'linear-gradient(135deg, #BFDBFE 0%, #60A5FA 100%)', 1, '《再睡一分钟》'),
  soon('pig-hated-baths', 'habits', 'The Pig Who Hated Baths', '不爱洗澡的小猪', '爱干净', '🐷',
    'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)', 1, '《不爱洗澡的小猪》'),
  soon('greedy-caterpillar', 'habits', 'The Greedy Caterpillar', '贪吃的毛毛虫', '适可而止', '🍎',
    'linear-gradient(135deg, #FECACA 0%, #F87171 100%)', 1, '《贪吃的毛毛虫》（改题）'),
  soon('tummy-helpers', 'habits', 'The Tummy Helpers', '肚子里的小精灵', '好好吃饭', '🧚',
    'linear-gradient(135deg, #FDE68A 0%, #FBBF24 100%)', 2, '《肚子里的小精灵》'),
  soon('monkey-tomorrow', 'habits', 'The Monkey Waits for Tomorrow', '小猴子等明天', '不拖延', '🐵',
    'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)', 2, '《小猴子等明天》'),
  soon('who-ate-the-dark', 'habits', 'Who Ate the Dark?', '谁吃掉了黑暗', '不怕黑', '👾',
    'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)', 2, '《爱吃黑暗的小怪兽》（改题）'),

  // ———— 系列四 · 分享与善良 💝 ————
  soon('pig-yummy-pie', 'sharing', "The Pig's Yummy Pie", '小猪的美味大饼', '分享食物', '🥧',
    'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 1, '《小猪的美味大饼》'),
  soon('reaching-moon', 'sharing', 'Reaching for the Moon', '够月亮', '合作', '🌙',
    'linear-gradient(135deg, #BFDBFE 0%, #3B82F6 100%)', 1, '《月亮的味道》（改题）'),
  soon('fox-sweet-magic', 'sharing', "The Fox's Sweet Magic", '小狐狸的甜蜜魔法', '分享甜蜜', '🦊',
    'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)', 2, '《小狐狸的甜蜜魔法》'),
  soon('octopus-umbrella', 'sharing', 'The Octopus Umbrella Shop', '小章鱼的雨伞店', '助人为乐', '🐙',
    'linear-gradient(135deg, #A5F3FC 0%, #06B6D4 100%)', 2, '《小章鱼的雨伞店》'),
  soon('fox-leaf-castle', 'sharing', "The Fox's Leaf Castle", '小狐狸的叶子城堡', '邀请朋友', '🍂',
    'linear-gradient(135deg, #FDE68A 0%, #D97706 100%)', 2, '《小狐狸的叶子城堡》'),
  soon('mice-move-egg', 'sharing', 'The Mice Move an Egg', '小老鼠搬蛋记', '想办法', '🥚',
    'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)', 2, '《小老鼠搬蛋记》'),

  // ———— 系列五 · 自然小百科 🔍 ————
  soon('going-to-rain', 'nature', "It's Going to Rain!", '要下雨了！', '天气认知', '🌧️',
    'linear-gradient(135deg, #BFDBFE 0%, #64748B 100%)', 1, '《要下雨了！》'),
  soon('clever-turtle', 'nature', 'The Clever Turtle', '聪明的小乌龟', '观察思考', '🐢',
    'linear-gradient(135deg, #BBF7D0 0%, #22C55E 100%)', 1, '《聪明的小乌龟》'),
  soon('monkey-red-bottom', 'nature', "Why Monkey's Bottom Is Red", '小猴子的红屁股', '趣味科普', '🐵',
    'linear-gradient(135deg, #FECACA 0%, #EF4444 100%)', 1, '《小猴子的红屁股》'),
  soon('fox-and-grapes', 'nature', 'The Fox and the Grapes', '小狐狸和葡萄', '伊索寓言', '🍇',
    'linear-gradient(135deg, #E9D5FF 0%, #8B5CF6 100%)', 1, '《小狐狸和葡萄》'),
  soon('animal-poop', 'nature', 'Amazing Animal Poop', '神奇的动物便便', '动物科普', '💩',
    'linear-gradient(135deg, #FDE68A 0%, #A16207 100%)', 2, '《神奇的动物便便》'),
  soon('animal-meeting', 'nature', 'The Animal Kingdom Meeting', '动物王国开大会', '认识动物', '🐯',
    'linear-gradient(135deg, #FED7AA 0%, #EA580C 100%)', 2, '《动物王国开大会》'),
];

const bookById = (id) => bookList.find((b) => b.id === id) || null;

module.exports = { bookList, bookById };
