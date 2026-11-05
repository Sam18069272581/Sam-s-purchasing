// 云函数：用假的 wx-server-sdk 在 node 里跑
const test = require('node:test');
const assert = require('assert');
const path = require('path');
const Module = require('module');

function loadCloudFn(name) {
  const added = [];
  const sdk = {
    DYNAMIC_CURRENT_ENV: 'env',
    init() {},
    getWXContext: () => ({ OPENID: 'o-test', UNIONID: '' }),
    database: () => ({ collection: () => ({ add: async ({ data }) => { added.push(data); return { _id: 'id-' + added.length }; } }) })
  };
  const orig = Module._load;
  Module._load = function (req, ...rest) { return req === 'wx-server-sdk' ? sdk : orig.call(this, req, ...rest); };
  const file = path.join(__dirname, '..', '..', 'cloudfunctions', name, 'index.js');
  delete require.cache[file];
  try { return { fn: require(file), added }; } finally { Module._load = orig; }
}

const addr = { name: '王秀兰', phone: '13812345678', detail: '夹拉村' };

test('login 云函数返回 openid', async () => {
  const { fn } = loadCloudFn('login');
  assert.deepStrictEqual(await fn.main({}), { openid: 'o-test', unionid: '' });
});

test('createOrder：正常下单写入数据库', async () => {
  const { fn, added } = loadCloudFn('createOrder');
  const r = await fn.main({ items: [{ id: 'p001', name: '智利车厘子 JJ级', price: 26900, qty: 2 }], address: addr, deliveryFee: 300 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.order.goodsAmount, 53800);
  assert.strictEqual(r.order.deliveryFee, 300);
  assert.strictEqual(r.order.totalAmount, 54100);
  assert.strictEqual(added[0]._openid, 'o-test');
  assert.strictEqual(added[0].status, '待采购');
});

test('createOrder：没有商品或收货信息不全时拒绝', async () => {
  const { fn, added } = loadCloudFn('createOrder');
  assert.strictEqual((await fn.main({ items: [], address: addr })).ok, false);
  assert.strictEqual((await fn.main({ items: [{ id: 'p001', price: 1, qty: 1 }], address: { name: 'a', phone: '123', detail: 'x' } })).ok, false);
  assert.strictEqual((await fn.main({ items: [{ id: 'p001', price: 1, qty: 1 }] })).ok, false);
  assert.strictEqual(added.length, 0);
});

test('createOrder：备注最多 200 字', async () => {
  const { fn, added } = loadCloudFn('createOrder');
  await fn.main({ items: [{ id: 'p001', name: 'x', price: 26900, qty: 1 }], address: addr, remark: '字'.repeat(500) });
  assert.strictEqual(added[0].remark.length, 200);
});

test('createOrder：不信任前端传来的价格（按商品表重新计算）', async () => {
  const { fn } = loadCloudFn('createOrder');
  // 有人改包把 ¥269 的车厘子改成 1 分钱
  const r = await fn.main({ items: [{ id: 'p001', name: '智利车厘子 JJ级', price: 1, qty: 1 }], address: addr, deliveryFee: 300 });
  assert.ok(!r.ok || r.order.goodsAmount === 26900, '服务端照收了 1 分钱的价格：' + JSON.stringify(r.order));
});

test('createOrder：不信任前端传来的配送费', async () => {
  const { fn } = loadCloudFn('createOrder');
  const r = await fn.main({ items: [{ id: 'p001', name: '智利车厘子 JJ级', price: 26900, qty: 1 }], address: addr, deliveryFee: 0 });
  assert.strictEqual(r.order.deliveryFee, 300, '前端传 0 元配送费，服务端照收');
});

test('createOrder：数量必须是正整数', async () => {
  const { fn } = loadCloudFn('createOrder');
  const r = await fn.main({ items: [{ id: 'p001', name: 'x', price: 26900, qty: 0.4 }], address: addr });
  assert.ok(!r.ok || r.order.goodsAmount > 0, '0.4 件被四舍五入成 0 件，生成了 0 元订单');
});

test('createOrder：已下架 / 不存在的商品拒绝下单', async () => {
  const { fn, added } = loadCloudFn('createOrder');
  const r = await fn.main({ items: [{ id: 'fake', name: '假商品', price: 1, qty: 1 }], address: addr });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(added.length, 0);
});

test('云函数里的商品表 / 配送规则副本是最新的（改了要运行 node scripts/sync-cloud.js）', () => {
  const fs = require('fs');
  const { FILES, expected, root } = require('../../scripts/sync-cloud.js');
  for (const [src, dst] of FILES) {
    assert.strictEqual(fs.readFileSync(path.join(root, dst), 'utf8'), expected(src), dst + ' 过期了，请运行 node scripts/sync-cloud.js');
  }
});
