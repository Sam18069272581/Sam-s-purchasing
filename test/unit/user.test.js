// 登录、用户资料、地址校验
const test = require('node:test');
const assert = require('assert');
const { setup } = require('../helpers/wx.js');

const good = { name: '王秀兰', phone: '13812345678', region: '四川省雅安市', detail: '夹拉村 3 组 12 号' };

test('addressError：完整地址通过', () => {
  const user = setup().req('utils/user.js');
  assert.strictEqual(user.addressError(good), '');
});

test('addressError：逐项提示缺什么', () => {
  const user = setup().req('utils/user.js');
  assert.strictEqual(user.addressError(null), '请先填写收货地址');
  assert.strictEqual(user.addressError(Object.assign({}, good, { name: '  ' })), '请填写收货人姓名');
  assert.strictEqual(user.addressError(Object.assign({}, good, { phone: '' })), '请填写 11 位手机号');
  assert.strictEqual(user.addressError(Object.assign({}, good, { phone: '1381234567' })), '请填写 11 位手机号', '10 位');
  assert.strictEqual(user.addressError(Object.assign({}, good, { phone: '138123456789' })), '请填写 11 位手机号', '12 位');
  assert.strictEqual(user.addressError(Object.assign({}, good, { phone: '23812345678' })), '请填写 11 位手机号', '不是 1 开头');
  assert.strictEqual(user.addressError(Object.assign({}, good, { detail: '' })), '请填写详细地址');
  assert.strictEqual(user.addressError(Object.assign({}, good, { detail: undefined })), '请填写详细地址');
});

test('set / get 合并保存资料', () => {
  const user = setup().req('utils/user.js');
  assert.deepStrictEqual(user.get(), {});
  user.set({ nickname: '小王' });
  user.set({ address: good });
  assert.deepStrictEqual(user.get(), { nickname: '小王', address: good });
});

test('登录 / 退出（不开云开发）', async () => {
  const env = setup();
  const user = env.req('utils/user.js');
  assert.strictEqual(user.isLoggedIn(), false);
  user.set({ address: good });
  const u = await user.login();
  assert.strictEqual(u.loggedIn, true);
  assert.strictEqual(u.openid, '');
  assert.ok(u.loginAt > 0);
  assert.deepStrictEqual(u.address, good, '登录不能把已填地址弄丢');
  assert.strictEqual(user.isLoggedIn(), true);
  user.logout();
  assert.strictEqual(user.isLoggedIn(), false);
  assert.deepStrictEqual(user.get().address, good, '退出登录后地址仍保留在本机');
});

test('wx.login 失败时 login() 抛错', async () => {
  const env = setup();
  env.loginFail = true;
  const user = env.req('utils/user.js');
  await assert.rejects(user.login());
  assert.strictEqual(user.isLoggedIn(), false);
});

test('开了云开发：登录拿到 openid', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  env.cloudResult = { openid: 'o-123' };
  const user = env.req('utils/user.js');
  const u = await user.login();
  assert.strictEqual(u.openid, 'o-123');
  assert.strictEqual(env.calls.last('cloud.callFunction').arg.name, 'login');
});

test('开了云开发但云函数报错：仍然能登录（openid 为空）', async () => {
  const env = setup({ cloud: true, config: { cloudEnv: 'test-env' } });
  env.cloudResult = () => { throw new Error('network'); };
  const user = env.req('utils/user.js');
  const warn = console.warn; console.warn = () => {};
  try {
    const u = await user.login();
    assert.strictEqual(u.loggedIn, true);
    assert.strictEqual(u.openid, '');
  } finally { console.warn = warn; }
});
