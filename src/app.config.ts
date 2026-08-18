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
      { pagePath: 'pages/books/index', text: '📚 绘本馆' },
      { pagePath: 'pages/glossary/index', text: '🔤 生词本' },
      { pagePath: 'pages/profile/index', text: '🙋 我的' },
    ],
  },
})
