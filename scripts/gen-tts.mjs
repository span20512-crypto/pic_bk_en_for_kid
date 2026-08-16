#!/usr/bin/env node
/**
 * 女童声语料离线预生成（PRD §3.6）
 *
 * 用法：
 *   node scripts/gen-tts.mjs         # 幂等增量生成，已存在的音频自动跳过
 *   node scripts/gen-tts.mjs --dry   # 只体检不生成：列出缺失语料
 *
 * 依赖：python3 + edge-tts（pip install edge-tts）
 * 音色：en-US-AnaNeural（小女孩声），语速 -15% 适配儿童
 *
 * 新增/修改任何会被朗读的英文文案后必须重新运行本脚本。
 * MVP 阶段产物提交进仓库 assets/audio/，经 jsDelivr 充当公开桶；
 * 正式对象存储就绪后此处改为上传逻辑（注意：网关 HEAD 探测吃并发配额，
 * 体检需退避重试且并发 ≤ 2；409 Duplicate 可能被包成 HTTP 400，须连响应体一起判）。
 */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// 直接复用客户端那三个模块，不在这里抄第二份实现 ——
// 散列一旦两处不一致，生成出来的文件名客户端就拼不出来，而且静态查不出。
const { ttsKey, normalize } = require('../miniprogram/core/hash.js');
const { splitSentences } = require('../miniprogram/core/cadence.js');
const { bookList } = require('../miniprogram/content/catalog.js');

const OUT_DIR = path.join(ROOT, 'assets', 'audio');
const VOICE = 'en-US-AnaNeural';
const RATE = '-15%';
const DRY = process.argv.includes('--dry');

// ---- 收集全部会被朗读的英文语料：台词逐句 + 生词 ----
const corpus = new Map(); // key -> text
function add(text) {
  const t = normalize(text);
  if (!t) return;
  const key = ttsKey(t);
  if (corpus.has(key) && corpus.get(key) !== t) {
    console.error(`✗ ttsKey 冲突: "${corpus.get(key)}" vs "${t}"`);
    process.exit(1);
  }
  corpus.set(key, t);
}

// 按「有没有写好台词」收集，而不是按 released ——
// 一本书临时下架不该让它的语料变成孤儿、下次上架又要重新生成一遍。
for (const book of bookList) {
  if (!book.pages || book.pages.length === 0) continue;
  for (const page of book.pages) {
    splitSentences(page.en).forEach(add);
    (page.glossary || []).forEach((g) => add(g.word));
  }
}

console.log(`语料总数: ${corpus.size} 条`);

// ---- macOS python 缺证书的兜底：把 certifi 的 CA 包喂给 edge-tts ----
const certifi = spawnSync('python3', ['-m', 'certifi'], { encoding: 'utf8' });
const env = { ...process.env };
if (certifi.status === 0 && certifi.stdout.trim()) {
  env.SSL_CERT_FILE = certifi.stdout.trim();
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let skipped = 0;
let missing = 0;
let generated = 0;
let failed = 0;

for (const [key, text] of corpus) {
  const file = path.join(OUT_DIR, `${key}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    skipped += 1;
    continue;
  }
  if (DRY) {
    missing += 1;
    console.log(`缺失: ${key}.mp3  ←  "${text}"`);
    continue;
  }

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    const r = spawnSync(
      'python3',
      ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', file],
      { env, encoding: 'utf8', timeout: 60000 }
    );
    ok = r.status === 0 && fs.existsSync(file) && fs.statSync(file).size > 0;
    if (!ok) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      if (attempt < 3) {
        const wait = attempt * 2000; // 退避重试
        console.log(`  重试 ${attempt}/2（等待 ${wait}ms）: "${text}"`);
        spawnSync('sleep', [String(wait / 1000)]);
      }
    }
  }
  if (ok) {
    generated += 1;
    console.log(`✓ ${key}.mp3  "${text}"`);
  } else {
    failed += 1;
    console.error(`✗ 生成失败: "${text}"`);
  }
}

if (DRY) {
  console.log(`\n体检完成：已存在 ${skipped} 条，缺失 ${missing} 条`);
  process.exit(missing > 0 ? 1 : 0);
} else {
  console.log(`\n完成：新生成 ${generated} 条，跳过 ${skipped} 条，失败 ${failed} 条`);
  process.exit(failed > 0 ? 1 : 0);
}
