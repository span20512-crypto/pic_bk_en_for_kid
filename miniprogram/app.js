const config = require('./utils/config');
const store = require('./utils/store');

App({
  globalData: {
    session: null, // { userId, nickname, guest }
  },

  onLaunch() {
    this.login();
  },

  // LOGIN_ENDPOINT 留空则走本地游客态（PRD §1.1）
  login() {
    if (!config.LOGIN_ENDPOINT) {
      this.globalData.session = store.guestSession();
      return;
    }
    wx.login({
      success: (res) => {
        wx.request({
          url: config.LOGIN_ENDPOINT,
          method: 'POST',
          data: { code: res.code },
          success: (r) => {
            this.globalData.session = (r.data && r.data.session) || store.guestSession();
          },
          fail: () => {
            this.globalData.session = store.guestSession();
          },
        });
      },
      fail: () => {
        this.globalData.session = store.guestSession();
      },
    });
  },
});
