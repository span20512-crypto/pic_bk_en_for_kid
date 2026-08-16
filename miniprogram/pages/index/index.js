/**
 * 我的 Tab —— 个人中心（PRD §3.8）
 *
 * 统计数字全部来自本地 vault，没有任何网络请求；游客态下也完整可用。
 *
 * 「关于与版权」不是占位菜单，它落地的是 PRD §2.2 第 4 条上线前置：
 * 小程序内必须标注素材来源与授权状态。提审前这一条会被看，所以真写上。
 */
const { bookList } = require('../../content/catalog');
const vault = require('../../core/vault');

const MENU = [
  { key: 'settings', icon: '⚙️', label: '阅读设置' },
  { key: 'report',   icon: '📊', label: '阅读报告' },
  { key: 'notice',   icon: '🔔', label: '消息通知' },
  { key: 'help',     icon: '❓', label: '帮助与反馈' },
  { key: 'invite',   icon: '👥', label: '邀请好友' },
];

const ABOUT = [
  '绘本选题来源：小红书 @快乐学英语008',
  '「小动物成长系列绘本动画 / 趣味英语故事」',
  '',
  '授权状态：选题参考，未获授权。',
  '本产品所有英文/中文台词均为面向 3-8 岁重新编写的原创简化文本，',
  '不使用原视频的旁白脚本、画面或配音；',
  '每页画面为免版权实拍短片（Mixkit）占位。',
  '',
  '如你是原作者并希望沟通授权或下架，请通过「帮助与反馈」联系我们。',
].join('\n');

Page({
  data: {
    nickName: '小读者',
    idText: '',
    isGuest: true,
    stats: { booksDone: 0, pagesRead: 0, streakDays: 0, wordCount: 0 },
    menu: MENU.map((m, i) => Object.assign({}, m, { last: i === MENU.length - 1 })),
    releasedCount: 0,
    totalCount: bookList.length,
  },

  onLoad() {
    this.setData({ releasedCount: bookList.filter((b) => b.released).length });
  },

  // 每次进 Tab 重算：阅读数据在绘本 Tab 持续变化
  onShow() {
    const identity = getApp().globalData.identity || {};
    this.setData({
      nickName: identity.nickName || '小读者',
      idText: identity.openid ? 'ID: ' + String(identity.openid).slice(-8).toUpperCase() : '',
      isGuest: identity.guest !== false,
      stats: vault.summary(bookList),
    });
  },

  onTapMenu(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'about') { this.onTapAbout(); return; }
    wx.showToast({ title: '这个功能还在做', icon: 'none' });
  },

  onTapAbout() {
    wx.showModal({
      title: '素材来源与授权状态',
      content: ABOUT,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#34D399',
    });
  },
});
