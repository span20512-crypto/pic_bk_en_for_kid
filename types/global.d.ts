/// <reference types="@tarojs/taro" />

declare module '*.scss'
declare module '*.png'
declare module '*.jpg'
declare module '*.svg'

declare const defineAppConfig: (config: import('@tarojs/taro').Config) => any
declare const definePageConfig: (config: import('@tarojs/taro').Config) => any
