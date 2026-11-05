// 收货地址页：位置授权、地图选点、保存校验
const test = require('node:test');
const assert = require('assert');
const { setup, input, sleep } = require('../helpers/wx.js');

test('第一次进入：自动请求位置授权并打开地图选点，选完填好地区和默认详细地址', () => {
  const env = setup();
  const pg = env.page('pages/address/address');
  assert.strictEqual(env.calls.last('authorize').arg.scope, 'scope.userLocation');
  assert.strictEqual(env.calls.of('chooseLocation').length, 1);
  assert.strictEqual(pg.data.latitude, 30.9);
  assert.strictEqual(pg.data.region, '四川省雅安市宝兴县硗碛乡');
  assert.strictEqual(pg.data.detail, '夹拉村村委会');
});

test('之前拒绝过位置授权：引导去设置页', () => {
  const env = setup();
  env.authSetting = { 'scope.userLocation': false };
  env.page('pages/address/address');
  assert.match(env.calls.last('showModal').arg.title, /位置权限/);
  assert.strictEqual(env.calls.of('openSetting').length, 1);
  assert.strictEqual(env.calls.of('chooseLocation').length, 0);
});

test('用户在地图上点了取消：不崩溃，可以手动填写', () => {
  const env = setup();
  env.location = null;
  const pg = env.page('pages/address/address');
  assert.strictEqual(pg.data.region, '');
  assert.strictEqual(pg.data.latitude, null);
});

test('已有地址：回显，不自动弹地图；重新选点不覆盖已填的详细地址', () => {
  const env = setup();
  env.req('utils/user.js').set({ address: { name: '王秀兰', phone: '13812345678', region: '旧地区', detail: '3 组 12 号', latitude: 1, longitude: 2 } });
  const pg = env.page('pages/address/address');
  assert.strictEqual(env.calls.of('chooseLocation').length, 0);
  assert.strictEqual(pg.data.name, '王秀兰');
  pg.chooseLocation();
  assert.strictEqual(pg.data.region, '四川省雅安市宝兴县硗碛乡');
  assert.strictEqual(pg.data.detail, '3 组 12 号');
  assert.strictEqual(env.calls.last('chooseLocation').arg.latitude, 1, '地图从上次的位置打开');
});

test('保存：缺项逐一提示，不保存', () => {
  const env = setup();
  env.location = null;
  const pg = env.page('pages/address/address');
  pg.onSave();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请填写收货人姓名');
  pg.onInput(input({ k: 'name' }, '王秀兰'));
  pg.onSave();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请填写 11 位手机号');
  pg.onInput(input({ k: 'phone' }, '13812345678'));
  pg.onSave();
  assert.strictEqual(env.calls.last('showToast').arg.title, '请填写详细地址');
  assert.strictEqual(env.req('utils/user.js').get().address, undefined);
});

test('保存成功：去掉首尾空格，带上坐标，然后返回上一页', async () => {
  const env = setup();
  const pg = env.page('pages/address/address');
  pg.onInput(input({ k: 'name' }, ' 王秀兰 '));
  pg.onInput(input({ k: 'phone' }, ' 13812345678 '));
  pg.onInput(input({ k: 'detail' }, '夹拉村 3 组 12 号 '));
  pg.onSave();
  const a = env.req('utils/user.js').get().address;
  assert.deepStrictEqual({ name: a.name, phone: a.phone, detail: a.detail, lat: a.latitude }, { name: '王秀兰', phone: '13812345678', detail: '夹拉村 3 组 12 号', lat: 30.9 });
  assert.strictEqual(env.calls.last('showToast').arg.title, '已保存');
  await sleep(700);
  assert.strictEqual(env.calls.of('navigateBack').length, 1);
});
