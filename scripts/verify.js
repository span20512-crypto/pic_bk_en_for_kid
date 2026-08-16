#!/usr/bin/env node
/**
 * 开发自查（PRD §1.1）：node scripts/verify.js
 * - JSON 合法性
 * - 页面四件套（js/json/wxml/wxss）
 * - require 图可达性
 * - 绘本数据完整性（字段、页数、分级句长、生词在台词中出现、ttsKey 无冲突）
 * - 旁白语料 MP3 是否齐备（assets/audio）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MP = path.join(ROOT, 'miniprogram');

const { ttsKey, splitSentences, normalize } = require(path.join(MP, 'utils/tts-key.js'));
const { seriesMeta, seriesOrder, bookList } = require(path.join(MP, 'pages/books/data.js'));

let errors = 0;
let warns = 0;
const err = (msg) => { errors += 1; console.error('✗ ' + msg); };
const warn = (msg) => { warns += 1; console.warn('⚠ ' + msg); };
const ok = (msg) => console.log('✓ ' + msg);

// ---- 1. JSON 合法性 ----
const jsonFiles = [
  path.join(ROOT, 'project.config.json'),
  path.join(MP, 'app.json'),
  path.join(MP, 'sitemap.json'),
];
const appJson = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));
(appJson.pages || []).forEach((p) => jsonFiles.push(path.join(MP, p + '.json')));
for (const f of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    err(`JSON 解析失败: ${path.relative(ROOT, f)} — ${e.message}`);
  }
}
ok(`JSON 合法性（${jsonFiles.length} 个文件）`);

// ---- 2. 页面四件套 ----
for (const p of appJson.pages || []) {
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
    const f = path.join(MP, p + ext);
    if (!fs.existsSync(f)) err(`页面缺文件: ${p}${ext}`);
  }
}
ok(`页面四件套（${(appJson.pages || []).length} 个页面）`);

// ---- 3. require 图 ----
function walkJs(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name);
    const st = fs.statSync(f);
    if (st.isDirectory()) walkJs(f, out);
    else if (name.endsWith('.js')) out.push(f);
  }
  return out;
}
const jsFiles = walkJs(MP, []);
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const target = path.resolve(path.dirname(f), m[1]);
    const candidates = [target, target + '.js', path.join(target, 'index.js')];
    if (!candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) {
      err(`require 不可达: ${path.relative(MP, f)} → ${m[1]}`);
    }
  }
}
ok(`require 图（${jsFiles.length} 个 js）`);

// ---- 4. 绘本数据完整性 ----
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
  });
}
ok(`绘本数据（${bookList.length} 本，其中已上线 ${bookList.filter((b) => b.released).length} 本）`);

// ---- 5. 旁白语料齐备性 ----
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
let missing = 0;
for (const [key, text] of corpus) {
  const f = path.join(AUDIO_DIR, key + '.mp3');
  if (!fs.existsSync(f) || fs.statSync(f).size === 0) {
    missing += 1;
    warn(`语料缺失: ${key}.mp3 ← "${text}"（运行 node scripts/gen-tts.mjs）`);
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
