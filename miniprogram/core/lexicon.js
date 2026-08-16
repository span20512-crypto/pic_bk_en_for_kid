/**
 * 字幕排版与生词标注（PRD §3.5「生词标记」）
 *
 * 把一页台词压平成一串带坐标的 token，供字幕组件直接渲染。
 *
 * ── 为什么在 JS 里压平，而不是在 WXML 里嵌套循环 ──────────────
 * 字幕要同时表达三件事：属于第几句（决定压暗）、是本句第几个词（决定高亮）、
 * 是不是生词（决定下划线与可点）。WXML 的模板表达式做不了「跑一遍生词匹配」，
 * 嵌套 wx:for 里再算匹配会在每次 setData 时全量重算。所以进入绘本时一次性
 * 压平成扁平数组，模板只做 si/wi 的数值比对 —— 这也让 setData 的数据量固定。
 *
 * ── 词组生词 ────────────────────────────────────────
 * 生词可以是词组（如 each other）。匹配时按**连续 token 序列**比对，命中后
 * 整个序列的每个 token 都挂上同一条释义，于是下划线连成一片、点哪个词都能查。
 */

/** 词元归一化：只留字母与撇号，用于与生词表比对（吃掉标点与大小写差异） */
function normalizeToken(token) {
  return String(token).toLowerCase().replace(/[^a-z']/g, '');
}

/**
 * 生成本页的字幕 token 序列。
 *
 * @param {{tokens:string[]}[]} sentenceTimings 每句的分词结果（来自 cadence.buildWordTiming）
 * @param {{word:string, cn:string, match?:string}[]} glossary 本页生词表
 * @returns {{key:string, si:number, wi:number, text:string,
 *            isGloss:boolean, glossWord:string, glossCn:string}[]}
 */
function layoutCaption(sentenceTimings, glossary) {
  const flat = [];
  sentenceTimings.forEach((sentence, si) => {
    sentence.tokens.forEach((text, wi) => {
      flat.push({
        key: si + '-' + wi,
        si: si,
        wi: wi,
        text: text,
        norm: normalizeToken(text),
        isGloss: false,
        glossWord: '',
        glossCn: '',
      });
    });
  });

  (glossary || []).forEach((entry) => {
    // match 用来对上台词里的实际词形（carry → carries）；没有就用 word 本身
    const target = String(entry.match || entry.word)
      .toLowerCase().split(/\s+/).map(normalizeToken).filter(Boolean);
    if (target.length === 0) return;

    for (let i = 0; i + target.length <= flat.length; i++) {
      let hit = true;
      for (let k = 0; k < target.length; k++) {
        if (flat[i + k].norm !== target[k]) { hit = false; break; }
      }
      if (!hit) continue;
      for (let k = 0; k < target.length; k++) {
        flat[i + k].isGloss = true;
        flat[i + k].glossWord = entry.word;
        flat[i + k].glossCn = entry.cn;
      }
      i += target.length - 1;
    }
  });

  // norm 只是匹配用的中间量，不必进 setData
  return flat.map((t) => ({
    key: t.key,
    si: t.si,
    wi: t.wi,
    text: t.text,
    isGloss: t.isGloss,
    glossWord: t.glossWord,
    glossCn: t.glossCn,
  }));
}

/**
 * 校验一页的生词是否都能在台词里找到落点。
 * 匹配不上的生词在字幕里既不下划线也点不开，等于白写 —— 这类错字/漏改词形
 * 静态就能查出来，不该等到真机上肉眼发现。scripts/check.mjs 会调用它。
 */
function unmatchedGlossary(sentenceTimings, glossary) {
  const marked = layoutCaption(sentenceTimings, glossary);
  return (glossary || [])
    .filter((entry) => !marked.some((t) => t.isGloss && t.glossWord === entry.word))
    .map((entry) => entry.word);
}

module.exports = { layoutCaption, unmatchedGlossary, normalizeToken };
