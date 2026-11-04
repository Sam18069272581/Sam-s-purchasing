// 在 node 里模拟小程序运行环境：wx.* API、Page()、App()。
// 每个测试调用 setup() 拿到一套全新的环境，互不影响。
const path = require('path');

const MP = path.join(__dirname, '..', '..', 'miniprogram');

function setup(opts = {}) {
  const store = {};
  const calls = [];
  const env = {
    store,
    calls,
    // 下一次 showModal 点「确定」还是「取消」，默认确定
    modalConfirm: true,
    // 模拟 wx.chooseLocation 返回的位置；设为 null 表示用户取消
    location: { name: '夹拉村村委会', address: '四川省雅安市宝兴县硗碛乡', latitude: 30.9, longitude: 102.6 },
    authSetting: {},
    loginFail: false,
    cloudResult: null,
    timers: []
  };
  const rec = (name, arg) => { calls.push({ name, arg }); };
  const P = v => Promise.resolve(v);

  const wx = {
    getStorageSync: k => (k in store ? JSON.parse(store[k]) : ''),
    setStorageSync: (k, v) => { store[k] = JSON.stringify(v); },
    removeStorageSync: k => { delete store[k]; },
    setTabBarBadge: o => { rec('setTabBarBadge', o); env.badge = o.text; return P(); },
    removeTabBarBadge: o => { rec('removeTabBarBadge', o); env.badge = undefined; return P(); },
    vibrateShort: o => rec('vibrateShort', o),
    showToast: o => rec('showToast', o),
    showLoading: o => rec('showLoading', o),
    hideLoading: o => rec('hideLoading', o),
    showModal: o => {
      rec('showModal', o);
      const confirm = env.modalConfirm;
      o.success && o.success({ confirm, cancel: !confirm });
    },
    login: o => {
      rec('login', o);
      if (env.loginFail) o.fail && o.fail({ errMsg: 'login:fail' });
      else o.success && o.success({ code: 'test-code' });
    },
    getSetting: o => { rec('getSetting', o); o.success && o.success({ authSetting: env.authSetting }); },
    authorize: o => { rec('authorize', o); o.complete && o.complete(); },
    openSetting: o => rec('openSetting', o),
    chooseLocation: o => {
      rec('chooseLocation', o);
      if (env.location) o.success && o.success(Object.assign({}, env.location));
      else o.fail && o.fail({ errMsg: 'chooseLocation:fail cancel' });
    },
    navigateTo: o => rec('navigateTo', o),
    redirectTo: o => rec('redirectTo', o),
    switchTab: o => rec('switchTab', o),
    navigateBack: o => rec('navigateBack', o),
    getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812, statusBarHeight: 44 }),
    getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 812, statusBarHeight: 44 }),
    getMenuButtonBoundingClientRect: () => ({ top: 48, height: 32, left: 281, right: 368, width: 87, bottom: 80 }),
    createSelectorQuery: () => {
      const api = {
        in: () => api,
        select: () => ({ boundingClientRect: () => api }),
        selectAll: () => ({ boundingClientRect: () => api }),
        exec: cb => cb && cb([[], null])
      };
      return api;
    },
    cloud: opts.cloud ? {
      init: o => rec('cloud.init', o),
      callFunction: async o => {
        rec('cloud.callFunction', o);
        if (typeof env.cloudResult === 'function') return env.cloudResult(o);
        return { result: env.cloudResult };
      }
    } : undefined
  };

  global.wx = wx;
  let pageDef = null, appDef = null;
  global.Page = def => { pageDef = def; };
  global.App = def => { appDef = def; };
  global.getApp = () => appDef || {};

  // 清掉小程序代码的 require 缓存，让 config / 缓存模块每次都是新的
  for (const k of Object.keys(require.cache)) if (k.startsWith(MP)) delete require.cache[k];

  if (opts.config) {
    const cfg = require(path.join(MP, 'config.js'));
    deepAssign(cfg, opts.config);
  }

  env.wx = wx;
  env.req = rel => require(path.join(MP, rel));
  env.calls.of = name => calls.filter(c => c.name === name);
  env.calls.last = name => { const l = calls.filter(c => c.name === name); return l[l.length - 1]; };

  // 加载一个页面，返回一个可以直接调用方法的页面实例
  env.page = (route, query = {}) => {
    pageDef = null;
    require(path.join(MP, route + '.js'));
    if (!pageDef) throw new Error(route + ' 没有调用 Page()');
    const inst = {};
    for (const k of Object.keys(pageDef)) if (k !== 'data') inst[k] = pageDef[k];
    inst.data = JSON.parse(JSON.stringify(pageDef.data || {}));
    inst.route = route;
    inst.setData = function (obj, cb) {
      for (const k of Object.keys(obj)) setPath(this.data, k, obj[k]);
      if (cb) cb();
    };
    inst.__def = pageDef;
    inst.onLoad && inst.onLoad(query);
    inst.onShow && inst.onShow();
    inst.onReady && inst.onReady();
    return inst;
  };
  env.app = () => { require(path.join(MP, 'app.js')); return appDef; };
  return env;
}

// 和小程序 setData 一样支持 'a.b[0].c' 这种路径
function setPath(obj, p, v) {
  const keys = p.replace(/\[(\d+)\]/g, '.$1').split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = v;
}

function deepAssign(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') deepAssign(t[k], s[k]);
    else t[k] = s[k];
  }
}

// 事件对象：模拟 bindtap / bindinput 传进来的 e
function tap(dataset = {}, extra = {}) {
  return Object.assign({ type: 'tap', currentTarget: { dataset }, target: { dataset }, detail: { x: 100, y: 300 }, touches: [{ clientX: 100, clientY: 300 }] }, extra);
}
function input(dataset, value) {
  return { type: 'input', currentTarget: { dataset }, target: { dataset }, detail: { value } };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { setup, tap, input, sleep, MP };
