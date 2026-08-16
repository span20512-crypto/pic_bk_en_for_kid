#!/usr/bin/env node
/**
 * 工程静态自查 —— 这个项目没有构建步骤，`node scripts/check.mjs` 就是唯一的
 * 「编译期」。开发者工具能报的语法错它也报，但更重要的是它检查那些**工具报不出来、
 * 只能在真机上肉眼发现**的问题：
 *
 *   · 生词写了却在台词里匹配不上 —— 字幕里既不下划线也点不开，等于白写
 *   · 台词改了但没重跑 gen-tts —— 那句话没有女童声语料，只能静默降级
 *   · 分级越界 —— Level 1 的页面混进了 14 个词的长句
 *   · 场景名拼错 —— buildScene 抛错，整页白屏
 *
 * 用法：node scripts/check.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MP = path.join(ROOT, 'miniprogram');

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.log('  ✗ ' + m); };
const section = (t) => console.log('\n' + t);

// ---------- wx / 框架全局桩 ----------
// 小程序 API 只在函数体里调用，require 阶段不会真的触发，桩到能跑通即可。
const storage = {};
globalThis.wx = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = v; },
  removeStorageSync: (k) => { delete storage[k]; },
  createInnerAudioContext: () => ({
    onCanplay() {}, onTimeUpdate() {}, onEnded() {}, onError() {},
    offCanplay() {}, offTimeUpdate() {}, offEnded() {}, offError() {},
    play() {}, stop() {}, seek() {}, destroy() {},
  }),
  downloadFile: () => ({ onProgressUpdate() {} }),
  showToast() {}, showModal() {}, request() {}, login() {},
  switchTab() {}, navigateTo() {}, navigateBack() {},
};
globalThis.getApp = () => ({ globalData: { identity: null } });

const registered = { pages: [], components: [] };
globalThis.App = () => {};
globalThis.Page = (o) => registered.pages.push(o);
globalThis.Component = (o) => registered.components.push(o);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rel = (p) => path.relative(ROOT, p);

// ---------- 1. JSON 合法性 ----------
section('[1] JSON 配置');
const appJson = (() => {
  const files = ['project.config.json', 'miniprogram/app.json', 'miniprogram/sitemap.json'];
  let parsed = null;
  for (const f of files) {
    try {
      const j = readJson(path.join(ROOT, f));
      if (f.endsWith('app.json')) parsed = j;
      ok(f);
    } catch (e) { bad(`${f} —— ${e.message}`); }
  }
  return parsed;
})();
if (!appJson) { console.log('\napp.json 解析失败，后续检查无法进行 ❌'); process.exit(1); }

// ---------- 2. 页面与组件文件完整性 ----------
section('[2] 页面 / 组件四件套');
const QUARTET = ['.js', '.json', '.wxml', '.wxss'];

function checkQuartet(base, label) {
  const missing = QUARTET.filter((ext) => !fs.existsSync(path.join(MP, base + ext)));
  if (missing.length) bad(`${label} 缺少 ${missing.join(' ')}`);
  return missing.length === 0;
}

appJson.pages.forEach((p) => { if (checkQuartet(p, p)) ok(p); });

// usingComponents 递归解析：组件也可能再引组件
const seenComponents = new Set();
function walkComponents(ownerJsonPath) {
  let json;
  try { json = readJson(ownerJsonPath); } catch (e) { return; }
  const using = json.usingComponents || {};
  Object.keys(using).forEach((tag) => {
    const target = path.normalize(path.join(path.dirname(ownerJsonPath), using[tag]));
    const base = path.relative(MP, target);
    if (seenComponents.has(base)) return;
    seenComponents.add(base);
    if (!checkQuartet(base, `组件 ${tag} (${base})`)) return;
    let cj;
    try { cj = readJson(target + '.json'); } catch (e) { bad(`组件 ${base}.json 解析失败`); return; }
    if (cj.component !== true) bad(`组件 ${base}.json 缺少 "component": true`);
    else ok(`组件 ${tag} → ${base}`);
    walkComponents(target + '.json');
  });
}
appJson.pages.forEach((p) => walkComponents(path.join(MP, p + '.json')));

// tabBar
section('[3] tabBar');
(appJson.tabBar.list || []).forEach((t) => {
  if (appJson.pages.indexOf(t.pagePath) === -1) bad(`tabBar 指向未注册页面 ${t.pagePath}`);
  [t.iconPath, t.selectedIconPath].forEach((icon) => {
    if (icon && !fs.existsSync(path.join(MP, icon))) bad(`tabBar 图标缺失 ${icon}`);
  });
});
ok(`${appJson.tabBar.list.length} 个 Tab，图标与页面指向齐全`);

// ---------- 4. require 图 ----------
section('[4] 模块解析与注册');
try {
  require(path.join(MP, 'app.js'));
  ok('app.js');
} catch (e) { bad(`app.js —— ${e.message}`); }

appJson.pages.forEach((p) => {
  const before = registered.pages.length;
  try {
    require(path.join(MP, p + '.js'));
    if (registered.pages.length > before) ok(p + '.js');
    else bad(`${p}.js 没有调用 Page()`);
  } catch (e) { bad(`${p}.js —— ${e.message}`); }
});

[...seenComponents].forEach((base) => {
  const before = registered.components.length;
  try {
    require(path.join(MP, base + '.js'));
    if (registered.components.length > before) ok(base + '.js');
    else bad(`${base}.js 没有调用 Component()`);
  } catch (e) { bad(`${base}.js —— ${e.message}`); }
});

// ---------- 5. 内容完整性 ----------
section('[5] 绘本内容');
const { bookList } = require(path.join(MP, 'content/catalog.js'));
const { seriesMeta, seriesOrder } = require(path.join(MP, 'content/series.js'));
const { splitSentences, buildWordTiming } = require(path.join(MP, 'core/cadence.js'));
const { unmatchedGlossary } = require(path.join(MP, 'core/lexicon.js'));
const { buildScene, sceneNames } = require(path.join(MP, 'core/scenery.js'));
const { ttsKey, normalize } = require(path.join(MP, 'core/hash.js'));
const settings = require(path.join(MP, 'core/settings.js'));

const released = bookList.filter((b) => b.released);
console.log(`    书目 ${bookList.length} 本（已上线 ${released.length} 本）/ 系列 ${seriesOrder.length} 个`);

bookList.length === 30
  ? ok('书目 30 本（PRD §3.2）')
  : bad(`书目 ${bookList.length} 本，PRD 规划为 30 本`);

// id 唯一
const ids = bookList.map((b) => b.id);
new Set(ids).size === ids.length ? ok('绘本 id 无重复') : bad('绘本 id 有重复');

// 每本都归属到已声明的系列
const strayed = bookList.filter((b) => !seriesMeta[b.series] || seriesOrder.indexOf(b.series) === -1);
strayed.length === 0
  ? ok('全部绘本归属于已声明的系列')
  : bad(`系列未声明：${strayed.map((b) => b.id + '→' + b.series).join(', ')}`);

/**
 * 分级规则（PRD §3.2）。
 * 「句数」只数**实义句**：Level 1 明确允许含拟声词，而 "Drip, drip!" /
 * "Oh no!" 这类感叹与拟声在语法上是独立句，按字面计数会把合规的页面误判成超标。
 * 这里把 ≤2 个词的片段视为拟声/感叹，不计入句数，但仍受词数上限约束。
 */
