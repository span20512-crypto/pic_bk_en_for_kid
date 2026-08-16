/**
 * 系列元数据（PRD §3.2 / §4.1）
 *
 * 绘本列表按系列分组，每组一个吸顶标题行。seriesOrder 决定分组的展示顺序，
 * 与 PRD 的「系列一 … 系列五」一致；catalog 里书的先后决定组内顺序。
 */

const seriesMeta = {
  // 认知篇：句式高度重复、只换名词与形容词，是最低门槛的入门系列，所以排在最前
  basics:  { title: '认知启蒙',     subtitle: '一页认识一样新东西', emoji: '🥕' },
  friends: { title: '小动物交朋友', subtitle: '和小伙伴互相帮助',   emoji: '🐾' },
  dreams:  { title: '大大的梦想',   subtitle: '小身体里的大梦想',   emoji: '🌟' },
  habits:  { title: '好习惯养成',   subtitle: '一起养成好习惯',     emoji: '🪥' },
  sharing: { title: '分享与善良',   subtitle: '分享让快乐加倍',     emoji: '💝' },
  nature:  { title: '自然小百科',   subtitle: '大自然的小秘密',     emoji: '🔍' },
};

const seriesOrder = ['basics', 'friends', 'dreams', 'habits', 'sharing', 'nature'];

module.exports = { seriesMeta, seriesOrder };
