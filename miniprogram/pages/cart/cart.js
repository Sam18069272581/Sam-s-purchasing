const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const fmt = require('../../utils/fmt.js');
const user = require('../../utils/user.js');
const config = require('../../config.js');

Page({
  data: { list: [], allChecked: false, goodsText: '0.00', feeText: '0.00', total: { int: '0', dec: '.00' }, freeTip: '', checkedCount: 0, popId: '', removing: '' },

  onShow() { this.refresh(cart.load()); },

  refresh(list) {
    const view = list.map((i, n) => Object.assign({ p: fmt.split(i.price), bg: fmt.gradient(i.categoryId), initial: i.name.slice(0, 1), delay: Math.min(n, 8) * 50 }, i));
    const s = price.summary(list, user.get().address, config.delivery);
    const th = config.delivery.freeThreshold;
    let freeTip = '';
    if (th > 0 && s.goods > 0 && s.goods < th) freeTip = '再买 ¥' + price.formatYuan(th - s.goods) + ' 免配送费';
    this.setData({
      list: view,
      allChecked: list.length > 0 && list.every(i => i.checked),
      checkedCount: list.filter(i => i.checked).reduce((n, i) => n + i.qty, 0),
      goodsText: price.formatYuan(s.goods),
      feeText: price.formatYuan(s.fee),
      total: fmt.split(s.total),
      freeTip
    });
  },

  bumpQty(id, qty) {
    this.setData({ popId: '' });
    this.refresh(cart.setQty(id, qty));
    this.setData({ popId: id });
  },
  onToggle(e) { this.refresh(cart.toggle(e.currentTarget.dataset.id)); },
  onToggleAll() { this.refresh(cart.toggleAll(!this.data.allChecked)); },
  onPlus(e) {
    const id = e.currentTarget.dataset.id;
    this.bumpQty(id, this.data.list.find(i => i.id === id).qty + 1);
  },
  onMinus(e) {
    const id = e.currentTarget.dataset.id;
    const it = this.data.list.find(i => i.id === id);
    if (it.qty > 1) return this.bumpQty(id, it.qty - 1);
    wx.showModal({
      content: '把「' + it.name + '」移出购物车？', confirmColor: '#14213D',
      success: r => { if (r.confirm) this.removeAnimated([id]); }
    });
  },
  // 删除时先播放收起动画，再真正删除
  removeAnimated(ids) {
    this.setData({ removing: ids.join(',') });
    setTimeout(() => {
      let list = cart.load();
      ids.forEach(id => { list = cart.setQty(id, 0); });
      this.setData({ removing: '' });
      this.refresh(list);
    }, 320);
  },
  onClear() {
    const ids = this.data.list.filter(i => i.checked).map(i => i.id);
    if (!ids.length) return;
    wx.showModal({ content: '删除选中的 ' + ids.length + ' 种商品？', confirmColor: '#14213D', success: r => { if (r.confirm) this.removeAnimated(ids); } });
  },
  goShop() { wx.switchTab({ url: '/pages/index/index' }); },
  onCheckout() {
    if (!this.data.checkedCount) return wx.showToast({ title: '请选择商品', icon: 'none' });
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  }
});