const LEVEL_RULES = {
  1: { maxSentences: 2, maxWords: 10 },
  2: { maxSentences: 3, maxWords: 14 },
};

released.forEach((book) => {
  const problems = [];

  if (book.pages.length !== 6) problems.push(`页数 ${book.pages.length}，应为 6`);

  book.pages.forEach((page, i) => {
    const at = `第 ${i + 1} 页`;
    const rule = LEVEL_RULES[book.level];

    if (sceneNames.indexOf(page.scene) === -1) {
      problems.push(`${at} 场景名 "${page.scene}" 不在模板库（可选：${sceneNames.join('/')}）`);
    } else {
      try {
        const src = buildScene(page.scene, page.accent);
        if (src.indexOf('data:image/svg+xml;base64,') !== 0) problems.push(`${at} 场景产出不是 data-url`);
      } catch (e) { problems.push(`${at} 场景生成失败：${e.message}`); }
    }

    if (!Array.isArray(page.decor) || page.decor.length !== 2) problems.push(`${at} decor 应为 2 个 Emoji`);
    if (!page.cn) problems.push(`${at} 缺中文台词`);
    if (!page.videoUrl) problems.push(`${at} 缺 videoUrl`);

    const sentences = splitSentences(page.en);
    const content = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length > 2);
    if (rule && content.length > rule.maxSentences) {
      problems.push(`${at} 实义句 ${content.length} 句，Level ${book.level} 上限 ${rule.maxSentences}`);
    }
    sentences.forEach((s) => {
      const n = s.split(/\s+/).filter(Boolean).length;
      if (rule && n > rule.maxWords) {
        problems.push(`${at} 单句 ${n} 词超 Level ${book.level} 上限 ${rule.maxWords}："${s}"`);
      }
    });

    const gloss = page.glossary || [];
    if (gloss.length !== 3) problems.push(`${at} 生词 ${gloss.length} 个，应为 3 个`);

    // 生词必须能在台词里找到落点，否则字幕上根本点不出来
    const timings = sentences.map(buildWordTiming);
    const missed = unmatchedGlossary(timings, gloss);
    if (missed.length) {
      problems.push(`${at} 生词在台词里匹配不到：${missed.join(', ')}（可用 match 字段指定实际词形）`);
    }
  });

  problems.length === 0
    ? ok(`《${book.titleCn}》${book.pages.length} 页，分级 / 生词 / 场景全部合规`)
    : problems.forEach((p) => bad(`《${book.titleCn}》${p}`));
});

