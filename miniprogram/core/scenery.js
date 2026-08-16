/**
 * 矢量场景库（PRD §3.3「降级画面」/ §3.7「失败降级」）
 *
 * 视频没就绪或加载失败时，绘本页画面退回这里生成的多层矢量插画 + Emoji 拼画，
 * 阅读流程绝不被网络阻塞。用 SVG 而非位图有两个硬理由：
 *   · DPR 无关，任何屏幕密度下都不糊（PRD 对画面清晰度有要求）；
 *   · 体积按笔画算，8 个模板合计仍是几 KB，不占主包预算（PRD §6 主包 < 2MB）。
 *
 * ⚠️ 场景里**不放 Emoji**。SVG 内嵌 Emoji 的字体回退在 iOS / Android 微信上
 * 表现不一致（时而变成豆腐块），主体 Emoji 一律由 story-stage 组件在上层用
 * <text> 渲染。这也是为什么本文件的产出可以安全地按纯 ASCII 做 base64。
 *
 * 画布 320×250，与阅读器视频框同尺寸。底部约 70px 会被字幕条盖住，
 * 所以叙事重心都放在上 2/3，下部只铺地面。
 */

// ---------- SMIL 动效片段 ----------
const drift = (dx, dur, delay) =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} 0;0 0" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

const bob = (dy, dur, delay) =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 -${dy};0 0" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

const sway = (cx, cy, deg, dur, delay) =>
  `<animateTransform attributeName="transform" type="rotate" values="-${deg} ${cx} ${cy};${deg} ${cx} ${cy};-${deg} ${cx} ${cy}" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

const twinkle = (dur, delay) =>
  `<animate attributeName="opacity" values="0.25;1;0.25" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

const breathe = (from, to, dur, delay) =>
  `<animate attributeName="opacity" values="${from};${to};${from}" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

const drop = (fromY, toY, dur, delay) =>
  `<animateTransform attributeName="transform" type="translate" values="0 ${fromY};0 ${toY}" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="0;0.85;0" dur="${dur}s" begin="${delay || 0}s" repeatCount="indefinite"/>`;

// ---------- 通用部件 ----------
const sky = (top, bottom) =>
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
  '<rect width="320" height="250" fill="url(#sky)"/>';

const sun = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r + 12}" fill="#FDE68A" opacity="0.35">${breathe(0.22, 0.5, 4)}</circle>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#FCD34D"/>` +
  `<circle cx="${x}" cy="${y}" r="${r - 5}" fill="#FEF3C7"/>`;

const moon = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="#FDE68A" opacity="0.18">${breathe(0.12, 0.3, 5)}</circle>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#FEF3C7"/>` +
  `<circle cx="${x - r * 0.35}" cy="${y - r * 0.3}" r="${r * 0.22}" fill="#FDE68A" opacity="0.75"/>` +
  `<circle cx="${x + r * 0.3}" cy="${y + r * 0.25}" r="${r * 0.16}" fill="#FDE68A" opacity="0.6"/>`;

const cloud = (x, y, s, opacity, dx, dur, delay) =>
  `<g opacity="${opacity}">` +
  `<ellipse cx="${x}" cy="${y}" rx="${20 * s}" ry="${10 * s}" fill="#fff"/>` +
  `<circle cx="${x - 11 * s}" cy="${y - 3 * s}" r="${9 * s}" fill="#fff"/>` +
  `<circle cx="${x + 10 * s}" cy="${y - 5 * s}" r="${11 * s}" fill="#fff"/>` +
  drift(dx, dur, delay) + '</g>';

const grayCloud = (x, y, s, dx, dur, delay) =>
  `<g opacity="0.92">` +
  `<ellipse cx="${x}" cy="${y}" rx="${22 * s}" ry="${11 * s}" fill="#94A3B8"/>` +
  `<circle cx="${x - 12 * s}" cy="${y - 4 * s}" r="${9 * s}" fill="#A8B8CC"/>` +
  `<circle cx="${x + 11 * s}" cy="${y - 6 * s}" r="${12 * s}" fill="#8496AC"/>` +
  drift(dx, dur, delay) + '</g>';

