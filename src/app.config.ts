export default defineAppConfig({
  pages: [
    'pages/books/index',
    'pages/glossary/index',
    'pages/profile/index',
  ],
  window: {
    navigationBarBackgroundColor: '#FFFDF7',
    navigationBarTitleText: '英语绘本馆',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FFFDF7',
    backgroundTextStyle: 'light',
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#34D399',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/books/index',
        text: '绘本馆',
        iconPath: 'assets/tab/shelf.png',
        selectedIconPath: 'assets/tab/shelf-on.png',
      },
      {
        pagePath: 'pages/glossary/index',
        text: '生词本',
        iconPath: 'assets/tab/words.png',
        selectedIconPath: 'assets/tab/words-on.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/me.png',
        selectedIconPath: 'assets/tab/me-on.png',
      },
    ],
  },
})
