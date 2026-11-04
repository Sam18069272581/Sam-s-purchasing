const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const fmt = require('../../utils/fmt.js');
const user = require('../../utils/user.js');
const order = require('../../utils/order.js');
const config = require('../../config.js');

Page({
  data: { address: null, items: [], goodsText: '0.00', feeText: '0.00', total: { int: '0', dec: '.00' }, feeNote: '', remark: '', submitting: false, success: null },

  onShow() {
    const address = user.get().address || null;
    const items = cart.load().filter(i => i.checked).map((i, n) => Object.assign({
      priceText: price.formatYuan(i.price), subText: price.formatYuan(i.price * i.qty),
      bg: fmt.gradient(i.categoryId), initial: i.name.slice(0, 1)
    }, i));
    const s = price.summary(items, address, config.delivery);
    const d = config.delivery;
    let feeNote = '';
    if (s.fee === 0 && s.goods > 0 && d.freeThreshold > 0) feeNote = '已满 ¥' + price.formatYuan(d.freeThreshold) + '，免配送费';
    else if (address && address.latitude != null && d.perKmFee > 0) feeNote = '距发货点约 ' + price.distanceKm(d.origin, address).toFixed(1) + ' 公里';
    this.setData({ address, items, feeNote, goods: s.goods, fee: s.fee, totalCents: s.total,
      count: items.reduce((n, i) => n + i.qty, 0),
      goodsText: price.formatYuan(s.goods), feeText: price.formatYuan(s.fee), total: fmt.split(s.total) });
  },

  editAddress() { wx.navigateTo({ url: '/pages/address/address' }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },

  async onSubmit() {
    if (!user.isLoggedIn()) {
      return wx.showModal({ content: '请先在「我的」页面微信登录', showCancel: false, confirmColor: '#14213D', success: () => wx.switchTab({ url: '/pages/mine/mine' }) });
    }
    const err = user.addressError(this.data.address);
    if (err) return wx.showToast({ title: err, icon: 'none' });
    if (!this.data.items.length) return wx.showToast({ title: '没有选中商品', icon: 'none' });
    if (config.minOrderAmount > 0 && this.data.goods < config.minOrderAmount) {
      return wx.showToast({ title: '满 ¥' + price.formatYuan(config.minOrderAmount) + ' 起送', icon: 'none' });
    }
    this.setData({ submitting: true });
    try {
      const o = await order.submit({
        items: this.data.items.map(i => ({ id: i.id, name: i.name, spec: i.spec, price: i.price, qty: i.qty })),
        address: this.data.address,
        goodsAmount: this.data.goods,
        deliveryFee: this.data.fee,
        totalAmount: this.data.totalCents,
        remark: this.data.remark
      });
      cart.removeChecked();
      wx.vibrateShort && wx.vibrateShort({ type: 'medium' });
      this.setData({ success: { id: o.id, total: price.formatYuan(o.totalAmount) } });
    } catch (e) {
      wx.showToast({ title: e.message || '下单失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goOrders() { wx.redirectTo({ url: '/pages/orders/orders' }); },
  goHome() { wx.switchTab({ url: '/pages/index/index' }); }
});
