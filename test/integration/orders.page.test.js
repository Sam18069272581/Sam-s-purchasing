// 我的订单页 + app 启动
const test = require('node:test');
const assert = require('assert');
const { setup } = require('../helpers/wx.js');

test('没有订单：空列表', () => {
  const env = setup();
  assert.deepStrictEqual(env.page('pages/orders/orders').data.list, []);
});

test('订单列表：时间、商品摘要、件数、金额', () => {
  const env = setup();
  const ts = new Date(2026, 10, 4, 9, 5).getTime();
  env.wx.setStorageSync('orders_v1', [{
    id: 'D1', createdAt: ts, status: '待采购', deliveryFee: 300, totalAmount: 36380, goodsAmount: 36080,
    items: [{ id: 'p001', name: '智利车厘子 JJ级', qty: 1 }, { id: 'p006', name: '可生食鸡蛋', qty: 2 }],
    address: { name: '王秀兰', detail: '夹拉村' }
  }]);
  const o = env.page('pages/orders/orders').data.list[0];
  assert.strictEqual(o.timeText, '2026-11-04 09:05');
  assert.strictEqual(o.summaryText, '智利车厘子 JJ级 ×1、可生食鸡蛋 ×2');
  assert.strictEqual(o.count, 3);
  assert.strictEqual(o.feeText, '3.00');
  assert.deepStrictEqual(o.total, { int: '363', dec: '.80' });
});

test('app 启动：不开云开发时不初始化云；回到前台刷新购物车角标', () => {
  const env = setup({ cloud: true });
  env.req('utils/cart.js').save([{ id: 'p001', name: 'x', price: 1, qty: 2, checked: true }]);
  env.badge = undefined;
  const app = env.app();
  app.onLaunch();
  assert.strictEqual(env.calls.of('cloud.init').length, 0);
  app.onShow();
  assert.strictEqual(env.badge, '2');
});

test('app 启动：配置了云环境 ID 时初始化云开发', () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'prod-123' } });
  env.app().onLaunch();
  assert.strictEqual(env.calls.last('cloud.init').arg.env, 'prod-123');
});
