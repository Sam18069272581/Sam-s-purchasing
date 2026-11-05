const user = require('../../utils/user.js');

Page({
  data: { name: '', phone: '', region: '', detail: '', latitude: null, longitude: null, locName: '' },

  onLoad() {
    const a = user.get().address;
    if (a) this.setData(a);
    else this.chooseLocation(); // 首次填写：先授权位置，在地图上选点
  },

  // 位置授权 → 地图选点。用户拒绝过授权时，引导去设置页打开
  chooseLocation() {
    wx.getSetting({
      success: s => {
        if (s.authSetting['scope.userLocation'] === false) {
          wx.showModal({
            title: '需要位置权限',
            content: '用于确定收货位置和计算配送费，请在设置中允许使用位置信息。',
            confirmText: '去设置',
            success: r => { if (r.confirm) wx.openSetting(); }
          });
          return;
        }
        wx.authorize({
          scope: 'scope.userLocation',
          complete: () => {
            wx.chooseLocation({
              latitude: this.data.latitude || undefined,
              longitude: this.data.longitude || undefined,
              success: loc => {
                this.setData({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  locName: loc.name,
                  region: loc.address || this.data.region,
                  detail: this.data.detail || loc.name
                });
              }
            });
          }
        });
      }
    });
  },

  onInput(e) { this.setData({ [e.currentTarget.dataset.k]: e.detail.value }); },

  onSave() {
    const a = {
      name: this.data.name.trim(), phone: this.data.phone.trim(), region: this.data.region,
      detail: this.data.detail.trim(), latitude: this.data.latitude, longitude: this.data.longitude, locName: this.data.locName
    };
    const err = user.addressError(a);
    if (err) return wx.showToast({ title: err, icon: 'none' });
    user.set({ address: a });
    wx.showToast({ title: '已保存' });
    setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) }), 600);
  }
});
