const user = require('../../utils/user.js');
const order = require('../../utils/order.js');
const config = require('../../config.js');

Page({
  data: { u: {}, orderCount: 0, agree: false, shake: false, shopName: config.shopName },

  onShow() { this.setData({ u: user.get(), orderCount: order.list().length }); },

  async onLogin() {
    if (!this.data.agree) {
      this.setData({ shake: false });
      setTimeout(() => this.setData({ shake: true }), 20);
      return wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none' });
    }
    wx.showLoading({ title: '登录中' });
    try {
      const u = await user.login();
      this.setData({ u });
      wx.hideLoading();
      if (!u.address) {
        wx.showModal({
          title: '完善收货信息',
          content: '为了方便配送，需要获取你的位置，并填写收货人、电话和详细地址。',
          confirmText: '去填写', confirmColor: '#14213D',
          success: r => { if (r.confirm) wx.navigateTo({ url: '/pages/address/address' }); }
        });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },

  onAgree() { this.setData({ agree: !this.data.agree }); },
  onChooseAvatar(e) { this.setData({ u: user.set({ avatar: e.detail.avatarUrl }) }); },
  onNickname(e) { if (e.detail.value) this.setData({ u: user.set({ nickname: e.detail.value }) }); },

  goAddress() { wx.navigateTo({ url: '/pages/address/address' }); },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  onLogout() {
    wx.showModal({ content: '确定退出登录？', confirmColor: '#14213D', success: r => { if (r.confirm) { user.logout(); this.onShow(); } } });
  }
});
