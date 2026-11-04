// 下单与订单列表
const test = require('node:test');
const assert = require('assert');
const { setup } = require('../helpers/wx.js');

const draft = () => ({
  items: [{ id: 'p001', name: '智利车厘子 JJ级', spec: '2.5kg/盒', price: 26900, qty: 1 }],
  address: { name: '王秀兰', phone: '13812345678', detail: '夹拉村' },
  goodsAmount: 26900, deliveryFee: 300, totalAmount: 27200, remark: ''
});

test('本机模式：订单存在本机，新订单排在最前', async () => {
  const env = setup();
  const order = env.req('utils/order.js');
  assert.deepStrictEqual(order.list(), []);
  const a = await order.submit(draft());
  assert.match(a.id, /^D\d+$/);
  assert.strictEqual(a.status, '待采购');
  assert.ok(a.createdAt > 0);
  await new Promise(r => setTimeout(r, 2));
  const b = await order.submit(draft());
  assert.deepStrictEqual(order.list().map(o => o.id), [b.id, a.id]);
});

test('本机模式：连续快速下单，订单号不重复', async () => {
  const env = setup();
  const order = env.req('utils/order.js');
  const now = Date.now;
  Date.now = () => 1793809121435; // 固定时间，模拟同一毫秒内下两单
  try {
    const a = await order.submit(draft());
    const b = await order.submit(draft());
    assert.notStrictEqual(a.id, b.id, '同一毫秒内下两单会得到相同订单号');
  } finally { Date.now = now; }
});

test('云开发模式：用云函数返回的订单号和金额', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  env.cloudResult = { ok: true, order: { id: 'cloud-1', goodsAmount: 26900, deliveryFee: 300, totalAmount: 27200, status: '待采购', createdAt: 1 } };
  const order = env.req('utils/order.js');
  const o = await order.submit(draft());
  assert.strictEqual(o.id, 'cloud-1');
  assert.strictEqual(env.calls.last('cloud.callFunction').arg.name, 'createOrder');
  assert.strictEqual(order.list()[0].id, 'cloud-1');
});

test('云开发模式：云函数拒绝时抛出它的提示，且不写本机订单', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  env.cloudResult = { ok: false, msg: '收货信息不完整' };
  const order = env.req('utils/order.js');
  await assert.rejects(order.submit(draft()), /收货信息不完整/);
  assert.deepStrictEqual(order.list(), []);
});
