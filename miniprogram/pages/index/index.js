const { categories, products } = require('../../data/products.js');
const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const fmt = require('../../utils/fmt.js');
const config = require('../../config.js');

let ballId = 0;

Page({
  data: {
    shopName: config.shopName,
    feeText: price.formatYuan(config.delivery.baseFee),
    navTop: 20, navH: 44, capsuleW: 88,
    categories: [], groups: [], activeCat: '', scrollTo: '', keyword: '',
    qty: {}, popId: '', cartCount: 0, cartTotal: { int: '0', dec: '.00' }, freeTip: '',
    cartBump: false, balls: []
  },

  onLoad() {
    // 自定义导航栏：对齐右上角胶囊按钮
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const cap = wx.getMenuButtonBoundingClientRect();
      this.win = win;
      this.setData({
        navTop: win.statusBarHeight,
        navH: (cap.top - win.statusBarHeight) * 2 + cap.height,
        capsuleW: win.windowWidth - cap.left + 8
      });
    } catch (e) {}
    this.setData({ categories, activeCat: categories[0].id });
    this.buildGroups('');
  },

  onReady() { this.measure(); },

  onShow() { this.refreshCart(false); },

  // 记录每个分类在列表里的位置，滚动时左侧分类自动跟随
  measure() {
    wx.createSelectorQuery().in(this)
      .selectAll('.group').boundingClientRect()
      .select('.main').boundingClientRect()
      .exec(res => {
        const groups = res[0] || [], main = res[1];
        if (!main) return;
        this.tops = groups.map(g => ({ id: g.id.replace('cat-', ''), top: g.top - main.top }));
      });
  },

  onScroll(e) {
    if (this.lock || !this.tops || !this.tops.length) return;
    const y = e.detail.scrollTop + 40;
    let cur = this.tops[0].id;
    this.tops.forEach(t => { if (t.top <= y) cur = t.id; });
    if (cur !== this.data.activeCat) this.setData({ activeCat: cur });
  },

  buildGroups(keyword) {
    const kw = keyword.trim();
    let n = 0;
    const groups = categories.map(c => ({
      id: c.id, name: c.name,
      items: products
        .filter(p => p.categoryId === c.id && (!kw || p.name.indexOf(kw) >= 0))
        .map(p => Object.assign({ p: fmt.split(p.price), bg: fmt.gradient(p.categoryId), initial: p.name.slice(0, 1), delay: Math.min(n++, 8) * 50 }, p))
    })).filter(g => g.items.length);
    this.setData({ groups }, () => this.measure());
  },

  refreshCart(bump) {
    const list = cart.load();
    const goods = price.goodsTotal(list);
    const th = config.delivery.freeThreshold;
    let freeTip = '配送费 ¥' + this.data.feeText + ' · 送货上门';
    if (th > 0 && goods > 0) freeTip = goods >= th ? '已免配送费' : '再买 ¥' + price.formatYuan(th - goods) + ' 免配送费';
    this.setData({ qty: cart.qtyMap(), cartCount: cart.count(list), cartTotal: fmt.split(goods), freeTip });
    if (bump) {
      this.setData({ cartBump: false });
      setTimeout(() => this.setData({ cartBump: true }), 20);
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }); this.buildGroups(e.detail.value); },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id;
    this.lock = true;
    clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => { this.lock = false; }, 600);
    this.setData({ activeCat: id, scrollTo: '' });
    this.setData({ scrollTo: 'cat-' + id });
  },

  onAdd(e) {
    const id = e.currentTarget.dataset.id;
    const p = products.find(x => x.id === id);
    cart.add(p, 1);
    wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    this.setData({ popId: '' });
    this.setData({ qty: cart.qtyMap(), popId: id });
    this.flyBall(e);
  },

  // 加购小球：从点击位置抛物线飞到底部购物车
  flyBall(e) {
    const t = (e.touches && e.touches[0]) || e.detail || {};
    const x = t.clientX != null ? t.clientX : t.x;
    const y = t.clientY != null ? t.clientY : t.y;
    const win = this.win || { windowWidth: 375, windowHeight: 667 };
    const r = win.windowWidth / 750;
    const tx = 92 * r, ty = win.windowHeight - 84 * r;
    const ball = { id: ++ballId, x: x - 10, y: y - 10, dx: tx - x, dy: ty - y, go: false };
    this.setData({ balls: this.data.balls.concat(ball) });
    setTimeout(() => {
      this.setData({ balls: this.data.balls.map(b => b.id === ball.id ? Object.assign({}, b, { go: true }) : b) });
    }, 30);
    setTimeout(() => {
      this.setData({ balls: this.data.balls.filter(b => b.id !== ball.id) });
      this.refreshCart(true);
    }, 600);
  },

  onMinus(e) {
    const id = e.currentTarget.dataset.id;
    cart.setQty(id, (this.data.qty[id] || 0) - 1);
    this.refreshCart(false);
  },

  goCart() { wx.switchTab({ url: '/pages/cart/cart' }); }
});
