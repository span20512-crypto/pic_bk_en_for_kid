/**
 * 「英语绘本馆」小程序入口。
 *
 * 这个 App 刻意很薄：绘本内容硬编码在 content/、阅读痕迹全在本地 vault，
 * 所以启动阶段没有任何网络请求，首屏不等任何东西（PRD §6 首屏 < 1s）。
 * 全局态只有一个「身份」，而且默认是游客。
 */
const settings = require('./core/settings');
const voice = require('./core/voice');

const GUEST_KEY = 'guest_identity';

App({
  globalData: {
    /** { openid, nickName, guest: boolean }。未换取会话时是本地生成的游客身份 */
    identity: null,
  },

  onLaunch() {
    this.restoreIdentity();
  },

  /**
   * 切后台立即停掉旁白并释放音频上下文（PRD §3.4 资源清理）。
   * 放在 App 层而不是页面层：微信可能在页面 onHide 之前就把音频会话交出去，
   * 由入口统一兜底最稳妥。
   */
  onHide() {
    voice.releaseAll();
  },

  /**
   * 恢复身份：优先用本地缓存，没有就生成一个稳定的游客 id。
   * LOGIN_ENDPOINT 留空时**完全不联网** —— 游客态足以跑通阅读与个人中心统计，
   * 等接了自有后端再换成 wx.login → 后端换 openid（PRD §1.1 / §5）。
   */
  restoreIdentity() {
    try {
      const cached = wx.getStorageSync(GUEST_KEY);
      if (cached && cached.openid) {
        this.globalData.identity = cached;
        return;
      }
    } catch (e) { /* 读不出来就当没有，往下走生成流程 */ }

    if (!settings.LOGIN_ENDPOINT) {
      const guest = {
        openid: 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        nickName: '小读者',
        guest: true,
      };
      this.globalData.identity = guest;
      try { wx.setStorageSync(GUEST_KEY, guest); } catch (e) { /* noop */ }
      return;
    }

    wx.login({
      success: (res) => {
        if (!res.code) return;
        wx.request({
          url: settings.LOGIN_ENDPOINT,
          method: 'POST',
          data: { code: res.code },
          success: (r) => {
            const data = r && r.data;
            if (!data || !data.openid) return;
            const identity = { openid: data.openid, nickName: data.nickName || '小读者', guest: false };
            this.globalData.identity = identity;
            try { wx.setStorageSync(GUEST_KEY, identity); } catch (e) { /* noop */ }
          },
        });
      },
    });
  },
});
