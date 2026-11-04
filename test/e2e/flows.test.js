// 端到端：完整用户流程
const test = require('node:test');
const assert = require('assert');
const { start, stop, open, addByName } = require('./helpers.js');

test.before(start);
test.after(stop);

test('完整下单：选商品 → 购物车 → 登录 → 授权位置填地址 → 结算 → 下单成功 → 查看订单', async () => {
  const app = await open();
  const { pg } = app;
  try {
    // 1. 商品页加购
    assert.match(await app.text('.pg-index .hero-sub'), /配送费¥3\.00/);
    await addByName(app, '智利车厘子', 2);
    await addByName(app, '可生食鸡蛋', 1);
    await pg.waitForTimeout(700); // 等飞入动画
    assert.strictEqual(await app.text('.pg-index .cart-count'), '3');
    assert.strictEqual(await app.text('.pg-index .cart-total'), '¥583.90'); // 269*2 + 45.9
    assert.strictEqual(await app.text('#tabbar .tab:nth-child(2) .badge'), '3');
    await app.shot('1-home');

    // 2. 购物车：金额 + ¥3 配送费
    await pg.click('.pg-index .cart-go');
    await pg.waitForSelector('.pg-cart .item');
    assert.strictEqual(await pg.locator('.pg-cart .item').count(), 2);
    assert.match(await app.text('.pg-cart .summary'), /商品金额¥583\.90配送费¥3\.00/);
    assert.strictEqual(await app.text('.pg-cart .bottom .price'), '¥586.90');
    await app.shot('2-cart');

    // 3. 未登录直接结算 → 被拦下去登录
    await pg.click('.pg-cart .pay');
    await pg.waitForSelector('.pg-checkout');
    await pg.click('.pg-checkout .pay');
    assert.match(await app.modalText(), /请先在「我的」页面微信登录/);
    await app.modalOk();
    await pg.waitForSelector('.pg-mine');

    // 4. 登录：先不勾协议 → 提示；勾选后登录 → 引导填地址
    await pg.click('.pg-mine .login .btn-primary');
    await app.waitToast('同意用户协议');
    await pg.click('.pg-mine .agree');
    await pg.click('.pg-mine .login .btn-primary');
    await pg.waitForSelector('.modal-mask:not(.out)', { timeout: 3000 });
    assert.match(await app.modalText(), /完善收货信息/);
    await app.modalOk();

    // 5. 地址页：地图选点 → 填姓名电话 → 保存
    await pg.waitForSelector('.pg-address');
    assert.match(await app.modalText(), /地图选点/);
    await app.modalOk();
    assert.match(await app.text('.pg-address .map-text'), /宝兴县/);
    await pg.click('.pg-address .btn-primary');
    await app.waitToast('请填写收货人姓名');
    await pg.fill('.pg-address .field:nth-child(2) input', '王秀兰');
    await pg.fill('.pg-address .field:nth-child(3) input', '1381234567');
    await pg.click('.pg-address .btn-primary');
    await app.waitToast('11 位手机号');
    await pg.fill('.pg-address .field:nth-child(3) input', '13812345678');
    await app.shot('3-address');
    await pg.click('.pg-address .btn-primary');
    await pg.waitForSelector('.pg-mine .menu', { timeout: 3000 });
    await pg.waitForTimeout(400);
    assert.match(await app.text('.pg-mine .menu-item:nth-child(1)'), /王秀兰13812345678/);

    // 6. 回购物车结算
    await app.tab(2);
    await pg.click('.pg-cart .pay');
    await pg.waitForSelector('.pg-checkout .it');
    assert.match(await app.text('.pg-checkout .addr'), /王秀兰13812345678/);
    assert.strictEqual(await pg.locator('.pg-checkout .it').count(), 2);
    assert.match(await app.text('.pg-checkout'), /商品总金额¥583\.90配送费¥3\.00/);
    assert.strictEqual(await app.text('.pg-checkout .bottom .price'), '¥586.90');
    await pg.fill('.pg-checkout textarea', '没货可换同类');
    await app.shot('4-checkout');

    // 7. 提交订单
    await pg.click('.pg-checkout .pay');
    await pg.waitForSelector('.pg-checkout .sheet');
    assert.match(await app.text('.pg-checkout .sheet'), /下单成功.*应付金额¥586\.90/);
    await app.shot('5-success');

    // 8. 订单列表
    await pg.click('.pg-checkout .sheet .btn-primary');
    await pg.waitForSelector('.pg-orders .order');
    const o = await app.text('.pg-orders .order');
    assert.match(o, /待采购/);
    assert.match(o, /智利车厘子JJ级×2、可生食鸡蛋×1/);
    assert.match(o, /共3件·配送费¥3\.00/);
    assert.match(o, /¥586\.90/);
    await app.shot('6-orders');

    // 9. 返回：回到购物车，已下单的商品清空；我的页订单数 +1
    await pg.click('#nav-back');
    await pg.waitForSelector('.pg-cart .empty');
    assert.strictEqual(await pg.locator('#tabbar .badge').count(), 0);
    await app.tab(3);
    assert.match(await app.text('.pg-mine .member-foot'), /^1我的订单/);

    assert.deepStrictEqual(app.errors, [], '页面有报错');
  } finally { await app.close(); }
});