/** 阔叶树：树干 + 三层树冠，整棵轻摇 */
const tree = (x, groundY, s, crown, delay) =>
  `<g>${sway(x, groundY, 1.5, 4.6, delay)}` +
  `<rect x="${x - 3.5 * s}" y="${groundY - 30 * s}" width="${7 * s}" height="${30 * s}" rx="${2 * s}" fill="#8B5E34"/>` +
  `<circle cx="${x - 9 * s}" cy="${groundY - 35 * s}" r="${11 * s}" fill="${crown}" opacity="0.85"/>` +
  `<circle cx="${x + 9 * s}" cy="${groundY - 36 * s}" r="${10 * s}" fill="${crown}" opacity="0.75"/>` +
  `<circle cx="${x}" cy="${groundY - 44 * s}" r="${12.5 * s}" fill="${crown}"/>` + '</g>';

/** 针叶树 */
const pine = (x, groundY, s, color, delay) =>
  `<g>${sway(x, groundY, 1.2, 5.2, delay)}` +
  `<rect x="${x - 2.6 * s}" y="${groundY - 9 * s}" width="${5.2 * s}" height="${10 * s}" rx="2" fill="#7C4A1E"/>` +
  `<polygon points="${x},${groundY - 50 * s} ${x - 15 * s},${groundY - 24 * s} ${x + 15 * s},${groundY - 24 * s}" fill="${color}"/>` +
  `<polygon points="${x},${groundY - 36 * s} ${x - 18 * s},${groundY - 8 * s} ${x + 18 * s},${groundY - 8 * s}" fill="${color}" opacity="0.9"/>` + '</g>';

/** 小花：细茎 + 四瓣 + 花心 */
const flower = (x, y, s, petal, delay) =>
  `<g>${sway(x, y + 7 * s, 4, 3.2, delay)}` +
  `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 7 * s}" stroke="#4D7C0F" stroke-width="${1.3 * s}"/>` +
  `<circle cx="${x - 2.6 * s}" cy="${y}" r="${2.2 * s}" fill="${petal}"/>` +
  `<circle cx="${x + 2.6 * s}" cy="${y}" r="${2.2 * s}" fill="${petal}"/>` +
  `<circle cx="${x}" cy="${y - 2.6 * s}" r="${2.2 * s}" fill="${petal}"/>` +
  `<circle cx="${x}" cy="${y + 2.6 * s}" r="${2.2 * s}" fill="${petal}"/>` +
  `<circle cx="${x}" cy="${y}" r="${1.8 * s}" fill="#FDE047"/>` + '</g>';

/** 草叶 */
const blade = (x, y, h, color) =>
  `<path d="M${x} ${y} Q${x + 4} ${y - h * 0.6} ${x + 2} ${y - h}" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.75"/>`;

/** 五角星 */
const star = (x, y, s, delay) =>
  `<polygon points="${x},${y - 4 * s} ${x + 1.2 * s},${y - 1.2 * s} ${x + 4 * s},${y - 1.2 * s} ${x + 1.8 * s},${y + 0.8 * s} ${x + 2.6 * s},${y + 3.6 * s} ${x},${y + 2 * s} ${x - 2.6 * s},${y + 3.6 * s} ${x - 1.8 * s},${y + 0.8 * s} ${x - 4 * s},${y - 1.2 * s} ${x - 1.2 * s},${y - 1.2 * s}" fill="#FEF3C7">${twinkle(2.2, delay)}</polygon>`;

/** 水面涟漪 */
const ripple = (cx, cy, rx, opacity, dur, delay) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.11}" fill="#fff" opacity="${opacity}">${breathe(opacity, opacity * 0.3, dur, delay)}</ellipse>`;

