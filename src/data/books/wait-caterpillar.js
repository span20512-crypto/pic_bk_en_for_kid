/**
 * 《等一等，小毛毛虫》Wait, Little Caterpillar
 *
 * ⚠️⚠️ 本书处于 **verbatim（原片直录）模式** —— 与本产品其余绘本的内容政策不同 ⚠️⚠️
 *
 * en 字段是小红书 @小耀祖之快乐学英语《很没耐心的毛毛虫》原片**烧录字幕的逐字转录**，
 * 由产品负责人在知悉风险后明确决定采用（2026-08-19），用于与原片画面/原声完全对齐。
 * 这是对 PRD §2.2 第 1 条「只借用题材，不搬运脚本」的**已知例外**，并且：
 *   - 原片本身改编自 Ross Burach《The Very Impatient Caterpillar》（商业出版绘本），
 *     属双重版权风险；
 *   - 台词随本文件进入公开 GitHub 仓库与 git 历史。
 *
 * 🚫 **提审/上线前必须处理**：把本书 released 改回 false，或将 en/cn 换成原创改写
 *    （改写版本见 git 历史 commit 3c0e3ba 之前的版本），并解除 verbatim 标记。
 *    见 PRD §2.2 的 verbatim 条目与 §7 待办。
 *
 * 配套约定（由 verbatim 标记驱动，见 catalog.js）：
 *   - **不生成 TTS 语料**（scripts/gen-tts.mjs 跳过）：不把第三方脚本送进语音管线，
 *     也避免合成音频入库。朗读改由原片自带声轨承担（阅读器在本地素材模式下取消静音）。
 *   - **不做分级句长校验**（scripts/verify.js 跳过）：原片节拍不受 §3.2 Level 2 的
 *     每页 2-3 句约束。
 *   - 本地素材不可用时，播放绘本走无声降级（字幕按估算节奏走完）。
 *
 * cn 字段：原片中文字幕为机器翻译且有明显错误（"建立你的蛹并等待两周两周"
 * "他爆发得太快了重击"），照录会让孩子读到错的中文，故按英文原义重译。
 *
 * clip: [起, 止]（秒）对齐原片实际情节节拍；末页止于 87.5s，避开 88s 起的纯黑片尾。
 */

module.exports = [
  {
    emoji: '🐛',
    decor: ['🍃', '🌼'],
    scene: 'meadow',
    accent: '#84CC16',
    // Yellow caterpillar walking on a leaf
    videoUrl: 'https://assets.mixkit.co/videos/6961/6961-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [0, 9] },
    en: [
      `Once upon a time there was a very impatient caterpillar.`,
    ],
    cn: [
      `很久很久以前，有一只非常没有耐心的毛毛虫。`,
    ],
    glossary: [
      { word: 'impatient', cn: '没有耐心的' },
      { word: 'caterpillar', cn: '毛毛虫' },
      { word: 'once', cn: '曾经；从前' },
    ],
  },
  {
    emoji: '🌳',
    decor: ['🐛', '🦋'],
    scene: 'forest',
    accent: '#16A34A',
    // Huge trees in a large green forest
    videoUrl: 'https://assets.mixkit.co/videos/5040/5040-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [9, 21] },
    en: [
      `He saw other caterpillars climbing a tree.`,
      `"Hey! Where are you going?"`,
      `"We're going to become butterflies!"`,
    ],
    cn: [
      `他看到别的毛毛虫在往树上爬。`,
      `"嘿！你们要去哪儿呀？"`,
      `"我们要去变成蝴蝶啦！"`,
    ],
    glossary: [
      { word: 'climb', cn: '爬', match: 'climbing' },
      { word: 'butterfly', cn: '蝴蝶', match: 'butterflies' },
      { word: 'become', cn: '变成' },
    ],
  },
  {
    emoji: '⏳',
    decor: ['🐛', '🌳'],
    scene: 'forest',
    accent: '#A16207',
    // Tree branches in the breeze
    videoUrl: 'https://assets.mixkit.co/videos/1188/1188-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [21, 34] },
    en: [
      `"Wait for me!"`,
      `He zoomed up the tree.`,
      `"Build your chrysalis and wait two weeks."`,
      `"Two weeks?! That's WAY too long!"`,
    ],
    cn: [
      `"等等我！"`,
      `他嗖地爬上了大树。`,
      `"结好你的蛹，然后等上两个星期。"`,
      `"两个星期？！那也太久了吧！"`,
    ],
    glossary: [
      { word: 'wait', cn: '等待' },
      { word: 'chrysalis', cn: '蛹' },
      { word: 'week', cn: '星期', match: 'weeks' },
    ],
  },
  {
    emoji: '🪺',
    decor: ['🐛', '❓'],
    scene: 'forest',
    accent: '#22C55E',
    // Sunshine through green leaves
    videoUrl: 'https://assets.mixkit.co/videos/16185/16185-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [34, 52] },
    en: [
      `He wrapped himself up fast.`,
      `"How about now?"`,
      `"No! Be patient!"`,
      `But he could not wait.`,
    ],
    cn: [
      `他飞快地把自己裹了起来。`,
      `"现在好了吗？"`,
      `"还没呢！要有耐心！"`,
      `可是他就是等不及。`,
    ],
    glossary: [
      { word: 'wrap', cn: '包裹', match: 'wrapped' },
      { word: 'patient', cn: '有耐心的' },
      { word: 'fast', cn: '快速地' },
    ],
  },
  {
    emoji: '😢',
    decor: ['🍂', '🐛'],
    scene: 'meadow',
    accent: '#64748B',
    // Maple leaves in the sunshine
    videoUrl: 'https://assets.mixkit.co/videos/48110/48110-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [52, 70] },
    en: [
      `He burst out too soon.`,
      `He fell to the ground.`,
      `"Oh no! Where are my wings?!"`,
      `His friend smiled.`,
      `"Growing takes time."`,
    ],
    cn: [
      `他太早冲出来了。`,
      `他摔到了地上。`,
      `"糟糕！我的翅膀呢？！"`,
      `他的朋友笑了笑。`,
      `"长大是需要时间的。"`,
    ],
    glossary: [
      { word: 'burst', cn: '冲出；破开' },
      { word: 'wing', cn: '翅膀', match: 'wings' },
      { word: 'grow', cn: '长大；生长', match: 'growing' },
    ],
  },
  {
    emoji: '🦋',
    decor: ['🌈', '🌼'],
    scene: 'meadow',
    accent: '#FF8C42',
    // Monarch butterfly takes flight
    videoUrl: 'https://assets.mixkit.co/videos/4276/4276-360.mp4',
    local: { file: 'impatient-caterpillar.mp4', clip: [70, 87.5] },
    en: [
      `This time, he waited.`,
      `"I did it! I'm a BUTTERFLY!"`,
      `"Waiting was so worth it!"`,
    ],
    cn: [
      `这一次，他耐心地等待着。`,
      `"我做到啦！我是一只蝴蝶！"`,
      `"这样的等待太值得了！"`,
    ],
    glossary: [
      { word: 'wait', cn: '等待', match: 'waited' },
      { word: 'butterfly', cn: '蝴蝶', match: 'butterfly' },
      { word: 'worth', cn: '值得' },
    ],
  },
];