test('分类与搜索', async () => {
  const app = await open();
  const { pg } = app;
  try {
    await pg.click('.pg-index .side-item:nth-child(4)');
    await pg.waitForTimeout(100);
    assert.match(await app.text('.pg-index .side-item.on'), /零食饮料/);
    await pg.fill('.pg-index .search-input', '鸡');
    await pg.waitForTimeout(200);
    assert.deepStrictEqual(await pg.locator('.pg-index .goods-name').allTextContents(), ['冰鲜鸡全翅', '可生食鸡蛋']);
    await pg.fill('.pg-index .search-input', 'jj');
    await pg.waitForTimeout(200);
    assert.deepStrictEqual(await pg.locator('.pg-index .goods-name').allTextContents(), ['智利车厘子 JJ级']);
    await pg.fill('.pg-index .search-input', '没有这个东西');
    await pg.waitForTimeout(200);
    assert.match(await app.text('.pg-index .empty'), /没有找到相关商品/);
    await pg.fill('.pg-index .search-input', '');
    await pg.waitForTimeout(200);
    assert.strictEqual(await pg.locator('.pg-index .goods').count(), 18);
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.close(); }
});

test('购物车：加减数量、减到 0 确认移除、取消勾选后金额变化', async () => {
  const app = await open();
  const { pg } = app;
  try {
    await addByName(app, '冰鲜鸡全翅', 1);
    await addByName(app, '苏打水', 1);
    await pg.waitForTimeout(700);
    await app.tab(2);
    const chicken = pg.locator('.pg-cart .item', { hasText: '冰鲜鸡全翅' });
    await chicken.locator('.plus').click();
    await pg.waitForTimeout(100);
    assert.match(await app.text('.pg-cart .summary'), /商品金额¥148\.70/); // 49.9*2 + 48.9
    await pg.locator('.pg-cart .item', { hasText: '苏打水' }).locator('.check').click();
    await pg.waitForTimeout(100);
    assert.match(await app.text('.pg-cart .summary'), /商品金额¥99\.80配送费¥3\.00/);
    assert.match(await app.text('.pg-cart .pay'), /结算2/);
    // 苏打水取消勾选后，商品页底部条仍显示购物车全部 3 件和对应金额
    await app.tab(1);
    assert.strictEqual(await app.text('.pg-index .cart-count'), '3');
    assert.strictEqual(await app.text('.pg-index .cart-total'), '¥148.70');
    await app.tab(2);
    // 减到 0：先取消，再确认
    const soda = pg.locator('.pg-cart .item', { hasText: '苏打水' });
    await soda.locator('.minus').click();
    await app.modalCancel();
    assert.strictEqual(await pg.locator('.pg-cart .item').count(), 2);
    await soda.locator('.minus').click();
    await app.modalOk();
    await pg.waitForTimeout(500);
    assert.strictEqual(await pg.locator('.pg-cart .item').count(), 1);
    // 全不选 → 结算提示
    await pg.click('.pg-cart .all');
    await pg.waitForTimeout(100);
    assert.match(await app.text('.pg-cart .summary'), /配送费¥0\.00/);
    await pg.click('.pg-cart .pay');
    await app.waitToast('请选择商品');
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.close(); }
});

test('所有页面都能打开且没有报错', async () => {
  const app = await open();
  const { pg } = app;
  try {
    await app.tab(2); await pg.waitForSelector('.pg-cart .empty');
    await app.tab(3); await pg.waitForSelector('.pg-mine .menu');
    await pg.click('.pg-mine .menu-item:nth-child(2)');
    await pg.waitForSelector('.pg-orders .empty');
    await pg.click('#nav-back'); await pg.waitForTimeout(400);
    await pg.click('.pg-mine .menu-item:nth-child(1)');
    await pg.waitForSelector('.pg-address');
    await app.modalCancel(); // 地图选点取消
    assert.match(await app.text('.pg-address .map-title'), /选择收货位置/);
    assert.deepStrictEqual(app.errors, []);
  } finally { await app.close(); }
});