/** 蝴蝶 */
const butterfly = (x, y, s, color, delay) =>
  `<g>${bob(7, 3.8, delay)}` +
  `<path d="M${x} ${y} Q${x - 7 * s} ${y - 8 * s} ${x - 13 * s} ${y - 2 * s} Q${x - 7 * s} ${y + 5 * s} ${x} ${y}" fill="${color}"/>` +
  `<path d="M${x} ${y} Q${x + 7 * s} ${y - 8 * s} ${x + 13 * s} ${y - 2 * s} Q${x + 7 * s} ${y + 5 * s} ${x} ${y}" fill="${color}" opacity="0.72"/>` +
  `<circle cx="${x}" cy="${y}" r="${1.8 * s}" fill="#78350F"/></g>`;

// ---------- 场景模板 ----------

function meadow(accent) {
  return sky('#7DD3FC', '#E0F2FE') +
    sun(268, 42, 17) +
    cloud(72, 38, 1.1, 0.9, 14, 10, 0) +
    cloud(178, 26, 0.8, 0.7, -12, 12, 2) +
    cloud(248, 74, 0.6, 0.5, 10, 9, 4) +
    // 起伏草坡：三层由远及近
    '<ellipse cx="70" cy="170" rx="170" ry="42" fill="#A7F3D0"/>' +
    '<ellipse cx="262" cy="176" rx="160" ry="44" fill="#86EFAC"/>' +
    '<ellipse cx="160" cy="212" rx="240" ry="56" fill="#4ADE80"/>' +
    '<ellipse cx="160" cy="248" rx="230" ry="40" fill="#22C55E" opacity="0.8"/>' +
    tree(48, 168, 1.15, '#16A34A', 0) +
    tree(280, 162, 0.9, '#22C55E', 1.2) +
    butterfly(150, 96, 1, accent, 0.4) +
    butterfly(214, 122, 0.75, '#F472B6', 1.4) +
    flower(96, 196, 1.25, accent, 0.5) +
    flower(136, 212, 1, '#F472B6', 1.2) +
    flower(198, 202, 1.1, '#FB923C', 0.2) +
    flower(244, 216, 0.9, accent, 0.9) +
    blade(26, 206, 16, '#15803D') + blade(300, 202, 18, '#15803D') +
    `<circle cx="112" cy="128" r="2.4" fill="#fff" opacity="0.7">${twinkle(2.4, 0.3)}</circle>` +
    `<circle cx="236" cy="108" r="2" fill="#FEF3C7" opacity="0.7">${twinkle(2, 1.1)}</circle>`;
}

function forest(accent) {
  return sky('#D1FAE5', '#ECFDF5') +
    // 远景林线
    pine(88, 140, 0.62, '#6EE7B7', 0) +
    pine(206, 136, 0.55, '#6EE7B7', 1) +
    pine(154, 132, 0.45, '#A7F3D0', 2) +
    // 树冠间的光柱
    `<polygon points="118,0 172,0 210,150 154,150" fill="#FEF9C3" opacity="0.28">${breathe(0.16, 0.38, 4.2)}</polygon>` +
    `<polygon points="228,0 254,0 288,140 250,140" fill="#FEF9C3" opacity="0.18">${breathe(0.28, 0.1, 5, 1)}</polygon>` +
    '<ellipse cx="160" cy="196" rx="240" ry="52" fill="#34D399"/>' +
    '<ellipse cx="160" cy="232" rx="230" ry="44" fill="#10B981" opacity="0.88"/>' +
    pine(36, 200, 1.2, '#059669', 0) +
    pine(288, 194, 1.05, '#047857', 1.4) +
    // 灌木丛
    '<circle cx="112" cy="188" r="13" fill="#059669" opacity="0.8"/>' +
    '<circle cx="128" cy="193" r="10" fill="#10B981" opacity="0.8"/>' +
    // 蘑菇
    `<g><rect x="196" y="188" width="6" height="11" rx="2.4" fill="#FEF3C7"/><path d="M189 190 Q199 172 209 190 Z" fill="${accent}"/><circle cx="195" cy="184" r="1.7" fill="#fff"/><circle cx="203" cy="186" r="1.4" fill="#fff"/></g>` +
    '<g><rect x="226" y="200" width="4.6" height="8" rx="2" fill="#FEF3C7"/><path d="M221 202 Q228 189 235 202 Z" fill="#F97316"/><circle cx="227" cy="197" r="1.2" fill="#fff"/></g>' +
    blade(64, 190, 15, '#047857') + blade(262, 196, 17, '#047857') +
    `<circle cx="92" cy="70" r="2.4" fill="#FEF3C7" opacity="0.8">${twinkle(2.4, 0.3)}</circle>` +
    `<circle cx="244" cy="86" r="2" fill="#FEF3C7" opacity="0.7">${twinkle(2, 1.2)}</circle>` +
    `<circle cx="174" cy="166" r="2" fill="#fff" opacity="0.5">${twinkle(2.8, 0.8)}</circle>`;
}

