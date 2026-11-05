// 确认订单页：金额、登录 / 地址校验、提交订单
const test = require('node:test');
const assert = require('assert');
const { setup, input, sleep } = require('../helpers/wx.js');

const ADDR = { name: '王秀兰', phone: '13812345678', region: '四川省雅安市宝兴县', detail: '夹拉村 3 组 12 号', latitude: 30.9, longitude: 102.6 };

function ready(env, { login = true, address = ADDR } = {}) {
  const cart = env.req('utils/cart.js');
  const { products } = env.req('data/products.js');
  cart.add(products.find(p => p.id === 'p001'), 1);
  cart.add(products.find(p => p.id === 'p006'), 2);
  cart.add(products.find(p => p.id === 'p011'), 1);
  cart.toggle('p011'); // 苏打水没勾选，不在这单里
  const user = env.req('utils/user.js');
  if (address) user.set({ address });
  if (login) user.set({ loggedIn: true });
  return { cart, user };
}

test('只结算勾选的商品，金额 = 商品 + ¥3 配送费', () => {
  const env = setup(); ready(env);
  const pg = env.page('pages/checkout/checkout');
  assert.deepStrictEqual(pg.data.items.map(i => i.id), ['p001', 'p006']);
  assert.strictEqual(pg.data.count, 3);
  assert.strictEqual(pg.data.items[1].subText, '91.80');
  assert.strictEqual(pg.data.goodsText, '360.80');
  assert.strictEqual(pg.data.feeText, '3.00');
  assert.deepStrictEqual(pg.data.total, { int: '363', dec: '.80' });
  assert.strictEqual(pg.data.feeNote, '', '不按距离收费时不显示距离');
});

test('距离很远也只收 ¥3', () => {
  const env = setup(); ready(env, { address: Object.assign({}, ADDR, { latitude: 40, longitude: 116 }) });
  const pg = env.page('pages/checkout/checkout');
  assert.strictEqual(pg.data.feeText, '3.00');
});

test('未登录：提示去「我的」登录，不下单', async () => {
  const env = setup(); ready(env, { login: false });
  const pg = env.page('pages/checkout/checkout');
  await pg.onSubmit();
  assert.match(env.calls.last('showModal').arg.content, /登录/);
  assert.strictEqual(env.calls.last('switchTab').arg.url, '/pages/mine/mine');
  assert.deepStrictEqual(env.req('utils/order.js').list(), []);
});

test('没填地址 / 地址不完整：提示具体缺什么', async () => {
  const env = setup(); ready(env, { address: null });
  const pg = env.page('pages/checkout/checkout');
  await pg.onSubmit();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请先填写收货地址');
  env.req('utils/user.js').set({ address: Object.assign({}, ADDR, { phone: '138' }) });
  pg.onShow();
  await pg.onSubmit();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请填写 11 位手机号');
  assert.deepStrictEqual(env.req('utils/order.js').list(), []);
});

test('点地址栏去编辑地址', () => {
  const env = setup(); ready(env);
  env.page('pages/checkout/checkout').editAddress();
  assert.strictEqual(env.calls.last('navigateTo').arg.url, '/pages/address/address');
});

test('提交成功：生成订单、清掉已下单商品、保留未勾选商品、弹出成功层', async () => {
  const env = setup(); const { cart } = ready(env);
  const pg = env.page('pages/checkout/checkout');
  pg.onRemark(input({}, '没货可换同类'));
  await pg.onSubmit();
  const orders = env.req('utils/order.js').list();
  assert.strictEqual(orders.length, 1);
  const o = orders[0];
  assert.strictEqual(o.goodsAmount, 36080);
  assert.strictEqual(o.deliveryFee, 300);
  assert.strictEqual(o.totalAmount, 36380);
  assert.strictEqual(o.remark, '没货可换同类');
  assert.deepStrictEqual(o.items.map(i => [i.id, i.qty]), [['p001', 1], ['p006', 2]]);
  assert.strictEqual(o.address.phone, ADDR.phone);
  assert.deepStrictEqual(cart.load().map(i => i.id), ['p011'], '没勾选的苏打水要留在购物车');
  assert.deepStrictEqual(pg.data.success, { id: o.id, total: '363.80' });
  assert.strictEqual(pg.data.submitting, false);
  pg.goOrders();
  assert.strictEqual(env.calls.last('redirectTo').arg.url, '/pages/orders/orders');
});

test('设置了起送金额时，不够不能下单', async () => {
  const env = setup({ config: { minOrderAmount: 50000 } }); ready(env);
  const pg = env.page('pages/checkout/checkout');
  await pg.onSubmit();
  assert.strictEqual(env.calls.last('showToast').arg.title, '满 ¥500.00 起送');
  assert.deepStrictEqual(env.req('utils/order.js').list(), []);
});

test('网络慢时连点两次「提交订单」只下一单', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  ready(env);
  let n = 0;
  env.cloudResult = async () => { await sleep(50); n++; return { result: { ok: true, order: { id: 'c' + n, totalAmount: 36380 } } }; };
  const pg = env.page('pages/checkout/checkout');
  await Promise.all([pg.onSubmit(), pg.onSubmit()]);
  assert.strictEqual(env.calls.of('cloud.callFunction').length, 1, '重复提交生成了两笔订单');
});

test('云函数报错：提示失败原因，购物车不清空', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  const { cart } = ready(env);
  env.cloudResult = { ok: false, msg: '有商品已下架，请刷新购物车' };
  const pg = env.page('pages/checkout/checkout');
  await pg.onSubmit();
  assert.strictEqual(env.calls.last('showToast').arg.title, '有商品已下架，请刷新购物车');
  assert.strictEqual(cart.load().length, 3);
  assert.strictEqual(pg.data.success, null);
  assert.strictEqual(pg.data.submitting, false);
});

test('下单成功后成功层显示服务端算出的金额', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  ready(env);
  env.cloudResult = { ok: true, order: { id: 'c1', goodsAmount: 36080, deliveryFee: 300, totalAmount: 36380 } };
  const pg = env.page('pages/checkout/checkout');
  await pg.onSubmit();
  assert.deepStrictEqual(pg.data.success, { id: 'c1', total: '363.80' });
});
