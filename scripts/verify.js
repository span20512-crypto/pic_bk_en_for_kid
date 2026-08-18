#!/usr/bin/env node
/**
 * 开发自查（PRD §1.1）：node scripts/verify.js
 * Taro 结构版：
 * - 页面三件套（index.tsx / index.config.ts / index.scss）
 * - 绘本数据完整性（字段、页数、分级句长、生词匹配、本地分段合法性、ttsKey 冲突）
 * - 旁白语料 MP3 齐备性（assets/audio）
 * （JS/TS 语法与模块图交由 taro build 的 webpack 编译兜底）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const { ttsKey, splitSentences, normalize } = require(path.join(SRC, 'utils/tts-key.js'));
const { seriesMeta, seriesOrder, bookList } = require(path.join(SRC, 'data/books.js'));

let errors = 0;
let warns = 0;
const err = (msg) => { errors += 1; console.error('✗ ' + msg); };
const warn = (msg) => { warns += 1; console.warn('⚠ ' + msg); };
const ok = (msg) => console.log('✓ ' + msg);

// ---- 1. 页面三件套 ----
const PAGES = ['pages/books', 'pages/glossary', 'pages/profile'];
for (const p of PAGES) {
  for (const f of ['index.tsx', 'index.config.ts', 'index.scss']) {
    if (!fs.existsSync(path.join(SRC, p, f))) err(`页面缺文件: ${p}/${f}`);
  }
}
ok(`页面三件套（${PAGES.length} 个页面）`);

// ---- 2. 绘本数据完整性 ----
const REQUIRED_BOOK = ['id', 'series', 'title', 'titleCn', 'tag', 'emoji', 'cover', 'level', 'source'];
const REQUIRED_PAGE = ['emoji', 'decor', 'scene', 'accent', 'en', 'cn', 'glossary'];
const SCENES = ['forest', 'meadow', 'river', 'burrow', 'night', 'rain', 'snow', 'seaside'];
const ids = new Set();
const corpus = new Map();

function addCorpus(text, where) {
  const t = normalize(text);
  const key = ttsKey(t);
  if (corpus.has(key) && corpus.get(key) !== t) {
    err(`ttsKey 冲突 (${where}): "${corpus.get(key)}" vs "${t}"`);
  }
  corpus.set(key, t);
}

for (const b of bookList) {
  const tag = `[${b.id || '?'}]`;
  for (const k of REQUIRED_BOOK) {
    if (b[k] === undefined || b[k] === '') err(`${tag} 缺字段 ${k}`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id || '')) err(`${tag} id 不是 kebab-case`);
  if (ids.has(b.id)) err(`${tag} id 重复`);
  ids.add(b.id);
  if (!seriesMeta[b.series]) err(`${tag} series 无效: ${b.series}`);
  if (b.level !== 1 && b.level !== 2) err(`${tag} level 必须是 1 或 2`);
  if (typeof b.released !== 'boolean') err(`${tag} released 必须是 boolean`);

  if (!b.released) continue;
  if (!Array.isArray(b.pages) || b.pages.length !== 6) {
    err(`${tag} 已上线绘本必须恰好 6 页，当前 ${b.pages ? b.pages.length : 0}`);
    continue;
  }

  b.pages.forEach((p, pi) => {
    const ptag = `${tag} 第${pi + 1}页`;
    for (const k of REQUIRED_PAGE) {
      if (p[k] === undefined || p[k] === '') err(`${ptag} 缺字段 ${k}`);
    }
    if (!Array.isArray(p.decor) || p.decor.length !== 2) err(`${ptag} decor 必须是 2 个 Emoji`);
    if (SCENES.indexOf(p.scene) < 0) err(`${ptag} scene 无效: ${p.scene}`);
    if (!Array.isArray(p.glossary) || p.glossary.length !== 3) {
      err(`${ptag} 生词必须恰好 3 个`);
    } else {
      const enLower = ' ' + p.en.toLowerCase().replace(/[^a-z']+/g, ' ') + ' ';
      p.glossary.forEach((g) => {
        if (!g.word || !g.cn) err(`${ptag} 生词缺 word/cn`);
        const needle = ' ' + (g.match || g.word).toLowerCase() + ' ';
        if (enLower.indexOf(needle) < 0) {
          err(`${ptag} 生词 "${g.word}"（匹配形 "${g.match || g.word}"）未出现在台词中`);
        }
        addCorpus(g.word, ptag);
      });
    }

    // 分级句长（PRD §3.2）：拟声/感叹短句（≤2 词）不计入句数
    const sents = splitSentences(p.en);
    const real = sents.filter((s) => s.split(/\s+/).length > 2);
    const maxSents = b.level === 1 ? 2 : 3;
    const maxWords = b.level === 1 ? 10 : 14;
    if (real.length > maxSents) err(`${ptag} Level ${b.level} 句数超限: ${real.length} > ${maxSents}`);
    sents.forEach((s) => {
      const wc = s.split(/\s+/).length;
      if (wc > maxWords) err(`${ptag} 单句词数超限（${wc} > ${maxWords}）: "${s}"`);
      addCorpus(s, ptag);
    });

    if (p.videoUrl && !/^https:\/\//.test(p.videoUrl)) err(`${ptag} videoUrl 必须是 https`);
    if (p.local) {
      if (!p.local.file || !Array.isArray(p.local.clip) || p.local.clip.length !== 2) {
        err(`${ptag} local 字段格式应为 { file, clip: [起, 止] }`);
      } else if (!(p.local.clip[0] >= 0 && p.local.clip[1] > p.local.clip[0])) {
        err(`${ptag} local.clip 分段非法: [${p.local.clip}]`);
      }
    }
  });

  // 本地分段应首尾相接不重叠（同一素材文件时）
  const clips = b.pages.filter((p) => p.local).map((p) => p.local.clip);
  for (let i = 1; i < clips.length; i++) {
    if (clips[i][0] < clips[i - 1][1] - 0.01) {
      warn(`${tag} 第${i}页与第${i + 1}页的 local.clip 有重叠`);
    }
  }
}
ok(`绘本数据（${bookList.length} 本，其中已上线 ${bookList.filter((b) => b.released).length} 本）`);

// ---- 3. 旁白语料齐备性 ----
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
let missing = 0;
for (const [key, text] of corpus) {
  const f = path.join(AUDIO_DIR, key + '.mp3');
  if (!fs.existsSync(f) || fs.statSync(f).size === 0) {
    missing += 1;
    warn(`语料缺失: ${key}.mp3 ← "${text}"（运行 npm run gen:tts）`);
  }
}
if (missing === 0) ok(`旁白语料齐备（${corpus.size} 条 MP3）`);

// ---- 汇总 ----
console.log('');
if (errors) {
  console.error(`失败：${errors} 个错误，${warns} 个警告`);
  process.exit(1);
} else {
  console.log(`通过：0 错误，${warns} 个警告`);
}