function river(accent) {
  return sky('#BAE6FD', '#E0F2FE') +
    '<defs><linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#0EA5E9"/></linearGradient></defs>' +
    sun(276, 40, 14) +
    cloud(88, 32, 0.85, 0.85, 14, 11, 0) +
    cloud(198, 22, 0.6, 0.6, -10, 9, 2.5) +
    // 远岸草坡
    '<ellipse cx="160" cy="136" rx="220" ry="26" fill="#4ADE80"/>' +
    tree(104, 130, 0.72, '#16A34A', 0.6) +
    tree(216, 128, 0.62, '#22C55E', 1.4) +
    blade(150, 132, 12, '#15803D') +
    // 河面
    '<rect y="142" width="320" height="108" fill="url(#water)"/>' +
    ripple(118, 162, 46, 0.4, 3, 0) +
    ripple(236, 188, 54, 0.3, 3.6, 1) +
    ripple(74, 214, 38, 0.28, 3.2, 1.8) +
    ripple(214, 232, 44, 0.24, 3.4, 0.6) +
    // 近岸圆石
    '<ellipse cx="30" cy="228" rx="24" ry="10" fill="#94A3B8"/><ellipse cx="26" cy="223" rx="13" ry="6" fill="#CBD5E1"/>' +
    '<ellipse cx="290" cy="236" rx="27" ry="11" fill="#94A3B8"/><ellipse cx="296" cy="230" rx="14" ry="6" fill="#CBD5E1"/>' +
    // 水花气泡
    `<g><circle cx="60" cy="200" r="2.8" fill="#fff" opacity="0.5"/>${bob(11, 3.6, 0)}</g>` +
    `<g><circle cx="262" cy="206" r="2.3" fill="#fff" opacity="0.45"/>${bob(9, 4.2, 1)}</g>` +
    // 蜻蜓
    `<g>${bob(6, 3.2, 0.5)}<line x1="176" y1="104" x2="190" y2="104" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/><ellipse cx="174" cy="100" rx="6" ry="2.2" fill="#A5F3FC" opacity="0.85"/><ellipse cx="174" cy="108" rx="6" ry="2.2" fill="#A5F3FC" opacity="0.85"/><circle cx="171" cy="104" r="2.2" fill="#0EA5E9"/></g>` +
    flower(58, 130, 1.1, accent, 0.7);
}

/**
 * 蚁穴剖面 —— 为《小蚂蚁和大象》这类地下题材准备。
 * 上半仍留一线地表天光，下半是土层与隧道，视觉上不至于闷成一块褐色。
 */
