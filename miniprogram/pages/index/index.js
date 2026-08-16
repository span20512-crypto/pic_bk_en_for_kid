const store = require('../../utils/store');
const { bookList } = require('../books/data');

const app = getApp();

Page({
  data: {
    session: { userId: '…', nickname: '游客小朋友' },
    stats: { booksDone: 0, pagesRead: 0, streak: 0, words: 0 },
    menu: [
      { icon: '⚙️', label: '阅读设置' },
      { icon: '📊', label: '阅读报告' },
      { icon: '🔔', label: '消息通知' },
      { icon: '💬', label: '帮助与反馈' },
      { icon: '🎁', label: '邀请好友' },
    ],
  },

  onShow() {
    this.setData({
      session: app.globalData.session || store.guestSession(),
      stats: store.getStats(bookList),
    });
  },

  onMenuTap() {
    // 功能菜单均为已规划（PRD §3.8）
    wx.showToast({ title: '功能规划中，敬请期待', icon: 'none' });
  },
});
