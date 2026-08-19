# media/ — 开发期本地素材（不进仓库）

本目录存放**版权受限的原版参考素材**（如小红书原视频），仅用于开发机本地效果比对。
整个目录已在 `.gitignore` 中排除（本 README 除外）——**这些素材不进小程序包、
不推 GitHub、不进正式环境**（PRD §2.2 内容政策）。

## 用法

1. 把素材放进本目录，文件名与 `src/data/books/` 里对应书的 `local.file` 一致。
   当前：`impatient-caterpillar.mp4`（《很没耐心的毛毛虫》原版动画，91s / 720×1280，
   配给 wait-caterpillar）；《小蚂蚁和大象》原片待补
2. 启动本地媒体服务器：`npm run serve:media`
3. 小程序启动时自动探测 `http://127.0.0.1:8930/ping`，探测成功则阅读器切换为
   原版画面（按 `src/data/books.js` 里每页 `local.clip` 分段静音循环），
   探测失败则照常走 Mixkit 免版权占位 + 降级场景
4. 真机联调：手机电脑同一 Wi-Fi，把 `src/utils/config.ts` 的 `LOCAL_MEDIA_BASE`
   改成媒体服务器打印的局域网 IP
