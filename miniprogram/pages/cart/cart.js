const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const user = require('../../utils/user.js');
const config = require('../../config.js');

Page({
  data: { list: [], allChecked: false, goodsText: '0.00', feeText: '0.00', totalText: '0.00', freeTip: '', checkedCount: 0 },

  onShow() { this.refresh(cart.load()); },

  refresh(list) {
    const view = list.map(i => Object.assign({ priceText: price.formatYuan(i.price), initial: i.name.slice(0, 1) }, i));
    const addr = user.get().address;
    const s = price.summary(list, addr, config.delivery);
    const th = config.delivery.freeThreshold;
    let freeTip = '';
    if (th > 0 && s.goods > 0 && s.goods < th) freeTip = '再买 ¥' + price.formatYuan(th - s.goods) + ' 免配送费';
    this.setData({
      list: view,
      allChecked: list.length > 0 && list.every(i => i.checked),
      checkedCount: list.filter(i => i.checked).reduce((n, i) => n + i.qty, 0),
      goodsText: price.formatYuan(s.goods),
      feeText: price.formatYuan(s.fee),
      totalText: price.formatYuan(s.total),
      freeTip
    });
  },

  onToggle(e) { this.refresh(cart.toggle(e.currentTarget.dataset.id)); },
  onToggleAll() { this.refresh(cart.toggleAll(!this.data.allChecked)); },
  onPlus(e) {
    const id = e.currentTarget.dataset.id;
    const it = this.data.list.find(i => i.id === id);
    this.refresh(cart.setQty(id, it.qty + 1));
  },
  onMinus(e) {
    const id = e.currentTarget.dataset.id;
    const it = this.data.list.find(i => i.id === id);
    if (it.qty > 1) return this.refresh(cart.setQty(id, it.qty - 1));
    wx.showModal({ content: '把「' + it.name + '」移出购物车？', success: r => { if (r.confirm) this.refresh(cart.setQty(id, 0)); } });
  },
  onClear() {
    wx.showModal({ content: '删除选中的商品？', success: r => { if (r.confirm) this.refresh(cart.removeChecked()); } });
  },
  goShop() { wx.switchTab({ url: '/pages/index/index' }); },
  onCheckout() {
    if (!this.data.checkedCount) return wx.showToast({ title: '请选择商品', icon: 'none' });
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  }
});