function burrow(accent) {
  return sky('#FCD9A8', '#F5C88A') +
    // 地表
    '<rect y="0" width="320" height="52" fill="#BAE6FD"/>' +
    sun(272, 24, 12) +
    '<ellipse cx="160" cy="56" rx="240" ry="16" fill="#4ADE80"/>' +
    blade(64, 52, 14, '#15803D') + blade(206, 52, 16, '#15803D') +
    flower(112, 44, 0.9, accent, 0.5) +
    // 土层：三段深浅递进
    '<rect y="60" width="320" height="190" fill="#C08552"/>' +
    '<ellipse cx="160" cy="72" rx="240" ry="14" fill="#A16207" opacity="0.55"/>' +
    '<ellipse cx="80" cy="150" rx="150" ry="60" fill="#A97142" opacity="0.5"/>' +
    '<ellipse cx="250" cy="200" rx="140" ry="56" fill="#8B5E34" opacity="0.45"/>' +
    // 隧道与巢室
    '<path d="M40 72 Q66 106 44 138 Q30 168 68 196" stroke="#6B4423" stroke-width="15" fill="none" stroke-linecap="round" opacity="0.55"/>' +
    '<path d="M250 70 Q226 104 254 136 Q276 164 240 198" stroke="#6B4423" stroke-width="13" fill="none" stroke-linecap="round" opacity="0.5"/>' +
    '<path d="M68 196 Q140 214 240 198" stroke="#6B4423" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.45"/>' +
    '<ellipse cx="150" cy="140" rx="46" ry="30" fill="#6B4423" opacity="0.42"/>' +
    // 根须
    '<path d="M104 60 Q112 88 100 112 Q94 128 104 146" stroke="#7C4A1E" stroke-width="2.4" fill="none" opacity="0.6"/>' +
    '<path d="M104 92 Q92 100 84 96" stroke="#7C4A1E" stroke-width="1.6" fill="none" opacity="0.5"/>' +
    '<path d="M198 60 Q192 84 202 104" stroke="#7C4A1E" stroke-width="2" fill="none" opacity="0.5"/>' +
    // 储粮与土粒
    `<circle cx="146" cy="140" r="7" fill="${accent}" opacity="0.9"/>` +
    '<circle cx="160" cy="146" r="5" fill="#FCD34D" opacity="0.85"/>' +
    '<circle cx="152" cy="128" r="4" fill="#FDE68A" opacity="0.8"/>' +
    '<circle cx="72" cy="118" r="2.6" fill="#8B5E34" opacity="0.7"/>' +
    '<circle cx="272" cy="152" r="2.2" fill="#8B5E34" opacity="0.6"/>' +
    '<circle cx="118" cy="216" r="3" fill="#8B5E34" opacity="0.6"/>' +
    `<circle cx="196" cy="176" r="2.4" fill="#FEF3C7" opacity="0.45">${twinkle(2.6, 0.7)}</circle>`;
}

function night(accent) {
  return sky('#0F172A', '#1E3A5F') +
    moon(258, 56, 20) +
    star(40, 38, 1.2, 0.2) + star(98, 24, 0.9, 1.1) + star(152, 50, 1, 0.6) +
    star(202, 28, 0.8, 1.6) + star(70, 76, 0.7, 0.9) + star(184, 82, 0.9, 1.9) +
    `<circle cx="122" cy="66" r="1.5" fill="#FEF3C7">${twinkle(2, 0.4)}</circle>` +
    `<circle cx="224" cy="96" r="1.3" fill="#FEF3C7">${twinkle(2.4, 1.2)}</circle>` +
    `<circle cx="28" cy="92" r="1.3" fill="#FEF3C7">${twinkle(2.2, 1.8)}</circle>` +
    cloud(92, 108, 0.8, 0.12, 18, 13, 0) +
    // 山丘剪影
    '<ellipse cx="66" cy="228" rx="160" ry="52" fill="#122032"/>' +
    '<ellipse cx="264" cy="240" rx="168" ry="56" fill="#0B1622"/>' +
    blade(38, 196, 14, '#1E3A5F') + blade(286, 204, 15, '#1E3A5F') +
    // 萤火虫
    `<g>${bob(9, 5, 0)}<circle cx="108" cy="168" r="5.4" fill="${accent}" opacity="0.2"/><circle cx="108" cy="168" r="2.6" fill="${accent}">${twinkle(1.8, 0)}</circle></g>` +
    `<g>${bob(7, 4, 1)}<circle cx="196" cy="180" r="4.6" fill="#FEF3C7" opacity="0.2"/><circle cx="196" cy="180" r="2.1" fill="#FEF3C7">${twinkle(2.2, 0.5)}</circle></g>` +
    `<g>${bob(8, 4.6, 2)}<circle cx="64" cy="156" r="4.2" fill="#FEF3C7" opacity="0.18"/><circle cx="64" cy="156" r="1.9" fill="#FEF3C7">${twinkle(2, 1)}</circle></g>`;
}

