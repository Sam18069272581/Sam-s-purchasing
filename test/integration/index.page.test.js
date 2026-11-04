// 商品页：分类、搜索、加购、底部购物车条
const test = require('node:test');
const assert = require('assert');
const { setup, tap, input, sleep } = require('../helpers/wx.js');

test('打开商品页：按分类分组展示全部商品，默认选中第一个分类', () => {
  const env = setup();
  const { categories, products } = env.req('data/products.js');
  const pg = env.page('pages/index/index');
  assert.strictEqual(pg.data.groups.length, categories.length);
  assert.strictEqual(pg.data.groups.reduce((n, g) => n + g.items.length, 0), products.length);
  assert.strictEqual(pg.data.activeCat, categories[0].id);
  assert.deepStrictEqual(pg.data.groups[0].items[0].p, { int: '269', dec: '.00' });
  assert.strictEqual(pg.data.freeTip, '配送费 ¥3.00 · 送货上门');
});

test('搜索：按名称过滤，只保留有结果的分类', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.onSearch(input({}, '鸡'));
  const names = pg.data.groups.flatMap(g => g.items.map(i => i.name));
  assert.deepStrictEqual(names, ['冰鲜鸡全翅', '可生食鸡蛋']);
  assert.deepStrictEqual(pg.data.groups.map(g => g.id), ['meat']);
});

test('搜索：没有结果时分组为空（页面显示「没有找到」）', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.onSearch(input({}, '不存在的商品'));
  assert.deepStrictEqual(pg.data.groups, []);
});

test('搜索：清空关键词恢复全部商品；前后空格忽略', () => {
  const env = setup();
  const { products } = env.req('data/products.js');
  const pg = env.page('pages/index/index');
  pg.onSearch(input({}, '  牛奶 '));
  assert.strictEqual(pg.data.groups.flatMap(g => g.items).length, 1);
  pg.onSearch(input({}, ''));
  assert.strictEqual(pg.data.groups.flatMap(g => g.items).length, products.length);
});

test('搜索：英文不区分大小写（搜 jj 能找到 JJ级车厘子）', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.onSearch(input({}, 'jj'));
  assert.deepStrictEqual(pg.data.groups.flatMap(g => g.items.map(i => i.id)), ['p001']);
});

test('点左侧分类：高亮并滚动到对应分组', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.onCatTap(tap({ id: 'snack' }));
  assert.strictEqual(pg.data.activeCat, 'snack');
  assert.strictEqual(pg.data.scrollTo, 'cat-snack');
  clearTimeout(pg.lockTimer);
});

test('滚动商品列表：左侧分类跟随', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.tops = [{ id: 'fruit', top: 0 }, { id: 'meat', top: 500 }, { id: 'dairy', top: 1000 }];
  pg.onScroll({ detail: { scrollTop: 520 } });
  assert.strictEqual(pg.data.activeCat, 'meat');
  pg.onScroll({ detail: { scrollTop: 0 } });
  assert.strictEqual(pg.data.activeCat, 'fruit');
});

test('加购：数量立刻变化，飞入动画结束后底部购物车条更新', async () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  pg.onAdd(tap({ id: 'p001' }));
  pg.onAdd(tap({ id: 'p001' }));
  pg.onAdd(tap({ id: 'p005' }));
  assert.deepStrictEqual(pg.data.qty, { p001: 2, p005: 1 });
  assert.strictEqual(pg.data.balls.length, 3, '每次点击飞一个小球');
  await sleep(700);
  assert.strictEqual(pg.data.balls.length, 0, '小球飞完要清掉');
  assert.strictEqual(pg.data.cartCount, 3);
  assert.deepStrictEqual(pg.data.cartTotal, { int: '587', dec: '.90' }); // 269*2 + 49.9
  assert.strictEqual(env.badge, '3');
});

test('减购：减到 0 从购物车移除', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  env.req('utils/cart.js').add({ id: 'p005', name: '冰鲜鸡全翅', price: 4990, categoryId: 'meat', spec: '' }, 1);
  pg.onShow();
  assert.strictEqual(pg.data.qty.p005, 1);
  pg.onMinus(tap({ id: 'p005' }));
  assert.strictEqual(pg.data.qty.p005, undefined);
  assert.strictEqual(pg.data.cartCount, 0);
});

test('底部购物车条：件数和金额口径一致（购物车里取消勾选的商品也算）', () => {
  const env = setup();
  const cart = env.req('utils/cart.js');
  cart.add({ id: 'p001', name: '智利车厘子 JJ级', price: 26900, categoryId: 'fruit', spec: '' }, 1);
  cart.add({ id: 'p005', name: '冰鲜鸡全翅', price: 4990, categoryId: 'meat', spec: '' }, 1);
  cart.toggle('p001'); // 在购物车页取消勾选车厘子
  const pg = env.page('pages/index/index');
  assert.strictEqual(pg.data.cartCount, 2);
  assert.deepStrictEqual(pg.data.cartTotal, { int: '318', dec: '.90' }, '显示 2 件但金额只算了 1 件');
});

test('从别的页面回来：数量和购物车同步', () => {
  const env = setup();
  const pg = env.page('pages/index/index');
  env.req('utils/cart.js').add({ id: 'p010', name: '每日坚果', price: 9990, categoryId: 'snack', spec: '' }, 4);
  pg.onShow();
  assert.strictEqual(pg.data.qty.p010, 4);
  assert.strictEqual(pg.data.cartCount, 4);
});

test('点底部购物车条跳到购物车 tab', () => {
  const env = setup();
  env.page('pages/index/index').goCart();
  assert.strictEqual(env.calls.last('switchTab').arg.url, '/pages/cart/cart');
});
