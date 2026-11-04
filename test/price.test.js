// 运行：node test/price.test.js
const assert = require('assert');
const p = require('../miniprogram/utils/price.js');
const rule = { baseFee: 1000, freeThreshold: 19900, includedKm: 10, perKmFee: 100, maxFee: 5000,
  origin: { latitude: 30.5728, longitude: 104.0668 } };

assert.strictEqual(p.formatYuan(4990), '49.90');
assert.strictEqual(p.goodsTotal([{ price: 4990, qty: 2 }, { price: 100, qty: 1, checked: false }]), 9980);
assert.strictEqual(p.deliveryFee(0, null, rule), 0, '空购物车不收配送费');
assert.strictEqual(p.deliveryFee(9980, null, rule), 1000, '无坐标只收基础费');
assert.strictEqual(p.deliveryFee(19900, null, rule), 0, '满 199 免配送费');
// 约 0.1° 纬度 ≈ 11.1km → 超出 1.1km，向上取整 2km → +¥2
const near = { latitude: 30.6728, longitude: 104.0668 };
assert.strictEqual(p.deliveryFee(5000, near, rule), 1200);
// 很远的地方封顶 ¥50
assert.strictEqual(p.deliveryFee(5000, { latitude: 32, longitude: 104 }, rule), 5000);
assert.deepStrictEqual(p.summary([{ price: 4990, qty: 2, checked: true }], null, rule), { goods: 9980, fee: 1000, total: 10980 });
// 不设免邮门槛
assert.strictEqual(p.deliveryFee(99999, null, Object.assign({}, rule, { freeThreshold: 0, perKmFee: 0 })), 1000);
// 当前线上规则：每单 ¥3，无免配送费
const live = require('../miniprogram/config.js').delivery;
assert.strictEqual(p.deliveryFee(0, null, live), 0);
assert.strictEqual(p.deliveryFee(4990, null, live), 300);
assert.strictEqual(p.deliveryFee(99999, { latitude: 32, longitude: 104 }, live), 300);
console.log('price tests passed');
