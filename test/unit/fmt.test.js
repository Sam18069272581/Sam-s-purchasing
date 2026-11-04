const test = require('node:test');
const assert = require('assert');
const fmt = require('../../miniprogram/utils/fmt.js');
const { categories } = require('../../miniprogram/data/products.js');

test('split：价格拆成整数和小数两段', () => {
  assert.deepStrictEqual(fmt.split(4990), { int: '49', dec: '.90' });
  assert.deepStrictEqual(fmt.split(0), { int: '0', dec: '.00' });
  assert.deepStrictEqual(fmt.split(5), { int: '0', dec: '.05' });
  assert.deepStrictEqual(fmt.split(1234567), { int: '12345', dec: '.67' });
});

test('gradient：每个分类都有专属占位色，未知分类有兜底', () => {
  const fallback = fmt.gradient('nope');
  assert.match(fallback, /^linear-gradient/);
  for (const c of categories) assert.notStrictEqual(fmt.gradient(c.id), fallback, c.id + ' 缺少占位色');
});
