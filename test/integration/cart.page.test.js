// 购物车页
const test = require('node:test');
const assert = require('assert');
const { setup, tap, sleep } = require('../helpers/wx.js');

function withCart(env) {
  const cart = env.req('utils/cart.js');
  const { products } = env.req('data/products.js');
  const get = id => products.find(p => p.id === id);
  cart.add(get('p001'), 1);   // 269.00
  cart.add(get('p005'), 2);   // 49.90 × 2
  return cart;
}

test('空购物车：显示空状态，合计 0', () => {
  const env = setup();
  const pg = env.page('pages/cart/cart');
  assert.deepStrictEqual(pg.data.list, []);
  assert.strictEqual(pg.data.allChecked, false);
  assert.strictEqual(pg.data.goodsText, '0.00');
  assert.strictEqual(pg.data.feeText, '0.00', '空购物车不收配送费');
});

test('有商品：商品金额 + 配送费 ¥3 = 合计', () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  assert.strictEqual(pg.data.list.length, 2);
  assert.strictEqual(pg.data.allChecked, true);
  assert.strictEqual(pg.data.checkedCount, 3);
  assert.strictEqual(pg.data.goodsText, '368.80');
  assert.strictEqual(pg.data.feeText, '3.00');
  assert.deepStrictEqual(pg.data.total, { int: '371', dec: '.80' });
  assert.strictEqual(pg.data.freeTip, '', '没有免配送费活动时不显示凑单提示');
});

test('取消勾选：只算勾选商品；全部取消后配送费也为 0', () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  pg.onToggle(tap({ id: 'p001' }));
  assert.strictEqual(pg.data.allChecked, false);
  assert.strictEqual(pg.data.goodsText, '99.80');
  assert.deepStrictEqual(pg.data.total, { int: '102', dec: '.80' });
  pg.onToggle(tap({ id: 'p005' }));
  assert.strictEqual(pg.data.feeText, '0.00');
  assert.deepStrictEqual(pg.data.total, { int: '0', dec: '.00' });
  pg.onToggleAll();
  assert.strictEqual(pg.data.allChecked, true);
  assert.strictEqual(pg.data.checkedCount, 3);
});

test('加减数量', () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  pg.onPlus(tap({ id: 'p005' }));
  assert.strictEqual(pg.data.list.find(i => i.id === 'p005').qty, 3);
  assert.strictEqual(pg.data.popId, 'p005');
  pg.onMinus(tap({ id: 'p005' }));
  assert.strictEqual(pg.data.list.find(i => i.id === 'p005').qty, 2);
});

test('数量为 1 再减：确认后播放收起动画再删除；取消则保留', async () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  env.modalConfirm = false;
  pg.onMinus(tap({ id: 'p001' }));
  await sleep(400);
  assert.strictEqual(pg.data.list.length, 2, '点了取消不应删除');
  env.modalConfirm = true;
  pg.onMinus(tap({ id: 'p001' }));
  assert.ok(pg.data.removing.includes('p001'), '先标记为删除中，播放动画');
  await sleep(400);
  assert.deepStrictEqual(pg.data.list.map(i => i.id), ['p005']);
  assert.strictEqual(pg.data.removing, '');
});

test('删除选中', async () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  pg.onToggle(tap({ id: 'p005' }));
  pg.onClear();
  assert.match(env.calls.last('showModal').arg.content, /1 种/);
  await sleep(400);
  assert.deepStrictEqual(pg.data.list.map(i => i.id), ['p005']);
});

test('删除动画期间：id 是另一个 id 前缀的商品不会被误标记', () => {
  const env = setup();
  const pg = env.page('pages/cart/cart');
  // removing 是逗号拼接的字符串，wxml 用 indexOf 判断，p1 会命中 p10
  pg.setData({ removing: ',p10,' });
  const wxml = require('fs').readFileSync(require('path').join(__dirname, '../../miniprogram/pages/cart/cart.wxml'), 'utf8');
  const expr = wxml.match(/class="item enter \{\{([^}]+)\}\}"/)[1];
  const cls = Function('removing', 'item', 'return (' + expr + ')')(pg.data.removing, { id: 'p1' });
  assert.strictEqual(cls, '', '商品 p1 被当成正在删除的 p10');
});

test('结算：没选商品时提示，选了跳到确认订单页', () => {
  const env = setup(); withCart(env);
  const pg = env.page('pages/cart/cart');
  pg.onToggleAll(); // 全部取消
  pg.onCheckout();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请选择商品');
  assert.strictEqual(env.calls.of('navigateTo').length, 0);
  pg.onToggleAll();
  pg.onCheckout();
  assert.strictEqual(env.calls.last('navigateTo').arg.url, '/pages/checkout/checkout');
});

test('去逛逛跳回商品页', () => {
  const env = setup();
  env.page('pages/cart/cart').goShop();
  assert.strictEqual(env.calls.last('switchTab').arg.url, '/pages/index/index');
});
