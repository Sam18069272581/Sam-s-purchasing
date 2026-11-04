// 保存订单到云数据库 orders 集合。商品金额在服务端重新计算，防止前端被篡改。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const items = (event.items || []).filter(i => i.qty > 0 && i.price >= 0);
  if (!items.length) return { ok: false, msg: '没有商品' };
  const a = event.address || {};
  if (!a.name || !/^1\d{10}$/.test(a.phone || '') || !a.detail) return { ok: false, msg: '收货信息不完整' };

  const goodsAmount = items.reduce((s, i) => s + Math.round(i.price) * Math.round(i.qty), 0);
  const deliveryFee = Math.max(0, Math.round(event.deliveryFee || 0));
  const order = {
    _openid: OPENID,
    items: items.map(i => ({ id: i.id, name: i.name, spec: i.spec || '', price: Math.round(i.price), qty: Math.round(i.qty) })),
    address: { name: a.name, phone: a.phone, region: a.region || '', detail: a.detail, latitude: a.latitude, longitude: a.longitude },
    goodsAmount,
    deliveryFee,
    totalAmount: goodsAmount + deliveryFee,
    remark: (event.remark || '').slice(0, 200),
    status: '待采购',
    createdAt: Date.now()
  };
  const r = await db.collection('orders').add({ data: order });
  return { ok: true, order: { id: r._id, goodsAmount, deliveryFee, totalAmount: order.totalAmount, status: order.status, createdAt: order.createdAt } };
};
