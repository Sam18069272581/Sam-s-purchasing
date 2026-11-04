const order = require('../../utils/order.js');
const price = require('../../utils/price.js');
const { split } = require('../../utils/fmt.js');

function fmt(ts) {
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

Page({
  data: { list: [] },
  onShow() {
    this.setData({
      list: order.list().map((o, n) => Object.assign({}, o, {
        timeText: fmt(o.createdAt), delay: Math.min(n, 8) * 60,
        totalText: price.formatYuan(o.totalAmount),
        feeText: price.formatYuan(o.deliveryFee),
        summaryText: o.items.map(i => i.name + ' ×' + i.qty).join('、'),
        count: o.items.reduce((n, i) => n + i.qty, 0),
        total: split(o.totalAmount)
      }))
    });
  }
});
