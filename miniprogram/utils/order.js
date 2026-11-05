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
  const all = list();
  if (!order.id) {
    // 订单号用时间戳；同一毫秒内连下两单时往后顺延，避免订单号重复
    let n = Date.now();
    while (all.some(o => o.id === 'D' + n)) n++;
    order.id = 'D' + n;
  }
  order.createdAt = order.createdAt || Date.now();
  order.status = order.status || '待采购';
  all.unshift(order);
  wx.setStorageSync(KEY, all);
  return order;
}

module.exports = { list, submit };
