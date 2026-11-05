// Builds a single-file clickable prototype of the mini program for the browser.
const fs = require('fs'), path = require('path');
// 用法：node test/e2e/sim/build.js [miniprogram目录] [输出.html]；测试里直接 require 调用 build()。
// 这是一个简化的小程序渲染器（WXML → HTML，wx.* 用浏览器模拟），只用于自动化测试和预览，
// 不能代替真机 / 开发者工具验证。
const { parseDocument } = require('htmlparser2');

function ast(nodes) {
  return nodes.map(n => n.type === 'text' ? { t: n.data } : n.type === 'tag' ? { n: n.name, a: n.attribs, c: ast(n.children || []) } : null).filter(Boolean);
}
const rpx = css => css.replace(/(-?\d*\.?\d+)rpx/g, (_, n) => (parseFloat(n) / 2) + 'px')
  .replace(/env\(safe-area-inset-bottom\)/g, 'var(--sab)').replace(/100vh/g, 'var(--vh)');
const tagSel = s => s.replace(/(^|[\s,>+~(])(view|text|image|button|input|textarea|scroll-view)(?=[\s{,.:\[)]|$)/g, '$1.wx-$2');
function scope(css, cls) {
  // prefix every selector outside @keyframes with .cls; "page" maps to the page root
  let out = '', i = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const sel = css.slice(i, open).trim();
    if (sel.startsWith('@')) {
      let depth = 1, j = open + 1; while (depth && j < css.length) { if (css[j] === '{') depth++; if (css[j] === '}') depth--; j++; }
      out += sel + css.slice(open, j) + '\n'; i = j; continue;
    }
    const close = css.indexOf('}', open);
    const sels = sel.split(',').map(s => s.trim()).map(s => /^page\b/.test(s) ? s.replace(/^page/, cls) : cls + ' ' + tagSel(s)).join(',');
    out += sels + css.slice(open, close + 1) + '\n'; i = close + 1;
  }
  return out;
}
function build(MP, OUT) {
const app = JSON.parse(fs.readFileSync(MP + '/app.json'));
const pages = {};
for (const p of app.pages) {
  const name = p.split('/')[1];
  const wxml = fs.readFileSync(`${MP}/${p}.wxml`, 'utf8');
  pages[p] = {
    ast: ast(parseDocument(wxml, { xmlMode: true, recognizeSelfClosing: true }).children),
    css: scope(rpx(fs.readFileSync(`${MP}/${p}.wxss`, 'utf8')), '.pg-' + name),
    json: JSON.parse(fs.readFileSync(`${MP}/${p}.json`, 'utf8'))
  };
}
const appCss = scope(rpx(fs.readFileSync(MP + '/app.wxss', 'utf8')), '.pg');
// JS modules
const mods = {};
(function walk(d) { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.js')) mods['/' + path.relative(MP, fp)] = fs.readFileSync(fp, 'utf8'); } })(MP);
// images as data URIs
const imgs = {};
for (const f of fs.readdirSync(MP + '/images')) imgs['/images/' + f] = 'data:image/png;base64,' + fs.readFileSync(MP + '/images/' + f).toString('base64');
const morph = fs.readFileSync(require.resolve('morphdom/dist/morphdom-umd.min.js'), 'utf8');
const runtime = fs.readFileSync(__dirname + '/runtime.js', 'utf8');
const shellCss = fs.readFileSync(__dirname + '/shell.css', 'utf8');
const shellHtml = fs.readFileSync(__dirname + '/shell.html', 'utf8');
const payload = JSON.stringify({ app, pages, mods, imgs }).replace(/<\/script/g, '<\\/script');
const html = shellHtml
  .replace('/*SHELL_CSS*/', shellCss + appCss + Object.values(pages).map(p => p.css).join('\n'))
  .replace('/*SCRIPTS*/', morph + '\nwindow.__MP__=' + payload + ';\n' + runtime);
if (OUT) fs.writeFileSync(OUT, html);
return html;
}
module.exports = { build };
if (require.main === module) {
  const MP = path.resolve(process.argv[2] || path.join(__dirname, '../../../miniprogram'));
  const OUT = process.argv[3] || 'preview.html';
  const html = build(MP, OUT);
  console.log('wrote', OUT, (html.length / 1024).toFixed(0) + 'KB');
}
