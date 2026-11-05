(function () {
  const MP = window.__MP__;
  const W = 375, H = 812, SB = 44; // iPhone-like frame
  // ---------- CommonJS loader ----------
  const cache = {};
  function resolve(from, p) {
    const parts = (p.startsWith('/') ? p : from.replace(/[^/]*$/, '') + p).split('/');
    const out = [];
    for (const s of parts) { if (s === '..') out.pop(); else if (s !== '.' && s !== '') out.push(s); }
    let r = '/' + out.join('/'); if (!r.endsWith('.js')) r += '.js'; return r;
  }
  function req(id) {
    if (cache[id]) return cache[id].exports;
    const m = { exports: {} }; cache[id] = m;
    new Function('module', 'exports', 'require', MP.mods[id])(m, m.exports, p => req(resolve(id, p)));
    return m.exports;
  }
  // ---------- WXML renderer ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  function ev(expr, sc) { try { return Function('s', 'with(s){return (' + expr + ')}')(sc); } catch (e) { return undefined; } }
  function interp(str, sc) {
    const m = str.match(/^\s*\{\{((?:(?!\}\})[\s\S])*)\}\}\s*$/);
    if (m) return ev(m[1], sc);
    return str.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => { const v = ev(e, sc); return v == null ? '' : v; });
  }
  const TAG = { text: 'span', label: 'label' };
  let uid = 0;
  function nodes(list, sc, ctx) {
    let out = '', prev = null;
    for (const n of list) {
      if (n.t != null) { out += esc(interp(n.t, sc)); continue; }
      const a = n.a;
      if ('wx:if' in a) { const ok = !!interp(a['wx:if'], sc); prev = ok; if (!ok) continue; }
      else if ('wx:elif' in a) { if (prev !== false) continue; const ok = !!interp(a['wx:elif'], sc); prev = ok; if (!ok) continue; }
      else if ('wx:else' in a) { if (prev !== false) { prev = null; continue; } prev = null; }
      else prev = null;
      if ('wx:for' in a) {
        const arr = interp(a['wx:for'], sc) || [];
        const it = a['wx:for-item'] || 'item', ix = a['wx:for-index'] || 'index';
        arr.forEach((v, i) => { out += el(n, Object.assign(Object.create(sc), { [it]: v, [ix]: i }), ctx, a['wx:key'] ? (typeof v === 'object' ? v[a['wx:key']] : v) : null); });
      } else out += el(n, sc, ctx, null);
    }
    return out;
  }
  function el(n, sc, ctx, key) {
    const a = n.a, name = n.n;
    if (name === 'block') return nodes(n.c, sc, ctx);
    const cls = ['wx-' + name], at = [], ds = {};
    let style = '';
    for (const k in a) {
      if (k.startsWith('wx:')) continue;
      const v = interp(a[k], sc);
      if (k.startsWith('data-')) { ds[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v; continue; }
      const em = k.match(/^(bind|catch):?(\w+)$/);
      if (em) { at.push(`data-ev-${em[2]}="${em[1]}:${esc(a[k])}"`); continue; }
      if (k === 'class') cls.push(v);
      else if (k === 'style') style += v;
      else if (k === 'id') at.push(`id="${esc(v)}"`);
      else if (k === 'src') at.push(`src="${esc(MP.imgs[v] || v)}"`);
      else if (k === 'placeholder') at.push(`placeholder="${esc(v)}"`);
      else if (k === 'value') at.push(`value="${esc(v == null ? '' : v)}"`);
      else if (k === 'hover-class') at.push(`data-hover="${esc(v)}"`);
      else if (k === 'type' && v === 'number') at.push('inputmode="numeric"');
      else if (k === 'maxlength') at.push(`maxlength="${esc(v)}"`);
      else if (k === 'disabled' && v) cls.push('disabled');
      else if (k === 'loading' && v) cls.push('loading');
      else if (k === 'scroll-into-view') ctx.scrollTo = v;
      else if (k === 'auto-height') style += ';height:auto;min-height:1.4em';
    }
    if (name === 'button') at.push('data-hover="button-hover"');
    if (name === 'image' && a.mode === 'aspectFill') style += ';object-fit:cover';
    if (Object.keys(ds).length) at.push(`data-ds="${esc(JSON.stringify(ds))}"`);
    if (key != null) at.push(`data-key="${esc(key)}"`);
    const c = `class="${esc(cls.join(' '))}"`, s = style ? ` style="${esc(style)}"` : '';
    if (name === 'input') return `<input ${c}${s} ${at.join(' ')}>`;
    if (name === 'image') return `<img ${c}${s} ${at.join(' ')}>`;
    if (name === 'textarea') return `<textarea ${c}${s} ${at.join(' ')} rows="1"></textarea>`;
    const tag = TAG[name] || 'div';
    return `<${tag} ${c}${s} ${at.join(' ')}>${nodes(n.c, sc, ctx)}</${tag}>`;
  }
  // ---------- shell refs ----------
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), navEl = $('#nav'), tabEl = $('#tabbar');
  // ---------- storage ----------
  const store = {};
  // ---------- page manager ----------
  let stack = []; const tabs = {}; let current = null; let pendingDef = null;
  window.Page = def => { pendingDef = def; };
  window.App = () => {}; window.getApp = () => ({});
  function createPage(route, query) {
    const meta = MP.pages[route];
    pendingDef = null;
    delete cache['/' + route + '.js'];
    req('/' + route + '.js');
    const def = pendingDef;
    const pg = Object.create(null);
    for (const k in def) if (k !== 'data') pg[k] = def[k];
    pg.data = JSON.parse(JSON.stringify(def.data || {}));
    pg.route = route;
    const root = document.createElement('div');
    root.className = 'pageview pg pg-' + route.split('/')[1];
    const inner = document.createElement('div'); inner.className = 'pg-inner'; root.appendChild(inner);
    pg.__root = root; pg.__inner = inner; pg.__meta = meta;
    pg.setData = function (obj, cb) {
      for (const k in obj) this.data[k] = obj[k];
      schedule(this); if (cb) setTimeout(cb, 40);
    };
    pg.__query = query || {};
    return pg;
  }
  const dirty = new Set(); let raf = 0;
  function schedule(pg) { dirty.add(pg); if (!raf) raf = requestAnimationFrame(flush); }
  function flush() { raf = 0; const d = [...dirty]; dirty.clear(); d.forEach(render); }
  function render(pg) {
    const ctx = {};
    const html = nodes(pg.__meta.ast, pg.data, ctx);
    const tmp = document.createElement('div'); tmp.className = 'pg-inner'; tmp.innerHTML = html;
    morphdom(pg.__inner, tmp, {
      getNodeKey: n => n.nodeType === 1 && n.getAttribute('data-key') ? n.getAttribute('data-key') + '|' + n.className.split(' ')[1] : n.id,
      onBeforeElUpdated: (from, to) => {
        if ((from.tagName === 'INPUT' || from.tagName === 'TEXTAREA') && document.activeElement === from) return false;
        if (from.tagName === 'INPUT') from.value = to.getAttribute('value') || '';
        return true;
      }
    });
    if (ctx.scrollTo !== pg.__lastScroll && !ctx.scrollTo) pg.__lastScroll = '';
    if (ctx.scrollTo && ctx.scrollTo !== pg.__lastScroll) {
      pg.__lastScroll = ctx.scrollTo;
      const t = pg.__inner.querySelector('#' + CSS.escape(ctx.scrollTo));
      if (t) { const sc = t.closest('.wx-scroll-view'); if (sc) sc.scrollTo({ top: t.offsetTop - sc.offsetTop, behavior: 'smooth' }); }
    }
  }
  function nav(pg) {
    const j = Object.assign({}, MP.app.window, pg.__meta.json);
    const custom = j.navigationStyle === 'custom';
    const bg = j.navigationBarBackgroundColor, fg = j.navigationBarTextStyle === 'white' ? '#fff' : '#000';
    $('#statusbar').style.background = custom ? 'transparent' : bg;
    $('#statusbar').style.color = custom ? '#000' : fg;
    navEl.style.display = custom ? 'none' : 'flex';
    navEl.style.background = bg; navEl.style.color = fg;
    $('#nav-title').textContent = j.navigationBarTitleText || '';
    $('#nav-back').style.display = stack.length > 1 ? 'block' : 'none';
    $('#capsule').className = 'capsule ' + (fg === '#fff' ? 'light' : 'dark');
    const isTab = MP.app.tabBar.list.some(t => t.pagePath === pg.route);
    tabEl.style.display = isTab ? 'flex' : 'none';
    stage.style.top = custom ? '0' : (SB + 44) + 'px';
    stage.style.bottom = isTab ? '84px' : '0';
    document.documentElement.style.setProperty('--sab', isTab ? '0px' : '34px');
    stage.style.background = j.backgroundColor || '#fff';
    document.documentElement.style.setProperty('--vh', (H - (custom ? 0 : SB + 44) - (isTab ? 84 : 0)) + 'px');
    tabEl.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('on', MP.app.tabBar.list[i].pagePath === pg.route));
    paintTabs();
  }
  function show(pg, anim) {
    const prev = current; current = pg;
    stage.appendChild(pg.__root);
    nav(pg);
    const first = !pg.__loaded;
    if (first) { pg.__loaded = true; pg.onLoad && pg.onLoad(pg.__query); }
    pg.onShow && pg.onShow();
    render(pg);
    if (first && pg.onReady) setTimeout(() => pg.onReady(), 50);
    if (prev && prev !== pg) prev.onHide && prev.onHide();
    if (anim === 'push') {
      pg.__root.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      if (prev) prev.__root.animate([{ transform: 'none' }, { transform: 'translateX(-30%)', opacity: .8 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => { if (current !== prev) prev.__root.remove(); };
    } else if (anim === 'pop') {
      if (prev) { stage.appendChild(prev.__root); prev.__root.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { if (current !== prev) prev.__root.remove(); }; }
      pg.__root.animate([{ transform: 'translateX(-30%)', opacity: .8 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' });
    } else if (prev && prev !== pg) prev.__root.remove();
  }
  function parseUrl(url) { const [p, q] = url.replace(/^\//, '').split('?'); const query = {}; (q || '').split('&').filter(Boolean).forEach(s => { const [k, v] = s.split('='); query[k] = decodeURIComponent(v); }); return { route: p, query }; }
  function isTab(route) { return MP.app.tabBar.list.some(t => t.pagePath === route); }
  // ---------- tab bar ----------
  let badges = {};
  function paintTabs() {
    tabEl.innerHTML = '';
    MP.app.tabBar.list.forEach((t, i) => {
      const on = current && current.route === t.pagePath;
      const d = document.createElement('div'); d.className = 'tab' + (on ? ' on' : '');
      d.style.color = on ? MP.app.tabBar.selectedColor : MP.app.tabBar.color;
      d.innerHTML = `<img src="${MP.imgs['/' + (on ? t.selectedIconPath : t.iconPath)]}"><span>${t.text}</span>` + (badges[i] ? `<b class="badge">${badges[i]}</b>` : '');
      d.onclick = () => wx.switchTab({ url: '/' + t.pagePath });
      tabEl.appendChild(d);
    });
  }
  // ---------- overlays ----------
  const ov = $('#overlay');
  function toast(text, ms) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; ov.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, ms || 1500); return t; }
  let loadingEl = null;
  const P = v => Promise.resolve(v);
  // ---------- wx mock ----------
  window.wx = {
    getStorageSync: k => store[k] === undefined ? '' : JSON.parse(store[k]),
    setStorageSync: (k, v) => { store[k] = JSON.stringify(v); },
    getWindowInfo: () => ({ windowWidth: W, windowHeight: H, statusBarHeight: SB, screenWidth: W, screenHeight: H }),
    getSystemInfoSync: () => wx.getWindowInfo(),
    getMenuButtonBoundingClientRect: () => ({ top: 48, height: 32, left: 281, right: 368, width: 87, bottom: 80 }),
    setTabBarBadge: o => { badges[o.index] = o.text; paintTabs(); return P(); },
    removeTabBarBadge: o => { delete badges[o.index]; paintTabs(); return P(); },
    vibrateShort: () => {}, 
    login: o => setTimeout(() => o.success && o.success({ code: 'demo' }), 500),
    showToast: o => toast(o.title, o.duration),
    showLoading: o => { loadingEl = toast(o.title || '加载中', 99999); loadingEl.classList.add('loading'); },
    hideLoading: () => { if (loadingEl) { loadingEl.remove(); loadingEl = null; } },
    showModal: o => {
      const m = document.createElement('div'); m.className = 'modal-mask';
      m.innerHTML = `<div class="modal">${o.title ? `<div class="m-title">${esc(o.title)}</div>` : ''}<div class="m-body">${esc(o.content || '')}</div><div class="m-btns">${o.showCancel === false ? '' : '<div class="m-btn c">取消</div>'}<div class="m-btn ok" style="color:${o.confirmColor || '#576B95'}">${esc(o.confirmText || '确定')}</div></div></div>`;
      ov.appendChild(m);
      const done = confirm => { m.classList.add('out'); setTimeout(() => m.remove(), 200); o.success && o.success({ confirm, cancel: !confirm }); };
      m.querySelector('.ok').onclick = () => done(true);
      const c = m.querySelector('.c'); if (c) c.onclick = () => done(false);
    },
    getSetting: o => o.success && o.success({ authSetting: {} }),
    authorize: o => { o.complete && o.complete(); },
    chooseLocation: o => {
      const m = document.createElement('div'); m.className = 'modal-mask';
      m.innerHTML = `<div class="modal"><div class="m-title">（演示）地图选点</div><div class="m-body">真机上这里会打开微信地图，让用户拖动地图选择位置。演示里直接使用示例地点。</div><div class="m-btns"><div class="m-btn c">取消</div><div class="m-btn ok">使用示例地点</div></div></div>`;
      ov.appendChild(m);
      m.querySelector('.ok').onclick = () => { m.remove(); o.success && o.success({ name: '夹拉村村委会', address: '四川省雅安市宝兴县硗碛乡', latitude: 30.9, longitude: 102.6 }); };
      m.querySelector('.c').onclick = () => m.remove();
    },
    openSetting: () => {},
    navigateTo: o => { const { route, query } = parseUrl(o.url); stack.push(createPage(route, query)); show(stack[stack.length - 1], 'push'); },
    redirectTo: o => { const { route, query } = parseUrl(o.url); const old = stack.pop(); old.onUnload && old.onUnload(); const pg = createPage(route, query); stack.push(pg); current = null; old.__root.remove(); show(pg, 'none'); },
    navigateBack: o => { if (stack.length < 2) { o && o.fail && o.fail(); return; } const old = stack.pop(); old.onUnload && old.onUnload(); current = old; show(stack[stack.length - 1], 'pop'); },
    switchTab: o => {
      const { route } = parseUrl(o.url);
      stack.forEach(p => { if (!isTab(p.route)) { p.onUnload && p.onUnload(); p.__root.remove(); } });
      if (!tabs[route]) tabs[route] = createPage(route);
      stack = [tabs[route]]; show(tabs[route], 'tab');
    },
    nextTick: f => setTimeout(f, 0),
    createSelectorQuery: () => {
      const q = []; const pv = current && current.__root;
      const rect = e => { const r = e.getBoundingClientRect(), p = phone.getBoundingClientRect(), s = p.width / W; return { id: e.id, top: (r.top - p.top) / s, left: (r.left - p.left) / s, width: r.width / s, height: r.height / s, bottom: (r.bottom - p.top) / s, right: (r.right - p.left) / s }; };
      const api = {
        in() { return api; },
        select(sel) { q.push(() => { const e = pv && pv.querySelector(sel); return e ? rect(e) : null; }); return { boundingClientRect() { return api; } }; },
        selectAll(sel) { q.push(() => [...(pv ? pv.querySelectorAll(sel) : [])].map(rect)); return { boundingClientRect() { return api; } }; },
        exec(cb) { setTimeout(() => cb && cb(q.map(f => f())), 30); }
      };
      return api;
    }
  };
  // ---------- events ----------
  const phone = $('#phone');
  function fire(type, target, extra) {
    let elx = target;
    while (elx && elx !== document.body) {
      const spec = elx.getAttribute && elx.getAttribute('data-ev-' + type);
      if (spec) {
        const [kind, handler] = spec.split(':');
        const pv = elx.closest('.pageview'); const pg = [...stack, ...Object.values(tabs)].find(p => p.__root === pv);
        const ds = JSON.parse(elx.getAttribute('data-ds') || '{}');
        if (pg && pg[handler]) pg[handler].call(pg, Object.assign({ type, currentTarget: { dataset: ds }, target: { dataset: ds } }, extra));
        if (kind === 'catch') return;
      }
      elx = elx.parentElement;
    }
  }
  stage.addEventListener('click', e => {
    const r = phone.getBoundingClientRect(), s = r.width / W;
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    fire('tap', e.target, { detail: { x, y }, touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });
  });
  stage.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('wx-scroll-view')) fire('scroll', e.target, { detail: { scrollTop: e.target.scrollTop } }); }, true);
  stage.addEventListener('input', e => fire('input', e.target, { detail: { value: e.target.value } }));
  stage.addEventListener('focusout', e => fire('blur', e.target, { detail: { value: e.target.value } }));
  stage.addEventListener('pointerdown', e => { const h = e.target.closest('[data-hover]'); if (h) { h.classList.add(h.getAttribute('data-hover')); const up = () => { h.classList.remove(h.getAttribute('data-hover')); window.removeEventListener('pointerup', up); }; window.addEventListener('pointerup', up); } });
  $('#nav-back').onclick = () => wx.navigateBack();
  // ---------- boot ----------
  req('/app.js');
  window.__proto = { wx, store, reset() { for (const k in store) delete store[k]; badges = {}; Object.keys(tabs).forEach(k => { tabs[k].__root.remove(); delete tabs[k]; }); stack = []; current = null; wx.switchTab({ url: '/' + MP.app.pages[0] }); } };
  wx.switchTab({ url: '/' + MP.app.pages[0] });
})();
