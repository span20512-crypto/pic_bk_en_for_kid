#!/usr/bin/env node
/**
 * 开发期本地媒体服务器：npm run serve:media
 *
 * 把版权受限的原版参考素材（media/ 目录，已 gitignore）通过局域网 HTTP
 * 提供给开发者工具 / 真机调试，素材不进包、不进仓库、不上线（PRD §2.2）。
 *
 * - GET /ping        → 探活（客户端 utils/media.ts 用）
 * - GET /<file>      → 流式返回 media/ 下的文件，支持 Range（视频 seek 必需）
 *
 * 真机联调：手机与电脑同一 Wi-Fi 即可 —— 客户端会并发探活 config.ts 里
 * LOCAL_MEDIA_BASES 的全部候选地址，模拟器命中 127.0.0.1、真机命中局域网 IP。
 * 只有当下方打印的局域网 IP 不在候选列表里（换了网络）时才需要改配置。
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = path.join(__dirname, '..', 'media')
const PORT = Number(process.env.PORT || 8930)

const MIME = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])

  if (urlPath === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
    res.end('pong')
    return
  }

  // 防目录穿越
  const file = path.normalize(path.join(MEDIA_DIR, urlPath))
  if (!file.startsWith(MEDIA_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404)
    res.end('not found')
    return
  }

  const size = fs.statSync(file).size
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
  const range = req.headers.range

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    const start = m && m[1] ? parseInt(m[1], 10) : 0
    const end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Access-Control-Allow-Origin': '*',
    })
    fs.createReadStream(file, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    })
    fs.createReadStream(file).pipe(res)
  }
})

server.listen(PORT, () => {
  const nets = os.networkInterfaces()
  const lan = Object.values(nets).flat().filter((n) => n && n.family === 'IPv4' && !n.internal)
  console.log(`媒体服务器已启动（目录 media/）：`)
  console.log(`  http://127.0.0.1:${PORT}/          ← 开发者工具用`)
  lan.forEach((n) => console.log(`  http://${n.address}:${PORT}/     ← 真机联调用（需在 config.ts 的 LOCAL_MEDIA_BASES 里）`))
  const files = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR).filter((f) => !f.startsWith('.') && f !== 'README.md') : []
  console.log(files.length ? `可用素材: ${files.join(', ')}` : '⚠ media/ 目录为空')
})
