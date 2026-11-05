// 金额与配送费计算
const test = require('node:test');
const assert = require('assert');
const p = require('../../miniprogram/utils/price.js');
const live = require('../../miniprogram/config.js').delivery;

const rule = { baseFee: 1000, freeThreshold: 19900, includedKm: 10, perKmFee: 100, maxFee: 5000,
  origin: { latitude: 30.5728, longitude: 104.0668 } };

test('formatYuan：分转元，两位小数', () => {
  assert.strictEqual(p.formatYuan(4990), '49.90');
  assert.strictEqual(p.formatYuan(0), '0.00');
  assert.strictEqual(p.formatYuan(5), '0.05');
  assert.strictEqual(p.formatYuan(100000), '1000.00');
  assert.strictEqual(p.formatYuan(4990.4), '49.90');
});

test('goodsTotal：只算勾选的商品，未设置 checked 视为勾选', () => {
  assert.strictEqual(p.goodsTotal([{ price: 4990, qty: 2 }, { price: 100, qty: 1, checked: false }]), 9980);
  assert.strictEqual(p.goodsTotal([]), 0);
  assert.strictEqual(p.goodsTotal([{ price: 4990, qty: 3, checked: true }]), 14970);
});

test('goodsTotal：常见价格相加不会出现浮点误差', () => {
  // 用分计算：0.1+0.2 这类问题不会出现
  const items = [{ price: 10, qty: 1 }, { price: 20, qty: 1 }];
  assert.strictEqual(p.goodsTotal(items), 30);
  assert.strictEqual(p.formatYuan(p.goodsTotal([{ price: 4590, qty: 7 }])), '321.30');
});

test('distanceKm：同一点为 0，0.1° 纬度约 11.1 公里', () => {
  const a = { latitude: 30.5728, longitude: 104.0668 };
  assert.strictEqual(p.distanceKm(a, a), 0);
  const km = p.distanceKm(a, { latitude: 30.6728, longitude: 104.0668 });
  assert.ok(km > 11 && km < 11.2, String(km));
  assert.strictEqual(p.distanceKm(null, a), 0);
});

test('deliveryFee：通用规则（免配送费门槛、按距离加价、封顶）', () => {
  assert.strictEqual(p.deliveryFee(0, null, rule), 0, '空购物车不收配送费');
  assert.strictEqual(p.deliveryFee(9980, null, rule), 1000, '无坐标只收基础费');
  assert.strictEqual(p.deliveryFee(19899, null, rule), 1000, '差 1 分不免');
  assert.strictEqual(p.deliveryFee(19900, null, rule), 0, '满 199 免配送费');
  const near = { latitude: 30.6728, longitude: 104.0668 }; // 超出约 1.1km → 向上取整 2km
  assert.strictEqual(p.deliveryFee(5000, near, rule), 1200);
  assert.strictEqual(p.deliveryFee(5000, { latitude: 32, longitude: 104 }, rule), 5000, '封顶 ¥50');
  assert.strictEqual(p.deliveryFee(5000, rule.origin, rule), 1000, '在包含公里数内不加价');
  assert.strictEqual(p.deliveryFee(99999, null, Object.assign({}, rule, { freeThreshold: 0, perKmFee: 0 })), 1000);
});

test('summary：商品 + 配送费 = 合计', () => {
  assert.deepStrictEqual(p.summary([{ price: 4990, qty: 2, checked: true }], null, rule), { goods: 9980, fee: 1000, total: 10980 });
  assert.deepStrictEqual(p.summary([{ price: 4990, qty: 2, checked: false }], null, rule), { goods: 0, fee: 0, total: 0 });
});

test('当前线上规则：每单 ¥3，无免配送费，不按距离加价', () => {
  assert.strictEqual(live.baseFee, 300);
  assert.strictEqual(live.freeThreshold, 0);
  assert.strictEqual(live.perKmFee, 0);
  assert.strictEqual(p.deliveryFee(0, null, live), 0);
  assert.strictEqual(p.deliveryFee(1, null, live), 300);
  assert.strictEqual(p.deliveryFee(4990, null, live), 300);
  assert.strictEqual(p.deliveryFee(99999999, null, live), 300, '买再多也不免');
  assert.strictEqual(p.deliveryFee(99999, { latitude: 32, longitude: 104 }, live), 300, '再远也不加价');
  assert.deepStrictEqual(p.summary([{ price: 26900, qty: 1 }, { price: 4590, qty: 2 }], null, live), { goods: 36080, fee: 300, total: 36380 });
});