function rain(accent) {
  const streak = (x, y, dur, delay) =>
    `<g><line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 15}" stroke="#7DD3FC" stroke-width="2" stroke-linecap="round"/>${drop(-32, 34, dur, delay)}</g>`;
  return sky('#CBD5E1', '#E2E8F0') +
    grayCloud(58, 30, 1.1, 12, 10, 0) +
    grayCloud(168, 20, 0.9, -10, 12, 1.5) +
    grayCloud(270, 32, 1, 10, 11, 3) +
    streak(38, 62, 1.5, 0) + streak(82, 56, 1.7, 0.5) + streak(126, 64, 1.4, 0.9) +
    streak(170, 58, 1.6, 0.2) + streak(214, 64, 1.5, 0.7) + streak(258, 58, 1.7, 1.1) +
    streak(298, 66, 1.4, 0.4) + streak(60, 104, 1.6, 1.3) + streak(196, 108, 1.5, 0.9) +
    // 被雨压暗的草地
    '<ellipse cx="160" cy="200" rx="240" ry="50" fill="#65A30D" opacity="0.8"/>' +
    '<ellipse cx="70" cy="228" rx="140" ry="36" fill="#4D7C0F" opacity="0.7"/>' +
    '<ellipse cx="266" cy="238" rx="130" ry="34" fill="#3F6212" opacity="0.6"/>' +
    tree(40, 196, 0.95, '#4D7C0F', 0.4) +
    tree(288, 190, 0.8, '#3F6212', 1.2) +
    // 水洼与涟漪
    ripple(112, 216, 32, 0.5, 2.8, 0) +
    ripple(224, 232, 38, 0.45, 3.2, 1.2) +
    `<g><circle cx="94" cy="170" r="2.3" fill="#7DD3FC"/>${drop(-24, 28, 1.8, 0.3)}</g>` +
    `<g><circle cx="230" cy="176" r="2.3" fill="#7DD3FC"/>${drop(-24, 28, 2, 1)}</g>` +
    flower(56, 206, 1, accent, 0.8);
}

