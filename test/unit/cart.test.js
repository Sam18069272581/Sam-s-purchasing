// 购物车（本机缓存）
const test = require('node:test');
const assert = require('assert');
const { setup } = require('../helpers/wx.js');

const P1 = { id: 'p001', categoryId: 'fruit', name: '智利车厘子 JJ级', spec: '2.5kg/盒', price: 26900, image: '' };
const P2 = { id: 'p005', categoryId: 'meat', name: '冰鲜鸡全翅', spec: '1kg/盒', price: 4990, image: '' };

test('空购物车', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  assert.deepStrictEqual(cart.load(), []);
  assert.strictEqual(cart.count(), 0);
  assert.deepStrictEqual(cart.qtyMap(), {});
});

test('加购：新商品默认勾选，重复加购累加数量', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  cart.add(P1);
  cart.add(P1, 2);
  cart.add(P2);
  const list = cart.load();
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].qty, 3);
  assert.strictEqual(list[0].checked, true);
  assert.strictEqual(cart.count(), 4);
  assert.deepStrictEqual(cart.qtyMap(), { p001: 3, p005: 1 });
});

test('改数量：减到 0 就移除', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  cart.add(P1); cart.add(P2);
  cart.setQty('p001', 5);
  assert.strictEqual(cart.qtyMap().p001, 5);
  cart.setQty('p001', 0);
  assert.deepStrictEqual(cart.load().map(i => i.id), ['p005']);
  cart.setQty('p005', -1);
  assert.deepStrictEqual(cart.load(), []);
});

test('勾选 / 全选 / 删除选中', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  cart.add(P1); cart.add(P2);
  cart.toggle('p001');
  assert.strictEqual(cart.load().find(i => i.id === 'p001').checked, false);
  cart.toggleAll(true);
  assert.ok(cart.load().every(i => i.checked));
  cart.toggle('p005');
  cart.removeChecked();
  assert.deepStrictEqual(cart.load().map(i => i.id), ['p005']);
});

test('购物车角标：有商品显示数量，超过 99 显示 99+，清空后移除', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  cart.add(P1, 3);
  assert.strictEqual(env.badge, '3');
  assert.strictEqual(env.calls.last('setTabBarBadge').arg.index, 1, '购物车在第 2 个 tab');
  cart.setQty('p001', 120);
  assert.strictEqual(env.badge, '99+');
  cart.setQty('p001', 0);
  assert.strictEqual(env.badge, undefined);
});

test('缓存读失败时不崩溃', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  env.wx.getStorageSync = () => { throw new Error('storage broken'); };
  assert.deepStrictEqual(cart.load(), []);
});

test('店主改了商品价格后，购物车里的价格跟着更新', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  // 模拟用户前几天加购时的旧价格
  env.wx.setStorageSync('cart_v1', [Object.assign({}, P1, { price: 19900, qty: 1, checked: true })]);
  const { products } = env.req('data/products.js');
  const now = products.find(p => p.id === 'p001').price;
  assert.strictEqual(cart.load()[0].price, now, '购物车仍是旧价格 ¥199，结算会按旧价下单');
});

test('商品下架（从商品列表删除）后，购物车自动去掉', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  env.wx.setStorageSync('cart_v1', [
    { id: 'gone', name: '已下架商品', price: 100, qty: 1, checked: true, categoryId: 'fruit', spec: '' },
    Object.assign({}, P1, { qty: 1, checked: true })
  ]);
  assert.deepStrictEqual(cart.load().map(i => i.id), ['p001']);
});
