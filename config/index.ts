import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'pic_bk_en_for_kid',
  date: '2026-8-18',
  // PRD §1.1：单位用 px，不随屏宽缩放。designWidth 与 1:1 比例 + 关闭 pxtransform 保持原始 px。
  designWidth: 375,
  deviceRatio: {
    375: 2,
    750: 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: { enable: false },
  },
  mini: {
    postcss: {
      // 保持 px 原样输出，不转换为 rpx（PRD §1.1）
      pxtransform: {
        enable: false,
      },
      cssModules: {
        enable: false,
      },
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
  },
  // 说明：Taro 4 的 Flutter 渲染引擎仅用于鸿蒙（HarmonyOS）编译目标，
  // 微信小程序端由微信自身渲染（WebView / Skyline），Flutter 不参与。
  // 未来接入鸿蒙时在此追加 harmony 配置并用 DevEco 构建。
})
