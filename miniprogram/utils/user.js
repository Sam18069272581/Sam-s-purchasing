// 用户资料与收货地址（本机缓存；开了云开发会同时拿 openid）
const config = require('../config.js');
const KEY = 'user_v1';

function get() {
  try { return wx.getStorageSync(KEY) || {}; } catch (e) { return {}; }
}
function set(patch) {
  const u = Object.assign(get(), patch);
  wx.setStorageSync(KEY, u);
  return u;
}
function isLoggedIn() {
  return !!get().loggedIn;
}

// 微信登录：wx.login 拿 code；有云开发就调用 login 云函数换 openid
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async () => {
        let openid = '';
        if (config.cloudEnv && wx.cloud) {
          try {
            const r = await wx.cloud.callFunction({ name: 'login' });
            openid = r.result.openid;
          } catch (e) { console.warn('login 云函数调用失败', e); }
        }
        resolve(set({ loggedIn: true, openid, loginAt: Date.now() }));
      },
      fail: reject
    });
  });
}
function logout() {
  set({ loggedIn: false });
}

// 地址完整性检查：姓名、手机号、详细地址都要有
function addressError(a) {
  if (!a) return '请先填写收货地址';
  if (!a.name || !a.name.trim()) return '请填写收货人姓名';
  if (!/^1\d{10}$/.test(a.phone || '')) return '请填写 11 位手机号';
  if (!a.detail || !a.detail.trim()) return '请填写详细地址';
  return '';
}

module.exports = { get, set, isLoggedIn, login, logout, addressError };
