const config = require('./config.js');
const cart = require('./utils/cart.js');

App({
  onLaunch() {
    if (config.cloudEnv && wx.cloud) {
      wx.cloud.init({ env: config.cloudEnv, traceUser: true });
    }
  },
  onShow() {
    cart.updateBadge();
  }
});
