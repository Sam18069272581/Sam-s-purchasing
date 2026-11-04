// 我的页：登录、协议勾选、资料、退出
const test = require('node:test');
const assert = require('assert');
const { setup, input } = require('../helpers/wx.js');

test('没勾选协议不能登录', async () => {
  const env = setup();
  const pg = env.page('pages/mine/mine');
  await pg.onLogin();
  assert.match(env.calls.last('showToast').arg.title, /同意用户协议/);
  assert.strictEqual(env.calls.of('login').length, 0);
});

test('勾选协议后登录；没地址时引导去填写', async () => {
  const env = setup();
  const pg = env.page('pages/mine/mine');
  pg.onAgree();
  await pg.onLogin();
  assert.strictEqual(pg.data.u.loggedIn, true);
  assert.strictEqual(env.calls.of('hideLoading').length, 1);
  assert.match(env.calls.last('showModal').arg.title, /收货信息/);
  assert.strictEqual(env.calls.last('navigateTo').arg.url, '/pages/address/address');
});

test('已有地址的老用户登录：不再弹填写地址', async () => {
  const env = setup();
  env.req('utils/user.js').set({ address: { name: 'a', phone: '13812345678', detail: 'x' } });
  const pg = env.page('pages/mine/mine');
  pg.onAgree();
  await pg.onLogin();
  assert.strictEqual(env.calls.of('showModal').length, 0);
});

test('登录失败：关掉 loading 并提示', async () => {
  const env = setup();
  env.loginFail = true;
  const pg = env.page('pages/mine/mine');
  pg.onAgree();
  await pg.onLogin();
  assert.strictEqual(env.calls.of('hideLoading').length, 1);
  assert.match(env.calls.last('showToast').arg.title, /登录失败/);
  assert.ok(!pg.data.u.loggedIn);
});

test('设置头像和昵称；空昵称不覆盖', () => {
  const env = setup();
  env.req('utils/user.js').set({ loggedIn: true });
  const pg = env.page('pages/mine/mine');
  pg.onChooseAvatar({ detail: { avatarUrl: 'wxfile://a.png' } });
  pg.onNickname(input({}, '小王'));
  pg.onNickname(input({}, ''));
  assert.strictEqual(pg.data.u.avatar, 'wxfile://a.png');
  assert.strictEqual(env.req('utils/user.js').get().nickname, '小王');
});

test('订单数量；退出登录', () => {
  const env = setup();
  env.wx.setStorageSync('orders_v1', [{ id: 'a' }, { id: 'b' }]);
  env.req('utils/user.js').set({ loggedIn: true });
  const pg = env.page('pages/mine/mine');
  assert.strictEqual(pg.data.orderCount, 2);
  pg.onLogout();
  assert.strictEqual(pg.data.u.loggedIn, false);
});

test('菜单跳转', () => {
  const env = setup();
  const pg = env.page('pages/mine/mine');
  pg.goAddress(); assert.strictEqual(env.calls.last('navigateTo').arg.url, '/pages/address/address');
  pg.goOrders(); assert.strictEqual(env.calls.last('navigateTo').arg.url, '/pages/orders/orders');
});
