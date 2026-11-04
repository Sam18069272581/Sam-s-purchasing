const { categories, products } = require('../../data/products.js');
const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const config = require('../../config.js');

const COLORS = ['#3d8b5f', '#c4553d', '#d49a2a', '#7a5bb5', '#a07042', '#3a7bbf'];

Page({
  data: {
    categories: [],
    groups: [],
    activeCat: '',
    scrollTo: '',
    keyword: '',
    qty: {},
    cartCount: 0,
    cartTotal: '0.00',
    freeTip: ''
  },

  onLoad() {
    const cats = categories.map((c, i) => Object.assign({ color: COLORS[i % COLORS.length] }, c));
    this.setData({ categories: cats, activeCat: cats[0].id });
    this.buildGroups('');
  },

  onShow() { this.refreshCart(); },

  buildGroups(keyword) {
    const kw = keyword.trim();
    const groups = this.data.categories.map(c => ({
      id: c.id, name: c.name, color: c.color,
      items: products
        .filter(p => p.categoryId === c.id && (!kw || p.name.indexOf(kw) >= 0))
        .map(p => Object.assign({ priceText: price.formatYuan(p.price), initial: p.name.slice(0, 1) }, p))
    })).filter(g => g.items.length);
    this.setData({ groups });
  },

  refreshCart() {
    const list = cart.load();
    const goods = price.goodsTotal(list);
    const th = config.delivery.freeThreshold;
    let freeTip = '';
    if (th > 0 && goods > 0) {
      freeTip = goods >= th ? '已免配送费' : '再买 ¥' + price.formatYuan(th - goods) + ' 免配送费';
    }
    this.setData({ qty: cart.qtyMap(), cartCount: cart.count(list), cartTotal: price.formatYuan(goods), freeTip });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.buildGroups(e.detail.value);
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCat: id, scrollTo: 'cat-' + id });
  },

  onAdd(e) {
    const p = products.find(x => x.id === e.currentTarget.dataset.id);
    cart.add(p, 1);
    this.refreshCart();
  },

  onMinus(e) {
    const id = e.currentTarget.dataset.id;
    cart.setQty(id, (this.data.qty[id] || 0) - 1);
    this.refreshCart();
  },

  goCart() { wx.switchTab({ url: '/pages/cart/cart' }); }
});
