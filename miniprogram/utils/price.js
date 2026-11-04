// 金额与配送费计算（纯函数，可在 node 里单测）
function formatYuan(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

// 两点直线距离（公里），Haversine 公式
function distanceKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// items: [{ price, qty, checked }]，price 单位分
function goodsTotal(items) {
  return items.filter(i => i.checked !== false).reduce((s, i) => s + i.price * i.qty, 0);
}

// 计算配送费。address 可带 latitude/longitude；没有坐标就只收基础费。
function deliveryFee(goodsAmount, address, rule) {
  if (goodsAmount <= 0) return 0;
  if (rule.freeThreshold > 0 && goodsAmount >= rule.freeThreshold) return 0;
  let fee = rule.baseFee;
  if (rule.perKmFee > 0 && address && address.latitude != null && rule.origin) {
    const km = distanceKm(rule.origin, address);
    const extra = Math.max(0, Math.ceil(km - rule.includedKm));
    fee += extra * rule.perKmFee;
  }
  if (rule.maxFee > 0) fee = Math.min(fee, rule.maxFee);
  return fee;
}

function summary(items, address, rule) {
  const goods = goodsTotal(items);
  const fee = deliveryFee(goods, address, rule);
  return { goods, fee, total: goods + fee };
}

module.exports = { formatYuan, distanceKm, goodsTotal, deliveryFee, summary };
