// 商品与分类数据的完整性
const test = require('node:test');
const assert = require('assert');
const { categories, products } = require('../../miniprogram/data/products.js');

test('分类 id 唯一且都有名称', () => {
  const ids = categories.map(c => c.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  categories.forEach(c => assert.ok(c.name && c.name.trim()));
});

test('商品 id 唯一', () => {
  const ids = products.map(p => p.id);
  assert.strictEqual(new Set(ids).size, ids.length, '有重复的商品 id');
});

test('每个商品都属于存在的分类，价格是正整数（分）', () => {
  const cat = new Set(categories.map(c => c.id));
  for (const p of products) {
    assert.ok(cat.has(p.categoryId), p.id + ' 的分类不存在：' + p.categoryId);
    assert.ok(Number.isInteger(p.price) && p.price > 0, p.id + ' 价格必须是正整数（单位分）');
    assert.ok(p.name && p.name.trim(), p.id + ' 缺少名称');
    assert.strictEqual(typeof p.spec, 'string');
  }
});

test('每个分类下至少有一个商品（否则左侧分类点了没反应）', () => {
  for (const c of categories) assert.ok(products.some(p => p.categoryId === c.id), c.name + ' 下没有商品');
});

test('商品图片只能是 https 或本地路径', () => {
  for (const p of products) if (p.image) assert.match(p.image, /^(https:\/\/|\/)/, p.id);
});