// ---------- 6. 语料齐全度 ----------
section('[6] 女童声语料');
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
const onDisk = fs.existsSync(AUDIO_DIR)
  ? new Set(fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')))
  : new Set();

const needed = new Map();
released.forEach((book) => {
  book.pages.forEach((page) => {
    splitSentences(page.en).forEach((s) => needed.set(ttsKey(s), s));
    (page.glossary || []).forEach((g) => needed.set(ttsKey(g.word), normalize(g.word)));
  });
});

const missingAudio = [...needed.entries()].filter(([k]) => !onDisk.has(k));
console.log(`    需要 ${needed.size} 条 / 仓库内 ${onDisk.size} 条`);
missingAudio.length === 0
  ? ok('全部朗读文案都有语料')
  : missingAudio.forEach(([k, t]) => bad(`缺语料 ${k}.mp3 ← "${t}"（跑 node scripts/gen-tts.mjs）`));

const orphan = [...onDisk].filter((k) => !needed.has(k));
if (orphan.length) console.log(`    提示：${orphan.length} 条语料已无人引用（改过台词？可安全删除）`);

// ---------- 7. 节奏基准 ----------
section('[7] 节奏与配置');
settings.STORY_GAP_MS === 700
  ? ok('STORY_GAP_MS = 700（参考动画实测中位值，勿轻改）')
  : bad(`STORY_GAP_MS = ${settings.STORY_GAP_MS}，基准应为 700`);
settings.TRIM_S < settings.TAIL_S
  ? ok(`尾部裁剪 ${settings.TRIM_S}s < 实测尾静音 ${settings.TAIL_S}s（切不到人声）`)
  : bad(`TRIM_S(${settings.TRIM_S}) 不小于 TAIL_S(${settings.TAIL_S})，会切掉人声`);
settings.VOICE_BASES.length >= 2
  ? ok(`音源镜像 ${settings.VOICE_BASES.length} 个（按条降级链）`)
  : bad('音源镜像少于 2 个，按条降级无处可退');

const timing = buildWordTiming('Momo is a little ant.');
timing.tokens.length === 5 && timing.starts[0] === 0 && timing.starts[4] < 1
  ? ok('buildWordTiming 逐词时间轴正常')
  : bad('buildWordTiming 输出异常');

// ---------- 8. 样式与模板的注释闭合 ----------
// 真踩过的坑：WXSS 注释里写了带 */ 的内容会把注释提前闭合，后半句变成裸 CSS，
// 报错位置指向文件末尾，肉眼极难定位。静态一扫就出来。
section('[8] 注释闭合');
function walkFiles(dir, out = []) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkFiles(p, out);
    else if (/\.(wxss|wxml)$/.test(f)) out.push(p);
  });
  return out;
}
let commentIssues = 0;
walkFiles(MP).forEach((file) => {
  const src = fs.readFileSync(file, 'utf8');
  const isWxml = file.endsWith('.wxml');
  const open = isWxml ? '<!--' : '/*';
  const close = isWxml ? '-->' : '*/';
  let stripped = '';
  let i = 0;
  while (i < src.length) {
    const a = src.indexOf(open, i);
    if (a < 0) { stripped += src.slice(i); break; }
    stripped += src.slice(i, a);
    const b = src.indexOf(close, a + open.length);
    if (b < 0) { bad(`${rel(file)} 注释未闭合`); commentIssues++; break; }
    i = b + close.length;
  }
  if (stripped.indexOf(close) !== -1) {
    bad(`${rel(file)} 剥掉注释后仍残留 ${close} —— 注释被提前闭合`);
    commentIssues++;
  }
  if (!isWxml && /[一-龥]/.test(stripped)) {
    bad(`${rel(file)} 注释外出现中文，多半是注释泄漏成了样式`);
    commentIssues++;
  }
});
if (commentIssues === 0) ok('wxss / wxml 注释全部闭合');

// ---------- 收尾 ----------
console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项未通过 ❌`);
process.exit(failures === 0 ? 0 : 1);
