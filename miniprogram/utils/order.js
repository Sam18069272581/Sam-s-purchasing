const config = require('../config.js');
const KEY = 'orders_v1';

function list() {
  try { return wx.getStorageSync(KEY) || []; } catch (e) { return []; }
}

// 提交订单：开了云开发就写云数据库（云函数会重新计算金额），否则存本机
async function submit(order) {
  if (config.cloudEnv && wx.cloud) {
    const r = await wx.cloud.callFunction({ name: 'createOrder', data: order });
    if (!r.result || !r.result.ok) throw new Error((r.result && r.result.msg) || '下单失败');
    order = Object.assign(order, r.result.order);
  }
  order.id = order.id || 'D' + Date.now();
  order.createdAt = order.createdAt || Date.now();
  order.status = order.status || '待采购';
  const all = list();
  all.unshift(order);
  wx.setStorageSync(KEY, all);
  return order;
}

module.exports = { list, submit };
