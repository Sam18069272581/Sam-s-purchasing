// 端到端测试：把小程序渲染成网页，在真实的 Chromium 里像用户一样点。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { build } = require('./sim/build.js');

const MP = path.join(__dirname, '..', '..', 'miniprogram');
let browser, htmlFile;

async function start() {
  htmlFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mp-e2e-')), 'index.html');
  build(MP, htmlFile);
  browser = await chromium.launch();
}
async function stop() { if (browser) await browser.close(); }

// 打开一个全新的小程序（本机缓存为空），返回页面和收集到的报错
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  await ctx.route(/^https?:/, r => r.abort()); // 不访问外网
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', e => errors.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto('file://' + htmlFile);
  await pg.waitForSelector('.pg-index .goods');
  const shotDir = process.env.E2E_SHOTS;
  const api = {
    pg, errors,
    tab: async n => { await pg.click(`#tabbar .tab:nth-child(${n})`); await pg.waitForTimeout(150); },
    modalOk: async () => { await pg.click('.modal-mask:not(.out) .ok'); await pg.waitForTimeout(250); },
    modalCancel: async () => { await pg.click('.modal-mask:not(.out) .c'); await pg.waitForTimeout(250); },
    modalText: async () => pg.textContent('.modal-mask:not(.out) .modal'),
    toast: async () => { const t = await pg.waitForSelector('.toast:not(.loading)'); return t.textContent(); },
    // 去掉所有空白，方便断言（WXML 里金额常被拆成多个 text）
    text: async sel => (await pg.textContent(sel)).replace(/\s+/g, ''),
    shot: async name => { if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await pg.locator('#phone').screenshot({ path: path.join(shotDir, name + '.png') }); } },
    close: () => ctx.close()
  };
  return api;
}

// 商品页里按商品名点 +
async function addByName(app, name, times = 1) {
  const card = app.pg.locator('.pg-index .goods', { hasText: name });
  for (let i = 0; i < times; i++) { await card.locator('.plus').click(); await app.pg.waitForTimeout(80); }
}

module.exports = { start, stop, open, addByName };
