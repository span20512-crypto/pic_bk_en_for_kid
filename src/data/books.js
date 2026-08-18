/**
 * 内容层聚合出口（CJS）
 *
 * 页面（tsx）与 node 脚本（gen-tts.mjs / verify.js）统一从这里 require，
 * 内部结构（series / catalog / books 一本一文件）对外不可见。
 */
const { seriesMeta, seriesOrder } = require('./series');
const { bookList, bookById } = require('./catalog');

module.exports = { seriesMeta, seriesOrder, bookList, bookById };