function snow(accent) {
  const flake = (x, y, r, dur, delay) =>
    `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.9"/>${drop(-30, 40, dur, delay)}</g>`;
  const bareTree = (x, groundY, s, delay) =>
    `<g>${sway(x, groundY, 1.2, 5.4, delay)}` +
    `<rect x="${x - 3 * s}" y="${groundY - 34 * s}" width="${6 * s}" height="${34 * s}" rx="2" fill="#6B4423"/>` +
    `<path d="M${x} ${groundY - 26 * s} L${x - 13 * s} ${groundY - 42 * s}" stroke="#6B4423" stroke-width="${3 * s}" stroke-linecap="round"/>` +
    `<path d="M${x} ${groundY - 30 * s} L${x + 12 * s} ${groundY - 44 * s}" stroke="#6B4423" stroke-width="${2.6 * s}" stroke-linecap="round"/>` +
    `<path d="M${x} ${groundY - 36 * s} L${x - 6 * s} ${groundY - 50 * s}" stroke="#6B4423" stroke-width="${2.2 * s}" stroke-linecap="round"/>` +
    `<circle cx="${x - 13 * s}" cy="${groundY - 42 * s}" r="${2.6 * s}" fill="#fff" opacity="0.9"/>` +
    `<circle cx="${x + 12 * s}" cy="${groundY - 44 * s}" r="${2.4 * s}" fill="#fff" opacity="0.85"/></g>`;
  // 天空压深一档：雪景本身几乎全白，天空再浅就跟雪地糊成一片，山脊全看不见
  return sky('#60A5FA', '#DBEAFE') +
    cloud(80, 34, 1, 0.7, 12, 12, 0) +
    cloud(230, 26, 0.8, 0.55, -10, 14, 2) +
    // 远山雪坡：由远及近三层，越近越亮，靠明度差拉出层次
    '<polygon points="0,152 70,84 140,152" fill="#93B4E8"/>' +
    '<polygon points="210,152 268,94 320,152" fill="#9DBBEA"/>' +
    '<polygon points="96,152 178,68 260,152" fill="#BBD3F2"/>' +
    // 主峰的雪冠与背阴面
    '<polygon points="150,96 178,68 206,96" fill="#FFFFFF"/>' +
    '<polygon points="178,68 206,96 260,152 178,152" fill="#A8C4EE"/>' +
    // 雪地
    '<ellipse cx="160" cy="198" rx="240" ry="54" fill="#F8FAFC"/>' +
    '<ellipse cx="80" cy="234" rx="150" ry="40" fill="#FFFFFF"/>' +
    '<ellipse cx="268" cy="242" rx="140" ry="38" fill="#EEF2F7"/>' +
    // 雪地上的浅蓝投影，免得下半幅白成一块
    '<ellipse cx="120" cy="206" rx="52" ry="7" fill="#CBDCF0" opacity="0.55"/>' +
    '<ellipse cx="238" cy="216" rx="44" ry="6" fill="#CBDCF0" opacity="0.45"/>' +
    bareTree(40, 202, 1.25, 0) +
    bareTree(288, 196, 1.0, 1.3) +
    // 雪堆
    `<ellipse cx="196" cy="212" rx="26" ry="12" fill="#fff"/><ellipse cx="196" cy="204" rx="16" ry="9" fill="#F8FAFC"/>` +
    flake(46, 70, 3, 4, 0) + flake(104, 52, 2.4, 4.6, 0.8) + flake(158, 78, 3.2, 4.2, 1.6) +
    flake(214, 58, 2.6, 5, 0.4) + flake(268, 82, 3, 4.4, 2.2) + flake(300, 60, 2.2, 4.8, 1.2) +
    flake(76, 120, 2.6, 5.2, 2.6) + flake(240, 128, 2.2, 4.6, 1.8) +
    `<circle cx="128" cy="206" r="3" fill="${accent}" opacity="0.55"/>` +
    `<circle cx="252" cy="216" r="2.4" fill="${accent}" opacity="0.45"/>`;
}

