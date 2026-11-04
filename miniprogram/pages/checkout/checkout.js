const cart = require('../../utils/cart.js');
const price = require('../../utils/price.js');
const user = require('../../utils/user.js');
const order = require('../../utils/order.js');
const config = require('../../config.js');

Page({
  data: { address: null, items: [], goodsText: '0.00', feeText: '0.00', totalText: '0.00', feeNote: '', remark: '', submitting: false },

  onShow() {
    const address = user.get().address || null;
    const items = cart.load().filter(i => i.checked).map(i => Object.assign({ priceText: price.formatYuan(i.price), subText: price.formatYuan(i.price * i.qty) }, i));
    const s = price.summary(items, address, config.delivery);
    const d = config.delivery;
    let feeNote = '';
    if (s.fee === 0 && s.goods > 0) feeNote = '已满 ¥' + price.formatYuan(d.freeThreshold) + '，免配送费';
    else if (address && address.latitude != null && d.perKmFee > 0) {
      feeNote = '距发货点约 ' + price.distanceKm(d.origin, address).toFixed(1) + ' 公里';
    } else if (d.perKmFee > 0) feeNote = '在地址里选择地图位置后，按距离计算配送费';
    this.setData({ address, items, feeNote, goods: s.goods, fee: s.fee, total: s.total,
      goodsText: price.formatYuan(s.goods), feeText: price.formatYuan(s.fee), totalText: price.formatYuan(s.total) });
  },

  editAddress() { wx.navigateTo({ url: '/pages/address/address' }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },

  async onSubmit() {
    if (!user.isLoggedIn()) {
      return wx.showModal({ content: '请先在「我的」页面微信登录', showCancel: false, success: () => wx.switchTab({ url: '/pages/mine/mine' }) });
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
        totalAmount: this.data.total,
        remark: this.data.remark
      });
      cart.removeChecked();
      wx.showModal({
        title: '下单成功',
        content: '订单号 ' + o.id + '，应付 ¥' + price.formatYuan(o.totalAmount) + '。代购员会尽快联系你确认。',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/orders/orders' })
      });
    } catch (e) {
      wx.showToast({ title: e.message || '下单失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
