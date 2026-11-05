// 保存订单到云数据库 orders 集合。
// 商品价格、配送费都在服务端按商品表和配送规则重新计算，不信任前端传来的金额，防止被改包篡改。
// shared/ 目录是 miniprogram 里商品表和规则的副本，由 scripts/sync-cloud.js 生成。
const cloud = require('wx-server-sdk');
const { products } = require('./shared/products.js');
const config = require('./shared/config.js');
const price = require('./shared/price.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const byId = {};
products.forEach(p => { byId[p.id] = p; });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const raw = Array.isArray(event.items) ? event.items : [];
  const items = [];
  for (const i of raw) {
    const p = byId[i && i.id];
    if (!p) return { ok: false, msg: '有商品已下架，请刷新购物车' };
    if (!Number.isInteger(i.qty) || i.qty <= 0 || i.qty > 999) return { ok: false, msg: '商品数量不正确' };
    items.push({ id: p.id, name: p.name, spec: p.spec || '', price: p.price, qty: i.qty });
  }
  if (!items.length) return { ok: false, msg: '没有商品' };
  const a = event.address || {};
  if (!a.name || !/^1\d{10}$/.test(a.phone || '') || !a.detail) return { ok: false, msg: '收货信息不完整' };

  const s = price.summary(items, a, config.delivery);
  if (config.minOrderAmount > 0 && s.goods < config.minOrderAmount) return { ok: false, msg: '未达到起送金额' };
  const order = {
    _openid: OPENID,
    items,
    address: { name: a.name, phone: a.phone, region: a.region || '', detail: a.detail, latitude: a.latitude, longitude: a.longitude },
    goodsAmount: s.goods,
    deliveryFee: s.fee,
    totalAmount: s.total,
    remark: String(event.remark || '').slice(0, 200),
    status: '待采购',
    createdAt: Date.now()
  };
  const r = await db.collection('orders').add({ data: order });
  return { ok: true, order: { id: r._id, items, goodsAmount: s.goods, deliveryFee: s.fee, totalAmount: s.total, status: order.status, createdAt: order.createdAt } };
};