function seaside(accent) {
  return sky('#7DD3FC', '#E0F2FE') +
    '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0EA5E9"/><stop offset="1" stop-color="#38BDF8"/></linearGradient>' +
    '<linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDE68A"/><stop offset="1" stop-color="#FCD34D"/></linearGradient></defs>' +
    sun(60, 42, 16) +
    cloud(190, 30, 0.9, 0.85, 14, 11, 0) +
    cloud(280, 58, 0.6, 0.55, -10, 9, 2.5) +
    // 海鸥
    `<g>${bob(6, 4, 0.3)}<path d="M112 62 Q120 54 128 62" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M128 62 Q136 54 144 62" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>` +
    `<g>${bob(5, 4.6, 1.2)}<path d="M206 86 Q212 80 218 86" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M218 86 Q224 80 230 86" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` +
    // 海平线抬到 104：字幕条会盖住底部约 70px，海与沙滩都往上挪才看得见
    '<rect y="104" width="320" height="66" fill="url(#sea)"/>' +
    ripple(96, 120, 44, 0.35, 3, 0) +
    ripple(228, 138, 50, 0.3, 3.6, 1) +
    ripple(150, 156, 46, 0.28, 3.2, 1.8) +
    // 浪花线
    `<path d="M0 166 Q40 158 80 166 Q120 174 160 166 Q200 158 240 166 Q280 174 320 166 L320 176 L0 176 Z" fill="#fff" opacity="0.8">${drift(-14, 6, 0)}</path>` +
    // 沙滩
    '<ellipse cx="160" cy="222" rx="250" ry="56" fill="url(#sand)"/>' +
    '<ellipse cx="60" cy="238" rx="120" ry="30" fill="#FEF3C7" opacity="0.75"/>' +
    // 贝壳与海星：贴着浪花线摆，留在字幕上沿之上
    `<g><path d="M92 196 Q102 178 112 196 Z" fill="${accent}"/><path d="M97 196 L100 183" stroke="#fff" stroke-width="1" opacity="0.75"/><path d="M102 196 L102 182" stroke="#fff" stroke-width="1" opacity="0.75"/><path d="M107 196 L104 183" stroke="#fff" stroke-width="1" opacity="0.75"/></g>` +
    '<g><polygon points="236,182 239,190 248,190 241,195 244,204 236,198 228,204 231,195 224,190 233,190" fill="#FB923C"/></g>' +
    '<circle cx="176" cy="200" r="3" fill="#fff" opacity="0.85"/>' +
    '<circle cx="270" cy="194" r="2.4" fill="#fff" opacity="0.75"/>';
}

const TEMPLATES = {
  meadow: meadow,
  forest: forest,
  river: river,
  burrow: burrow,
  night: night,
  rain: rain,
  snow: snow,
  seaside: seaside,
};

// ---------- 输出 ----------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * ASCII → base64。小程序没有 btoa，而 <image> 对 base64 data-url 的支持
 * 比 URL 编码的 SVG 稳，所以自己编一份。
 * 场景 SVG 保证纯 ASCII（Emoji 一律在上层渲染），因此不需要 UTF-8 分段。
 */
function toBase64(ascii) {
  let out = '';
  for (let i = 0; i < ascii.length; i += 3) {
    const c0 = ascii.charCodeAt(i);
    const c1 = i + 1 < ascii.length ? ascii.charCodeAt(i + 1) : 0;
    const c2 = i + 2 < ascii.length ? ascii.charCodeAt(i + 2) : 0;
    out += B64[c0 >> 2];
    out += B64[((c0 & 3) << 4) | (c1 >> 4)];
    out += i + 1 < ascii.length ? B64[((c1 & 15) << 2) | (c2 >> 6)] : '=';
    out += i + 2 < ascii.length ? B64[c2 & 63] : '=';
  }
  return out;
}

/** 可用模板名清单（content 层的 scene 字段只能取这些值） */
const sceneNames = Object.keys(TEMPLATES);

/**
 * 生成一页的场景插画（data-url）。
 * @param {string} name  模板名，见 sceneNames
 * @param {string} accent 该页主题色，用于点缀元素
 */
function buildScene(name, accent) {
  const build = TEMPLATES[name];
  if (!build) throw new Error('未知场景模板: ' + name);
  const svg = '<svg viewBox="0 0 320 250" xmlns="http://www.w3.org/2000/svg">' +
    build(accent || '#34D399') + '</svg>';
  // 非 ASCII 会让 toBase64 静默产出坏图（charCodeAt > 255 被截断），提前炸掉
  if (/[^\x00-\x7F]/.test(svg)) {
    throw new Error('场景 SVG 含非 ASCII 字符（Emoji 应由上层渲染）: ' + name);
  }
  return 'data:image/svg+xml;base64,' + toBase64(svg);
}

module.exports = { buildScene, sceneNames };
