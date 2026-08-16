/**
 * 绘本卡片（PRD §3.1）
 *
 * 两种形态共用一个组件：已上线的可点进阅读器，未上线的是「敬请期待」占位卡。
 * 做成一个组件而不是两个，是因为占位卡也要占住同样的版面高度 —— 分两个组件
 * 早晚会长出两套间距，列表滚起来就会一跳一跳。
 *
 * 点按反馈用微信原生的 hover-class，不用 WXSS 的 :active：
 * :active 对 view 的触发在真机上并不保证，官方框架给的机制就是 hover-class。
 */
Component({
  properties: {
    /** 页面备好的展示模型，见 pages/books/index.js 的 toCardModel */
    book: { type: Object, value: null },
  },

  methods: {
    onTap() {
      const book = this.data.book;
      if (!book) return;
      if (!book.released) {
        wx.showToast({ title: '这本还在准备中', icon: 'none' });
        return;
      }
      this.triggerEvent('open', { id: book.id });
    },
  },
});
